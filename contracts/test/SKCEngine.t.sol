// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SKCEngine} from "../src/SKCEngine.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {ReputationManager} from "../src/ReputationManager.sol";

// Reuse mocks
import {MockIdentityRegistry} from "./AgentRegistry.t.sol";
import {MockReputationRegistry} from "./ReputationManager.t.sol";

contract SKCEngineTest is Test {
    SKCEngine public engine;
    AgentRegistry public agentReg;
    ReputationManager public repManager;
    MockIdentityRegistry public mockIdentity;
    MockReputationRegistry public mockReputation;

    address public owner = address(this);
    address public protocolAPI = makeAddr("protocolAPI");

    address public agent1 = makeAddr("agent1");
    address public agent2 = makeAddr("agent2");
    address public agent3 = makeAddr("agent3");
    address public unregistered = makeAddr("unregistered");
    address public builder = makeAddr("builder");

    uint256 constant WAD = 1e18;

    function setUp() public {
        // Deploy mocks
        mockIdentity = new MockIdentityRegistry();
        mockReputation = new MockReputationRegistry();

        // Deploy core contracts
        agentReg = new AgentRegistry(address(mockIdentity));
        repManager = new ReputationManager(address(mockReputation));

        engine = new SKCEngine(
            address(agentReg),
            address(repManager),
            protocolAPI
        );

        // Authorize engine to write reputation
        repManager.authorizeCaller(address(engine));

        // Register agents in ERC-8004 mock
        mockIdentity.mint(agent1, 1);
        mockIdentity.mint(agent2, 2);
        mockIdentity.mint(agent3, 3);

        // Agents join Yiling ecosystem
        vm.prank(agent1);
        agentReg.joinEcosystem(1);
        vm.prank(agent2);
        agentReg.joinEcosystem(2);
        vm.prank(agent3);
        agentReg.joinEcosystem(3);
    }

    // ========== Helpers ==========

    function _createDefaultQuery() internal returns (uint256) {
        vm.prank(protocolAPI);
        return engine.createQuery(
            "Is the sky blue?",
            0.3e18,     // alpha: 30% stop chance
            1,          // k
            0.01e18,    // flatReward
            0.1e18,     // bondAmount
            1e18,       // liquidityParam
            0.5e18,     // initialPrice
            5e18,       // fundingAmount
            0,          // no reputation threshold
            "",         // no reputation tag
            builder,    // creator
            "eip155:10143", // queryChain
            ""              // source
        );
    }

    function _createQueryNoRandomStop() internal returns (uint256) {
        vm.prank(protocolAPI);
        return engine.createQuery(
            "Test question",
            1,              // alpha: basically 0% chance
            1,              // k
            0.01e18,        // flatReward
            0.1e18,         // bondAmount
            1e18,           // liquidityParam
            0.5e18,         // initialPrice
            5e18,           // fundingAmount
            0,
            "",
            builder,
            "eip155:10143",
            ""
        );
    }

    // ========== API Gate Tests ==========

    function test_apiGated_revert_unauthorized() public {
        address stranger = makeAddr("stranger");
        vm.prank(stranger);
        vm.expectRevert(SKCEngine.NotAuthorized.selector);
        engine.createQuery("Q", 0.2e18, 1, 0.01e18, 0.1e18, 1e18, 0.5e18, 5e18, 0, "", builder, "eip155:10143", "");
    }

    function test_apiGated_protocolAPI_succeeds() public {
        vm.prank(protocolAPI);
        uint256 queryId = engine.createQuery("Q", 0.2e18, 1, 0.01e18, 0.1e18, 1e18, 0.5e18, 5e18, 0, "", builder, "eip155:10143", "");
        assertEq(queryId, 0);
    }

    function test_apiGated_disabled_anyoneCan() public {
        engine.setAPIGated(false);

        address anyone = makeAddr("anyone");
        vm.prank(anyone);
        uint256 queryId = engine.createQuery("Q", 0.2e18, 1, 0.01e18, 0.1e18, 1e18, 0.5e18, 5e18, 0, "", anyone, "eip155:10143", "");
        assertEq(queryId, 0);
    }

    // ========== Query Creation Tests ==========

    function test_createQuery() public {
        uint256 queryId = _createDefaultQuery();
        assertEq(queryId, 0);
        assertEq(engine.queryCount(), 1);

        (string memory question, uint256 currentPrice, address creator, bool resolved, , uint256 reportCount) =
            engine.getQueryInfo(queryId);

        assertEq(question, "Is the sky blue?");
        assertEq(currentPrice, 0.5e18);
        assertEq(creator, builder);
        assertFalse(resolved);
        assertEq(reportCount, 0);
    }

    function test_createQuery_revert_invalidAlpha() public {
        vm.prank(protocolAPI);
        vm.expectRevert(SKCEngine.InvalidParameters.selector);
        engine.createQuery("Q", 0, 1, 0.01e18, 0.1e18, 1e18, 0.5e18, 5e18, 0, "", builder, "eip155:10143", "");
    }

    function test_createQuery_revert_invalidProbability() public {
        vm.prank(protocolAPI);
        vm.expectRevert(SKCEngine.InvalidProbability.selector);
        engine.createQuery("Q", 0.2e18, 1, 0.01e18, 0.1e18, 1e18, WAD, 5e18, 0, "", builder, "eip155:10143", "");
    }

    // ========== Submit Report Tests ==========

    function test_submitReport() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.7e18, agent1, 0.1e18, "eip155:10143");

        (uint256 agentId, address reporter, uint256 probability, , , , ,) = engine.getReport(queryId, 0);
        assertEq(agentId, 1);
        assertEq(reporter, agent1);
        assertEq(probability, 0.7e18);
        assertEq(engine.getReportCount(queryId), 1);
        assertTrue(engine.hasReported(queryId, agent1));
    }

    function test_submitReport_revert_unregisteredAgent() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(protocolAPI);
        vm.expectRevert(SKCEngine.AgentNotRegistered.selector);
        engine.submitReport(queryId, 0.7e18, unregistered, 0.1e18, "eip155:10143");
    }

    function test_submitReport_revert_alreadyReported() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.7e18, agent1, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        vm.expectRevert(SKCEngine.AlreadyReported.selector);
        engine.submitReport(queryId, 0.8e18, agent1, 0.1e18, "eip155:10143");
    }

    function test_submitReport_revert_invalidProbability() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(protocolAPI);
        vm.expectRevert(SKCEngine.InvalidProbability.selector);
        engine.submitReport(queryId, WAD, agent1, 0.1e18, "eip155:10143");
    }

    function test_submitReport_revert_notAPI() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(agent1);
        vm.expectRevert(SKCEngine.NotAuthorized.selector);
        engine.submitReport(queryId, 0.7e18, agent1, 0.1e18, "eip155:10143");
    }

    function test_submitReport_updatesPrice() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.7e18, agent1, 0.1e18, "eip155:10143");

        (, uint256 currentPrice, , , ,) = engine.getQueryInfo(queryId);
        assertEq(currentPrice, 0.7e18);
    }

    // ========== Resolution Tests ==========

    function test_forceResolve() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.7e18, agent1, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.8e18, agent2, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.forceResolve(queryId);

        (, , , bool resolved, ,) = engine.getQueryInfo(queryId);
        assertTrue(resolved);
    }

    function test_forceResolve_revert_notAPI() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.7e18, agent1, 0.1e18, "eip155:10143");

        address stranger = makeAddr("stranger");
        vm.prank(stranger);
        vm.expectRevert(SKCEngine.NotAuthorized.selector);
        engine.forceResolve(queryId);
    }

    // ========== Payout Tests ==========

    function test_payout_correctAgent_earnsMore() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.3e18, agent1, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.7e18, agent2, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.8e18, agent3, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.forceResolve(queryId);

        uint256 payout1 = engine.getPayoutAmount(queryId, agent1);
        uint256 payout2 = engine.getPayoutAmount(queryId, agent2);

        assertTrue(payout2 > payout1, "Agent moving toward truth should earn more");
    }

    function test_payout_lastKAgent_getsFlatReward() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.6e18, agent1, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.7e18, agent2, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.8e18, agent3, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.forceResolve(queryId);

        uint256 payout3 = engine.getPayoutAmount(queryId, agent3);
        assertTrue(payout3 > 0, "Last agent should have payout");
    }

    function test_recordPayoutClaim() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.7e18, agent1, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.8e18, agent2, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.forceResolve(queryId);

        vm.prank(protocolAPI);
        engine.recordPayoutClaim(queryId, agent2);

        assertTrue(engine.hasClaimed(queryId, agent2));
    }

    function test_recordPayoutClaim_revert_notResolved() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.7e18, agent1, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        vm.expectRevert(SKCEngine.QueryNotResolved.selector);
        engine.recordPayoutClaim(queryId, agent1);
    }

    function test_recordPayoutClaim_revert_alreadyClaimed() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.7e18, agent1, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.8e18, agent2, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.forceResolve(queryId);

        vm.prank(protocolAPI);
        engine.recordPayoutClaim(queryId, agent2);

        vm.prank(protocolAPI);
        vm.expectRevert(SKCEngine.AlreadyClaimed.selector);
        engine.recordPayoutClaim(queryId, agent2);
    }

    // ========== Reputation Integration Tests ==========

    function test_reputation_writtenAfterResolution() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.7e18, agent1, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.8e18, agent2, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.forceResolve(queryId);

        uint256 feedbackCount = mockReputation.getFeedbackCount(1);
        assertTrue(feedbackCount > 0, "Reputation should be written after resolution");
    }

    // ========== Reputation Threshold Tests ==========

    function test_submitReport_revert_belowReputationThreshold() public {
        vm.prank(protocolAPI);
        uint256 queryId = engine.createQuery(
            "High reputation query",
            1,
            1,
            0.01e18,
            0.1e18,
            1e18,
            0.5e18,
            5e18,
            5000,           // minReputation = 50.00
            "governance",
            builder,
            "eip155:10143",
            ""
        );

        vm.prank(protocolAPI);
        vm.expectRevert(SKCEngine.AgentNotEligible.selector);
        engine.submitReport(queryId, 0.7e18, agent1, 0.1e18, "eip155:10143");
    }

    // ========== Admin Tests ==========

    function test_setProtocolAPI() public {
        address newAPI = makeAddr("newAPI");
        engine.setProtocolAPI(newAPI);
        assertEq(engine.protocolAPI(), newAPI);
    }

    function test_setAPIGated() public {
        engine.setAPIGated(false);
        assertFalse(engine.apiGated());
    }

    // ========== Chain Mismatch Tests ==========

    function test_submitReport_revert_chainMismatch() public {
        uint256 queryId = _createQueryNoRandomStop(); // queryChain = "eip155:10143"

        vm.prank(protocolAPI);
        vm.expectRevert(SKCEngine.ChainMismatch.selector);
        engine.submitReport(queryId, 0.7e18, agent1, 0.1e18, "eip155:84532"); // Base != Monad
    }

    // ========== Query Active State Tests ==========

    function test_isQueryActive() public {
        uint256 queryId = _createQueryNoRandomStop();
        assertTrue(engine.isQueryActive(queryId));

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.7e18, agent1, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.forceResolve(queryId);
        assertFalse(engine.isQueryActive(queryId));
    }

    function test_submitReport_revert_resolvedQuery() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.7e18, agent1, 0.1e18, "eip155:10143");

        vm.prank(protocolAPI);
        engine.forceResolve(queryId);

        vm.prank(protocolAPI);
        vm.expectRevert(SKCEngine.QueryNotActive.selector);
        engine.submitReport(queryId, 0.8e18, agent2, 0.1e18, "eip155:10143");
    }

    // ========== Source Chain Tracking ==========

    function test_sourceChain_tracked() public {
        uint256 queryId = _createQueryNoRandomStop();

        vm.prank(protocolAPI);
        engine.submitReport(queryId, 0.7e18, agent1, 0.1e18, "eip155:10143");

        (, , , , , , string memory sourceChain,) = engine.getReport(queryId, 0);
        assertEq(sourceChain, "eip155:10143");
    }
}
