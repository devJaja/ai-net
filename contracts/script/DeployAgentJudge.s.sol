// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {TaskCoordinator} from "../src/TaskCoordinator.sol";
import {AgentJudge} from "../src/AgentJudge.sol";

contract DeployAgentJudge is Script {
    function run() external {
        // Existing deployed addresses
        address registry    = 0x052f70C756B079F7eADB8b72C7Ea1579215090C8;
        address coordinator = 0x2097796487bea53b00D1e6e2D3327D30bEf08E3E;

        vm.startBroadcast();

        AgentJudge judge = new AgentJudge(payable(coordinator), registry);

        console.log("AgentJudge:       ", address(judge));
        console.log("Coordinator:      ", coordinator);
        console.log("Registry:         ", registry);

        vm.stopBroadcast();
    }
}
