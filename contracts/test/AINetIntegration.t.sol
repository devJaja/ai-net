// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/GuildPermissions.sol";
import "../src/AgentRegistry.sol";
import "../src/TaskCoordinator.sol";

/**
 * @title AINetIntegrationTest
 * @notice End-to-end test: create task → hire agents → pay via ERC-7710 → complete
 */
contract AINetIntegrationTest is Test {
    GuildPermissions public guildPerms;
    AgentRegistry   public registry;
    TaskCoordinator public coordinator;

    address deployer = address(this);
    address user     = makeAddr("user");
    address agent1   = makeAddr("agent1");
    address agent2   = makeAddr("agent2");

    function setUp() public {
        guildPerms   = new GuildPermissions();
        registry     = new AgentRegistry();
        coordinator  = new TaskCoordinator(
            address(guildPerms),
            address(registry)
        );

        // Register agents
        registry.register("https://research.venice.ai", "research", 0.01 ether);
        vm.prank(agent1);
        registry.register("https://risk.venice.ai", "risk", 0.01 ether);

        vm.prank(agent2);
        registry.register("https://coding.venice.ai", "coding", 0.02 ether);
    }

    function test_fullTaskLifecycle() public {
        // 1. Create task with 0.05 ETH budget
        vm.deal(user, 0.1 ether);
        vm.prank(user);
        uint256 taskId = coordinator.createTask{value: 0.05 ether}("Market research report", 7 days);

        // 2. Coordinator hires agents
        coordinator.hireAgent(taskId, agent1);
        coordinator.hireAgent(taskId, agent2);

        // 3. Complete task — unspent budget refunded
        uint256 balBefore = user.balance;
        coordinator.completeTask(taskId);
        uint256 balAfter = user.balance;

        // agent1 got 0.01, agent2 got 0.02 → 0.03 spent, 0.02 refunded
        assertEq(agent1.balance, 0.01 ether);
        assertEq(agent2.balance, 0.02 ether);
        assertEq(balAfter - balBefore, 0.02 ether); // refund
    }

    function test_cannotHirePaidAgent() public {
        vm.deal(user, 0.1 ether);
        vm.prank(user);
        uint256 taskId = coordinator.createTask{value: 0.05 ether}("Test task", 1 days);

        coordinator.hireAgent(taskId, agent1);

        // Second hire of same agent should revert
        vm.expectRevert();
        coordinator.hireAgent(taskId, agent1);
    }

    function test_cannotHireAfterCompletion() public {
        vm.deal(user, 0.1 ether);
        vm.prank(user);
        uint256 taskId = coordinator.createTask{value: 0.05 ether}("Test task", 1 days);

        coordinator.completeTask(taskId);

        vm.expectRevert();
        coordinator.hireAgent(taskId, agent1);
    }
}
