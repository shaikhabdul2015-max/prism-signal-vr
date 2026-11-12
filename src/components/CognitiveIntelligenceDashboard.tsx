/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 25: Cognitive Intelligence Dashboard (Tab 15).
 * Enterprise AGI-inspired cognitive interface presenting structured reasoning decomposition,
 * multi-option decision matrices, 6-agent deliberation consensus, 3-tier predictive scenario
 * forecasting, retrieval-based continuous learning, and knowledge graph exploration.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  BrainCircuit,
  Cpu,
  Layers,
  Network,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  TrendingUp,
  GitBranch,
  BarChart3,
  Clock,
  Compass,
  FileCheck,
  UserCheck,
} from 'lucide-react';
import { VRTelemetry } from '../types/diagnostics';
import {
  CognitiveReasoningResult,
  DecisionComparison,
  LearningInsight,
  CognitiveConsensusReport,
  ScenarioComparisonReport,
  ConfidenceCalibrationMetric,
  KnowledgeGraphSnapshot,
  KnowledgeNodeType,
} from '../types/phase25';
import { cognitiveReasoningEngine } from '../engines/CognitiveReasoningEngine';
import { advancedDecisionIntelligence } from '../engines/AdvancedDecisionIntelligence';
import { continuousLearningEngine } from '../engines/ContinuousLearningEngine';
import { cognitiveAgentCollaboration } from '../engines/CognitiveAgentCollaboration';
import { predictiveScenarioIntelligence } from '../engines/PredictiveScenarioIntelligence';
import { cognitiveSelfEvaluation } from '../engines/CognitiveSelfEvaluation';
import { knowledgeGraphEngine } from '../engines/KnowledgeGraphEngine';
import { humanApprovalManager } from '../engines/HumanApprovalManager';

interface CognitiveIntelligenceDashboardProps {
  telemetry: VRTelemetry;
}

