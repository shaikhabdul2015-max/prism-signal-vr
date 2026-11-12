/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sensor Intelligence Dashboard (Phase 30)
 * Enterprise-grade Command & Control visualization for:
 * 1. Sensor Intelligence Overview
 * 2. Sensor Availability Monitor
 * 3. Real-Time Telemetry Viewer
 * 4. Environmental Awareness Center
 * 5. Sensor Fusion Monitor
 * 6. Anomaly Detection Center
 * 7. Environmental Prediction
 * 8. Sensor Health Monitor
 * 9. Environmental Event Timeline
 * 10. Multi-Agent Intelligence Reports
 * 11. Sensor Data Provenance & Privacy Controls
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';
import {
  SensorType,
  AnomalySeverity,
  EnvironmentalState,
  SensorCapabilityRecord,
  NormalizedSensorTelemetry,
  EnvironmentalContext,
  SensorFusionSummary,
  SensorAnomaly,
  EnvironmentalPrediction,
  SensorHealthRecord,
  EnvironmentalEventRecord,
  SensorConsensusReport,
  SensorPrivacySettings,
} from '../types/phase30';
import { realTimeSensorIntelligenceEngine } from '../engines/RealTimeSensorIntelligenceEngine';
import { environmentalAwarenessEngine } from '../engines/EnvironmentalAwarenessEngine';
import { sensorFusionEngine } from '../engines/SensorFusionEngine';
import { sensorAnomalyDetectionEngine } from '../engines/SensorAnomalyDetectionEngine';
import { environmentalPredictionEngine } from '../engines/EnvironmentalPredictionEngine';
import { sensorHealthMonitor } from '../engines/SensorHealthMonitor';
import { environmentalEventOrchestrator } from '../engines/EnvironmentalEventOrchestrator';
import { multiAgentSensorIntelligence } from '../engines/MultiAgentSensorIntelligence';
import {
  Activity,
  Radio,
  Gauge,
  Compass,
  Layers,
  AlertTriangle,
  TrendingUp,
  HeartPulse,
  Clock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Search,
  CheckCircle2,
  RefreshCw,
  Eye,
  Lock,
  Cpu,
  Zap,
} from 'lucide-react';

interface SensorIntelligenceDashboardProps {
  telemetry: VRTelemetry;
  activeIncidents?: IncidentRecord[];
  isPhysicalVRActive?: boolean;
}

