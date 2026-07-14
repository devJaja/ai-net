// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/GuildPermissions.sol";
import "../src/AgentRegistry.sol";
import "../src/TaskCoordinator.sol";
import "../src/AgentJudge.sol";

/**
 * @title AgentJudgeTest
 * @notice Comprehensive tests for Track 3 (Judge) and Track 4 (Feedback)
 */
contract AgentJudgeTest is Test {
    GuildPermissions public guildPerms;
    AgentRegistry    public registry;
    TaskCoordinator  public coordinator;
    AgentJudge       public judge;

    address deployer = address(this);
    address user     = makeAddr("user");
    address agent1   = makeAddr("agent1");
    address agent2   = makeAddr("agent2");
    address evaluator = makeAddr("evaluator");
    address reviewer  = makeAddr("reviewer");

    function setUp() public {
        guildPerms   = new GuildPermissions();
        registry     = new AgentRegistry();
        coordinator  = new TaskCoordinator(
            address(registry), address(guildPerms), address(this)
        );
        judge = new AgentJudge(payable(address(coordinator)), address(registry));

        // Register agents
        registry.register("https://research.venice.ai", "research", 0.01 ether);
        vm.prank(agent1);
        registry.register("https://risk.venice.ai", "risk", 0.01 ether);
        vm.prank(agent2);
        registry.register("https://coding.venice.ai", "coding", 0.02 ether);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    function _createAndCompleteTask() internal returns (uint256 taskId) {
        vm.deal(user, 0.1 ether);
        vm.prank(user);
        taskId = coordinator.createTask{value: 0.05 ether}("Market research report", 7 days);
        coordinator.hireAgent(taskId, agent1);
        coordinator.hireAgent(taskId, agent2);
        coordinator.completeTask(taskId);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TRACK 3: Judge Agent Tests
    // ══════════════════════════════════════════════════════════════════════════

    function test_evaluateTask_success() public {
        uint256 taskId = _createAndCompleteTask();

        vm.prank(evaluator);
        uint256 evalId = judge.evaluateTask(taskId, agent1, 8, "PASS", "Excellent research quality");

        assertEq(evalId, 0);
        assertEq(judge.evaluationCount(), 1);

        (uint256 tId, address ev, address ag, uint8 score, , , ) = judge.evaluations(0);
        assertEq(tId, taskId);
        assertEq(ev, evaluator);
        assertEq(ag, agent1);
        assertEq(score, 8);
    }

    function test_evaluateTask_updatesReputation() public {
        uint256 taskId = _createAndCompleteTask();

        vm.prank(evaluator);
        judge.evaluateTask(taskId, agent1, 9, "PASS", "Outstanding");

        (uint256 avgS, , uint256 evalCnt, , uint256 passCnt, ) = judge.getReputation(agent1);
        assertEq(avgS, 9);
        assertEq(evalCnt, 1);
        assertEq(passCnt, 1);
    }

    function test_evaluateTask_multipleEvaluators() public {
        uint256 taskId = _createAndCompleteTask();

        vm.prank(evaluator);
        judge.evaluateTask(taskId, agent1, 8, "PASS", "Good work");

        vm.prank(reviewer);
        judge.evaluateTask(taskId, agent1, 6, "NEEDS_REVISION", "Could be better");

        (uint256 avgS, , uint256 evalCnt, , uint256 passCnt, uint256 failCnt) = judge.getReputation(agent1);
        assertEq(avgS, 7);  // (8+6)/2
        assertEq(evalCnt, 2);
        assertEq(passCnt, 1);
        assertEq(failCnt, 0); // NEEDS_REVISION is not FAIL
    }

    function test_evaluateTask_failVerdict() public {
        uint256 taskId = _createAndCompleteTask();

        vm.prank(evaluator);
        judge.evaluateTask(taskId, agent2, 3, "FAIL", "Did not meet requirements");

        (, , , , , uint256 failCnt) = judge.getReputation(agent2);
        assertEq(failCnt, 1);
    }

    function test_evaluateTask_revertsOnIncompleteTask() public {
        vm.deal(user, 0.1 ether);
        vm.prank(user);
        uint256 taskId = coordinator.createTask{value: 0.05 ether}("Test", 7 days);

        vm.expectRevert(AgentJudge.TaskNotCompleted.selector);
        judge.evaluateTask(taskId, agent1, 5, "PASS", "ok");
    }

    function test_evaluateTask_revertsOnInvalidScore() public {
        uint256 taskId = _createAndCompleteTask();

        vm.expectRevert(AgentJudge.InvalidScore.selector);
        judge.evaluateTask(taskId, agent1, 0, "PASS", "zero");

        vm.expectRevert(AgentJudge.InvalidScore.selector);
        judge.evaluateTask(taskId, agent1, 11, "PASS", "eleven");
    }

    function test_evaluateTask_revertsOnEmptyVerdict() public {
        uint256 taskId = _createAndCompleteTask();

        vm.expectRevert(AgentJudge.EmptyVerdict.selector);
        judge.evaluateTask(taskId, agent1, 5, "", "no verdict");
    }

    function test_evaluateTask_revertsOnUnassignedAgent() public {
        uint256 taskId = _createAndCompleteTask();
        address stranger = makeAddr("stranger");

        vm.expectRevert(AgentJudge.NotTaskParticipant.selector);
        judge.evaluateTask(taskId, stranger, 5, "PASS", "not assigned");
    }

    function test_getTaskEvaluations() public {
        uint256 taskId = _createAndCompleteTask();

        vm.prank(evaluator);
        judge.evaluateTask(taskId, agent1, 8, "PASS", "good");
        vm.prank(reviewer);
        judge.evaluateTask(taskId, agent2, 7, "PASS", "decent");

        AgentJudge.Evaluation[] memory evals = judge.getTaskEvaluations(taskId);
        assertEq(evals.length, 2);
        assertEq(evals[0].agent, agent1);
        assertEq(evals[1].agent, agent2);
    }

    function test_getAgentEvaluations() public {
        uint256 taskId = _createAndCompleteTask();

        vm.prank(evaluator);
        judge.evaluateTask(taskId, agent1, 9, "PASS", "excellent");

        AgentJudge.Evaluation[] memory evals = judge.getAgentEvaluations(agent1);
        assertEq(evals.length, 1);
        assertEq(evals[0].score, 9);
    }

    function test_avgScore_noEvaluations() public {
        assertEq(judge.avgScore(agent1), 0);
    }

    function test_avgScore_withEvaluations() public {
        uint256 taskId = _createAndCompleteTask();

        vm.prank(evaluator);
        judge.evaluateTask(taskId, agent1, 6, "PASS", "ok");
        vm.prank(reviewer);
        judge.evaluateTask(taskId, agent1, 8, "PASS", "good");

        assertEq(judge.avgScore(agent1), 7); // (6+8)/2
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TRACK 4: Feedback Tests
    // ══════════════════════════════════════════════════════════════════════════

    function test_submitFeedback_success() public {
        uint256 taskId = _createAndCompleteTask();

        vm.prank(reviewer);
        uint256 fbId = judge.submitFeedback(taskId, agent1, "Great research on DeFi protocols", 5);

        assertEq(fbId, 0);
        assertEq(judge.feedbackCount(), 1);

        (uint256 tId, address ag, address author, , uint8 rating, ) = judge.feedbackItems(0);
        assertEq(tId, taskId);
        assertEq(ag, agent1);
        assertEq(author, reviewer);
        assertEq(rating, 5);
    }

    function test_submitFeedback_updatesReputation() public {
        uint256 taskId = _createAndCompleteTask();

        vm.prank(reviewer);
        judge.submitFeedback(taskId, agent1, "Excellent", 4);

        (, uint256 avgR, , uint256 fbCnt, , ) = judge.getReputation(agent1);
        assertEq(avgR, 4);
        assertEq(fbCnt, 1);
    }

    function test_submitFeedback_multipleFeedbacks() public {
        uint256 taskId = _createAndCompleteTask();

        vm.prank(evaluator);
        judge.submitFeedback(taskId, agent1, "Very thorough", 5);
        vm.prank(reviewer);
        judge.submitFeedback(taskId, agent1, "Good but could be faster", 3);

        (, uint256 avgR, , uint256 fbCnt, , ) = judge.getReputation(agent1);
        assertEq(avgR, 4);  // (5+3)/2
        assertEq(fbCnt, 2);
    }

    function test_submitFeedback_revertsOnEmptyContent() public {
        uint256 taskId = _createAndCompleteTask();

        vm.expectRevert(AgentJudge.EmptyFeedback.selector);
        judge.submitFeedback(taskId, agent1, "", 5);
    }

    function test_submitFeedback_revertsOnInvalidRating() public {
        uint256 taskId = _createAndCompleteTask();

        vm.expectRevert(AgentJudge.InvalidRating.selector);
        judge.submitFeedback(taskId, agent1, "good", 0);

        vm.expectRevert(AgentJudge.InvalidRating.selector);
        judge.submitFeedback(taskId, agent1, "good", 6);
    }

    function test_getTaskFeedback() public {
        uint256 taskId = _createAndCompleteTask();

        vm.prank(evaluator);
        judge.submitFeedback(taskId, agent1, "Excellent research", 5);
        vm.prank(reviewer);
        judge.submitFeedback(taskId, agent2, "Solid coding", 4);

        AgentJudge.Feedback[] memory fbs = judge.getTaskFeedback(taskId);
        assertEq(fbs.length, 2);
        assertEq(fbs[0].agent, agent1);
        assertEq(fbs[1].agent, agent2);
    }

    function test_getAgentFeedback() public {
        uint256 taskId = _createAndCompleteTask();

        vm.prank(reviewer);
        judge.submitFeedback(taskId, agent1, "Great work", 5);

        AgentJudge.Feedback[] memory fbs = judge.getAgentFeedback(agent1);
        assertEq(fbs.length, 1);
        assertEq(fbs[0].rating, 5);
    }

    function test_avgRating_noFeedback() public {
        assertEq(judge.avgRating(agent1), 0);
    }

    function test_avgRating_withFeedback() public {
        uint256 taskId = _createAndCompleteTask();

        vm.prank(evaluator);
        judge.submitFeedback(taskId, agent1, "ok", 3);
        vm.prank(reviewer);
        judge.submitFeedback(taskId, agent1, "good", 5);

        assertEq(judge.avgRating(agent1), 4); // (3+5)/2
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Combined Judge + Feedback
    // ══════════════════════════════════════════════════════════════════════════

    function test_fullJudgeAndFeedbackLifecycle() public {
        uint256 taskId = _createAndCompleteTask();

        // Judge evaluates agent1
        vm.prank(evaluator);
        judge.evaluateTask(taskId, agent1, 9, "PASS", "Outstanding research");

        // Reviewer gives feedback on agent1
        vm.prank(reviewer);
        judge.submitFeedback(taskId, agent1, "Very thorough analysis", 5);

        // Judge evaluates agent2
        vm.prank(evaluator);
        judge.evaluateTask(taskId, agent2, 7, "PASS", "Good coding");

        // Reviewer gives feedback on agent2
        vm.prank(reviewer);
        judge.submitFeedback(taskId, agent2, "Solid but verbose", 4);

        // Verify agent1 reputation
        (uint256 s1, uint256 r1, uint256 e1, uint256 f1, uint256 p1, ) = judge.getReputation(agent1);
        assertEq(s1, 9);   // avg score
        assertEq(r1, 5);   // avg rating
        assertEq(e1, 1);   // eval count
        assertEq(f1, 1);   // feedback count
        assertEq(p1, 1);   // pass count

        // Verify agent2 reputation
        (uint256 s2, uint256 r2, uint256 e2, uint256 f2, , ) = judge.getReputation(agent2);
        assertEq(s2, 7);
        assertEq(r2, 4);
        assertEq(e2, 1);
        assertEq(f2, 1);
    }

    function test_eventsEmitted() public {
        uint256 taskId = _createAndCompleteTask();

        vm.prank(evaluator);
        vm.expectEmit(true, true, true, true);
        emit AgentJudge.TaskEvaluated(0, taskId, agent1, evaluator, 8, "PASS");
        judge.evaluateTask(taskId, agent1, 8, "PASS", "good");

        vm.prank(reviewer);
        vm.expectEmit(true, true, true, true);
        emit AgentJudge.FeedbackSubmitted(0, taskId, agent1, reviewer, 5);
        judge.submitFeedback(taskId, agent1, "excellent", 5);
    }

    function test_taskFeedbackAndEvaluationsAreIndependent() public {
        uint256 taskId = _createAndCompleteTask();

        vm.prank(evaluator);
        judge.evaluateTask(taskId, agent1, 8, "PASS", "good");
        vm.prank(reviewer);
        judge.submitFeedback(taskId, agent1, "nice", 4);

        // Evaluations and feedback are separate
        AgentJudge.Evaluation[] memory evals = judge.getTaskEvaluations(taskId);
        AgentJudge.Feedback[] memory fbs = judge.getTaskFeedback(taskId);
        assertEq(evals.length, 1);
        assertEq(fbs.length, 1);
    }
}
