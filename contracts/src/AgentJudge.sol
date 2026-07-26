// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {TaskCoordinator} from "./TaskCoordinator.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @title AgentJudge — on-chain task evaluation (Track 3) and feedback (Track 4)
/// @notice Anyone can evaluate a completed task; agents accumulate on-chain reputation.
///         Feedback is permanently recorded and aggregated into agent scores.
contract AgentJudge {

    // ── State ─────────────────────────────────────────────────────────────────

    TaskCoordinator public immutable coordinator;
    AgentRegistry   public immutable registry;

    // ── Track 3: Judge Evaluations ────────────────────────────────────────────

    struct Evaluation {
        uint256 taskId;
        address evaluator;       // who judged
        address agent;           // agent being evaluated
        uint8   score;           // 1–10
        string  verdict;         // "PASS", "FAIL", "NEEDS_REVISION"
        string  rationale;       // explanation
        uint256 timestamp;
    }

    uint256 public evaluationCount;
    mapping(uint256 => Evaluation) public evaluations;           // evalId → Evaluation
    mapping(uint256 => uint256[]) public taskEvaluations;       // taskId → evalIds
    mapping(address => uint256[]) public agentEvaluations;      // agent → evalIds

    // ── Track 4: Feedback ─────────────────────────────────────────────────────

    struct Feedback {
        uint256 taskId;
        address agent;
        address author;
        string  content;
        uint8   rating;          // 1–5 stars
        uint256 timestamp;
    }

    uint256 public feedbackCount;
    mapping(uint256 => Feedback) public feedbackItems;           // feedbackId → Feedback
    mapping(uint256 => uint256[]) public taskFeedback;           // taskId → feedbackIds
    mapping(address => uint256[]) public agentFeedback;          // agent → feedbackIds

    // ── Agent Reputation (aggregated) ─────────────────────────────────────────

    struct Reputation {
        uint256 totalScore;      // sum of all evaluation scores
        uint256 evalCount;       // number of evaluations
        uint256 totalRating;     // sum of all feedback ratings
        uint256 feedbackCount;   // number of feedbacks
        uint256 passCount;       // verdicts = "PASS"
        uint256 failCount;       // verdicts = "FAIL"
    }

    mapping(address => Reputation) public reputation;

    // ── Events ────────────────────────────────────────────────────────────────

    event TaskEvaluated(
        uint256 indexed evalId,
        uint256 indexed taskId,
        address indexed agent,
        address evaluator,
        uint8 score,
        string verdict
    );

    event FeedbackSubmitted(
        uint256 indexed feedbackId,
        uint256 indexed taskId,
        address indexed agent,
        address author,
        uint8 rating
    );

    event ReputationUpdated(address indexed agent, uint256 totalScore, uint256 evalCount);

    // ── Errors ────────────────────────────────────────────────────────────────

    error TaskNotCompleted();
    error InvalidScore();
    error InvalidRating();
    error EmptyVerdict();
    error EmptyFeedback();
    error DuplicateEvaluation();
    error NotTaskParticipant();

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address payable _coordinator, address _registry) {
        coordinator = TaskCoordinator(_coordinator);
        registry    = AgentRegistry(_registry);
    }

    // ── Track 3: Judge Functions ──────────────────────────────────────────────

    /// @notice Evaluate an agent's performance on a completed task.
    ///         Callable by anyone (decentralized judging).
    /// @param taskId  The completed task to evaluate
    /// @param agent   The agent being evaluated
    /// @param score   Quality score 1–10
    /// @param verdict "PASS", "FAIL", or "NEEDS_REVISION"
    /// @param rationale Explanation of the verdict
    function evaluateTask(
        uint256 taskId,
        address agent,
        uint8   score,
        string calldata verdict,
        string calldata rationale
    ) external returns (uint256 evalId) {
        if (score < 1 || score > 10) revert InvalidScore();
        if (bytes(verdict).length == 0) revert EmptyVerdict();

        // Verify the task exists and is completed
        (, , , , bool completed) = coordinator.tasks(taskId);
        if (!completed) revert TaskNotCompleted();

        // Verify the agent was assigned to this task
        address[] memory assigned = coordinator.getAssignedAgents(taskId);
        bool found = false;
        for (uint256 i; i < assigned.length; i++) {
            if (assigned[i] == agent) { found = true; break; }
        }
        if (!found) revert NotTaskParticipant();

        evalId = evaluationCount++;
        Evaluation storage e = evaluations[evalId];
        e.taskId     = taskId;
        e.evaluator  = msg.sender;
        e.agent      = agent;
        e.score      = score;
        e.verdict    = verdict;
        e.rationale  = rationale;
        e.timestamp  = block.timestamp;

        taskEvaluations[taskId].push(evalId);
        agentEvaluations[agent].push(evalId);

        // Update reputation
        Reputation storage r = reputation[agent];
        r.totalScore += score;
        r.evalCount  += 1;
        if (_strEq(verdict, "PASS"))  r.passCount += 1;
        if (_strEq(verdict, "FAIL"))  r.failCount += 1;

        emit TaskEvaluated(evalId, taskId, agent, msg.sender, score, verdict);
        emit ReputationUpdated(agent, r.totalScore, r.evalCount);
    }

    // ── Track 4: Feedback Functions ───────────────────────────────────────────

    /// @notice Submit feedback for an agent's work on a task.
    ///         Permanent, on-chain record that feeds into agent reputation.
    /// @param taskId  The task this feedback relates to
    /// @param agent   The agent being rated
    /// @param content Feedback text
    /// @param rating  1–5 star rating
    function submitFeedback(
        uint256 taskId,
        address agent,
        string calldata content,
        uint8   rating
    ) external returns (uint256 fbId) {
        if (bytes(content).length == 0) revert EmptyFeedback();
        if (rating < 1 || rating > 5)   revert InvalidRating();

        fbId = feedbackCount++;
        Feedback storage fb = feedbackItems[fbId];
        fb.taskId   = taskId;
        fb.agent    = agent;
        fb.author   = msg.sender;
        fb.content  = content;
        fb.rating   = rating;
        fb.timestamp = block.timestamp;

        taskFeedback[taskId].push(fbId);
        agentFeedback[agent].push(fbId);

        // Update reputation
        Reputation storage r = reputation[agent];
        r.totalRating += rating;
        r.feedbackCount += 1;

        emit FeedbackSubmitted(fbId, taskId, agent, msg.sender, rating);
        emit ReputationUpdated(agent, r.totalScore, r.evalCount);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    /// @notice Get an agent's average evaluation score (0–10 scale, 0 if none)
    function avgScore(address agent) external view returns (uint256) {
        Reputation storage r = reputation[agent];
        if (r.evalCount == 0) return 0;
        return r.totalScore / r.evalCount;
    }

    /// @notice Get an agent's average feedback rating (0–5 scale, 0 if none)
    function avgRating(address agent) external view returns (uint256) {
        Reputation storage r = reputation[agent];
        if (r.feedbackCount == 0) return 0;
        return r.totalRating / r.feedbackCount;
    }

    /// @notice Get all evaluations for a task
    function getTaskEvaluations(uint256 taskId) external view returns (Evaluation[] memory) {
        uint256[] storage ids = taskEvaluations[taskId];
        Evaluation[] memory result = new Evaluation[](ids.length);
        for (uint256 i; i < ids.length; i++) {
            result[i] = evaluations[ids[i]];
        }
        return result;
    }

    /// @notice Get all feedback for a task
    function getTaskFeedback(uint256 taskId) external view returns (Feedback[] memory) {
        uint256[] memory ids = taskFeedback[taskId];
        Feedback[] memory result = new Feedback[](ids.length);
        for (uint256 i; i < ids.length; i++) {
            result[i] = feedbackItems[ids[i]];
        }
        return result;
    }

    /// @notice Get all evaluations for an agent
    function getAgentEvaluations(address agent) external view returns (Evaluation[] memory) {
        uint256[] storage ids = agentEvaluations[agent];
        Evaluation[] memory result = new Evaluation[](ids.length);
        for (uint256 i; i < ids.length; i++) {
            result[i] = evaluations[ids[i]];
        }
        return result;
    }

    /// @notice Get all feedback for an agent
    function getAgentFeedback(address agent) external view returns (Feedback[] memory) {
        uint256[] memory ids = agentFeedback[agent];
        Feedback[] memory result = new Feedback[](ids.length);
        for (uint256 i; i < ids.length; i++) {
            result[i] = feedbackItems[ids[i]];
        }
        return result;
    }

    /// @notice Full reputation summary for an agent
    function getReputation(address agent) external view returns (
        uint256 _avgScore,
        uint256 _avgRating,
        uint256 _evalCount,
        uint256 _feedbackCount,
        uint256 _passCount,
        uint256 _failCount
    ) {
        Reputation storage r = reputation[agent];
        _evalCount     = r.evalCount;
        _feedbackCount = r.feedbackCount;
        _passCount     = r.passCount;
        _failCount     = r.failCount;
        _avgScore      = r.evalCount > 0 ? r.totalScore / r.evalCount : 0;
        _avgRating     = r.feedbackCount > 0 ? r.totalRating / r.feedbackCount : 0;
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _strEq(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
