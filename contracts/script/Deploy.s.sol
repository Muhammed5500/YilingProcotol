// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {ReputationManager} from "../src/ReputationManager.sol";
import {SKCEngine} from "../src/SKCEngine.sol";
import {QueryFactory} from "../src/QueryFactory.sol";

contract DeployScript is Script {
    // ERC-8004 on Monad Testnet (public infrastructure addresses)
    address constant ERC8004_IDENTITY = 0x8004A818BFB912233c491871b3d84c89A494BD9e;
    address constant ERC8004_REPUTATION = 0x8004B663056A597Dffe9eCcC1965A193B7388713;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        // Role addresses are loaded from env so they never get committed.
        // Each role should be its own wallet (separate from the deployer).
        address protocolApi = vm.envAddress("PROTOCOL_API_ADDRESS");
        address treasury    = vm.envAddress("TREASURY_ADDRESS");

        console.log("Deployer (Owner):", deployer);
        console.log("ProtocolAPI:", protocolApi);
        console.log("Treasury:", treasury);
        console.log("ERC-8004 Identity:", ERC8004_IDENTITY);
        console.log("ERC-8004 Reputation:", ERC8004_REPUTATION);

        vm.startBroadcast(deployerKey);

        // 1. Deploy AgentRegistry
        AgentRegistry agentRegistry = new AgentRegistry(ERC8004_IDENTITY);
        console.log("AgentRegistry:", address(agentRegistry));

        // 2. Deploy ReputationManager
        ReputationManager reputationManager = new ReputationManager(ERC8004_REPUTATION);
        console.log("ReputationManager:", address(reputationManager));

        // 3. Deploy SKCEngine — protocolAPI is separate from owner
        SKCEngine skcEngine = new SKCEngine(
            address(agentRegistry),
            address(reputationManager),
            protocolApi
        );
        console.log("SKCEngine:", address(skcEngine));

        // 4. Deploy QueryFactory — protocolAPI is separate from owner
        QueryFactory queryFactory = new QueryFactory(
            address(skcEngine),
            protocolApi
        );
        console.log("QueryFactory:", address(queryFactory));

        // 5. Authorize SKCEngine to write reputation
        reputationManager.authorizeCaller(address(skcEngine));
        console.log("SKCEngine authorized to write reputation");

        vm.stopBroadcast();

        // Print summary
        console.log("");
        console.log("=== DEPLOYMENT SUMMARY ===");
        console.log("OWNER=", deployer);
        console.log("PROTOCOL_API=", protocolApi);
        console.log("TREASURY=", treasury);
        console.log("SKC_ENGINE_ADDRESS=", address(skcEngine));
        console.log("QUERY_FACTORY_ADDRESS=", address(queryFactory));
        console.log("AGENT_REGISTRY_ADDRESS=", address(agentRegistry));
        console.log("REPUTATION_MANAGER_ADDRESS=", address(reputationManager));
    }
}
