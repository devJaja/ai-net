// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

/// @notice Registers agents on the AgentRegistry.
///         Each agent must come from a unique wallet (one address = one capability).
///         Use the TypeScript registerAgents.ts script for HD-derived wallets,
///         or run this script with multiple wallets via foundry multisig.
contract RegisterAgents is Script {
    AgentRegistry constant REGISTRY = AgentRegistry(0x052f70C756B079F7eADB8b72C7Ea1579215090C8);

    /// @param capability  Agent capability string (e.g. "research")
    /// @param priceEth    Price per task in ETH (e.g. "0.01")
    function runSingle(string calldata capability, uint256 priceEth) external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(privateKey);
        REGISTRY.register("https://api.venice.ai/api/v1", capability, priceEth);
        vm.stopBroadcast();
        console.log("Registered agent:");
        console.log("  Capability:", capability);
        console.log("  Price (wei):", priceEth);
    }
}
