// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {SKCEngine} from "./SKCEngine.sol";

/// @title QueryFactory
/// @notice Convenience wrapper for creating and managing queries
/// @dev API-gated — only Protocol API can create queries
contract QueryFactory {
    // --- State ---
    SKCEngine public skcEngine;
    address public owner;
    address public protocolAPI;
    bool public apiGated;

    // creator → queryIds mapping
    mapping(address => uint256[]) private _creatorQueries;
    // active query tracking
    uint256[] private _activeQueryIds;
    mapping(uint256 => uint256) private _activeQueryIndex;
    mapping(uint256 => bool) private _isActive;

    // --- Events ---
    event QueryDeployed(
        uint256 indexed queryId,
        address indexed creator,
        string question
    );

    // --- Errors ---
    error NotOwner();
    error NotAuthorized();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyProtocolAPI() {
        if (apiGated && msg.sender != protocolAPI) revert NotAuthorized();
        _;
    }

    constructor(address _skcEngine, address _protocolAPI) {
        require(_skcEngine != address(0), "Zero address");
        skcEngine = SKCEngine(_skcEngine);
        protocolAPI = _protocolAPI;
        apiGated = true;
        owner = msg.sender;
    }

    // ========== CORE FUNCTIONS ==========

    /// @notice Create a new truth discovery query
    /// @dev Called by Protocol API after x402 payment verification
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
        address creator,
        string calldata queryChain,
        string calldata source
    ) external onlyProtocolAPI returns (uint256 queryId) {
        queryId = skcEngine.createQuery(
            question,
            alpha,
            k,
            flatReward,
            bondAmount,
            liquidityParam,
            initialPrice,
            fundingAmount,
            minReputation,
            reputationTag,
            creator,
            queryChain,
            source
        );

        _creatorQueries[creator].push(queryId);
        _activeQueryIds.push(queryId);
        _activeQueryIndex[queryId] = _activeQueryIds.length - 1;
        _isActive[queryId] = true;

        emit QueryDeployed(queryId, creator, question);
    }

    /// @notice Mark a query as inactive (called when resolved)
    function markResolved(uint256 queryId) external {
        if (!_isActive[queryId]) return;

        (,,, bool resolved,,) = skcEngine.getQueryInfo(queryId);
        if (!resolved) return;

        _isActive[queryId] = false;

        uint256 index = _activeQueryIndex[queryId];
        uint256 lastIndex = _activeQueryIds.length - 1;

        if (index != lastIndex) {
            uint256 lastQueryId = _activeQueryIds[lastIndex];
            _activeQueryIds[index] = lastQueryId;
            _activeQueryIndex[lastQueryId] = index;
        }

        _activeQueryIds.pop();
        delete _activeQueryIndex[queryId];
    }

    // ========== VIEW FUNCTIONS ==========

    function getQueryCount() external view returns (uint256) {
        return skcEngine.queryCount();
    }

    function getActiveQueries() external view returns (uint256[] memory) {
        return _activeQueryIds;
    }

    function getQueriesByCreator(address creator) external view returns (uint256[] memory) {
        return _creatorQueries[creator];
    }

    function isActive(uint256 queryId) external view returns (bool) {
        return _isActive[queryId];
    }

    // ========== ADMIN ==========

    function setSKCEngine(address _engine) external onlyOwner {
        if (_engine == address(0)) revert ZeroAddress();
        skcEngine = SKCEngine(_engine);
    }

    function setProtocolAPI(address _api) external onlyOwner {
        protocolAPI = _api;
    }

    function setAPIGated(bool _gated) external onlyOwner {
        apiGated = _gated;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
