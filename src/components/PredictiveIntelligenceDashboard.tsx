/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Predictive Intelligence & Decision Optimization Dashboard (Phase 33)
 * Tab 23: Enterprise Cognitive Analytics, Time-Series Forecasting & Explainable Decision Support.
 * 
 * Sub-panels:
 * 1. Overview & Real-Time Forecasts
 * 2. Temporal Pattern & Trend Analytics
 * 3. Scenario Forecasting Comparison (Best / Expected / Worst)
 * 4. Decision Optimization Support (Multi-criteria trade-offs & Human Approval)
 * 5. Predictive Operational Risk Monitor
 * 6. Confidence Scoring & Explainability Inspector
 * 7. Adaptive Learning & Forecast Accuracy
 * 8. Multi-Agent Analytical Council (6 Specialists)
 * 9. Persistence & Telemetry Provenance
 */

import React, { useState, useEffect, useMemo } from 'react';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';
import {
  PredictiveIntelligenceState,
  MetricForecastSeries,
  ForecastScenario,
  DecisionRecommendation,
  PredictiveRiskIndicator,
  TemporalPatternAnalysis,
} from '../types/phase33';
import { PredictiveIntelligenceOrchestrator } from '../engines/PredictiveIntelligenceOrchestrator';
import { DecisionOptimizationEngine } from '../engines/DecisionOptimizationEngine';
import { AdaptiveLearningEngine } from '../engines/AdaptiveLearningEngine';
import {
  TrendingUp,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Cpu,
  Brain,
  Shield,
  Clock,
  ArrowRight,
  RefreshCw,
  GitBranch,
  BarChart2,
  Zap,
  Radio,
  FileText,
  UserCheck,
} from 'lucide-react';

interface PredictiveIntelligenceDashboardProps {
  telemetry: VRTelemetry;
  activeIncidents?: IncidentRecord[];
  isPhysicalVRActive?: boolean;
}