export const SensorIntelligenceDashboard: React.FC<SensorIntelligenceDashboardProps> = ({
  telemetry,
  activeIncidents = [],
  isPhysicalVRActive = false,
}) => {
  const [activeSubView, setActiveSubView] = useState<
    | 'overview'
    | 'availability'
    | 'telemetry'
    | 'awareness'
    | 'fusion'
    | 'anomalies'
    | 'prediction'
    | 'health'
    | 'events'
    | 'agents'
    | 'privacy'
  >('overview');

  const [capabilities, setCapabilities] = useState<SensorCapabilityRecord[]>(() =>
    realTimeSensorIntelligenceEngine.getAllCapabilities()
  );
  const [normalizedTelemetry, setNormalizedTelemetry] = useState<NormalizedSensorTelemetry>(() =>
    realTimeSensorIntelligenceEngine.getLatestTelemetry()
  );
  const [context, setContext] = useState<EnvironmentalContext>(() =>
    environmentalAwarenessEngine.getContext()
  );
  const [fusionSummary, setFusionSummary] = useState<SensorFusionSummary | null>(() =>
    sensorFusionEngine.getLatestSummary()
  );
  const [anomalies, setAnomalies] = useState<SensorAnomaly[]>(() =>
    sensorAnomalyDetectionEngine.getAllAnomalies()
  );
  const [prediction, setPrediction] = useState<EnvironmentalPrediction | null>(() =>
    environmentalPredictionEngine.getLatestPrediction()
  );
  const [healthRecords, setHealthRecords] = useState<SensorHealthRecord[]>(() =>
    sensorHealthMonitor.getAllRecords()
  );
  const [events, setEvents] = useState<EnvironmentalEventRecord[]>(() =>
    environmentalEventOrchestrator.getAllEvents()
  );
  const [consensusReport, setConsensusReport] = useState<SensorConsensusReport | null>(() =>
    multiAgentSensorIntelligence.getLatestConsensus()
  );
  const [privacySettings, setPrivacySettings] = useState<SensorPrivacySettings>(() =>
    realTimeSensorIntelligenceEngine.getPrivacySettings()
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('ALL');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Ingest incoming application telemetry into the pipeline
  useEffect(() => {
    const norm = realTimeSensorIntelligenceEngine.ingestTelemetry(telemetry, isPhysicalVRActive);
    setNormalizedTelemetry(norm);

    const ctx = environmentalAwarenessEngine.evaluateTelemetry(norm);
    setContext(ctx);

    const fused = sensorFusionEngine.fuse(norm);
    setFusionSummary(fused);

    const newAnoms = sensorAnomalyDetectionEngine.analyzeTelemetry(norm);
    if (newAnoms.length > 0) {
      newAnoms.forEach((a) => environmentalEventOrchestrator.ingestAnomaly(a));
    }
    setAnomalies(sensorAnomalyDetectionEngine.getAllAnomalies());

    const pred = environmentalPredictionEngine.predict(norm, 15);
    setPrediction(pred);

    const health = sensorHealthMonitor.evaluateHealth(norm);
    setHealthRecords(health);

    const council = multiAgentSensorIntelligence.evaluateCouncil(norm, ctx, fused, sensorAnomalyDetectionEngine.getAllAnomalies());
    setConsensusReport(council);
  }, [telemetry, isPhysicalVRActive]);

  // Subscribe to real-time events
  useEffect(() => {
    const unsubEvents = environmentalEventOrchestrator.subscribe((evts) => setEvents(evts));
    const unsubAnom = sensorAnomalyDetectionEngine.subscribe((anoms) => setAnomalies(anoms));
    const unsubHealth = sensorHealthMonitor.subscribe((hrs) => setHealthRecords(hrs));
    const unsubTelemetry = realTimeSensorIntelligenceEngine.subscribe((t) => setNormalizedTelemetry(t));

    return () => {
      unsubEvents();
      unsubAnom();
      unsubHealth();
      unsubTelemetry();
    };
  }, []);

  const handleStartCollection = useCallback(() => {
    const started = realTimeSensorIntelligenceEngine.startCollection();
    if (started) {
      setStatusMessage('Real-time browser sensor listeners activated.');
      setTimeout(() => setStatusMessage(null), 3500);
    }
  }, []);

  const handleStopCollection = useCallback(() => {
    realTimeSensorIntelligenceEngine.stopCollection();
    setStatusMessage('Real-time browser sensor collection paused.');
    setTimeout(() => setStatusMessage(null), 3500);
  }, []);

  const handleRequestPermission = useCallback(async (sensor: SensorType) => {
    const granted = await realTimeSensorIntelligenceEngine.requestSensorPermission(sensor);
    setCapabilities(realTimeSensorIntelligenceEngine.discoverCapabilities());
    setStatusMessage(granted ? `Permission granted for ${sensor}.` : `Permission denied or unsupported for ${sensor}.`);
    setTimeout(() => setStatusMessage(null), 3500);
  }, []);

  const handleAcknowledgeAnomaly = useCallback((id: string) => {
    sensorAnomalyDetectionEngine.acknowledgeAnomaly(id);
    setAnomalies(sensorAnomalyDetectionEngine.getAllAnomalies());
  }, []);

  const handleToggleSensor = useCallback((sensor: SensorType) => {
    const updated = realTimeSensorIntelligenceEngine.updatePrivacySettings({
      allowedSensors: {
        ...privacySettings.allowedSensors,
        [sensor]: !privacySettings.allowedSensors[sensor],
      },
    });
    setPrivacySettings(updated);
  }, [privacySettings]);

  // Filtered anomalies
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((a) => {
      const matchesSearch =
        searchQuery === '' ||
        a.explanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.sourceSensor.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity =
        selectedSeverityFilter === 'ALL' || a.severity === selectedSeverityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [anomalies, searchQuery, selectedSeverityFilter]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        searchQuery === '' ||
        e.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.eventType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity =
        selectedSeverityFilter === 'ALL' || e.severity === selectedSeverityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [events, searchQuery, selectedSeverityFilter]);

  const activeSensorsCount = healthRecords.filter((h) => h.healthState === 'ONLINE').length;
  const criticalAnomaliesCount = anomalies.filter((a) => a.severity === 'CRITICAL' && !a.acknowledged).length;

  return (
    <div className="flex flex-col gap-4 font-mono text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950 border border-cyan-500/40 rounded-lg text-cyan-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 tracking-wider">
                REAL-TIME SENSOR INTELLIGENCE & ENVIRONMENTAL AWARENESS
              </h2>
              <span className="px-2 py-0.5 text-[10px] rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                PHASE 30
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Browser IMU telemetry, multi-sensor fusion, anomaly detection, predictive environmental dynamics, and multi-agent consensus.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {realTimeSensorIntelligenceEngine.isRunning() ? (
            <button
              onClick={handleStopCollection}
              className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 rounded-lg text-xs font-bold transition-colors"
            >
              Pause Sensor Stream
            </button>
          ) : (
            <button
              onClick={handleStartCollection}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 border border-cyan-400 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Start Sensor Stream
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="p-2.5 bg-cyan-950/70 border border-cyan-500 rounded-lg text-xs text-cyan-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* KPI Ribbon Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
          <span className="text-slate-500 text-[10px] uppercase">ENVIRONMENT STATE</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                context.state === 'NORMAL'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : context.state === 'CHANGING'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  : context.state === 'UNSTABLE'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              {context.state}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
          <span className="text-slate-500 text-[10px] uppercase">ONLINE SENSORS</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base font-bold text-cyan-400">{activeSensorsCount}</span>
            <span className="text-slate-500 text-[10px]">/ {healthRecords.length} modalities</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
          <span className="text-slate-500 text-[10px] uppercase">FUSION CONFIDENCE</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base font-bold text-emerald-400">
              {Math.round((fusionSummary?.overallConfidence || 0.8) * 100)}%
            </span>
            <span className="text-slate-500 text-[10px]">calibrated</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
          <span className="text-slate-500 text-[10px] uppercase">ACTIVE ANOMALIES</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-base font-bold ${criticalAnomaliesCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {anomalies.filter((a) => !a.acknowledged).length}
            </span>
            <span className="text-slate-500 text-[10px]">({criticalAnomaliesCount} crit)</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
          <span className="text-slate-500 text-[10px] uppercase">PREDICTED STABILITY</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base font-bold text-purple-400">
              {prediction?.trackingStabilityEstimate ?? 90}%
            </span>
            <span className="text-slate-500 text-[10px]">next 15s</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
          <span className="text-slate-500 text-[10px] uppercase">PROVENANCE TIER</span>
          <div className="flex items-center gap-1 mt-1">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
              {normalizedTelemetry.provenance}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-View Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 pb-2 text-xs">
        {[
          { id: 'overview', label: '1. OVERVIEW', icon: Activity },
          { id: 'availability', label: `2. CAPABILITIES (${capabilities.filter((c) => c.isSupported).length})`, icon: Radio },
          { id: 'telemetry', label: '3. LIVE TELEMETRY', icon: Gauge },
          { id: 'awareness', label: `4. ENVIRONMENT (${context.state})`, icon: Compass },
          { id: 'fusion', label: '5. SENSOR FUSION', icon: Layers },
          { id: 'anomalies', label: `6. ANOMALIES (${anomalies.filter((a) => !a.acknowledged).length})`, icon: AlertTriangle },
          { id: 'prediction', label: '7. PREDICTIONS', icon: TrendingUp },
          { id: 'health', label: '8. SENSOR HEALTH', icon: HeartPulse },
          { id: 'events', label: `9. EVENTS (${events.length})`, icon: Clock },
          { id: 'agents', label: '10. AGENT COUNCIL (6)', icon: Cpu },
          { id: 'privacy', label: '11. PRIVACY & PERMISSIONS', icon: Lock },
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

      {/* SUB-VIEW 1: OVERVIEW */}
      {activeSubView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
          {/* Environmental State Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 uppercase">ENVIRONMENTAL DYNAMICS</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {context.isSimulated ? 'SIMULATED DATA' : 'BROWSER TELEMETRY'}
              </span>
            </div>
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col gap-2">
              <div className="text-sm font-bold text-slate-100">{context.dominantDynamics}</div>
              <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                <span>Acceleration: <strong className="text-cyan-400">{context.accelerationMagnitude} m/s²</strong></span>
                <span>Angular Vol: <strong className="text-purple-400">{context.angularVelocityMagnitude}°</strong></span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className="bg-cyan-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, (context.accelerationMagnitude / 20) * 100)}%` }}
                />
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase">RECOMMENDED RESPONSES</span>
              <ul className="mt-1 space-y-1">
                {context.recommendations.map((rec, i) => (
                  <li key={i} className="text-slate-300 flex items-start gap-1.5 text-[11px]">
                    <span className="text-cyan-400">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Consensus Report Summary */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 uppercase">MULTI-AGENT VERDICT</span>
              <span className="text-[10px] text-slate-500">
                {consensusReport?.disagreementsCount || 0} disputes
              </span>
            </div>
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-slate-200">System Verdict: {consensusReport?.systemVerdict}</div>
                  <div className="text-[10px] text-slate-400">Score: {consensusReport?.overallSensorScore}/100</div>
                </div>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase">DIRECTIVES</span>
              <ul className="mt-1 space-y-1">
                {consensusReport?.consensusDirectives.map((d, i) => (
                  <li key={i} className="text-slate-300 flex items-start gap-1.5 text-[11px]">
                    <span className="text-emerald-400">✓</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick Health Summary */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 uppercase">SENSOR MODALITY STATUS</span>
              <span className="text-[10px] text-slate-500">Phase 30 Discovery</span>
            </div>
            <div className="space-y-2">
              {healthRecords.map((hr) => (
                <div
                  key={hr.sensorType}
                  className="p-2 bg-slate-900/50 border border-slate-800 rounded flex items-center justify-between"
                >
                  <span className="font-mono text-[11px] text-slate-300">{hr.sensorType}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      hr.healthState === 'ONLINE'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : hr.healthState === 'UNSUPPORTED'
                        ? 'bg-slate-900 text-slate-500 border border-slate-700'
                        : hr.healthState === 'PERMISSION_REQUIRED'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {hr.healthState}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: SENSOR AVAILABILITY */}
      {activeSubView === 'availability' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-200">BROWSER SENSOR CAPABILITIES</h3>
              <p className="text-xs text-slate-400">
                Only native browser APIs supported by this runtime environment are queried.
              </p>
            </div>
            <button
              onClick={() => setCapabilities(realTimeSensorIntelligenceEngine.discoverCapabilities())}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs flex items-center gap-1.5 text-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Probe APIs</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {capabilities.map((cap) => (
              <div
                key={cap.sensorType}
                className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{cap.sensorType}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        cap.isSupported
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-900 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {cap.isSupported ? 'SUPPORTED' : 'UNSUPPORTED'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {cap.hardwareName || 'Standard Web Platform API'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                  <span>Permission: <strong className="text-slate-200">{cap.permissionState}</strong></span>
                  {cap.permissionState === 'prompt' && (
                    <button
                      onClick={() => handleRequestPermission(cap.sensorType)}
                      className="px-2 py-0.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded font-bold"
                    >
                      Request Permission
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: LIVE TELEMETRY */}
      {activeSubView === 'telemetry' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Orientation & Motion */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <h3 className="font-bold text-sm text-slate-200 uppercase">DEVICE IMU STREAM</h3>
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2 text-xs">
              <div className="font-bold text-cyan-400">Orientation Data:</div>
              {normalizedTelemetry.orientation ? (
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>Alpha (Z): <strong>{normalizedTelemetry.orientation.alpha.toFixed(1)}°</strong></div>
                  <div>Beta (X): <strong>{normalizedTelemetry.orientation.beta.toFixed(1)}°</strong></div>
                  <div>Gamma (Y): <strong>{normalizedTelemetry.orientation.gamma.toFixed(1)}°</strong></div>
                </div>
              ) : (
                <div className="text-slate-500">Orientation API idle or awaiting device motion.</div>
              )}

              <div className="font-bold text-purple-400 pt-2 border-t border-slate-800">Linear Acceleration:</div>
              {normalizedTelemetry.motion ? (
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>X: <strong>{normalizedTelemetry.motion.acceleration[0].toFixed(2)} m/s²</strong></div>
                  <div>Y: <strong>{normalizedTelemetry.motion.acceleration[1].toFixed(2)} m/s²</strong></div>
                  <div>Z: <strong>{normalizedTelemetry.motion.acceleration[2].toFixed(2)} m/s²</strong></div>
                </div>
              ) : (
                <div className="text-slate-500">Accelerometer stream idle.</div>
              )}
            </div>
          </div>

          {/* WebXR & Performance */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <h3 className="font-bold text-sm text-slate-200 uppercase">WEBXR & PERFORMANCE</h3>
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2 text-xs">
              <div className="font-bold text-emerald-400">WebXR Head Pose:</div>
              <div className="text-[11px] text-slate-300">
                Position: [{normalizedTelemetry.xrTracking?.headPosition.map((v) => v.toFixed(2)).join(', ')}] m
              </div>
              <div className="text-[11px] text-slate-300">
                Tracked Skeleton: <strong>{normalizedTelemetry.xrTracking?.trackedJointsCount ?? 25} / 25 joints</strong>
              </div>

              <div className="font-bold text-amber-400 pt-2 border-t border-slate-800">Cadence Performance:</div>
              <div className="flex items-center gap-4 text-[11px]">
                <span>Render FPS: <strong className="text-slate-100">{normalizedTelemetry.performance?.fps ?? 72}</strong></span>
                <span>Delta: <strong className="text-slate-100">{(normalizedTelemetry.performance?.frameDeltaMs ?? 13.88).toFixed(1)} ms</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: ENVIRONMENTAL AWARENESS */}
      {activeSubView === 'awareness' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="font-bold text-sm text-slate-200">ENVIRONMENTAL CONTEXT & BOUNDARY SURVEILLANCE</h3>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Current Environmental State:</span>
              <strong className="text-cyan-300">{context.state}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Boundary Proximity Ratio:</span>
              <strong className="text-amber-400">{Math.round(context.boundaryProximityRatio * 100)}%</strong>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-1">
              <div
                className={`h-2 rounded-full ${
                  context.boundaryProximityRatio > 0.7 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.round(context.boundaryProximityRatio * 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 mt-2">
              Chamber Boundary: <strong>[-8.0, 0.0, -8.0] to [8.0, 5.0, 8.0] meters</strong>
            </div>
          </div>

          <div className="mt-2">
            <span className="text-xs font-bold text-slate-300 uppercase">STATE CHANGE AUDIT LOG</span>
            <div className="mt-1 space-y-1">
              {environmentalAwarenessEngine.getStateHistory().map((item, i) => (
                <div key={i} className="p-2 bg-slate-900/40 border border-slate-800 rounded flex items-center justify-between text-[11px]">
                  <span className="font-bold text-cyan-400">{item.state}</span>
                  <span className="text-slate-400 truncate max-w-md">{item.reason}</span>
                  <span className="text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: SENSOR FUSION */}
      {activeSubView === 'fusion' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="font-bold text-sm text-slate-200">MULTI-SOURCE SENSOR FUSION</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
              <span className="font-bold text-cyan-400">Fused Spatial Vectors:</span>
              <div className="text-[11px] text-slate-300">
                Fused Motion: [{fusionSummary?.fusedMotionVector.join(', ')}] m/s²
              </div>
              <div className="text-[11px] text-slate-300">
                Fused Orientation: [{fusionSummary?.fusedOrientationVector.join(', ')}]°
              </div>
              <div className="text-[11px] text-slate-400">
                Contributing Modalities: {fusionSummary?.contributingSensors.join(', ') || 'None'}
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
              <span className="font-bold text-purple-400">Conflict Detection:</span>
              {fusionSummary?.conflictingSignals.length === 0 ? (
                <div className="text-emerald-400 text-[11px]">Zero divergent sensor measurements detected.</div>
              ) : (
                fusionSummary?.conflictingSignals.map((c, i) => (
                  <div key={i} className="p-1.5 bg-rose-950/40 border border-rose-900 rounded text-[11px] text-rose-300">
                    <div>{c.sensorA} vs {c.sensorB}: Δ {c.divergence}</div>
                    <div className="text-slate-400 text-[10px]">{c.reason}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 6: ANOMALIES */}
      {activeSubView === 'anomalies' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h3 className="font-bold text-sm text-slate-200">ANOMALY DETECTION REPOSITORY</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter anomalies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                />
              </div>
              <select
                value={selectedSeverityFilter}
                onChange={(e) => setSelectedSeverityFilter(e.target.value)}
                className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 mt-1">
            {filteredAnomalies.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">No active anomalies detected in current stream.</div>
            ) : (
              filteredAnomalies.map((anom) => (
                <div
                  key={anom.id}
                  className={`p-3 rounded-lg border text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                    anom.severity === 'CRITICAL'
                      ? 'bg-rose-950/40 border-rose-800'
                      : anom.severity === 'HIGH'
                      ? 'bg-amber-950/40 border-amber-800'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{anom.sourceSensor}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700">
                        {anom.severity}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(anom.timestampMs).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-slate-300 mt-1">{anom.explanation}</div>
                    <div className="text-[11px] text-cyan-400 mt-0.5">
                      Recommended: {anom.recommendedResponse}
                    </div>
                  </div>

                  {!anom.acknowledged ? (
                    <button
                      onClick={() => handleAcknowledgeAnomaly(anom.id)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[11px] text-slate-200 font-bold shrink-0"
                    >
                      Acknowledge
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-400 font-bold shrink-0">Acknowledged</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 7: PREDICTION */}
      {activeSubView === 'prediction' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="font-bold text-sm text-slate-200">ENVIRONMENTAL & TRACKING PREDICTIONS</h3>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Forecast Horizon:</span>
              <strong className="text-slate-100">{prediction?.horizonSeconds ?? 15} seconds</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Projected Environmental State:</span>
              <strong className="text-cyan-400">{prediction?.projectedState ?? 'NORMAL'}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tracking Stability Estimate:</span>
              <strong className="text-emerald-400">{prediction?.trackingStabilityEstimate ?? 90}%</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Performance Degradation Risk:</span>
              <strong className="text-amber-400">{prediction?.performanceDegradationRisk ?? 'LOW'}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Statistical Uncertainty Band:</span>
              <strong className="text-purple-400">±{Math.round((prediction?.uncertaintyBand ?? 0.12) * 100)}%</strong>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase">PREDICTIVE WARNINGS</span>
              <ul className="mt-1 space-y-1">
                {(prediction?.warnings || ['No adverse cadence or tracking deviations forecasted.']).map((w, i) => (
                  <li key={i} className="text-slate-300 text-[11px] flex items-start gap-1.5">
                    <span className="text-amber-400">⚠</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 8: SENSOR HEALTH */}
      {activeSubView === 'health' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="font-bold text-sm text-slate-200">SENSOR HEALTH & DIAGNOSTICS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {healthRecords.map((hr) => (
              <div
                key={hr.sensorType}
                className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{hr.sensorType}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        hr.healthState === 'ONLINE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : hr.healthState === 'UNSUPPORTED'
                          ? 'bg-slate-900 text-slate-500 border border-slate-700'
                          : hr.healthState === 'PERMISSION_REQUIRED'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {hr.healthState}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{hr.diagnosticNotes}</div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Frequency: {hr.eventFrequencyHz} Hz</span>
                  <span>Freshness: {hr.freshnessMs} ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 9: EVENT TIMELINE */}
      {activeSubView === 'events' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-200">ENVIRONMENTAL EVENT STREAM</h3>
            <button
              onClick={() => environmentalEventOrchestrator.clearEvents()}
              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 rounded text-xs"
            >
              Clear Log
            </button>
          </div>

          <div className="space-y-2 mt-1">
            {filteredEvents.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs">No environmental events logged.</div>
            ) : (
              filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 bg-slate-900/50 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-950 border border-slate-700 text-slate-300">
                      {evt.eventType}
                    </span>
                    <span className="text-slate-200">{evt.summary}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                    <span>Agent: {evt.assignedAgent}</span>
                    <span>{new Date(evt.timestampMs).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 10: MULTI-AGENT COUNCIL */}
      {activeSubView === 'agents' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="font-bold text-sm text-slate-200">SPECIALIST AGENTS SENSOR ASSESSMENTS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {consensusReport?.agentAssessments.map((agent) => (
              <div
                key={agent.agentRole}
                className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{agent.agentName}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        agent.assessmentVerdict === 'NOMINAL'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : agent.assessmentVerdict === 'ADVISORY'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {agent.assessmentVerdict}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {agent.keyFindings.map((f, i) => (
                      <li key={i} className="text-[11px] text-slate-300 flex items-start gap-1">
                        <span className="text-cyan-400">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                  Confidence: <strong className="text-slate-200">{agent.confidenceScore}%</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 11: PRIVACY & PERMISSIONS */}
      {activeSubView === 'privacy' && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="font-bold text-sm text-slate-200">DATA PRIVACY, RETENTION & SECURITY CONTROLS</h3>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-200">Global Sensor Telemetry Collection</div>
                <div className="text-[11px] text-slate-400">Master switch for real-time sensor listener binding.</div>
              </div>
              <button
                onClick={() =>
                  setPrivacySettings(
                    realTimeSensorIntelligenceEngine.updatePrivacySettings({
                      isCollectionEnabled: !privacySettings.isCollectionEnabled,
                    })
                  )
                }
                className={`px-3 py-1 rounded font-bold text-xs ${
                  privacySettings.isCollectionEnabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {privacySettings.isCollectionEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="font-bold text-slate-300 uppercase">Per-Modality Toggles:</span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {Object.keys(privacySettings.allowedSensors).map((sensorKey) => (
                  <button
                    key={sensorKey}
                    onClick={() => handleToggleSensor(sensorKey as SensorType)}
                    className={`p-2 rounded border text-left text-[11px] flex items-center justify-between ${
                      privacySettings.allowedSensors[sensorKey as SensorType]
                        ? 'bg-cyan-950/60 border-cyan-800 text-cyan-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span>{sensorKey}</span>
                    <span>{privacySettings.allowedSensors[sensorKey as SensorType] ? 'ON' : 'OFF'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div>• Data Retention Horizon: <strong>{privacySettings.dataRetentionSeconds} seconds</strong></div>
              <div>• External Transmission to AI Providers: <strong>STRICTLY DISABLED BY DEFAULT</strong></div>
              <div>• Precise Location (GPS): <strong>NEVER QUERIED OR COLLECTED</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
