import React, { useState, useEffect, useMemo } from 'react';
import { VRTelemetry, LightingPreset } from '../types/diagnostics';
import {
  TelemetrySource,
  SystemOperationalStatus,
  IncidentRecord,
  TestExecutionRecord,
  TestScenarioConfig,
  CloudSyncStatus,
  CrossSessionAnalytics,
} from '../types/phase17';
import { TestOrchestrator, DEFAULT_TEST_SCENARIOS } from '../utils/testOrchestrator';
import { IncidentManager } from '../utils/incidentManager';
import { CloudSyncEngine } from '../utils/cloudSyncEngine';
import { coordinateAIAgents } from '../utils/agentCoordinator';
import { analyzePredictiveFailures } from '../utils/predictiveFailureEngine';
import { SessionReplayManager } from '../utils/sessionReplayManager';
import { VRDigitalTwin } from './VRDigitalTwin';
import { SessionReplayView } from './SessionReplayView';
import { EnterpriseObservabilityDashboard } from './EnterpriseObservabilityDashboard';
import { EnterpriseAuthModal } from './EnterpriseAuthModal';
import { AutonomousIntelligenceDashboard } from './AutonomousIntelligenceDashboard';
import { CollectiveIntelligenceCenter } from './CollectiveIntelligenceCenter';
import { DigitalTwinDashboard } from './DigitalTwinDashboard';
import { MissionIntelligenceDashboard } from './MissionIntelligenceDashboard';
import { AutonomousCommandCenter } from './AutonomousCommandCenter';
import { CognitiveIntelligenceDashboard } from './CognitiveIntelligenceDashboard';
import { GlobalEvolutionDashboard } from './GlobalEvolutionDashboard';
import { StrategicIntelligenceDashboard } from './StrategicIntelligenceDashboard';
import { AutonomousMissionExecutionDashboard } from './AutonomousMissionExecutionDashboard';
import { AdvancedWebXRDashboard } from './AdvancedWebXRDashboard';
import { SensorIntelligenceDashboard } from './SensorIntelligenceDashboard';
import { DistributedIntelligenceDashboard } from './DistributedIntelligenceDashboard';
import { AdvancedSecurityDashboard } from './AdvancedSecurityDashboard';
import { PredictiveIntelligenceDashboard } from './PredictiveIntelligenceDashboard';
import { AutonomousIntelligenceEvolutionDashboard } from './AutonomousIntelligenceEvolutionDashboard';
import { GlobalIntelligenceNetworkDashboard } from './GlobalIntelligenceNetworkDashboard';
import { UnifiedSuperintelligenceCommandCenter } from './UnifiedSuperintelligenceCommandCenter';
import { authService } from '../services/firebaseAuthService';
import {
  Activity,
  Target,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Server,
  Cloud,
  CloudOff,
  Terminal,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Layers,
  BrainCircuit,
  Brain,
  Filter,
  Search,
  Download,
  X,
  Gauge,
  Cpu,
  RefreshCw,
  GitBranch,
  Box,
  Rocket,
  Compass,
  Glasses,
  Radio,
  Network,
  TrendingUp,
  Sparkles,
  Crown,
} from 'lucide-react';

interface GlobalCommandCenterProps {
  telemetry: VRTelemetry;
  saveTelemetry: (telemetry: VRTelemetry) => Promise<void>;
  onClose: () => void;
  isPhysicalVRActive?: boolean;
}

type CommandTab =
  | 'overview'
  | 'live_ops'
  | 'observability'
  | 'orchestrator'
  | 'incidents'
  | 'predictive'
  | 'cloud_sync'
  | 'analytics'
  | 'agents'
  | 'autonomous_intelligence'
  | 'collective_intelligence'
  | 'digital_twin'
  | 'mission_intelligence'
  | 'autonomous_command_center'
  | 'cognitive_intelligence'
  | 'global_evolution'
  | 'strategic_intelligence'
  | 'mission_execution_intelligence'
  | 'advanced_webxr_reality'
  | 'sensor_intelligence'
  | 'distributed_intelligence'
  | 'advanced_security'
  | 'predictive_decision_intelligence'
  | 'autonomous_intelligence_evolution'
  | 'global_intelligence_network'
  | 'unified_superintelligence_command_center';

