// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {FixedPointMath} from "./FixedPointMath.sol";
import {AgentRegistry} from "./AgentRegistry.sol";
import {ReputationManager} from "./ReputationManager.sol";

/// @title SKCEngine
/// @notice Core SKC (Strictly Proper Scoring Rule with Random Stop) truth discovery engine
/// @dev Implements the self-resolving mechanism based on Harvard's SKC research
///      All core functions are API-gated — only the Protocol API can call them
contract SKCEngine {
    using FixedPointMath for uint256;

    // --- Constants ---
    uint256 public constant WAD = 1e18;
    uint256 public constant MIN_PROBABILITY = 0.01e18;
    uint256 public constant MAX_PROBABILITY = 0.99e18;
    uint256 public constant FORCE_RESOLVE_DELAY = 2 days;
    int256 public constant WAD_INT = 1e18;

    // --- Structs ---
    struct Report {
        uint256 agentId;
        address reporter;
        uint256 probability;
        uint256 priceBefore;
        uint256 priceAfter;
        uint256 bondAmount;     // accounting-based bond (tracked, not held)
        string sourceChain;     // chain where bond was paid via x402
        uint256 timestamp;
    }

    struct Query {
        string question;
        uint256 alpha;          // stop probability per report [0, WAD)
        uint256 k;              // number of last agents getting flat reward
        uint256 flatReward;     // R = reward per last-k agent (in USDC units)
        uint256 bondAmount;     // required bond per report (in USDC units)
        uint256 liquidityParam; // b = LMSR scaling parameter
        uint256 currentPrice;   // current market price
        uint256 initialPrice;   // starting price
        bool resolved;
        uint256 totalPool;      // total accounting pool
        address creator;
        uint256 reportCount;
        uint256 createdAt;
        int128 minReputation;   // minimum reputation threshold (0 = no filter)
        string reputationTag;   // tag2 for reputation filtering
    }

    // --- State ---
    address public owner;
    address public protocolAPI;     // the only address that can call core functions
    bool public apiGated;           // if true, only protocolAPI can call; if false, open to all

    AgentRegistry public agentRegistry;
    ReputationManager public reputationManager;

    uint256 public queryCount;
    mapping(uint256 => Query) public queries;
    mapping(uint256 => Report[]) public reports;
    mapping(uint256 => mapping(address => bool)) public hasReported;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    mapping(uint256 => mapping(address => uint256)) public payouts;

    // --- Events ---
    event QueryCreated(
        uint256 indexed queryId,
        string question,
        uint256 alpha,
        uint256 initialPrice,
        address indexed creator
    );
    event ReportSubmitted(
        uint256 indexed queryId,
        uint256 indexed agentId,
        address indexed reporter,
        uint256 probability,
        uint256 priceBefore,
        uint256 reportIndex
    );
    event QueryResolved(
        uint256 indexed queryId,
        uint256 finalPrice,
        uint256 totalReports
    );
    event PayoutRecorded(
        uint256 indexed queryId,
        address indexed reporter,
        uint256 amount
    );
    event APIGateUpdated(bool gated);
    event ProtocolAPIUpdated(address indexed oldAPI, address indexed newAPI);

    // --- Errors ---
    error NotOwner();
    error NotAuthorized();
    error QueryNotActive();
    error QueryNotResolved();
    error AlreadyReported();
    error AlreadyClaimed();
    error InvalidProbability();
    error InvalidParameters();
    error AgentNotRegistered();
    error AgentNotEligible();
    error InsufficientFunding();
    error ForceResolveNotReady();
    error NoPayout();

    // --- Modifiers ---
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyProtocolAPI() {
        if (apiGated && msg.sender != protocolAPI) revert NotAuthorized();
        _;
    }

    constructor(
        address _agentRegistry,
        address _reputationManager,
        address _protocolAPI
    ) {
        require(_agentRegistry != address(0), "Zero address");
        require(_reputationManager != address(0), "Zero address");

        agentRegistry = AgentRegistry(_agentRegistry);
        reputationManager = ReputationManager(_reputationManager);
        protocolAPI = _protocolAPI;
        apiGated = true;
        owner = msg.sender;
    }

    // ========== CORE FUNCTIONS (API-GATED) ==========

    /// @notice Create a new truth discovery query
    /// @dev Called by Protocol API after x402 payment is verified
    function createQuery(
        string calldata question,
        uint256 alpha,
        uint256 k,
        uint256 flatReward,
        uint256 bondAmount,
        uint256 liquidityParam,
        uint256 initialPrice,
        uint256 fundingAmount,
        int128 minReputation,
        string calldata reputationTag,
        address creator
    ) external onlyProtocolAPI returns (uint256 queryId) {
        if (alpha == 0 || alpha >= WAD) revert InvalidParameters();
        if (bondAmount == 0) revert InvalidParameters();
        if (liquidityParam == 0) revert InvalidParameters();
        if (initialPrice < MIN_PROBABILITY || initialPrice > MAX_PROBABILITY) revert InvalidProbability();

        // Minimum funding per SKC paper: b·ln(2) + k·R
        uint256 minFunding = (liquidityParam * uint256(FixedPointMath.LN2_WAD)) / WAD + (flatReward * k);
        if (fundingAmount < minFunding) revert InsufficientFunding();

        queryId = queryCount++;

        Query storage q = queries[queryId];
        q.question = question;
        q.alpha = alpha;
        q.k = k;
        q.flatReward = flatReward;
        q.bondAmount = bondAmount;
        q.liquidityParam = liquidityParam;
        q.currentPrice = initialPrice;
        q.initialPrice = initialPrice;
        q.totalPool = fundingAmount;
        q.creator = creator;
        q.createdAt = block.timestamp;
        q.minReputation = minReputation;
        q.reputationTag = reputationTag;

        emit QueryCreated(queryId, question, alpha, initialPrice, creator);
    }

    /// @notice Submit a report for a query
    /// @dev Called by Protocol API after agent's x402 bond payment is verified
    function submitReport(
        uint256 queryId,
        uint256 probability,
        address reporter,
        uint256 bondAmount,
        string calldata sourceChain
    ) external onlyProtocolAPI {
        Query storage q = queries[queryId];
        if (q.resolved) revert QueryNotActive();
        if (q.bondAmount == 0) revert QueryNotActive();
        if (hasReported[queryId][reporter]) revert AlreadyReported();
        if (bondAmount < q.bondAmount) revert InvalidParameters();
        if (probability < MIN_PROBABILITY || probability > MAX_PROBABILITY) revert InvalidProbability();

        // Check agent is registered via ERC-8004
        if (!agentRegistry.isRegisteredAgent(reporter)) revert AgentNotRegistered();

        // Check reputation threshold if set
        uint256 agentId = agentRegistry.getAgentId(reporter);
        if (q.minReputation > 0) {
            if (!reputationManager.isAgentEligible(agentId, q.minReputation, q.reputationTag)) {
                revert AgentNotEligible();
            }
        }

        // Record report
        uint256 priceBefore = q.currentPrice;
        q.currentPrice = probability;
        q.totalPool += bondAmount;

        reports[queryId].push(Report({
            agentId: agentId,
            reporter: reporter,
            probability: probability,
            priceBefore: priceBefore,
            priceAfter: probability,
            bondAmount: bondAmount,
            sourceChain: sourceChain,
            timestamp: block.timestamp
        }));

        hasReported[queryId][reporter] = true;
        q.reportCount++;

        emit ReportSubmitted(queryId, agentId, reporter, probability, priceBefore, q.reportCount - 1);

        // Random stop check
        _checkRandomStop(queryId);
    }

    /// @notice Record that a payout has been claimed (settlement happens off-chain via x402)
    /// @dev Called by Protocol API after x402 payout is settled
    function recordPayoutClaim(uint256 queryId, address reporter) external onlyProtocolAPI {
        Query storage q = queries[queryId];
        if (!q.resolved) revert QueryNotResolved();
        if (hasClaimed[queryId][reporter]) revert AlreadyClaimed();

        uint256 payout = payouts[queryId][reporter];
        if (payout == 0) revert NoPayout();

        hasClaimed[queryId][reporter] = true;

        emit PayoutRecorded(queryId, reporter, payout);
    }

    /// @notice Force resolve a query
    function forceResolve(uint256 queryId) external onlyProtocolAPI {
        Query storage q = queries[queryId];
        if (q.resolved) revert QueryNotActive();
        if (q.reportCount == 0) revert InvalidParameters();

        _resolve(queryId);
    }

    // ========== VIEW FUNCTIONS (open to all) ==========

    function getQueryInfo(uint256 queryId)
        external
        view
        returns (
            string memory question,
            uint256 currentPrice,
            address creator,
            bool resolved,
            uint256 totalPool,
            uint256 reportCount
        )
    {
        Query storage q = queries[queryId];
        return (q.question, q.currentPrice, q.creator, q.resolved, q.totalPool, q.reportCount);
    }

    function getQueryParams(uint256 queryId)
        external
        view
        returns (
            uint256 alpha,
            uint256 k,
            uint256 flatReward,
            uint256 bondAmount,
            uint256 liquidityParam,
            uint256 createdAt
        )
    {
        Query storage q = queries[queryId];
        return (q.alpha, q.k, q.flatReward, q.bondAmount, q.liquidityParam, q.createdAt);
    }

    function getReport(uint256 queryId, uint256 index)
        external
        view
        returns (
            uint256 agentId,
            address reporter,
            uint256 probability,
            uint256 priceBefore,
            uint256 priceAfter,
            uint256 bondAmount,
            string memory sourceChain,
            uint256 timestamp
        )
    {
        Report storage r = reports[queryId][index];
        return (r.agentId, r.reporter, r.probability, r.priceBefore, r.priceAfter, r.bondAmount, r.sourceChain, r.timestamp);
    }

    function getReportCount(uint256 queryId) external view returns (uint256) {
        return reports[queryId].length;
    }

    function getPayoutAmount(uint256 queryId, address reporter) external view returns (uint256) {
        return payouts[queryId][reporter];
    }

    function isQueryActive(uint256 queryId) external view returns (bool) {
        Query storage q = queries[queryId];
        return q.bondAmount > 0 && !q.resolved;
    }

    // ========== ADMIN FUNCTIONS ==========

    function setProtocolAPI(address _api) external onlyOwner {
        address old = protocolAPI;
        protocolAPI = _api;
        emit ProtocolAPIUpdated(old, _api);
    }

    function setAPIGated(bool _gated) external onlyOwner {
        apiGated = _gated;
        emit APIGateUpdated(_gated);
    }

    function setAgentRegistry(address _registry) external onlyOwner {
        require(_registry != address(0), "Zero address");
        agentRegistry = AgentRegistry(_registry);
    }

    function setReputationManager(address _manager) external onlyOwner {
        require(_manager != address(0), "Zero address");
        reputationManager = ReputationManager(_manager);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    // ========== INTERNAL ==========

    function _checkRandomStop(uint256 queryId) internal {
        Query storage q = queries[queryId];
        uint256 rand = uint256(blockhash(block.number - 1)) % WAD;
        if (rand < q.alpha) {
            _resolve(queryId);
        }
    }

    function _resolve(uint256 queryId) internal {
        Query storage q = queries[queryId];
        q.resolved = true;

        uint256 totalReports = reports[queryId].length;
        if (totalReports == 0) return;

        // Final price = last report's probability (truth reference)
        uint256 qFinal = reports[queryId][totalReports - 1].probability;

        // Calculate payouts
        uint256 totalPayouts = 0;
        uint256[] memory rawPayouts = new uint256[](totalReports);

        for (uint256 i = 0; i < totalReports; i++) {
            Report storage r = reports[queryId][i];

            if (i >= totalReports - q.k) {
                // Last k agents: bond + flat reward
                rawPayouts[i] = r.bondAmount + q.flatReward;
            } else {
                // Scored agents: max(0, bond + b * deltaS)
                int256 deltaS = FixedPointMath.deltaPayout(qFinal, r.priceBefore, r.priceAfter);
                int256 rawPayout = int256(r.bondAmount) + (int256(q.liquidityParam) * deltaS) / WAD_INT;

                if (rawPayout > 0) {
                    rawPayouts[i] = uint256(rawPayout);
                } else {
                    rawPayouts[i] = 0;
                }
            }
            totalPayouts += rawPayouts[i];
        }

        // Pro-rata scaling if pool insufficient
        if (totalPayouts > q.totalPool && totalPayouts > 0) {
            for (uint256 i = 0; i < totalReports; i++) {
                rawPayouts[i] = (rawPayouts[i] * q.totalPool) / totalPayouts;
            }
        }

        // Assign payouts and write reputation
        for (uint256 i = 0; i < totalReports; i++) {
            Report storage r = reports[queryId][i];
            payouts[queryId][r.reporter] = rawPayouts[i];

            // Write reputation to ERC-8004
            int256 deltaS = FixedPointMath.deltaPayout(qFinal, r.priceBefore, r.priceAfter);
            int128 reputationScore = int128(deltaS * 10000 / WAD_INT);

            try reputationManager.writeReputation(
                r.agentId,
                reputationScore,
                q.reputationTag
            ) {} catch {}
        }

        emit QueryResolved(queryId, qFinal, totalReports);
    }
}
