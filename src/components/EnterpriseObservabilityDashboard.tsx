/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enterprise Observability & System Monitoring Dashboard (Phase 18).
 * Real-time monitoring of WebXR frame cadence, API latency window, browser memory heap,
 * cloud sync health, tracking stability, AI agents, and incident resolution MTTR.
 */

import React, { useEffect, useState } from 'react';
import {
  LiveObservabilitySnapshot,
  UpgradedAgentCoordinationReport,
  QuestHardwareFeatures,
} from '../types/phase18';
import { observability } from '../utils/observabilityEngine';
import { agentCoordinator } from '../utils/agentCoordinator';
import { validateQuestWebXR } from '../utils/questWebXRValidator';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';
import {
  Activity,
  Cpu,
  Cloud,
  CheckCircle,
  AlertTriangle,
  Radio,
  ShieldCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface Props {
  telemetry: VRTelemetry | null;
  incidents: IncidentRecord[];
  isPhysicalVRActive: boolean;
}

export const EnterpriseObservabilityDashboard: React.FC<Props> = ({
  telemetry,
  incidents,
  isPhysicalVRActive,
}) => {
  const [snapshot, setSnapshot] = useState<LiveObservabilitySnapshot>(() =>
    observability.computeSnapshot(telemetry, incidents, isPhysicalVRActive)
  );
  const [agentReport, setAgentReport] = useState<UpgradedAgentCoordinationReport>(() =>
    agentCoordinator.coordinateEnterpriseAgents(telemetry || ({} as VRTelemetry), {
      isPhysicalVRActive,
      incidents,
    })
  );
  const [questFeatures, setQuestFeatures] = useState<QuestHardwareFeatures | null>(null);

  useEffect(() => {
    // Initial hardware query
    validateQuestWebXR().then((res) => {
      setQuestFeatures(res.features);
    });

    // Refresh telemetry observation snapshot every 1.5s
    const timer = setInterval(() => {
      const snap = observability.computeSnapshot(telemetry, incidents, isPhysicalVRActive);
      setSnapshot(snap);

      if (telemetry) {
        const rep = agentCoordinator.coordinateEnterpriseAgents(telemetry, {
          isPhysicalVRActive,
          incidents,
        });
        setAgentReport(rep);
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [telemetry, incidents, isPhysicalVRActive]);

  const { fpsMetrics, memoryMetrics, apiLatencyHistoryMs, averageApiLatencyMs, provenance } = snapshot;

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Top Banner: Provenance & Live Health Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-wide uppercase font-mono text-cyan-300">
                Enterprise Observability Node
              </h2>
              <span
                className={`px-2 py-0.5 text-xs font-mono font-bold rounded ${
                  provenance === 'Physical Hardware'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {provenance === 'Physical Hardware' ? 'PHYSICAL VR HARDWARE' : 'SIMULATED TELEMETRY'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live kernel stream monitoring Meta Quest runtime, render delta timing, and multi-agent coordination.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Cloud Sync:</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {snapshot.cloudSyncHealth.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Grid of Key Performance Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: FPS & Cadence */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-mono">RENDER CADENCE</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-50">{fpsMetrics.currentFps}</span>
            <span className="text-xs font-mono text-slate-400">/ {fpsMetrics.targetFps} FPS Target</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Jitter Score: {fpsMetrics.cadenceJitterScore}/100</span>
            <span className={fpsMetrics.droppedFramesLastSec === 0 ? 'text-emerald-400' : 'text-amber-400'}>
              {fpsMetrics.droppedFramesLastSec} drops
            </span>
          </div>
        </div>

        {/* Metric 2: Measured API Latency */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-mono">API & SYNC LATENCY</span>
            <Cloud className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-50">{averageApiLatencyMs}</span>
            <span className="text-xs font-mono text-slate-400">ms (median)</span>
          </div>
          {/* Mini Sparkline for Latency */}
          <div className="mt-2 flex items-end gap-1 h-5 pt-1">
            {apiLatencyHistoryMs.slice(-10).map((lat, idx) => {
              const h = Math.min(100, Math.max(20, Math.round((lat / 30) * 100)));
              return (
                <div
                  key={idx}
                  className="flex-1 bg-emerald-500/50 hover:bg-emerald-400 rounded-t transition-all"
                  style={{ height: `${h}%` }}
                  title={`${lat}ms`}
                />
              );
            })}
          </div>
        </div>

        {/* Metric 3: Memory Heap */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-mono">BROWSER HEAP</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-50">
              {memoryMetrics.supported && memoryMetrics.usedJSHeapSizeMb
                ? `${memoryMetrics.usedJSHeapSizeMb} MB`
                : '18 MB'}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {memoryMetrics.supported ? `of ${memoryMetrics.totalJSHeapSizeMb} MB` : 'Estimated'}
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${memoryMetrics.memoryPressureScore}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-slate-400 text-right">
            Pressure: {memoryMetrics.memoryPressureScore}%
          </div>
        </div>

        {/* Metric 4: Tracking & Skeleton Joints */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-mono">SKELETON JOINTS</span>
            <Radio className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-50">
              {snapshot.availableSkeletonJointsCount}
            </span>
            <span className="text-xs font-mono text-slate-400">/ 25 XRHand Joints</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Stability: {snapshot.trackingStabilityPercent}%</span>
            <span className="text-emerald-400">Active</span>
          </div>
        </div>
      </div>

      {/* Meta Quest WebXR Hardware Detection Card */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide font-mono text-cyan-300">
              META QUEST HARDWARE DETECTION
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Detected: {questFeatures?.detectedModel || 'Querying...'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="text-slate-400">Model Identification</div>
            <div className="text-slate-200 font-bold mt-0.5">{questFeatures?.detectedModel}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="text-slate-400">Hand Tracking API</div>
            <div className={`font-bold mt-0.5 ${questFeatures?.handTrackingSupported ? 'text-emerald-400' : 'text-amber-400'}`}>
              {questFeatures?.handTrackingSupported ? 'XRHand Ready' : 'Fallback Emulated'}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="text-slate-400">6DoF Headset Tracking</div>
            <div className={`font-bold mt-0.5 ${questFeatures?.sixDoFHeadsetDetected ? 'text-emerald-400' : 'text-slate-400'}`}>
              {questFeatures?.sixDoFHeadsetDetected ? 'Connected' : 'Offline (Desktop)'}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="text-slate-400">Display Refresh Rates</div>
            <div className="text-slate-200 font-bold mt-0.5">
              {questFeatures?.supportedRefreshRatesHz?.join(' / ') || '72'} Hz
            </div>
          </div>
        </div>
      </div>

      {/* AI Multi-Agent Coordination Matrix */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold tracking-wide font-mono text-purple-300">
              AUTONOMOUS AI AGENT COORDINATION MATRIX
            </h3>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Overall Confidence: <span className="text-purple-300 font-bold">{Math.round(agentReport.overallConfidence * 100)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(agentReport.agents).map(([role, task]) => (
            <div
              key={role}
              className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-semibold text-cyan-300">{role}</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                    task.state === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : task.state === 'evaluating'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {task.state.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-2 mb-2">{task.findings[0]}</p>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-800/80">
                <span>Confidence: {Math.round(task.confidence * 100)}%</span>
                <span>Uncertainty: {Math.round(task.uncertaintyScore * 100)}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Rule #2 Invariant Banner */}
        <div className="mt-4 p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-300 flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase font-mono">Mandatory Invariant Rule #2:</span>{' '}
            {agentReport.environmentalCausationStrictRule2Notice}
          </div>
        </div>
      </div>
    </div>
  );
};
