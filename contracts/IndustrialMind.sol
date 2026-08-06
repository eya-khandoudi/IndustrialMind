// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IndustrialMind Safety Contract
/// @notice Immutable on-chain log for industrial safety events
/// @dev Deployed on Sepolia Testnet for ChainHack 2026
contract IndustrialMind {

    address public owner;
    uint256 public deployedAt;

    // ─── Data Structures ────────────────────────────────────────

    struct SafetyAlert {
        string  zoneId;
        string  zoneName;
        string  severity;      // "critical" | "high" | "medium"
        string  metric;        // "temp" | "gas" | "vibration" | "pressure"
        uint256 metricValue;   // scaled x100 (e.g. 95.50°C → 9550)
        string  aiAnalysis;    // Groq LLM generated analysis
        string  actionTaken;   // automated response
        uint256 timestamp;
        address reporter;
    }

    struct WorkerReport {
        bytes32 zkProofHash;   // simulated ZK commitment
        string  category;
        string  urgency;
        uint256 timestamp;
    }

    struct ComplianceRecord {
        string  zoneId;
        uint256 score;         // 0–10000 (scaled x100)
        uint256 timestamp;
    }

    // ─── Storage ─────────────────────────────────────────────────

    SafetyAlert[]     public alerts;
    WorkerReport[]    public reports;
    ComplianceRecord[] public complianceLog;

    // ─── Events ──────────────────────────────────────────────────

    event AlertLogged(
        uint256 indexed id,
        string  zoneId,
        string  severity,
        string  metric,
        uint256 timestamp
    );

    event ReportLogged(
        uint256 indexed id,
        bytes32 zkHash,
        string  category,
        uint256 timestamp
    );

    event ComplianceUpdated(
        uint256 indexed id,
        string  zoneId,
        uint256 score,
        uint256 timestamp
    );

    // ─── Constructor ──────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        deployedAt = block.timestamp;
    }

    // ─── Write Functions ──────────────────────────────────────────

    /// @notice Log a safety alert detected by the AI engine
    function logAlert(
        string calldata zoneId,
        string calldata zoneName,
        string calldata severity,
        string calldata metric,
        uint256 metricValue,
        string calldata aiAnalysis,
        string calldata actionTaken
    ) external returns (uint256 id) {
        id = alerts.length;
        alerts.push();
        SafetyAlert storage newAlert = alerts[id];
        newAlert.zoneId = zoneId;
        newAlert.zoneName = zoneName;
        newAlert.severity = severity;
        newAlert.metric = metric;
        newAlert.metricValue = metricValue;
        newAlert.aiAnalysis = aiAnalysis;
        newAlert.actionTaken = actionTaken;
        newAlert.timestamp = block.timestamp;
        newAlert.reporter = msg.sender;
        
        emit AlertLogged(id, zoneId, severity, metric, block.timestamp);
    }

    /// @notice Log an anonymous worker safety report (ZK-protected)
    function logWorkerReport(
        bytes32 zkProofHash,
        string calldata category,
        string calldata urgency
    ) external returns (uint256 id) {
        id = reports.length;
        reports.push(WorkerReport({
            zkProofHash: zkProofHash,
            category:    category,
            urgency:     urgency,
            timestamp:   block.timestamp
        }));
        emit ReportLogged(id, zkProofHash, category, block.timestamp);
    }

    /// @notice Update compliance score for a zone
    function updateCompliance(
        string calldata zoneId,
        uint256 score
    ) external returns (uint256 id) {
        id = complianceLog.length;
        complianceLog.push(ComplianceRecord({
            zoneId:    zoneId,
            score:     score,
            timestamp: block.timestamp
        }));
        emit ComplianceUpdated(id, zoneId, score, block.timestamp);
    }

    // ─── View Functions ───────────────────────────────────────────

    function getAlertCount()     external view returns (uint256) { return alerts.length; }
    function getReportCount()    external view returns (uint256) { return reports.length; }
    function getComplianceCount() external view returns (uint256) { return complianceLog.length; }

    function getLatestAlert() external view returns (SafetyAlert memory) {
        require(alerts.length > 0, "No alerts yet");
        return alerts[alerts.length - 1];
    }

    function getLatestCompliance() external view returns (ComplianceRecord memory) {
        require(complianceLog.length > 0, "No records yet");
        return complianceLog[complianceLog.length - 1];
    }
}