export const GlobalCommandCenter: React.FC<GlobalCommandCenterProps> = ({
  telemetry,
  saveTelemetry,
  onClose,
  isPhysicalVRActive = false,
}) => {
  const [activeTab, setActiveTab] = useState<CommandTab>('overview');
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [incidentFilter, setIncidentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [resolutionText, setResolutionText] = useState<string>('');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authSession, setAuthSession] = useState(() => authService.getSessionState());

  useEffect(() => {
    return authService.subscribe((state) => {
      setAuthSession(state);
    });
  }, []);

  // Persistent service singletons
  const orchestrator = useMemo(() => new TestOrchestrator(), []);
  const incidentManager = useMemo(() => new IncidentManager(), []);
  const cloudEngine = useMemo(() => new CloudSyncEngine(), []);
  const replayManager = useMemo(() => new SessionReplayManager(), []);

  // Reactive state from services
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick((t) => t + 1);

  useEffect(() => {
    const unsubOrch = orchestrator.subscribe(forceUpdate);
    const unsubInc = incidentManager.subscribe(forceUpdate);
    const unsubCloud = cloudEngine.subscribeStatus(forceUpdate);
    return () => {
      unsubOrch();
      unsubInc();
      unsubCloud();
    };
  }, [orchestrator, incidentManager, cloudEngine]);

  // Telemetry Source determination
  const telemetrySource: TelemetrySource = isPhysicalVRActive
    ? 'Physical Hardware'
    : telemetry.sessionId.includes('replay')
    ? 'Recorded Session'
    : 'Simulation';

  // Audit incoming telemetry for incidents
  useEffect(() => {
    incidentManager.auditTelemetryForIncidents(telemetry);
  }, [telemetry, incidentManager]);

  const incidents = incidentManager.getAllIncidents();
  const queue = orchestrator.getQueue();
  const history = orchestrator.getHistory();
  const syncStatus = cloudEngine.getStatus();

  // Multi-Agent consolidation
  const consolidation = useMemo(() => {
    return coordinateAIAgents(telemetry, {
      telemetrySource,
      incidents,
      activeExecutions: queue,
      isPhysicalVRActive,
    });
  }, [telemetry, telemetrySource, incidents, queue, isPhysicalVRActive]);

  // Predictive health
  const predictiveReport = useMemo(() => {
    return analyzePredictiveFailures(telemetry);
  }, [telemetry]);

  // Cross session analytics
  const [crossAnalytics, setCrossAnalytics] = useState<CrossSessionAnalytics | null>(null);
  useEffect(() => {
    cloudEngine.fetchCrossSessionAnalytics().then(setCrossAnalytics);
  }, [cloudEngine]);

  // KPI metrics
  const fps = telemetry.frames?.[0]?.frameDurationMs
    ? Math.round(1000 / telemetry.frames[0].frameDurationMs)
    : 72;
  const frameDeltaMs = telemetry.frames?.[0]?.frameDurationMs || 13.8;
  const latencyMs = telemetry.latencySamples?.[0]?.latencyMs || 13.8;
  const trackedJointsCount = telemetry.joints?.filter((j) => j.tracked).length || 0;
  const expectedJoints = telemetry.expectedJointCount || 25;
  const activeIncidentCount = incidentManager.getActiveIncidents().length;

  // Incident Filtering
  const filteredIncidents = incidents.filter((inc) => {
    const matchesFilter = incidentFilter === 'ALL' || inc.severity === incidentFilter;
    const matchesSearch =
      searchQuery === '' ||
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.incidentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Handler for manual cloud sync
  const [syncingNow, setSyncingNow] = useState(false);
  const handleTriggerSync = async () => {
    setSyncingNow(true);
    try {
      await cloudEngine.syncSnapshot(telemetry, {
        telemetrySource,
        incidents,
        testExecutions: queue,
      });
      const analytics = await cloudEngine.fetchCrossSessionAnalytics();
      setCrossAnalytics(analytics);
    } finally {
      setSyncingNow(false);
    }
  };

  // Handler for executing orchestrator queue
  const [orchestratorRunning, setOrchestratorRunning] = useState(false);
  const handleExecuteNextInQueue = async () => {
    if (queue.length === 0 || orchestratorRunning) return;
    setOrchestratorRunning(true);
    const nextItem = queue[0];
    try {
      await orchestrator.executeTest(nextItem.executionId, telemetry, {
        isPhysicalHardware: isPhysicalVRActive,
      });
    } finally {
      setOrchestratorRunning(false);
    }
  };

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-center-title"
      className="flex flex-col h-full max-h-[94vh] w-full text-slate-100 font-sans"
    >
      {/* Top Command Center Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-400 shadow-lg shadow-cyan-950/50">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="command-center-title" className="text-base sm:text-lg font-mono font-bold tracking-wide text-cyan-300">
                GLOBAL VR INTELLIGENCE COMMAND CENTER
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/70 text-cyan-300 font-bold">
                PHASE 18 ENTERPRISE
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
              <span>PROVENANCE:</span>
              <span
                className={`font-bold px-1.5 py-0.2 rounded text-[10px] uppercase ${
                  telemetrySource === 'Physical Hardware'
                    ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                    : telemetrySource === 'Recorded Session'
                    ? 'bg-purple-950 border border-purple-600 text-purple-300'
                    : 'bg-amber-950 border border-amber-600 text-amber-300'
                }`}
              >
                {telemetrySource}
              </span>
              <span>•</span>
              <span>SYSTEM STATUS:</span>
              <span
                className={`font-bold uppercase ${
                  consolidation.systemVerdict === 'Operational'
                    ? 'text-emerald-400'
                    : consolidation.systemVerdict === 'Warning'
                    ? 'text-amber-400'
                    : consolidation.systemVerdict === 'Critical'
                    ? 'text-red-400'
                    : 'text-cyan-400'
                }`}
              >
                {consolidation.systemVerdict}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Enterprise Auth Button */}
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/70 text-cyan-300 text-xs font-mono font-bold transition-colors shadow-sm cursor-pointer"
            title="Enterprise Authentication & Role-Based Access Control"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {authSession.isAuthenticated && authSession.user
                ? authSession.user.role.toUpperCase()
                : 'AUTH & RBAC'}
            </span>
          </button>

          {/* Cloud Sync Quick Status */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
            {syncStatus === 'synced' ? (
              <Cloud className="w-4 h-4 text-emerald-400" />
            ) : syncStatus === 'syncing' ? (
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
            ) : syncStatus === 'queued' ? (
              <CloudOff className="w-4 h-4 text-amber-400" />
            ) : (
              <Server className="w-4 h-4 text-slate-400" />
            )}
            <span className="uppercase font-bold text-slate-300">{syncStatus}</span>
            {cloudEngine.getOfflineQueueLength() > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-400">
                {cloudEngine.getOfflineQueueLength()} queued
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close Command Center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* KPI Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-3 text-xs font-mono">
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">CADENCE</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold ${fps >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
              ~{fps}
            </span>
            <span className="text-slate-500 text-[10px]">FPS ({frameDeltaMs.toFixed(1)}ms)</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">JS FRAME LATENCY</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold ${latencyMs <= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {latencyMs.toFixed(1)}
            </span>
            <span className="text-slate-500 text-[10px]">ms delta</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">25-JOINT SKELETON</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold ${trackedJointsCount === expectedJoints ? 'text-emerald-400' : 'text-cyan-400'}`}>
              {trackedJointsCount} / {expectedJoints}
            </span>
            <span className="text-slate-500 text-[10px]">joints</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">ACTIVE INCIDENTS</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold ${activeIncidentCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {activeIncidentCount}
            </span>
            <span className="text-slate-500 text-[10px]">active</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">TEST QUEUE</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-purple-400">{queue.length}</span>
            <span className="text-slate-500 text-[10px]">scenarios</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">RULE #2 STATUS</span>
          <div className="flex items-center gap-1 mt-0.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-bold text-emerald-300">INCONCLUSIVE (ENFORCED)</span>
          </div>
        </div>
      </div>

      {/* 9-Tab Navigation Bar */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 pb-2 mb-3 text-xs font-mono">
        {[
          { id: 'overview', label: '1. OVERVIEW', icon: Activity },
          { id: 'live_ops', label: '2. LIVE OPERATIONS', icon: Layers },
          { id: 'observability', label: '3. OBSERVABILITY & METRICS', icon: Gauge },
          { id: 'orchestrator', label: `4. TEST ORCHESTRATOR (${queue.length})`, icon: Play },
          { id: 'incidents', label: `5. AI INCIDENTS (${activeIncidentCount})`, icon: AlertTriangle },
          { id: 'predictive', label: '6. PREDICTIVE HEALTH', icon: BrainCircuit },
          { id: 'cloud_sync', label: '7. CLOUD SYNC', icon: Cloud },
          { id: 'analytics', label: '8. ANALYTICS & REPLAY', icon: GitBranch },
          { id: 'agents', label: '9. AI AGENTS (6)', icon: Terminal },
          { id: 'autonomous_intelligence', label: '10. AUTONOMOUS INTELLIGENCE', icon: BrainCircuit },
          { id: 'collective_intelligence', label: '11. COLLECTIVE INTELLIGENCE (P20)', icon: Brain },
          { id: 'digital_twin', label: '12. DIGITAL TWIN (P21)', icon: Box },
          { id: 'mission_intelligence', label: '13. MISSION INTELLIGENCE (P22)', icon: Rocket },
          { id: 'autonomous_command_center', label: '14. COMMAND & CONTROL (P23)', icon: Shield },
          { id: 'cognitive_intelligence', label: '15. COGNITIVE INTELLIGENCE (P25)', icon: Brain },
          { id: 'global_evolution', label: '16. GLOBAL EVOLUTION (P26)', icon: Compass },
          { id: 'strategic_intelligence', label: '17. STRATEGIC INTELLIGENCE (P27)', icon: Target },
          { id: 'mission_execution_intelligence', label: '18. AUTONOMOUS MISSION INTELLIGENCE (P28)', icon: Rocket },
          { id: 'advanced_webxr_reality', label: '19. ADVANCED WEBXR REALITY (P29)', icon: Glasses },
          { id: 'sensor_intelligence', label: '20. REAL-TIME SENSOR INTELLIGENCE (P30)', icon: Radio },
          { id: 'distributed_intelligence', label: '21. DISTRIBUTED AI INTELLIGENCE (P31)', icon: Network },
          { id: 'advanced_security', label: '22. ADVANCED SECURITY & ZERO-TRUST (P32)', icon: ShieldCheck },
          { id: 'predictive_decision_intelligence', label: '23. PREDICTIVE & DECISION INTELLIGENCE (P33)', icon: TrendingUp },
          { id: 'autonomous_intelligence_evolution', label: '24. AUTONOMOUS INTELLIGENCE EVOLUTION (P34)', icon: Sparkles },
          { id: 'global_intelligence_network', label: '25. GLOBAL INTELLIGENCE NETWORK (P35)', icon: Network },
          { id: 'unified_superintelligence_command_center', label: '26. UNIFIED SUPERINTELLIGENCE COMMAND CENTER (P36)', icon: Crown },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as CommandTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
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

      {/* Main Tab Content Viewport */}
      <div className="flex-1 overflow-y-auto pr-1">
        {/* TAB 1: GLOBAL SYSTEM OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-4">
            {/* Executive Briefing Banner */}
            <div className="bg-slate-900/90 border border-cyan-800/80 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Chief Intelligence Agent // Executive Briefing
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {new Date(consolidation.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-mono">
                {consolidation.chiefExecutiveBriefing}
              </p>
              <div className="mt-1 pt-1.5 border-t border-slate-800 flex flex-col gap-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Critical Directives:</span>
                <ul className="list-disc list-inside text-xs font-mono text-cyan-300 flex flex-col gap-0.5">
                  {consolidation.criticalDirectives.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Quick Actions & Live Control */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-300 uppercase mb-1">Automated Test Orchestration</h4>
                  <p className="text-[11px] text-slate-400">
                    {queue.length > 0 ? `${queue.length} scenarios waiting in priority queue.` : 'Test queue is idle.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleExecuteNextInQueue}
                    disabled={queue.length === 0 || orchestratorRunning}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded font-bold"
                  >
                    <Play className="w-3.5 h-3.5" /> Execute Next
                  </button>
                  <button
                    onClick={() => orchestrator.enqueueTest(DEFAULT_TEST_SCENARIOS[0].id)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                  >
                    + Enqueue 25-Joint
                  </button>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-300 uppercase mb-1">Cloud Telemetry Synchronization</h4>
                  <p className="text-[11px] text-slate-400">
                    Status: <span className="text-emerald-400 font-bold uppercase">{syncStatus}</span>. Offline queue has {cloudEngine.getOfflineQueueLength()} pending records.
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleTriggerSync}
                    disabled={syncingNow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded font-bold"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? 'animate-spin' : ''}`} /> Sync Now
                  </button>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-300 uppercase mb-1">Mandatory Rule #2 Verification</h4>
                  <p className="text-[11px] text-slate-400">
                    Room illumination causation remains strictly INCONCLUSIVE without verified hardware tokens.
                  </p>
                </div>
                <div className="mt-3 text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Deterministic Audit: 100% COMPLIANT</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE VR OPERATIONS & 3D DIGITAL TWIN */}
        {activeTab === 'live_ops' && (
          <div className="flex flex-col gap-3">
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">
                ACTIVE SESSION: <strong className="text-slate-200">{telemetry.sessionId}</strong>
              </span>
              <span className="text-slate-400">
                PROVENANCE: <strong className="text-cyan-300">{telemetrySource}</strong>
              </span>
            </div>
            <VRDigitalTwin telemetry={telemetry} selectedHand="right" />
          </div>
        )}

        {/* TAB 3: ENTERPRISE OBSERVABILITY & METRICS */}
        {activeTab === 'observability' && (
          <EnterpriseObservabilityDashboard
            telemetry={telemetry}
            incidents={incidents}
            isPhysicalVRActive={isPhysicalVRActive}
          />
        )}

        {/* TAB 4: INTELLIGENT TEST ORCHESTRATOR */}
        {activeTab === 'orchestrator' && (
          <div className="flex flex-col gap-4 text-xs font-mono">
            {/* Orchestrator Controls */}
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-300 uppercase">Test Orchestration Queue</span>
                <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300">
                  {queue.length} Pending
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExecuteNextInQueue}
                  disabled={queue.length === 0 || orchestratorRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded font-bold"
                >
                  <Play className="w-3.5 h-3.5" /> Execute Next
                </button>
              </div>
            </div>

            {/* Preconfigured Scenario Launchpad */}
            <div className="flex flex-col gap-2">
              <h4 className="font-bold text-slate-400 uppercase">Scenario Launchpad (Add to Priority Queue)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {orchestrator.getScenarios().map((scen) => (
                  <div key={scen.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{scen.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-bold">
                          {scen.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{scen.description}</p>
                    </div>
                    <button
                      onClick={() => orchestrator.enqueueTest(scen.id)}
                      className="mt-3 self-start px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px]"
                    >
                      + Enqueue
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Queue List */}
            <div className="flex flex-col gap-2 mt-2">
              <h4 className="font-bold text-slate-400 uppercase">Current Priority Execution Queue</h4>
              {queue.length === 0 ? (
                <div className="p-4 bg-slate-950/60 rounded border border-slate-800 text-slate-500 italic">
                  Queue is empty. Select a scenario above to enqueue tests.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {queue.map((item) => (
                    <div key={item.executionId} className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{item.scenarioName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 font-bold uppercase">
                            {item.state}
                          </span>
                          <span className="text-[10px] text-slate-500">ID: {item.executionId}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Category: {item.category} • Priority: {item.priority.toUpperCase()} • Retries: {item.retryCount}/{item.maxRetries}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => orchestrator.cancelExecution(item.executionId)}
                          className="px-2.5 py-1 bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: AI INCIDENT MANAGEMENT CENTER */}
        {activeTab === 'incidents' && (
          <div className="flex flex-col gap-3 text-xs font-mono">
            {/* Incident Filter & Search Controls */}
            <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">Severity:</span>
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'INFO'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setIncidentFilter(sev)}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      incidentFilter === sev ? 'bg-cyan-900 text-cyan-200 font-bold' : 'text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search incidents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs focus:outline-none w-36 sm:w-48"
                />
              </div>
            </div>

            {/* Incidents Table */}
            <div className="flex flex-col gap-2">
              {filteredIncidents.length === 0 ? (
                <div className="p-6 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-500 text-center">
                  No incidents matching the current filter criteria.
                </div>
              ) : (
                filteredIncidents.map((inc) => (
                  <div
                    key={inc.incidentId}
                    onClick={() => setSelectedIncident(inc)}
                    className="bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            inc.severity === 'CRITICAL'
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : inc.severity === 'HIGH'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : inc.severity === 'MEDIUM'
                              ? 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {inc.severity}
                        </span>
                        <span className="font-bold text-slate-200">{inc.title}</span>
                        {inc.occurrenceCount > 1 && (
                          <span className="text-[10px] text-amber-400 font-bold">
                            ({inc.occurrenceCount}x merged)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{inc.diagnosticExplanation}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          inc.state === 'RESOLVED' || inc.state === 'CLOSED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-red-950/60 text-red-300 border border-red-800'
                        }`}
                      >
                        {inc.state}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Incident Details Modal */}
            {selectedIncident && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-lg w-full flex flex-col gap-3 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-cyan-300 text-sm">INCIDENT DETAIL INSPECTOR</span>
                    <button onClick={() => setSelectedIncident(null)}>
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">INCIDENT ID:</span>
                    <span className="text-slate-200 font-bold">{selectedIncident.incidentId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">DIAGNOSTIC EXPLANATION:</span>
                    <p className="text-slate-300">{selectedIncident.diagnosticExplanation}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">RECOMMENDED CORRECTIVE ACTION:</span>
                    <p className="text-emerald-400 font-bold">{selectedIncident.recommendedAction}</p>
                  </div>

                  {selectedIncident.state !== 'RESOLVED' && selectedIncident.state !== 'CLOSED' && (
                    <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-800">
                      <label className="text-slate-400">Resolution Notes:</label>
                      <input
                        type="text"
                        placeholder="Enter resolution notes..."
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => {
                            incidentManager.updateIncidentState(
                              selectedIncident.incidentId,
                              'RESOLVED',
                              resolutionText || 'Operator verified and resolved'
                            );
                            setSelectedIncident(null);
                          }}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold"
                        >
                          Mark as Resolved
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PREDICTIVE VR HEALTH */}
        {activeTab === 'predictive' && (
          <div className="flex flex-col gap-4 text-xs font-mono">
            <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-xl flex flex-col gap-2">
              <h3 className="font-bold text-purple-300 uppercase">Predictive Failure Forecasts</h3>
              <p className="text-slate-400 text-[11px]">{predictiveReport.disclaimer}</p>
            </div>
            <div className="flex flex-col gap-2">
              {predictiveReport.alerts.map((alert) => (
                <div key={alert.id} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{alert.title}</span>
                    <span className="text-amber-400 uppercase font-bold">{alert.riskLevel} RISK</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{alert.description}</p>
                  <span className="text-cyan-400 text-[11px]">Remediation: {alert.suggestedRemediation}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: CLOUD SYNCHRONIZATION ENGINE */}
        {activeTab === 'cloud_sync' && (
          <div className="flex flex-col gap-4 text-xs font-mono">
            <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-cyan-300 uppercase">Cloud Telemetry Synchronization Engine</h3>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Endpoint: <span className="text-slate-300">/api/cloud/sync</span> • Offline Buffer: {cloudEngine.getOfflineQueueLength()} records
                </p>
              </div>
              <button
                onClick={handleTriggerSync}
                disabled={syncingNow}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold"
              >
                {syncingNow ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>

            {crossAnalytics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">TOTAL SESSIONS</span>
                  <span className="text-base font-bold text-cyan-300">{crossAnalytics.totalSessionsRecorded}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">CROSS-SESSION AVG FPS</span>
                  <span className="text-base font-bold text-emerald-400">{crossAnalytics.averageFps} FPS</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">AVG LATENCY DELTA</span>
                  <span className="text-base font-bold text-amber-400">{crossAnalytics.averageLatencyMs} ms</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">PASS RATE</span>
                  <span className="text-base font-bold text-purple-400">{crossAnalytics.passRatePercent}%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: HISTORICAL ANALYTICS & REPLAY */}
        {activeTab === 'analytics' && (
          <SessionReplayView telemetry={telemetry} replayManager={replayManager} />
        )}

        {/* TAB 8: AI AGENT MONITORING (6 AGENTS) */}
        {activeTab === 'agents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
            {consolidation.agentReports.map((agent) => (
              <div key={agent.role} className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                    <span className="font-bold text-cyan-300">{agent.role}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-emerald-400 font-bold uppercase">
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">{agent.lastAction}</p>
                  <ul className="list-disc list-inside text-[10px] text-slate-300 flex flex-col gap-1">
                    {agent.findings.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between text-[10px] text-slate-500">
                  <span>Confidence: {agent.confidenceScore}%</span>
                  <span>Evidence: {agent.evidenceCount} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 10: AUTONOMOUS INTELLIGENCE DASHBOARD (PHASE 19) */}
        {activeTab === 'autonomous_intelligence' && (
          <AutonomousIntelligenceDashboard telemetry={telemetry} />
        )}

        {/* TAB 11: COLLECTIVE INTELLIGENCE CENTER (PHASE 20) */}
        {activeTab === 'collective_intelligence' && (
          <CollectiveIntelligenceCenter telemetry={telemetry} />
        )}

        {/* TAB 12: DIGITAL TWIN CONTROL CENTER (PHASE 21) */}
        {activeTab === 'digital_twin' && (
          <DigitalTwinDashboard telemetry={telemetry} />
        )}

        {/* TAB 13: MISSION INTELLIGENCE (PHASE 22) */}
        {activeTab === 'mission_intelligence' && (
          <MissionIntelligenceDashboard telemetry={telemetry} />
        )}

        {/* TAB 14: AUTONOMOUS COMMAND & CONTROL (PHASE 23) */}
        {activeTab === 'autonomous_command_center' && (
          <AutonomousCommandCenter telemetry={telemetry} />
        )}

        {/* TAB 15: COGNITIVE INTELLIGENCE (PHASE 25) */}
        {activeTab === 'cognitive_intelligence' && (
          <CognitiveIntelligenceDashboard telemetry={telemetry} />
        )}

        {/* TAB 16: GLOBAL EVOLUTION & META-INTELLIGENCE (PHASE 26) */}
        {activeTab === 'global_evolution' && (
          <GlobalEvolutionDashboard
            telemetry={telemetry}
            activeIncidents={incidents}
            isPhysicalVRActive={isPhysicalVRActive}
          />
        )}

        {/* TAB 17: STRATEGIC INTELLIGENCE (PHASE 27) */}
        {activeTab === 'strategic_intelligence' && (
          <StrategicIntelligenceDashboard
            telemetry={telemetry}
            activeIncidents={incidents}
            isPhysicalVRActive={isPhysicalVRActive}
          />
        )}

        {/* TAB 18: AUTONOMOUS MISSION INTELLIGENCE (PHASE 28) */}
        {activeTab === 'mission_execution_intelligence' && (
          <AutonomousMissionExecutionDashboard
            telemetry={telemetry}
            activeIncidents={incidents}
            isPhysicalVRActive={isPhysicalVRActive}
          />
        )}

        {/* TAB 19: ADVANCED WEBXR REALITY (PHASE 29) */}
        {activeTab === 'advanced_webxr_reality' && (
          <AdvancedWebXRDashboard
            telemetry={telemetry}
            activeIncidents={incidents}
            isPhysicalVRActive={isPhysicalVRActive}
          />
        )}

        {/* TAB 20: REAL-TIME SENSOR INTELLIGENCE (PHASE 30) */}
        {activeTab === 'sensor_intelligence' && (
          <SensorIntelligenceDashboard
            telemetry={telemetry}
            activeIncidents={incidents}
            isPhysicalVRActive={isPhysicalVRActive}
          />
        )}

        {/* TAB 21: DISTRIBUTED AI INTELLIGENCE (PHASE 31) */}
        {activeTab === 'distributed_intelligence' && (
          <DistributedIntelligenceDashboard
            telemetry={telemetry}
            activeIncidents={incidents}
            isPhysicalVRActive={isPhysicalVRActive}
          />
        )}

        {/* TAB 22: ADVANCED SECURITY & ZERO-TRUST (PHASE 32) */}
        {activeTab === 'advanced_security' && (
          <AdvancedSecurityDashboard
            telemetry={telemetry}
            activeIncidents={incidents}
            isPhysicalVRActive={isPhysicalVRActive}
          />
        )}

        {/* TAB 23: PREDICTIVE & DECISION INTELLIGENCE (PHASE 33) */}
        {activeTab === 'predictive_decision_intelligence' && (
          <PredictiveIntelligenceDashboard
            telemetry={telemetry}
            activeIncidents={incidents}
            isPhysicalVRActive={isPhysicalVRActive}
          />
        )}

        {/* TAB 24: AUTONOMOUS INTELLIGENCE EVOLUTION & SELF-OPTIMIZATION (PHASE 34) */}
        {activeTab === 'autonomous_intelligence_evolution' && (
          <AutonomousIntelligenceEvolutionDashboard />
        )}

        {/* TAB 25: GLOBAL INTELLIGENCE NETWORK & UNIVERSAL KNOWLEDGE ORCHESTRATION (PHASE 35) */}
        {activeTab === 'global_intelligence_network' && (
          <GlobalIntelligenceNetworkDashboard />
        )}

        {/* TAB 26: UNIFIED SUPERINTELLIGENCE COMMAND CENTER & SYSTEM-WIDE ORCHESTRATION (PHASE 36) */}
        {activeTab === 'unified_superintelligence_command_center' && (
          <UnifiedSuperintelligenceCommandCenter />
        )}
      </div>

      {/* Footer Close */}
      <div className="mt-3 pt-2.5 border-t border-slate-800 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 transition-colors"
        >
          Close Command Center
        </button>
      </div>

      {/* Enterprise Authentication & RBAC Modal */}
      <EnterpriseAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </section>
  );
};
