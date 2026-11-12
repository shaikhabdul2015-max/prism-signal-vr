/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 21: Digital Twin Dashboard & Scenario Simulation Lab.
 * Renders real-time digital mirror of the VR chamber, 2D vector schematic,
 * dynamic scenario simulation controls, baseline vs simulated variance,
 * 1s/5s/15s predictive modeling, and collective 6-agent evaluations.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Shield,
  Layers,
  Clock,
  Download,
  CheckCircle2,
  TrendingDown,
  Cpu,
  Compass,
  Radio,
  Zap,
} from 'lucide-react';
import { VRTelemetry } from '../types/diagnostics';
import {
  DigitalTwinSnapshot,
  SimulationSessionReport,
  SimulationScenarioConfig,
} from '../types/phase21';
import { digitalTwinEngine } from '../utils/DigitalTwinEngine';
import {
  environmentSimulationEngine,
  DEFAULT_SIMULATION_SCENARIOS,
} from '../utils/EnvironmentSimulationEngine';

interface DigitalTwinDashboardProps {
  telemetry: VRTelemetry;
}

export const DigitalTwinDashboard: React.FC<DigitalTwinDashboardProps> = ({ telemetry }) => {
  const [twinSnapshot, setTwinSnapshot] = useState<DigitalTwinSnapshot>(() =>
    digitalTwinEngine.getSnapshot()
  );
  const [activeSession, setActiveSession] = useState<SimulationSessionReport | null>(() =>
    environmentSimulationEngine.getActiveSession()
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    DEFAULT_SIMULATION_SCENARIOS[0].scenarioId
  );
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Subscribe to Digital Twin and Simulation updates
  useEffect(() => {
    const unsubTwin = digitalTwinEngine.subscribe((snap) => {
      setTwinSnapshot(snap);
    });
    const unsubSim = environmentSimulationEngine.subscribe((sess) => {
      setActiveSession(sess);
    });
    return () => {
      unsubTwin();
      unsubSim();
    };
  }, []);

  // Synchronize when telemetry changes if no active simulation is running
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'RUNNING') {
      digitalTwinEngine.synchronizeState(telemetry, undefined, undefined, false);
    }
  }, [telemetry, activeSession]);

  const scenarios = useMemo(
    () => environmentSimulationEngine.getAvailableScenarios(),
    []
  );

  const selectedScenario = useMemo(
    () => scenarios.find((s) => s.scenarioId === selectedScenarioId) || scenarios[0],
    [scenarios, selectedScenarioId]
  );

  const handleStartSimulation = () => {
    environmentSimulationEngine.startSimulation(selectedScenarioId, telemetry);
  };

  const handlePauseSimulation = () => {
    environmentSimulationEngine.pauseSimulation();
  };

  const handleResumeSimulation = () => {
    environmentSimulationEngine.resumeSimulation();
  };

  const handleResetSimulation = () => {
    environmentSimulationEngine.resetSimulation();
    digitalTwinEngine.synchronizeState(telemetry, undefined, undefined, false);
  };

  const handleExportReport = () => {
    const reportData = {
      exportedAt: new Date().toISOString(),
      twinSnapshot,
      activeSession,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prism-digital-twin-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice('Telemetry snapshot exported successfully.');
    setTimeout(() => setExportNotice(null), 3500);
  };

  // Convert chamber coordinates [-5 to 5] to SVG canvas [0 to 300]
  const mapCoords = (x: number, z: number): { cx: number; cy: number } => {
    const scale = 25;
    const cx = 150 + x * scale;
    const cy = 150 + z * scale;
    return { cx, cy };
  };

  const objects = twinSnapshot.objects;
  const ruby = objects['ruby'];
  const azure = objects['azure'];
  const emerald = objects['emerald'];
  const emitter = objects['console_emitter'];
  const target = objects['target_receiver'];

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Top Banner: Status, Version, Drift & Security Isolation */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/40 rounded-lg text-cyan-400">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  DIGITAL TWIN VIRTUALIZATION
                </h2>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {twinSnapshot.checksum}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                    activeSession && activeSession.status === 'RUNNING'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {activeSession && activeSession.status === 'RUNNING'
                    ? 'SIMULATION LAB ACTIVE'
                    : 'SYNCHRONIZED WITH VR'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Version #{twinSnapshot.version} • Sync Drift: {twinSnapshot.syncIntegrity.driftMs}ms • Health:{' '}
                <span className="text-emerald-400 font-bold">
                  {twinSnapshot.systemHealthScore}%
                </span>{' '}
                • Isolated Sandbox:{' '}
                <span className="text-cyan-300 font-bold">STRICT (ZERO HARDWARE POLLUTION)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-stretch lg:self-auto justify-end">
            <button
              onClick={handleExportReport}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all shadow-sm"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Export Audit Record</span>
            </button>
          </div>
        </div>

        {exportNotice && (
          <div className="mt-3 px-3 py-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{exportNotice}</span>
          </div>
        )}
      </div>

      {/* Main Grid: 2D Schematic & Crystal State Array */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 2D Top-Down Spatial Chamber Schematic */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
                  Top-Down Spatial Chamber Schematic
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">2D Orthographic Vector</span>
            </div>

            {/* SVG Chamber View */}
            <div className="relative bg-slate-950 border border-slate-800 rounded-lg p-2 flex items-center justify-center overflow-hidden">
              <svg viewBox="0 0 300 300" className="w-full max-w-[320px] h-[280px]">
                {/* Radial grid circles */}
                <circle cx="150" cy="150" r="130" fill="none" stroke="#1e293b" strokeDasharray="4 4" />
                <circle cx="150" cy="150" r="90" fill="none" stroke="#1e293b" strokeDasharray="2 2" />
                <circle cx="150" cy="150" r="45" fill="none" stroke="#1e293b" />
                <line x1="150" y1="10" x2="150" y2="290" stroke="#1e293b" strokeDasharray="2 2" />
                <line x1="10" y1="150" x2="290" y2="150" stroke="#1e293b" strokeDasharray="2 2" />

                {/* Ray Beams */}
                {emitter && ruby && (
                  <line
                    x1={mapCoords(emitter.position[0], emitter.position[2]).cx}
                    y1={mapCoords(emitter.position[0], emitter.position[2]).cy}
                    x2={mapCoords(ruby.position[0], ruby.position[2]).cx}
                    y2={mapCoords(ruby.position[0], ruby.position[2]).cy}
                    stroke="#ec4899"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    className="animate-pulse"
                  />
                )}
                {ruby && azure && (
                  <line
                    x1={mapCoords(ruby.position[0], ruby.position[2]).cx}
                    y1={mapCoords(ruby.position[0], ruby.position[2]).cy}
                    x2={mapCoords(azure.position[0], azure.position[2]).cx}
                    y2={mapCoords(azure.position[0], azure.position[2]).cy}
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeOpacity={ruby.isAligned ? '1' : '0.4'}
                  />
                )}
                {azure && emerald && (
                  <line
                    x1={mapCoords(azure.position[0], azure.position[2]).cx}
                    y1={mapCoords(azure.position[0], azure.position[2]).cy}
                    x2={mapCoords(emerald.position[0], emerald.position[2]).cx}
                    y2={mapCoords(emerald.position[0], emerald.position[2]).cy}
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeOpacity={azure.isAligned ? '1' : '0.3'}
                  />
                )}
                {emerald && target && (
                  <line
                    x1={mapCoords(emerald.position[0], emerald.position[2]).cx}
                    y1={mapCoords(emerald.position[0], emerald.position[2]).cy}
                    x2={mapCoords(target.position[0], target.position[2]).cx}
                    y2={mapCoords(target.position[0], target.position[2]).cy}
                    stroke="#a855f7"
                    strokeWidth="2.5"
                    strokeOpacity={emerald.isAligned ? '1' : '0.2'}
                  />
                )}

                {/* Nodes Rendering */}
                {emitter && (
                  <g>
                    <circle
                      cx={mapCoords(emitter.position[0], emitter.position[2]).cx}
                      cy={mapCoords(emitter.position[0], emitter.position[2]).cy}
                      r="9"
                      fill="#8b5cf6"
                      stroke="#c084fc"
                      strokeWidth="2"
                    />
                    <text
                      x={mapCoords(emitter.position[0], emitter.position[2]).cx}
                      y={mapCoords(emitter.position[0], emitter.position[2]).cy + 18}
                      fill="#cbd5e1"
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      EMITTER
                    </text>
                  </g>
                )}

                {ruby && (
                  <g>
                    <circle
                      cx={mapCoords(ruby.position[0], ruby.position[2]).cx}
                      cy={mapCoords(ruby.position[0], ruby.position[2]).cy}
                      r="10"
                      fill={ruby.isAligned ? '#ef4444' : '#7f1d1d'}
                      stroke="#f87171"
                      strokeWidth="2"
                    />
                    <text
                      x={mapCoords(ruby.position[0], ruby.position[2]).cx}
                      y={mapCoords(ruby.position[0], ruby.position[2]).cy - 14}
                      fill="#fca5a5"
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      RUBY ({ruby.rotationYDeg}°)
                    </text>
                  </g>
                )}

                {azure && (
                  <g>
                    <circle
                      cx={mapCoords(azure.position[0], azure.position[2]).cx}
                      cy={mapCoords(azure.position[0], azure.position[2]).cy}
                      r="10"
                      fill={azure.isAligned ? '#06b6d4' : '#164e63'}
                      stroke="#38bdf8"
                      strokeWidth="2"
                    />
                    <text
                      x={mapCoords(azure.position[0], azure.position[2]).cx}
                      y={mapCoords(azure.position[0], azure.position[2]).cy + 18}
                      fill="#7dd3fc"
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      AZURE ({azure.rotationYDeg}°)
                    </text>
                  </g>
                )}

                {emerald && (
                  <g>
                    <circle
                      cx={mapCoords(emerald.position[0], emerald.position[2]).cx}
                      cy={mapCoords(emerald.position[0], emerald.position[2]).cy}
                      r="10"
                      fill={emerald.isAligned ? '#10b981' : '#064e3b'}
                      stroke="#34d399"
                      strokeWidth="2"
                    />
                    <text
                      x={mapCoords(emerald.position[0], emerald.position[2]).cx}
                      y={mapCoords(emerald.position[0], emerald.position[2]).cy - 14}
                      fill="#6ee7b7"
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      EMERALD ({emerald.rotationYDeg}°)
                    </text>
                  </g>
                )}

                {target && (
                  <g>
                    <polygon
                      points={`${mapCoords(target.position[0], target.position[2]).cx},${
                        mapCoords(target.position[0], target.position[2]).cy - 12
                      } ${mapCoords(target.position[0], target.position[2]).cx - 10},${
                        mapCoords(target.position[0], target.position[2]).cy + 8
                      } ${mapCoords(target.position[0], target.position[2]).cx + 10},${
                        mapCoords(target.position[0], target.position[2]).cy + 8
                      }`}
                      fill={target.isReceivingLight ? '#ec4899' : '#831843'}
                      stroke="#f472b6"
                      strokeWidth="2"
                    />
                    <text
                      x={mapCoords(target.position[0], target.position[2]).cx}
                      y={mapCoords(target.position[0], target.position[2]).cy - 16}
                      fill="#fbcfe8"
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      TARGET SPIRE
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </div>

          {/* Environmental State bar */}
          <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">AMBIENT LUX</span>
              <span className="font-mono font-bold text-amber-300">
                {twinSnapshot.environment.ambientLux} lx
              </span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">GLARE FACTOR</span>
              <span className="font-mono font-bold text-cyan-300">
                {Math.round(twinSnapshot.environment.glareFactor * 100)}%
              </span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
              <span className="text-slate-400 block text-[10px]">BEAM COHERENCE</span>
              <span className="font-mono font-bold text-emerald-300">
                {twinSnapshot.environment.lightBeamCoherence}%
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Crystal Digital Twins and Real-Time Node Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[ruby, azure, emerald].map((c) => {
              if (!c) return null;
              return (
                <div
                  key={c.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: c.colorHex }}
                    />
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                        c.isAligned
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {c.isAligned ? 'RESONATING' : 'MISALIGNED'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-white truncate">{c.name}</h4>
                    <p className="text-[11px] font-mono text-slate-400 mt-1">
                      Angle: <strong className="text-slate-200">{c.rotationYDeg}°</strong> (
                      {c.rotationYRad.toFixed(2)} rad)
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">
                      Freq: <strong className="text-slate-200">{c.frequencyHz} Hz</strong>
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Resonance</span>
                      <span className="font-mono font-bold text-cyan-400">
                        {c.resonancePercent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${c.resonancePercent}%`,
                          backgroundColor: c.colorHex,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Node Status Matrix */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Digital Twin Optical Chain Matrix</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2">Node</th>
                    <th className="pb-2">Position [X, Y, Z]</th>
                    <th className="pb-2">Light Rx</th>
                    <th className="pb-2">Reflect Tx</th>
                    <th className="pb-2">Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {Object.values(objects).map((node) => (
                    <tr key={node.id}>
                      <td className="py-2 font-semibold text-white">{node.name}</td>
                      <td className="py-2 text-slate-400">
                        [{node.position.map((p) => p.toFixed(1)).join(', ')}]
                      </td>
                      <td className="py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            node.isReceivingLight
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {node.isReceivingLight ? 'ACTIVE' : 'IDLE'}
                        </span>
                      </td>
                      <td className="py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            node.isReflectingToTarget
                              ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/30'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {node.isReflectingToTarget ? 'TRANSMITTING' : 'OFFLINE'}
                        </span>
                      </td>
                      <td className="py-2 text-emerald-400 font-bold">{node.healthScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Simulation Lab Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-950/60 border border-amber-500/40 rounded-lg text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>SCENARIO SIMULATION LAB</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded uppercase font-bold">
                  SANDBOX EXPERIMENTATION
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Stress-test optical dropouts, thermal cadence jitters, and network partitions with strict zero hardware contamination.
              </p>
            </div>
          </div>

          {/* Simulation Controls */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <select
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
            >
              {scenarios.map((scen) => (
                <option key={scen.scenarioId} value={scen.scenarioId}>
                  [{scen.severity}] {scen.name}
                </option>
              ))}
            </select>

            {(!activeSession || activeSession.status === 'IDLE' || activeSession.status === 'COMPLETED') && (
              <button
                onClick={handleStartSimulation}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Scenario</span>
              </button>
            )}

            {activeSession && activeSession.status === 'RUNNING' && (
              <button
                onClick={handlePauseSimulation}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            )}

            {activeSession && activeSession.status === 'PAUSED' && (
              <button
                onClick={handleResumeSimulation}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume</span>
              </button>
            )}

            {activeSession && (
              <button
                onClick={handleResetSimulation}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Scenario Metadata */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3.5 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Active Scenario Configuration
            </span>
            <p className="text-slate-200 mt-0.5">{selectedScenario.description}</p>
          </div>
          <div className="flex items-center space-x-3 font-mono text-[11px] shrink-0">
            <span className="text-slate-400">
              Drop Rate: <strong className="text-amber-400">{selectedScenario.parameters.simulatedFrameDropRate * 100}%</strong>
            </span>
            <span className="text-slate-400">
              Occlusion: <strong className="text-rose-400">{selectedScenario.parameters.simulatedJointOcclusionCount} joints</strong>
            </span>
            <span className="text-slate-400">
              Net Spike: <strong className="text-cyan-400">{selectedScenario.parameters.networkLatencySpikeMs}ms</strong>
            </span>
          </div>
        </div>

        {/* Active Session Telemetry & Variance Breakdown */}
        {activeSession ? (
          <div className="space-y-5">
            {/* Real-Time Session Status Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase">Session Status</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    activeSession.status === 'RUNNING'
                      ? 'text-amber-400 animate-pulse'
                      : activeSession.status === 'COMPLETED'
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }`}
                >
                  {activeSession.status}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase">Elapsed Time</span>
                <span className="text-sm font-bold font-mono text-cyan-400">
                  {activeSession.elapsedSeconds}s / {selectedScenario.durationSeconds}s
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase">Simulated Cadence</span>
                <span className="text-sm font-bold font-mono text-rose-400">
                  {activeSession.simulatedMetrics.fps} FPS
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase">Tracked Joints</span>
                <span className="text-sm font-bold font-mono text-purple-400">
                  {activeSession.simulatedMetrics.trackedJoints} / 25
                </span>
              </div>
            </div>

            {/* Baseline vs Simulated Variance Table */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-amber-400" />
                <span>Baseline vs Simulated Telemetry Variance</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2">Metric Channel</th>
                      <th className="pb-2">Physical Baseline</th>
                      <th className="pb-2">Simulated Stress</th>
                      <th className="pb-2">Delta Variance</th>
                      <th className="pb-2">Stress Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-2 font-semibold">Frame Rate (FPS)</td>
                      <td className="py-2 text-slate-400">{activeSession.baselineMetrics.fps} FPS</td>
                      <td className="py-2 text-rose-400 font-bold">{activeSession.simulatedMetrics.fps} FPS</td>
                      <td className="py-2 text-rose-400">{activeSession.variance.fpsDelta} FPS</td>
                      <td className="py-2 text-slate-400">
                        {activeSession.variance.fpsDelta < -20 ? 'Critical Cadence Drop' : 'Nominal'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-semibold">Network Latency (RTT)</td>
                      <td className="py-2 text-slate-400">{activeSession.baselineMetrics.latencyMs} ms</td>
                      <td className="py-2 text-amber-400 font-bold">{activeSession.simulatedMetrics.latencyMs} ms</td>
                      <td className="py-2 text-amber-400">+{activeSession.variance.latencyDeltaMs} ms</td>
                      <td className="py-2 text-slate-400">
                        {activeSession.variance.latencyDeltaMs > 500 ? 'Queue Backpressure Warning' : 'Manageable'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-semibold">Tracked Joints (Hands)</td>
                      <td className="py-2 text-slate-400">{activeSession.baselineMetrics.trackedJoints} / 25</td>
                      <td className="py-2 text-cyan-400 font-bold">{activeSession.simulatedMetrics.trackedJoints} / 25</td>
                      <td className="py-2 text-rose-400">-{activeSession.variance.jointsLost} joints</td>
                      <td className="py-2 text-slate-400">
                        {activeSession.variance.jointsLost > 10 ? 'Optical Occlusion Event' : 'Stable'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-semibold">Stability Score</td>
                      <td className="py-2 text-slate-400">{activeSession.baselineMetrics.stabilityScore}%</td>
                      <td className="py-2 text-emerald-400 font-bold">{activeSession.simulatedMetrics.stabilityScore}%</td>
                      <td className="py-2 text-amber-400">{activeSession.variance.stabilityShift}%</td>
                      <td className="py-2 text-slate-400">
                        {activeSession.variance.stabilityShift < -30 ? 'High Failure Probability' : 'Adequate'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Predictive Multi-Horizon Projections (1s, 5s, 15s) */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Predictive Future-State Digital Twin Projections</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {activeSession.predictions.map((pred) => (
                  <div
                    key={pred.horizonSeconds}
                    className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold font-mono text-cyan-400">
                          +{pred.horizonSeconds}s Horizon
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                          Conf: {Math.round(pred.confidenceScore * 100)}%
                        </span>
                      </div>
                      <div className="text-xs font-mono space-y-1 text-slate-300">
                        <div>
                          Cadence:{' '}
                          <span className="font-bold text-white">{pred.predictedFps} FPS</span>
                        </div>
                        <div>
                          Tracking Confidence:{' '}
                          <span className="font-bold text-white">
                            {pred.predictedJointConfidence}
                          </span>
                        </div>
                        <div>
                          Dropout Risk:{' '}
                          <span className="font-bold text-rose-400">
                            {pred.trackingDropoutRiskPercent}%
                          </span>
                        </div>
                        <div>
                          Incident Prob:{' '}
                          <span className="font-bold text-amber-400">
                            {pred.incidentProbabilityPercent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {pred.predictedAnomalies.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase block mb-1">
                          Projected Anomalies
                        </span>
                        <ul className="text-[11px] text-rose-300 list-disc list-inside space-y-0.5">
                          {pred.predictedAnomalies.map((anom, idx) => (
                            <li key={idx} className="truncate">{anom}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Collective 6-Agent AI Evaluations */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Collective 6-Agent Intelligence Evaluations</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(activeSession.agentEvaluations).map(([role, evalData]) => (
                  <div
                    key={role}
                    className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[11px] font-bold text-slate-200 uppercase">
                          {role.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400">
                          {Math.round(evalData.confidence * 100)}%
                        </span>
                      </div>
                      <span className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-semibold mb-2">
                        {evalData.verdict}
                      </span>
                      <ul className="text-[11px] text-slate-400 list-disc list-inside space-y-1">
                        {evalData.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-950/40 border border-dashed border-slate-800 rounded-lg">
            <Radio className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">
              Simulation Sandbox Idle
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Select a stress scenario above and click &quot;Start Scenario&quot; to begin simulated environmental perturbation, variance comparison, and multi-agent predictive analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