export const PredictiveIntelligenceDashboard: React.FC<PredictiveIntelligenceDashboardProps> = ({
  telemetry,
  activeIncidents = [],
  isPhysicalVRActive = false,
}) => {
  const orchestrator = useMemo(() => PredictiveIntelligenceOrchestrator.getInstance(), []);
  const decisionEngine = useMemo(() => DecisionOptimizationEngine.getInstance(), []);
  const adaptiveEngine = useMemo(() => AdaptiveLearningEngine.getInstance(), []);

  const [state, setState] = useState<PredictiveIntelligenceState>(() => orchestrator.getCurrentState());
  const [activeSubTab, setActiveSubTab] = useState<string>('overview');
  const [selectedMetric, setSelectedMetric] = useState<string>('cadence_fps');
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Ingest telemetry on prop update
  useEffect(() => {
    const nextState = orchestrator.processLiveCycle(telemetry, isPhysicalVRActive);
    setState(nextState);
  }, [telemetry, isPhysicalVRActive, orchestrator]);

  // Subscribe to orchestrator updates
  useEffect(() => {
    return orchestrator.subscribe(setState);
  }, [orchestrator]);

  const showNotification = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 4000);
  };

  const activeForecastSeries = useMemo(() => {
    return state.forecasts.find((f) => f.metricKey === selectedMetric) || state.forecasts[0];
  }, [state.forecasts, selectedMetric]);

  const activePattern = useMemo(() => {
    return state.temporalPatterns.find((p) => p.metricKey === selectedMetric);
  }, [state.temporalPatterns, selectedMetric]);

  const accuracyStats = useMemo(() => adaptiveEngine.getAccuracyStatistics(), [adaptiveEngine, state.learningRecords]);

  return (
    <div className="flex flex-col gap-4 text-slate-100 font-sans pb-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h1 className="text-lg font-bold tracking-wide text-indigo-300 font-mono">
              PHASE 33: PREDICTIVE INTELLIGENCE & DECISION OPTIMIZATION ENGINE
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Time-series forecasting, Holt linear smoothing, scenario simulations, multi-criteria trade-offs, and multi-agent cognitive consensus.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">PROVENANCE:</span>
            <span className={`font-bold ${isPhysicalVRActive ? 'text-emerald-400' : 'text-cyan-400'}`}>
              {isPhysicalVRActive ? 'OBSERVED_DATA' : 'CALCULATED_INDICATOR'}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">ACCURACY:</span>
            <span className="text-emerald-400 font-bold">{state.overallForecastingAccuracyPercent}%</span>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {statusNotification && (
        <div className="bg-indigo-950 border border-indigo-500 text-indigo-200 px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{statusNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotification(null)}
            className="text-indigo-400 hover:text-indigo-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 pb-2 text-xs font-mono">
        {[
          { id: 'overview', label: '1. Overview & Forecasts', icon: Activity },
          { id: 'temporal', label: '2. Temporal Patterns', icon: Clock },
          { id: 'scenarios', label: `3. Scenarios (${state.scenarios.length})`, icon: GitBranch },
          { id: 'decisions', label: `4. Decision Optimization (${state.activeRecommendations.length})`, icon: Layers },
          { id: 'risks', label: `5. Predictive Risks (${state.riskIndicators.length})`, icon: AlertTriangle },
          { id: 'explainability', label: '6. Explainability & Confidence', icon: HelpCircle },
          { id: 'adaptive', label: `7. Adaptive Learning (${state.learningRecords.length})`, icon: Brain },
          { id: 'agents', label: '8. Agent Council', icon: UserCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-indigo-950 border border-indigo-500 text-indigo-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: OVERVIEW & FORECASTS */}
      {activeSubTab === 'overview' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
              <span className="text-slate-400 text-[10px] uppercase font-mono">CURRENT CADENCE</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {state.forecasts.find((f) => f.metricKey === 'cadence_fps')?.historical.slice(-1)[0]?.value ?? 72}
                </span>
                <span className="text-slate-500 text-xs font-mono">FPS</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono mt-1">Target: 72 FPS Locked</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
              <span className="text-slate-400 text-[10px] uppercase font-mono">TRACKING INTEGRITY</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {state.forecasts.find((f) => f.metricKey === 'tracking_joints')?.historical.slice(-1)[0]?.value ?? 25}
                </span>
                <span className="text-slate-500 text-xs font-mono">/ 25 joints</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono mt-1">Bimanual Mesh Active</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
              <span className="text-slate-400 text-[10px] uppercase font-mono">FORECAST ACCURACY</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-indigo-400">{state.overallForecastingAccuracyPercent}%</span>
                <span className="text-slate-500 text-xs font-mono">accuracy</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1">MAPE: {accuracyStats.meanAbsolutePercentageError}%</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
              <span className="text-slate-400 text-[10px] uppercase font-mono">RULE #2 SAFETY</span>
              <div className="flex items-center gap-1 mt-1">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold font-mono text-emerald-300">INCONCLUSIVE</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1">Physical Causation Guard</span>
            </div>
          </div>

          {/* Metric Selector & Forecast Series View */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold font-mono text-slate-100">
                  TIME-SERIES FORECAST (15s FORWARD HORIZON)
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                {state.forecasts.map((f) => (
                  <button
                    key={f.metricKey}
                    type="button"
                    onClick={() => setSelectedMetric(f.metricKey)}
                    className={`px-2.5 py-1 rounded border text-[11px] transition-colors ${
                      selectedMetric === f.metricKey
                        ? 'bg-indigo-950 border-indigo-500 text-indigo-200 font-bold'
                        : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    {f.metricLabel}
                  </button>
                ))}
              </div>
            </div>

            {activeForecastSeries && (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-slate-400">
                      Historical Track ({activeForecastSeries.historical.length} samples) ➔ Projected Forecast ({activeForecastSeries.forecast.length}s horizon)
                    </span>
                    <span className="text-indigo-400 font-bold">Unit: {activeForecastSeries.unit}</span>
                  </div>

                  {/* Visual Stepped Chart */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <div className="bg-slate-900/70 p-3 rounded border border-slate-800">
                      <span className="text-[11px] font-mono text-slate-400 block mb-1">Historical Observations:</span>
                      <div className="flex items-end gap-1 h-20 overflow-x-auto pt-2">
                        {activeForecastSeries.historical.slice(-15).map((pt, idx) => {
                          const heightPct = Math.min(100, Math.max(15, (pt.value / 90) * 100));
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full min-w-[14px]">
                              <div
                                className="w-full bg-cyan-500/70 hover:bg-cyan-400 rounded-t transition-all"
                                style={{ height: `${heightPct}%` }}
                                title={`${pt.value} ${activeForecastSeries.unit} at ${new Date(pt.timestamp).toLocaleTimeString()}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-slate-900/70 p-3 rounded border border-slate-800">
                      <span className="text-[11px] font-mono text-indigo-300 block mb-1">Holt Linear Forecast (15s):</span>
                      <div className="flex items-end gap-1 h-20 overflow-x-auto pt-2">
                        {activeForecastSeries.forecast.map((pt, idx) => {
                          const heightPct = Math.min(100, Math.max(15, (pt.value / 90) * 100));
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full min-w-[14px]">
                              <div
                                className="w-full bg-indigo-500/70 hover:bg-indigo-400 rounded-t transition-all"
                                style={{ height: `${heightPct}%` }}
                                title={`+${idx + 1}s Projected: ${pt.value} ${activeForecastSeries.unit}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-3 pt-2 border-t border-slate-800/80">
                    <span>Provenance: <strong className="text-cyan-300">{activeForecastSeries.historical.slice(-1)[0]?.provenance || 'CALCULATED_INDICATOR'}</strong></span>
                    <span>Confidence Interval: <strong className="text-indigo-300">90% (±1.645σ)</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: TEMPORAL PATTERNS */}
      {activeSubTab === 'temporal' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {state.temporalPatterns.map((pat) => (
              <div key={pat.patternId} className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-slate-100">{pat.metricKey.toUpperCase()}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                        pat.trend === 'STABLE'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : pat.trend === 'RISING'
                          ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                          : pat.trend === 'DECLINING'
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}
                    >
                      {pat.trend}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs font-mono bg-slate-950 p-2.5 rounded border border-slate-800">
                    <div>
                      <span className="text-slate-500">Trend Slope:</span>{' '}
                      <span className="text-slate-200">{pat.trendSlope > 0 ? `+${pat.trendSlope}` : pat.trendSlope} /sec</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Volatility Index:</span>{' '}
                      <span className="text-indigo-300">{pat.volatilityIndex}/100</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Seasonality:</span>{' '}
                      <span className="text-slate-200">{pat.seasonalityDetected ? `Cycle period ~${pat.cyclePeriodSeconds}s` : 'None detected'}</span>
                    </div>
                  </div>

                  {pat.changePoints.length > 0 && (
                    <div className="mt-3 text-[11px] font-mono bg-amber-950/30 p-2 rounded border border-amber-900 text-amber-300">
                      <strong>Change Point:</strong> {pat.changePoints[0].description}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                  <span>Data Completeness: {pat.dataCompletenessPercent}%</span>
                  <span>{new Date(pat.analyzedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: SCENARIOS */}
      {activeSubTab === 'scenarios' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {state.scenarios.map((scen) => (
              <div key={scen.scenarioId} className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                        scen.type === 'BEST_CASE'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : scen.type === 'EXPECTED_CASE'
                          ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                          : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}
                    >
                      {scen.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Probability: <strong className="text-slate-200">{scen.probabilityPercent !== null ? `${scen.probabilityPercent}%` : 'Statistical N/A'}</strong>
                    </span>
                  </div>

                  <h4 className="text-sm font-bold font-mono text-slate-100 mt-2">{scen.title}</h4>

                  <div className="mt-3 bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1 text-xs font-mono">
                    <div className="text-slate-400 font-bold mb-1">Projected Metrics (30s Horizon):</div>
                    {Object.entries(scen.projectedMetrics).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-slate-300">
                        <span>{k}:</span>
                        <span className="font-bold text-indigo-300">{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 block">Key Assumptions:</span>
                    <ul className="list-disc list-inside text-[11px] font-mono text-slate-400 space-y-0.5">
                      {scen.assumptions.map((a, idx) => (
                        <li key={idx}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                  <strong className="text-indigo-400">Preparation:</strong> {scen.recommendedPreparation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: DECISION OPTIMIZATION */}
      {activeSubTab === 'decisions' && (
        <div className="flex flex-col gap-4">
          <div className="space-y-4">
            {state.activeRecommendations.map((rec) => (
              <div key={rec.recommendationId} className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold font-mono text-slate-100">{rec.topic}</h4>
                    <span className="text-[10px] font-mono text-slate-500">ID: {rec.recommendationId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-bold">
                      Confidence: {rec.confidenceScore}%
                    </span>
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded border font-bold ${
                        rec.approvalState === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : rec.approvalState === 'PENDING_APPROVAL'
                          ? 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {rec.approvalState}
                    </span>
                  </div>
                </div>

                <p className="text-xs font-mono text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800">
                  <strong className="text-emerald-400">Decision Support Recommendation:</strong> {rec.justification}
                </p>

                {/* Evaluated Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {rec.evaluatedOptions.map((opt) => {
                    const isSelected = opt.optionId === rec.recommendedOptionId;
                    return (
                      <div
                        key={opt.optionId}
                        className={`p-3 rounded-lg border text-xs font-mono flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500'
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">{opt.title}</span>
                            <span className="text-[10px] text-indigo-300 font-bold">{opt.compositeScore}/100</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{opt.description}</p>
                          <div className="text-[10px] text-slate-500 mt-2">
                            <span>Cost-Benefit: {opt.costBenefitRatio.toFixed(1)}x</span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="mt-2 pt-1 border-t border-indigo-800 text-[10px] text-emerald-400 font-bold">
                            ✓ RECOMMENDED OPTION
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Operator Approval Trigger */}
                {rec.approvalState === 'PENDING_APPROVAL' && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between bg-amber-950/20 p-2.5 rounded border border-amber-900/60">
                    <span className="text-xs font-mono text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Human Operator Sign-Off Required Prior to Execution
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          decisionEngine.submitHumanDecision(rec.recommendationId, true, 'Lead Systems Architect');
                          showNotification(`Approved decision recommendation ${rec.recommendationId}`);
                        }}
                        className="px-3 py-1 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 border border-emerald-600 rounded text-xs font-mono font-bold"
                      >
                        Authorize
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          decisionEngine.submitHumanDecision(rec.recommendationId, false, 'Lead Systems Architect', 'Operator preferred manual override');
                          showNotification(`Rejected decision recommendation ${rec.recommendationId}`);
                        }}
                        className="px-3 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700 rounded text-xs font-mono font-bold"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 5: PREDICTIVE RISKS */}
      {activeSubTab === 'risks' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.riskIndicators.map((risk) => (
              <div key={risk.riskId} className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                          risk.severity === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-400 border-rose-800'
                            : risk.severity === 'HIGH'
                            ? 'bg-amber-950 text-amber-400 border-amber-800'
                            : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        }`}
                      >
                        {risk.severity}
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-100">{risk.category}</span>
                    </div>

                    <span className="text-xs font-mono text-slate-400">
                      Score: <strong className="text-indigo-300">{risk.currentRiskScore}/100</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2.5 text-xs font-mono bg-slate-950 p-2.5 rounded border border-slate-800">
                    <div>
                      <span className="text-slate-500">+30s Projection:</span>{' '}
                      <span className="text-slate-200 font-bold">{risk.projectedRiskScore30s}/100</span>
                    </div>
                    <div>
                      <span className="text-slate-500">+60s Projection:</span>{' '}
                      <span className="text-slate-200 font-bold">{risk.projectedRiskScore60s}/100</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Trend:</span>{' '}
                      <span className="text-slate-200">{risk.trend}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Early Warning:</span>{' '}
                      <span className={risk.earlyWarningTriggered ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                        {risk.earlyWarningTriggered ? 'TRIGGERED' : 'QUIET'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] font-mono text-slate-400">
                    <strong>Mitigation Steps:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300">
                      {risk.mitigationSteps.map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500">
                  Last Assessed: {new Date(risk.assessedAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 6: EXPLAINABILITY & CONFIDENCE */}
      {activeSubTab === 'explainability' && (
        <div className="flex flex-col gap-4">
          <div className="space-y-3">
            {Object.values(state.explanations).map((exp) => (
              <div key={exp.predictionId} className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold font-mono text-slate-100">{exp.modelIdentifier}</h4>
                    <span className="text-[10px] font-mono text-slate-500">Method: {exp.calculationMethod}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                      Calibrated Confidence: {exp.calibratedConfidence}%
                    </span>
                    <span className="text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
                      Quality: {exp.dataQualityRating}
                    </span>
                  </div>
                </div>

                <div className="text-xs font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300">
                  <strong>Provenance Statement:</strong> {exp.provenanceStatement}
                </div>

                <div className="space-y-1 mt-1">
                  <span className="text-[11px] font-mono text-slate-400 block">Contributing Factors:</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {exp.contributingFactors.map((fac, idx) => (
                      <div key={idx} className="bg-slate-950/60 p-2 rounded border border-slate-800 text-[11px] font-mono">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{fac.factorName}</span>
                          <span className={fac.contributionPercent > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                            {fac.contributionPercent > 0 ? `+${fac.contributionPercent}%` : `${fac.contributionPercent}%`}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{fac.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 7: ADAPTIVE LEARNING */}
      {activeSubTab === 'adaptive' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
              <span className="text-slate-400 text-[10px] uppercase font-mono">MODEL VERSION</span>
              <div className="text-sm font-bold font-mono text-slate-200 mt-1">{accuracyStats.modelVersion}</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
              <span className="text-slate-400 text-[10px] uppercase font-mono">ACCURACY RATE</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{accuracyStats.accuracyPercent}%</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
              <span className="text-slate-400 text-[10px] uppercase font-mono">MEAN ABS ERROR (MAE)</span>
              <div className="text-xl font-bold font-mono text-indigo-300 mt-1">{accuracyStats.meanAbsoluteError}</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
              <span className="text-slate-400 text-[10px] uppercase font-mono">MEAN ABS % ERROR (MAPE)</span>
              <div className="text-xl font-bold font-mono text-cyan-300 mt-1">{accuracyStats.meanAbsolutePercentageError}%</div>
            </div>
          </div>

          <div className="space-y-2">
            {state.learningRecords.map((rec) => (
              <div key={rec.recordId} className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-200">{rec.metricKey}</span>
                  <span className="text-slate-400">
                    Pred: <strong className="text-indigo-300">{rec.predictedValue}</strong> ➔ Actual: <strong className="text-emerald-300">{rec.actualObservedValue}</strong>
                  </span>
                  <span className="text-slate-500">| Err: {rec.errorPercentage}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[10px]">{new Date(rec.feedbackTimestamp).toLocaleTimeString()}</span>
                  <span className="text-slate-400 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                    Iter #{rec.learningIteration}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 8: AGENT COUNCIL */}
      {activeSubTab === 'agents' && (
        <div className="flex flex-col gap-4">
          {state.agentConsensus && (
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold font-mono text-indigo-300">SIX-AGENT PREDICTIVE CONSENSUS DIRECTIVE</h4>
                  <span className="text-xs font-mono text-slate-400">Forecast Status: <strong className="text-emerald-400">{state.agentConsensus.overallHealthForecast}</strong></span>
                </div>
                <span className="text-xs font-mono bg-indigo-950 text-indigo-200 border border-indigo-800 px-2.5 py-1 rounded font-bold">
                  Alignment: {state.agentConsensus.consensusAlignmentPercent}%
                </span>
              </div>

              <p className="text-xs font-mono text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800">
                {state.agentConsensus.unifiedAnalyticalDirective}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-1">
                {state.agentConsensus.agentContributions.map((contrib) => (
                  <div key={contrib.agentId} className="bg-slate-950/80 p-3 rounded border border-slate-800 text-xs font-mono flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-200">
                        <span className="font-bold text-slate-100">{contrib.agentRole}</span>
                        <span className="text-emerald-400 text-[10px]">{contrib.confidenceScore}%</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mb-1">{contrib.focusDomain}</span>
                      <p className="text-[11px] text-slate-300 mt-1">{contrib.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