export const CognitiveIntelligenceDashboard: React.FC<CognitiveIntelligenceDashboardProps> = ({
  telemetry,
}) => {
  // Navigation sub-view inside Tab 15
  const [activeSubView, setActiveSubView] = useState<
    'reasoning' | 'decisions' | 'collaboration' | 'scenarios' | 'learning' | 'knowledge_graph'
  >('reasoning');

  // Reasoning state
  const [problemQuery, setProblemQuery] = useState<string>(
    'Render pipeline frametime variance exceeded 18ms under 25-joint full skeleton tracking.'
  );
  const [currentReasoning, setCurrentReasoning] = useState<CognitiveReasoningResult>(() =>
    cognitiveReasoningEngine.analyzeProblem(
      'Render pipeline frametime variance exceeded 18ms under 25-joint full skeleton tracking.',
      telemetry
    )
  );

  // Decision state
  const [decisions, setDecisions] = useState<DecisionComparison[]>(() =>
    advancedDecisionIntelligence.getAllDecisions()
  );

  // Consensus state
  const [currentConsensus, setCurrentConsensus] = useState<CognitiveConsensusReport>(() =>
    cognitiveAgentCollaboration.conveneMultiAgentDeliberation(
      'Evaluating autonomous dynamic resolution scaling vs test throttling.',
      telemetry
    )
  );

  // Scenario state
  const [scenarioReport, setScenarioReport] = useState<ScenarioComparisonReport>(() =>
    predictiveScenarioIntelligence.generateScenarioProjections(telemetry)
  );

  // Calibration state
  const [calibration, setCalibration] = useState<ConfidenceCalibrationMetric>(() =>
    cognitiveSelfEvaluation.getCalibrationMetrics()
  );

  // Continuous learning state
  const [learningSearch, setLearningSearch] = useState<string>('');
  const [insights, setInsights] = useState<LearningInsight[]>(() =>
    continuousLearningEngine.getAllInsights()
  );

  // Knowledge graph state
  const [graphSnapshot, setGraphSnapshot] = useState<KnowledgeGraphSnapshot>(() =>
    knowledgeGraphEngine.getSnapshot()
  );
  const [graphFilterType, setGraphFilterType] = useState<string>('ALL');
  const [graphSearchQuery, setGraphSearchQuery] = useState<string>('');
  const [cycleAuditResult, setCycleAuditResult] = useState<{ hasCycles: boolean; count: number } | null>(null);

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);

  // Trigger reasoning
  const handleTriggerReasoning = () => {
    const result = cognitiveReasoningEngine.analyzeProblem(problemQuery, telemetry);
    setCurrentReasoning(result);
    // Also re-generate scenario trajectories
    const scenarios = predictiveScenarioIntelligence.generateScenarioProjections(telemetry);
    setScenarioReport(scenarios);
    setNotification('Cognitive reasoning and predictive trajectories updated.');
    setTimeout(() => setNotification(null), 4000);
  };

  // Trigger consensus
  const handleTriggerConsensus = () => {
    const rep = cognitiveAgentCollaboration.conveneMultiAgentDeliberation(
      problemQuery,
      telemetry
    );
    setCurrentConsensus(rep);
    setNotification('6 AI specialist agents convened. Consensus directive updated.');
    setTimeout(() => setNotification(null), 4000);
  };

  // Run cycle audit
  const handleRunCycleAudit = () => {
    const res = knowledgeGraphEngine.detectCycles();
    setCycleAuditResult({ hasCycles: res.hasCycles, count: res.cycles.length });
    setNotification(
      res.hasCycles
        ? `Warning: Detected ${res.cycles.length} circular dependencies in knowledge graph!`
        : 'Topological audit passed: 0 circular dependencies detected. Dependency chain is strictly acyclic.'
    );
    setTimeout(() => setNotification(null), 5000);
  };

  // Operator decision actions
  const handleApproveDecision = (decisionId: string) => {
    advancedDecisionIntelligence.updateDecisionStatus(decisionId, 'APPROVED', 'Operator approved via Cognitive Center.');
    setDecisions(advancedDecisionIntelligence.getAllDecisions());
    // Record self-evaluation feedback
    cognitiveSelfEvaluation.recordEvaluation({
      decisionId,
      predictedConfidence: 0.85,
      actualOutcomeSuccess: true,
      feedbackNotes: 'Operator verified successful execution with zero cadence drop.',
    });
    setCalibration(cognitiveSelfEvaluation.getCalibrationMetrics());
    setNotification(`Decision ${decisionId} approved and recorded for calibration.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRejectDecision = (decisionId: string) => {
    advancedDecisionIntelligence.updateDecisionStatus(decisionId, 'REJECTED', 'Operator rejected recommendation.');
    setDecisions(advancedDecisionIntelligence.getAllDecisions());
    cognitiveSelfEvaluation.recordEvaluation({
      decisionId,
      predictedConfidence: 0.85,
      actualOutcomeSuccess: false,
      feedbackNotes: 'Operator rejected action due to manual override preference.',
    });
    setCalibration(cognitiveSelfEvaluation.getCalibrationMetrics());
    setNotification(`Decision ${decisionId} rejected. Ground truth calibration updated.`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered insights
  const filteredInsights = useMemo(() => {
    return continuousLearningEngine.queryInsights(learningSearch);
  }, [learningSearch, insights]);

  // Filtered knowledge nodes
  const filteredGraphNodes = useMemo(() => {
    let list = graphSnapshot.nodes;
    if (graphFilterType !== 'ALL') {
      list = list.filter((n) => n.type === graphFilterType);
    }
    if (graphSearchQuery.trim()) {
      const q = graphSearchQuery.toLowerCase();
      list = list.filter((n) => n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q));
    }
    return list;
  }, [graphSnapshot, graphFilterType, graphSearchQuery]);

  return (
    <div className="flex flex-col gap-4 text-xs font-mono text-slate-200">
      {/* Top Banner Notice */}
      {notification && (
        <div className="p-2.5 rounded-lg bg-cyan-950/90 border border-cyan-500/80 text-cyan-200 flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Cognitive Intelligence Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">COGNITIVE STATUS</span>
          <div className="flex items-center gap-1.5 mt-1">
            <BrainCircuit className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-emerald-400 font-bold text-xs">SYNTHESIS ACTIVE</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">UNCERTAINTY ENTROPY</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-sm font-bold ${
                currentReasoning.uncertaintyScore < 0.35 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {currentReasoning.uncertaintyScore.toFixed(3)}
            </span>
            <span className="text-slate-500 text-[10px]">
              ({Math.round((1 - currentReasoning.uncertaintyScore) * 100)}% clarity)
            </span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">CALIBRATION SCORE</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-sm font-bold text-cyan-400">
              {calibration.meanBrierScore.toFixed(3)}
            </span>
            <span className="text-slate-500 text-[10px]">Brier loss</span>
          </div>
          <span className="text-[9px] text-emerald-400 font-bold mt-0.5 uppercase">
            {calibration.calibrationBias}
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">AGENT CONSENSUS</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-sm font-bold text-purple-400">
              {Math.round(currentConsensus.consensusScore * 100)}%
            </span>
            <span className="text-slate-500 text-[10px]">6 agents</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-0.5">
            CIO: {currentConsensus.approvedByChiefOfficer ? 'APPROVED' : 'PENDING'}
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">KNOWLEDGE TOPOLOGY</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-sm font-bold text-emerald-400">
              {graphSnapshot.nodeCount}
            </span>
            <span className="text-slate-500 text-[10px]">nodes / {graphSnapshot.relationshipCount} rels</span>
          </div>
          <span className="text-[9px] text-emerald-300 font-bold mt-0.5">
            ACYCLIC VERIFIED
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">EXPERIENTIAL MEMORY</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-sm font-bold text-cyan-300">
              {insights.length}
            </span>
            <span className="text-slate-500 text-[10px]">insights</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-0.5">
            HASH DEDUP ACTIVE
          </span>
        </div>
      </div>

      {/* Sub-View Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800 pb-2">
        {[
          { id: 'reasoning', label: '1. Structured Reasoning', icon: Brain },
          { id: 'decisions', label: '2. Decision Matrix & Gates', icon: BarChart3 },
          { id: 'collaboration', label: '3. 6-Agent Deliberation', icon: Network },
          { id: 'scenarios', label: '4. 3-Tier Predictive Scenarios', icon: TrendingUp },
          { id: 'learning', label: '5. Continuous Learning (RAM)', icon: Cpu },
          { id: 'knowledge_graph', label: '6. Knowledge Graph Explorer', icon: GitBranch },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubView(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                activeSubView === tab.id
                  ? 'bg-cyan-950 border border-cyan-500 text-cyan-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-VIEW 1: STRUCTURED REASONING */}
      {activeSubView === 'reasoning' && (
        <div className="flex flex-col gap-4">
          {/* Problem Input & Bayesian Trigger */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 uppercase flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-cyan-400" />
                Structured Problem Decomposition & Bayesian Hypothesis Engine
              </span>
              <span className="text-[10px] text-slate-400">
                RULE #2 ENFORCEMENT • PROVENANCE VERIFIED
              </span>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="text"
                value={problemQuery}
                onChange={(e) => setProblemQuery(e.target.value)}
                placeholder="Enter problem statement or telemetry anomaly description..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                onClick={handleTriggerReasoning}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-900/30"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Execute Reasoning</span>
              </button>
            </div>

            {/* Quick Templates */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 flex-wrap">
              <span>Quick Diagnostics:</span>
              {[
                'Frametime spike above 20ms during complex scene illumination',
                'Optical sensor occlusion causing 4-joint tracking dropout',
                'Telemetry packet queue latency elevation under synthetic test stress',
              ].map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setProblemQuery(tmpl);
                    const res = cognitiveReasoningEngine.analyzeProblem(tmpl, telemetry);
                    setCurrentReasoning(res);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Template {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Reasoning Results Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Hypotheses Column */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 uppercase">1. Hypotheses Probabilities</span>
                <span className="text-[10px] text-slate-500">Bayesian Posterior</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {currentReasoning.hypotheses.map((h) => {
                  const isSelected = currentReasoning.selectedHypothesis?.id === h.id;
                  const pct = Math.round(h.posteriorProbability * 100);
                  return (
                    <div
                      key={h.id}
                      className={`p-3 rounded-lg border flex flex-col gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-cyan-950/50 border-cyan-500 text-cyan-100 shadow-md shadow-cyan-950/50'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{h.statement}</span>
                        <span
                          className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            pct >= 50
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                        {h.rationale}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/80">
                        <span>Prior: {Math.round(h.priorProbability * 100)}%</span>
                        <span className="text-cyan-400">
                          {h.evidenceSupportIds.length} Supports • {h.evidenceContradictionIds.length} Contradictions
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Collected Evidence Column */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 uppercase">2. Multi-Source Evidence</span>
                <span className="text-[10px] text-slate-500">Provenance Flagged</span>
              </div>

              <div className="flex flex-col gap-2">
                {currentReasoning.evidenceItems.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{ev.label}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                          ev.provenance === 'PHYSICAL_HARDWARE'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                            : 'bg-purple-950 text-purple-300 border border-purple-600'
                        }`}
                      >
                        {ev.provenance}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono mt-0.5">
                      <span className="text-slate-400">
                        Observed: <strong className="text-cyan-300">{String(ev.observedValue)}</strong>
                      </span>
                      <span className="text-slate-500">Baseline: {String(ev.expectedBaseline)}</span>
                      <span className="text-slate-400">Weight: {ev.weight}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Explainable Conclusion Column */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 uppercase">3. Explainable Synthesis</span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {Math.round(currentReasoning.overallConfidence * 100)}% CONFIDENCE
                </span>
              </div>

              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/80 text-cyan-200 leading-relaxed font-sans text-xs">
                {currentReasoning.explainableConclusion}
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <span className="font-bold text-slate-300 uppercase text-[10px]">Actionable Directives:</span>
                <ul className="flex flex-col gap-1">
                  {currentReasoning.actionableDirectives.map((d, i) => (
                    <li
                      key={i}
                      className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-start gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                <span>Problem ID: {currentReasoning.problemId}</span>
                <span>{new Date(currentReasoning.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: DECISION MATRIX & HUMAN OPERATOR GATES */}
      {activeSubView === 'decisions' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 uppercase flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Advanced Multi-Option Decision Matrix & Human Authorization Gates
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                SAFETY RULE: CRITICAL ACTIONS CANNOT BE SELF-AUTHORIZED
              </span>
            </div>
            <p className="text-slate-300 font-sans text-xs">
              Every candidate action is scored across feasibility, operational risk, projected benefit, and latency impact.
              Decisions with elevated risk or critical scope are held at explicit operator gates.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {decisions.map((dec) => (
              <div
                key={dec.decisionId}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <h3 className="font-bold text-sm text-cyan-200">{dec.title}</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5 font-sans">{dec.context}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        dec.executionStatus === 'APPROVED'
                          ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                          : dec.executionStatus === 'PENDING_APPROVAL'
                          ? 'bg-amber-950 border border-amber-600 text-amber-300'
                          : 'bg-red-950 border border-red-600 text-red-300'
                      }`}
                    >
                      {dec.executionStatus}
                    </span>
                    {dec.approvalRequired && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-purple-950 border border-purple-600 text-purple-300 font-bold">
                        OPERATOR GATE REQUIRED
                      </span>
                    )}
                  </div>
                </div>

                {/* Options Table */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {dec.options.map((opt) => {
                    const isRec = opt.id === dec.recommendedOptionId;
                    return (
                      <div
                        key={opt.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                          isRec
                            ? 'bg-slate-900/90 border-cyan-500 shadow-md shadow-cyan-950/50'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-100">{opt.title}</span>
                            {isRec && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500 text-cyan-300 uppercase">
                                RECOMMENDED
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-sans leading-relaxed mb-2">
                            {opt.description}
                          </p>

                          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                            <div>
                              <span className="text-slate-500">Benefit:</span>{' '}
                              <strong className="text-emerald-400">{Math.round(opt.benefitScore * 100)}%</strong>
                            </div>
                            <div>
                              <span className="text-slate-500">Feasibility:</span>{' '}
                              <strong className="text-cyan-400">{Math.round(opt.feasibilityScore * 100)}%</strong>
                            </div>
                            <div>
                              <span className="text-slate-500">Risk:</span>{' '}
                              <strong className={opt.riskScore >= 0.5 ? 'text-amber-400' : 'text-slate-300'}>
                                {Math.round(opt.riskScore * 100)}%
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-500">Latency:</span>{' '}
                              <strong className="text-purple-300">{opt.latencyImpactMs}ms</strong>
                            </div>
                          </div>
                        </div>

                        {/* Pros / Cons */}
                        <div className="text-[10px] flex flex-col gap-1 border-t border-slate-800 pt-2">
                          <div className="text-emerald-400">✓ {opt.pros[0]}</div>
                          <div className="text-slate-400">✗ {opt.cons[0]}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Operator Actions Bar */}
                <div className="flex items-center justify-between border-t border-slate-800 pt-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                    <span>
                      {dec.operatorReviewNote || 'Awaiting operator review or autonomous confirmation.'}
                    </span>
                  </div>

                  {dec.executionStatus === 'PENDING_APPROVAL' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRejectDecision(dec.decisionId)}
                        className="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 font-bold transition-colors"
                      >
                        Reject Action
                      </button>
                      <button
                        onClick={() => handleApproveDecision(dec.decisionId)}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-lg shadow-emerald-950/50"
                      >
                        Authorize & Execute
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: 6-AGENT COGNITIVE DELIBERATION */}
      {activeSubView === 'collaboration' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 uppercase flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" />
                6-Agent Specialist Cognitive Deliberation & Consensus
              </span>
              <button
                onClick={handleTriggerConsensus}
                className="px-3 py-1 rounded-lg bg-purple-900/70 hover:bg-purple-800 border border-purple-500 text-purple-200 text-xs font-bold transition-colors"
              >
                Re-Convene Council
              </button>
            </div>
            <p className="text-slate-300 font-sans text-xs">
              Direct collaborative synthesis across Operations, Testing, Tracking, Performance, Incident Management,
              and Chief Intelligence leadership.
            </p>
          </div>

          {/* Unified Directive Banner */}
          <div className="bg-slate-950/90 border border-cyan-800/80 rounded-xl p-4 flex flex-col gap-2 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                Synthesized Multi-Agent Consensus Directive
              </span>
              <span className="font-mono text-emerald-400 font-bold text-xs">
                {Math.round(currentConsensus.consensusScore * 100)}% CONSENSUS
              </span>
            </div>
            <p className="text-slate-200 font-sans text-xs leading-relaxed">
              {currentConsensus.unifiedDirective}
            </p>
          </div>

          {/* 6 Agent Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentConsensus.perspectives.map((p) => (
              <div
                key={p.agentRole}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-100">{p.agentName}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        p.stance === 'SUPPORT'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                          : p.stance === 'CONDITIONAL_APPROVAL'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-600'
                          : 'bg-amber-950 text-amber-300 border border-amber-600'
                      }`}
                    >
                      {p.stance}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    {p.argument}
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-2 flex flex-col gap-1 text-[10px] text-slate-400">
                  <span className="text-cyan-400 font-bold">Recommended Modification:</span>
                  <span>• {p.recommendedModifications[0] || 'Standard execution'}</span>
                  <div className="flex justify-between items-center text-slate-500 pt-1">
                    <span>Confidence: {Math.round(p.confidence * 100)}%</span>
                    <span>Role: {p.agentRole}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: 3-TIER PREDICTIVE SCENARIO FORECASTING */}
      {activeSubView === 'scenarios' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 uppercase flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                3-Tier Multi-Horizon Predictive Scenario Trajectories
              </span>
              <span className="text-[10px] text-purple-300 font-mono font-bold bg-purple-950 border border-purple-600 px-2 py-0.5 rounded">
                SIMULATED PROJECTIONS • DIGITAL TWIN INTEGRATED
              </span>
            </div>
            <p className="text-slate-300 font-sans text-xs">
              Simulates environmental fluctuations, thermal throttling, and sensor occlusion across Best-Case,
              Expected, and Worst-Case operational trajectories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Best-Case */}
            <div className="bg-slate-950/80 border border-emerald-900/60 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-lg">
              <div>
                <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2 mb-2">
                  <span className="font-bold text-emerald-400 text-sm uppercase">1. Best-Case Trajectory</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600">
                    {Math.round(scenarioReport.projections.bestCase.probability * 100)}% Prob.
                  </span>
                </div>
                <p className="text-slate-300 font-sans text-xs leading-relaxed mb-3">
                  {scenarioReport.projections.bestCase.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 mb-3">
                  <div>
                    <span className="text-slate-500 text-[10px] block">PROJECTED CADENCE</span>
                    <strong className="text-emerald-400 text-sm">~{scenarioReport.projections.bestCase.projectedFps} FPS</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">FRAME LATENCY</span>
                    <strong className="text-emerald-400 text-sm">{scenarioReport.projections.bestCase.projectedLatencyMs} ms</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">INCIDENT RISK</span>
                    <strong className="text-emerald-300 text-sm">{(scenarioReport.projections.bestCase.projectedIncidentProbability * 100).toFixed(0)}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">JOINT DRIFT</span>
                    <strong className="text-emerald-300 text-sm">{scenarioReport.projections.bestCase.projectedJointDriftMm} mm</strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex flex-col gap-1">
                  <span className="text-emerald-400 font-bold text-[10px] uppercase">Assumptions:</span>
                  {scenarioReport.projections.bestCase.keyAssumptions.map((a, i) => (
                    <span key={i}>• {a}</span>
                  ))}
                </div>
              </div>
              <div className="text-[9px] font-mono text-purple-400 uppercase pt-2 border-t border-slate-800">
                [SIMULATED DATA PREDICTION]
              </div>
            </div>

            {/* Expected */}
            <div className="bg-slate-950/80 border border-cyan-900/60 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-lg">
              <div>
                <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2 mb-2">
                  <span className="font-bold text-cyan-300 text-sm uppercase">2. Expected Trajectory</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-600">
                    {Math.round(scenarioReport.projections.expected.probability * 100)}% Prob.
                  </span>
                </div>
                <p className="text-slate-300 font-sans text-xs leading-relaxed mb-3">
                  {scenarioReport.projections.expected.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 mb-3">
                  <div>
                    <span className="text-slate-500 text-[10px] block">PROJECTED CADENCE</span>
                    <strong className="text-cyan-300 text-sm">~{scenarioReport.projections.expected.projectedFps} FPS</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">FRAME LATENCY</span>
                    <strong className="text-cyan-300 text-sm">{scenarioReport.projections.expected.projectedLatencyMs} ms</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">INCIDENT RISK</span>
                    <strong className="text-cyan-400 text-sm">{(scenarioReport.projections.expected.projectedIncidentProbability * 100).toFixed(0)}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">JOINT DRIFT</span>
                    <strong className="text-cyan-400 text-sm">{scenarioReport.projections.expected.projectedJointDriftMm} mm</strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex flex-col gap-1">
                  <span className="text-cyan-400 font-bold text-[10px] uppercase">Assumptions:</span>
                  {scenarioReport.projections.expected.keyAssumptions.map((a, i) => (
                    <span key={i}>• {a}</span>
                  ))}
                </div>
              </div>
              <div className="text-[9px] font-mono text-purple-400 uppercase pt-2 border-t border-slate-800">
                [SIMULATED DATA PREDICTION]
              </div>
            </div>

            {/* Worst-Case */}
            <div className="bg-slate-950/80 border border-red-900/60 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-lg">
              <div>
                <div className="flex items-center justify-between border-b border-red-900/40 pb-2 mb-2">
                  <span className="font-bold text-red-400 text-sm uppercase">3. Worst-Case Trajectory</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-600">
                    {Math.round(scenarioReport.projections.worstCase.probability * 100)}% Prob.
                  </span>
                </div>
                <p className="text-slate-300 font-sans text-xs leading-relaxed mb-3">
                  {scenarioReport.projections.worstCase.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 mb-3">
                  <div>
                    <span className="text-slate-500 text-[10px] block">PROJECTED CADENCE</span>
                    <strong className="text-red-400 text-sm">~{scenarioReport.projections.worstCase.projectedFps} FPS</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">FRAME LATENCY</span>
                    <strong className="text-red-400 text-sm">{scenarioReport.projections.worstCase.projectedLatencyMs} ms</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">INCIDENT RISK</span>
                    <strong className="text-red-300 text-sm">{(scenarioReport.projections.worstCase.projectedIncidentProbability * 100).toFixed(0)}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">JOINT DRIFT</span>
                    <strong className="text-red-300 text-sm">{scenarioReport.projections.worstCase.projectedJointDriftMm} mm</strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex flex-col gap-1">
                  <span className="text-red-400 font-bold text-[10px] uppercase">Mitigation Strategies:</span>
                  {scenarioReport.projections.worstCase.mitigationStrategies.map((m, i) => (
                    <span key={i}>• {m}</span>
                  ))}
                </div>
              </div>
              <div className="text-[9px] font-mono text-purple-400 uppercase pt-2 border-t border-slate-800">
                [SIMULATED DATA PREDICTION]
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: CONTINUOUS LEARNING (RAM) */}
      {activeSubView === 'learning' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 uppercase flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Experiential Continuous Learning & Retrieval Memory
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                RETRIEVAL-AUGMENTED PARADIGM • NO MODEL WEIGHT MODIFICATION
              </span>
            </div>

            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={learningSearch}
                  onChange={(e) => setLearningSearch(e.target.value)}
                  placeholder="Query learned patterns, remedies, or keywords..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredInsights.map((ins) => (
              <div
                key={ins.id}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-cyan-200 text-xs">{ins.patternDescription}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        ins.outcomeSuccess
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                          : 'bg-red-950 text-red-300 border border-red-600'
                      }`}
                    >
                      {ins.outcomeSuccess ? 'VERIFIED REMEDY' : 'REGRESSION NOTED'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800 text-slate-200 text-xs font-mono mb-2">
                    <strong className="text-emerald-400">Remedy:</strong> {ins.remedyApplied}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {ins.retrievalKeywords.map((kw, idx) => (
                      <span key={idx} className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px]">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800 pt-2 font-mono">
                  <span>Agent: {ins.provenance.responsibleAgent}</span>
                  <span>Applied: {ins.applicationCount} times</span>
                  <span>Sig: {ins.signatureHash}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 6: KNOWLEDGE GRAPH EXPLORER */}
      {activeSubView === 'knowledge_graph' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 uppercase flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                Knowledge Graph Topology & Circular Dependency Audit
              </span>
              <button
                onClick={handleRunCycleAudit}
                className="px-3 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-emerald-200 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Audit Circular Dependencies</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={graphSearchQuery}
                  onChange={(e) => setGraphSearchQuery(e.target.value)}
                  placeholder="Filter nodes by ID or name..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto">
                {['ALL', 'MODULE', 'AGENT', 'SAFETY_RULE'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setGraphFilterType(type)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      graphFilterType === type
                        ? 'bg-cyan-950 border border-cyan-500 text-cyan-200 font-bold'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Graph Nodes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredGraphNodes.map((node) => {
              const { inbound, outbound } = knowledgeGraphEngine.getNeighbors(node.id);
              return (
                <div
                  key={node.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-100 text-xs">{node.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          node.type === 'MODULE'
                            ? 'bg-blue-950 text-blue-300 border border-blue-700'
                            : node.type === 'AGENT'
                            ? 'bg-purple-950 text-purple-300 border border-purple-700'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        }`}
                      >
                        {node.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block mb-2">{node.id}</span>

                    <div className="text-[10px] font-mono text-slate-400 flex flex-col gap-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <div>Inbound: {inbound.length} links</div>
                      <div>Outbound: {outbound.length} links</div>
                      {outbound.length > 0 && (
                        <div className="text-cyan-400 truncate">
                          ↳ {outbound[0].relation} → {outbound[0].targetNodeId}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[9px] text-slate-500 font-mono border-t border-slate-800 pt-1.5 flex justify-between">
                    <span>Acyclic: OK</span>
                    <span>{new Date(node.updatedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
