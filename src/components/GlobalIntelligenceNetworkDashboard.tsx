/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Global Intelligence Network & Universal Knowledge Orchestration Dashboard (Phase 35)
 * Tab 25: Universal Knowledge Graph, 6-Agent Messaging Fabric, Multi-Source Fusion,
 * Semantic Search Console, Context Retrieval, Conflict Resolution, and Zero-Trust Governance.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  GlobalIntelligenceNetworkState,
  UniversalKnowledgeNode,
  UniversalKnowledgeEdge,
  KnowledgeClassificationTier,
  AgentSpecialistRole,
  SemanticSearchResult,
} from '../types/phase35';
import { IntelligenceNetworkCoordinator } from '../engines/IntelligenceNetworkCoordinator';
import { GlobalIntelligenceNetworkEngine } from '../engines/GlobalIntelligenceNetworkEngine';
import { UniversalKnowledgeGraphEngine } from '../engines/UniversalKnowledgeGraphEngine';
import { UniversalKnowledgeOrchestrator } from '../engines/UniversalKnowledgeOrchestrator';
import { CrossAgentKnowledgeExchange } from '../engines/CrossAgentKnowledgeExchange';
import { MultiSourceIntelligenceFusion } from '../engines/MultiSourceIntelligenceFusion';
import { SemanticKnowledgeSearchEngine } from '../engines/SemanticKnowledgeSearchEngine';
import { ContextAwareKnowledgeRetrieval } from '../engines/ContextAwareKnowledgeRetrieval';
import { KnowledgeConflictResolutionEngine } from '../engines/KnowledgeConflictResolutionEngine';
import { GlobalKnowledgeSynchronization } from '../engines/GlobalKnowledgeSynchronization';
import { KnowledgeGovernanceEngine } from '../engines/KnowledgeGovernanceEngine';
import {
  Network,
  Share2,
  Database,
  Search,
  Layers,
  Shield,
  RefreshCw,
  GitPullRequest,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Sliders,
  Send,
  Eye,
  X,
  UserCheck,
  FileText,
  AlertCircle,
  Cpu,
  Brain,
  Zap,
} from 'lucide-react';

export const GlobalIntelligenceNetworkDashboard: React.FC = () => {
  const coordinator = useMemo(() => IntelligenceNetworkCoordinator.getInstance(), []);
  const networkEngine = useMemo(() => GlobalIntelligenceNetworkEngine.getInstance(), []);
  const graphEngine = useMemo(() => UniversalKnowledgeGraphEngine.getInstance(), []);
  const orchestrator = useMemo(() => UniversalKnowledgeOrchestrator.getInstance(), []);
  const exchange = useMemo(() => CrossAgentKnowledgeExchange.getInstance(), []);
  const fusionEngine = useMemo(() => MultiSourceIntelligenceFusion.getInstance(), []);
  const searchEngine = useMemo(() => SemanticKnowledgeSearchEngine.getInstance(), []);
  const contextRetrieval = useMemo(() => ContextAwareKnowledgeRetrieval.getInstance(), []);
  const conflictEngine = useMemo(() => KnowledgeConflictResolutionEngine.getInstance(), []);
  const syncEngine = useMemo(() => GlobalKnowledgeSynchronization.getInstance(), []);
  const governanceEngine = useMemo(() => KnowledgeGovernanceEngine.getInstance(), []);

  const [state, setState] = useState<GlobalIntelligenceNetworkState>(coordinator.getState());
  const [activePanel, setActivePanel] = useState<
    | 'OVERVIEW'
    | 'GRAPH'
    | 'SOURCES'
    | 'EXCHANGE'
    | 'FUSION'
    | 'SEARCH'
    | 'CONTEXT'
    | 'CONFLICTS'
    | 'SYNC'
    | 'GOVERNANCE'
  >('OVERVIEW');

  // Search console state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[]>([]);
  const [selectedSearchCategory, setSelectedSearchCategory] = useState('ALL');

  // Interactive Graph state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('kn-telemetry-invariance');
  const [nodeCategoryFilter, setNodeCategoryFilter] = useState('ALL');

  // Agent message sender state
  const [msgSender, setMsgSender] = useState<AgentSpecialistRole>('OperationsAgent');
  const [msgTarget, setMsgTarget] = useState<AgentSpecialistRole | 'BROADCAST'>('BROADCAST');
  const [msgTopic, setMsgTopic] = useState('OPERATIONAL_UPDATE');
  const [msgText, setMsgText] = useState('');

  // Context retrieval state
  const [contextInput, setContextInput] = useState('Evaluating VR render frame drops during burst telemetry');
  const [contextAgent, setContextAgent] = useState<AgentSpecialistRole>('PerformanceAgent');
  const [retrievedDossier, setRetrievedDossier] = useState<any>(null);

  // Human operator resolution
  const [operatorName, setOperatorName] = useState('OPERATOR-CHIEF-01');
  const [resolutionRationale, setResolutionRationale] = useState('Verified against Phase 34 horizon benchmarks');

  // Notification toast
  const [notification, setNotification] = useState<{ type: 'success' | 'warn' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsub = coordinator.subscribe((st) => setState(st));
    return () => unsub();
  }, [coordinator]);

  const showNotification = (type: 'success' | 'warn' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSearch = () => {
    const { results } = searchEngine.search(searchQuery, {
      category: selectedSearchCategory,
    });
    setSearchResults(results);
  };

  const handleSendMessage = () => {
    if (!msgText.trim()) return;
    exchange.publishMessage({
      senderRole: msgSender,
      targetRole: msgTarget,
      messageType: 'PUBLISH',
      topic: msgTopic,
      payload: { note: msgText },
      evidenceReferences: ['USER-DIRECTIVE-DISPATCH'],
    });
    setMsgText('');
    coordinator.notifyListeners();
    showNotification('success', `Message dispatched from ${msgSender} to ${msgTarget}`);
  };

  const handleRunContextRetrieval = () => {
    const dossier = contextRetrieval.retrieveContext({
      requestingAgent: contextAgent,
      operationalContext: contextInput,
      accessLevel: 'OPERATIONAL',
      maxResults: 5,
    });
    setRetrievedDossier(dossier);
    showNotification('success', `Retrieved ${dossier.items.length} relevant knowledge nodes with citations.`);
  };

  const handleResolveConflict = (conflictId: string, chosenNodeId?: string) => {
    const res = conflictEngine.resolveConflict(
      conflictId,
      chosenNodeId || 'kn-holt-linear-horizon',
      resolutionRationale,
      operatorName
    );
    if (res.success) {
      coordinator.notifyListeners();
      showNotification('success', `Conflict "${conflictId}" resolved with operator sign-off.`);
    } else {
      showNotification('error', res.error || 'Failed to resolve conflict');
    }
  };

  const handleManualSync = () => {
    const rec = syncEngine.triggerSync();
    coordinator.notifyListeners();
    showNotification('success', `Synchronization cycle #${rec.localVersion} completed (${rec.mode}).`);
  };

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return graphEngine.getNode(selectedNodeId);
  }, [selectedNodeId, graphEngine, state.nodesCount]);

  const selectedNodeNeighbors = useMemo(() => {
    if (!selectedNodeId) return { outgoing: [], incoming: [] };
    return graphEngine.getNeighbors(selectedNodeId);
  }, [selectedNodeId, graphEngine, state.edgesCount]);

  const filteredGraphNodes = useMemo(() => {
    const nodes = graphEngine.getAllNodes();
    if (nodeCategoryFilter === 'ALL') return nodes;
    return nodes.filter((n) => n.category === nodeCategoryFilter);
  }, [graphEngine, nodeCategoryFilter, state.nodesCount]);

  return (
    <div className="w-full h-full min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-6 space-y-6 overflow-y-auto">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-sm shadow-cyan-500/10">
              <Network className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                  GLOBAL INTELLIGENCE NETWORK &amp; UNIVERSAL KNOWLEDGE ORCHESTRATION
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-mono font-medium rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  PHASE 35
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                Universal Knowledge Graph, Cross-Agent Mesh, Multi-Source Fusion, Context-Aware Retrieval &amp; Zero-Trust Governance
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900 text-xs font-mono text-slate-300 flex items-center space-x-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>SOURCES: {state.sources.length} REGISTERED</span>
          </div>

          <div className="px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900 text-xs font-mono text-slate-300 flex items-center space-x-1.5">
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>GRAPH: {state.nodesCount} NODES / {state.edgesCount} EDGES</span>
          </div>

          <button
            onClick={handleManualSync}
            className="px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-sm shadow-cyan-600/30"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Knowledge</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
              : notification.type === 'warn'
              ? 'bg-amber-950/90 border-amber-700 text-amber-200'
              : 'bg-rose-950/90 border-rose-700 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex overflow-x-auto space-x-1 pb-1 border-b border-slate-800 scrollbar-none">
        {[
          { id: 'OVERVIEW', label: '1. Network Overview', icon: Activity },
          { id: 'GRAPH', label: '2. Universal Graph Explorer', icon: Share2 },
          { id: 'SOURCES', label: '3. Intelligence Sources', icon: Radio },
          { id: 'EXCHANGE', label: '4. Six-Agent Exchange', icon: Send },
          { id: 'FUSION', label: '5. Multi-Source Fusion', icon: Layers },
          { id: 'SEARCH', label: '6. Semantic Search Console', icon: Search },
          { id: 'CONTEXT', label: '7. Context-Aware Retrieval', icon: Brain },
          { id: 'CONFLICTS', label: `8. Conflict Resolution (${state.activeConflicts.filter(c => c.status !== 'RESOLVED').length})`, icon: AlertTriangle },
          { id: 'SYNC', label: '9. Synchronization Center', icon: RefreshCw },
          { id: 'GOVERNANCE', label: '10. Governance & Security', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activePanel === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id as any)}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors flex items-center space-x-2 whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-cyan-500 text-cyan-400 bg-slate-900/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* PANEL 1: NETWORK OVERVIEW */}
      {activePanel === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Network Health Ratio</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-emerald-300">
                  {Math.round(state.networkTopology.healthySourcesRatio * 100)}%
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {state.sources.length} Intelligence Sources Active
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Topology Mesh:</span>
                <span className="text-cyan-400 font-mono">Connected</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Knowledge Graph Volume</span>
                <Share2 className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-cyan-300">
                  {state.nodesCount} Nodes
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {state.edgesCount} Directed Typed Relationships
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Consistency Audit:</span>
                <span className="text-emerald-400 font-mono">Zero Orphaned Edges</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Multi-Source Fusions</span>
                <Layers className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono text-purple-300">
                  {state.recentFusions.length} Concepts Fused
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Duplicate claims suppressed transparently
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Average Confidence:</span>
                <span className="text-purple-300 font-mono">98.2%</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Persistence &amp; Sync Tier</span>
                <RefreshCw className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2">
                <div className="text-lg font-bold font-mono text-amber-300 truncate">
                  {state.persistenceMode}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Version v{state.lastSync.localVersion} • Status: {state.lastSync.status}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Cloud Sync Real State:</span>
                <span className="text-slate-300 font-mono">{state.lastSync.isCloudActive ? 'Active Cloud' : 'Local Memory'}</span>
              </div>
            </div>
          </div>

          {/* Network Topology Visual Cards */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center space-x-2">
              <Network className="w-4 h-4 text-cyan-400" />
              <span>Network Topology Mesh Nodes</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {state.networkTopology.nodes.map((node) => (
                <div key={node.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 truncate">{node.label}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                      {node.status}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-cyan-400 mt-1">{node.category}</div>
                  <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Throughput:</span>
                    <span className="text-slate-200 font-mono">{node.throughputMsgSec} msg/sec</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Six Specialist Agent Mandates Summary */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center space-x-2">
              <Brain className="w-4 h-4 text-emerald-400" />
              <span>Six-Agent Intelligence Network Council</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {state.agentContributions.map((ag) => (
                <div key={ag.agentRole} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{ag.agentName}</span>
                      <span className="text-[10px] font-mono text-emerald-400">{ag.knowledgeStatus}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{ag.mandate}</p>
                    <div className="mt-2 text-[11px] text-cyan-300 font-mono bg-slate-900/80 p-2 rounded border border-slate-800/80">
                      "{ag.strategicInsight}"
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Author Nodes: {ag.activeKnowledgeNodesCount}</span>
                    <span>Messages: {ag.messagesSentCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PANEL 2: UNIVERSAL GRAPH EXPLORER */}
      {activePanel === 'GRAPH' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                    <Share2 className="w-4 h-4 text-cyan-400" />
                    <span>Universal Knowledge Nodes</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click a node to inspect relationships, dependencies, evidence, and lineage.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-400">Filter:</span>
                  <select
                    value={nodeCategoryFilter}
                    onChange={(e) => setNodeCategoryFilter(e.target.value)}
                    className="bg-slate-900 text-slate-200 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono"
                  >
                    <option value="ALL">ALL CATEGORIES</option>
                    <option value="SECURITY_RULE">SECURITY RULE</option>
                    <option value="OPTIMIZATION_ACTION">OPTIMIZATION ACTION</option>
                    <option value="DOMAIN_FACT">DOMAIN FACT</option>
                    <option value="MISSION_METRIC">MISSION METRIC</option>
                    <option value="PREDICTION">PREDICTION</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredGraphNodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-950/40 shadow-sm shadow-cyan-500/20'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold text-white">{node.label}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                          {node.classification}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-cyan-400 mt-1">{node.category}</div>
                      <div className="mt-2 text-xs text-slate-300 line-clamp-2">
                        {JSON.stringify(node.properties)}
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Confidence: {node.confidence}%</span>
                        <span>v{node.version}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Node Inspector Sidebar */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center space-x-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Node Inspector &amp; Topology</span>
              </h3>

              {selectedNode ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400">NODE ID</div>
                    <div className="text-xs font-mono font-bold text-cyan-300">{selectedNode.id}</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono text-slate-400">LABEL &amp; PROVENANCE</div>
                    <div className="text-sm font-bold text-white">{selectedNode.label}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">Source: {selectedNode.provenanceSourceId}</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono text-slate-400">EVIDENCE REFERENCES</div>
                    <div className="space-y-1 mt-1">
                      {selectedNode.evidenceReferences.map((ref, i) => (
                        <div key={i} className="p-1.5 rounded bg-slate-950 font-mono text-[11px] text-emerald-400 border border-slate-800">
                          {ref}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono text-slate-400">CONNECTED RELATIONSHIPS</div>
                    <div className="space-y-1 mt-1 font-mono text-[11px]">
                      {selectedNodeNeighbors.outgoing.map((e) => (
                        <div key={e.id} className="p-1.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                          <span className="text-cyan-400 font-bold">&rarr; {e.relationship}</span> &rarr; {e.targetNodeId}
                        </div>
                      ))}
                      {selectedNodeNeighbors.incoming.map((e) => (
                        <div key={e.id} className="p-1.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                          <span className="text-purple-400 font-bold">&larr; {e.relationship}</span> &larr; {e.sourceNodeId}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-xs italic">Select a node from the explorer to inspect details.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PANEL 3: INTELLIGENCE SOURCE REGISTRY */}
      {activePanel === 'SOURCES' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center space-x-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>Registered Intelligence Sources</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Real registered sources. Strictly distinguishes local memory execution from actual server proxy or cloud connectivity.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {state.sources.map((src) => (
                <div key={src.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{src.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                        {src.health}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-cyan-400 mt-0.5">{src.type}</div>

                    <div className="mt-3 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Connection:</span>
                        <span className="text-slate-200 font-mono text-[11px]">{src.connection}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Latency:</span>
                        <span className="text-slate-200 font-mono text-[11px]">{src.latencyMs} ms</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Reliability:</span>
                        <span className="text-emerald-400 font-mono text-[11px]">{src.reliabilityScore}%</span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-[10px] font-mono text-slate-400 mb-1">CAPABILITIES</div>
                      <div className="flex flex-wrap gap-1">
                        {src.capabilities.map((c, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 text-[9px] font-mono text-slate-300 border border-slate-800">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Cloud Real:</span>
                    <span className={src.isCloudConnected ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
                      {src.isCloudConnected ? 'VERIFIED' : 'LOCAL ONLY'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PANEL 4: SIX-AGENT KNOWLEDGE EXCHANGE */}
      {activePanel === 'EXCHANGE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center space-x-2">
                <Send className="w-4 h-4 text-cyan-400" />
                <span>Inter-Agent Knowledge Exchange Stream</span>
              </h3>

              <div className="space-y-3">
                {state.recentMessages.map((msg) => (
                  <div key={msg.messageId} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center space-x-2">
                        <span className="text-cyan-400 font-bold">{msg.senderRole}</span>
                        <span className="text-slate-400">&rarr;</span>
                        <span className="text-purple-300 font-bold">{msg.targetRole}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{msg.timestamp.slice(11, 19)}</span>
                    </div>

                    <div className="text-xs text-slate-200 font-mono bg-slate-900/70 p-2.5 rounded border border-slate-800/80">
                      {JSON.stringify(msg.payload)}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>Topic: {msg.topic}</span>
                      <span>Ref: {msg.evidenceReferences.join(', ') || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Message Dispatcher Form */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Dispatch Agent Directive</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Sender Specialist Role</label>
                  <select
                    value={msgSender}
                    onChange={(e) => setMsgSender(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200"
                  >
                    <option value="ChiefIntelligenceAgent">Chief Intelligence Officer</option>
                    <option value="OperationsAgent">Operations Lead</option>
                    <option value="TestAgent">Automated Test Orchestrator</option>
                    <option value="TrackingAgent">Tracking Specialist</option>
                    <option value="PerformanceAgent">Performance Engineer</option>
                    <option value="IncidentAgent">Incident Commander</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Target Role</label>
                  <select
                    value={msgTarget}
                    onChange={(e) => setMsgTarget(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200"
                  >
                    <option value="BROADCAST">BROADCAST (All Agents)</option>
                    <option value="OperationsAgent">Operations Lead</option>
                    <option value="TestAgent">Automated Test Orchestrator</option>
                    <option value="TrackingAgent">Tracking Specialist</option>
                    <option value="PerformanceAgent">Performance Engineer</option>
                    <option value="IncidentAgent">Incident Commander</option>
                    <option value="ChiefIntelligenceAgent">Chief Intelligence Officer</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Topic</label>
                  <input
                    type="text"
                    value={msgTopic}
                    onChange={(e) => setMsgTopic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Payload Note</label>
                  <textarea
                    rows={3}
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    placeholder="Enter directive or evidence note..."
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 font-mono text-slate-200"
                  />
                </div>

                <button
                  onClick={handleSendMessage}
                  className="w-full py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors flex items-center justify-center space-x-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Across Knowledge Mesh</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANEL 5: MULTI-SOURCE INTELLIGENCE FUSION */}
      {activePanel === 'FUSION' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Multi-Source Intelligence Fusion Records</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Cross-source correlation and deduplication. Independent verification requires distinct sources; duplicate copies are suppressed.
            </p>

            <div className="space-y-4">
              {state.recentFusions.map((fuse) => (
                <div key={fuse.fusionId} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{fuse.primaryConcept}</h4>
                      <div className="text-[10px] font-mono text-purple-400 mt-0.5">
                        Contributing Sources: {fuse.contributingSourceIds.join(', ')}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300">
                        {fuse.reliabilityIndicator}
                      </span>
                      <span className="text-xs font-mono text-cyan-400">{fuse.confidenceScore}% Confidence</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    {fuse.synthesizedFacts.map((fact, idx) => (
                      <div key={idx} className="flex items-start space-x-2 p-2 rounded bg-slate-900/60 border border-slate-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{fact}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-800/60">
                    <span>Duplicates Suppressed: {fuse.duplicateCountSuppressed}</span>
                    <span>Contradictions Flagged: {fuse.contradictionsIdentified.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PANEL 6: SEMANTIC SEARCH CONSOLE */}
      {activePanel === 'SEARCH' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center space-x-2">
              <Search className="w-4 h-4 text-cyan-400" />
              <span>Semantic &amp; Keyword Knowledge Search Console</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search across universal knowledge nodes (e.g., 'telemetry', 'smoothing horizon', '60 FPS')..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-200"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors flex items-center space-x-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Knowledge</span>
              </button>
            </div>

            <div className="space-y-3">
              {searchResults.length === 0 ? (
                <div className="p-6 rounded-lg bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs">
                  Enter a query above to execute hybrid semantic / keyword search over universal knowledge nodes.
                </div>
              ) : (
                searchResults.map((res) => (
                  <div key={res.nodeId} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{res.label}</span>
                      <span className="text-xs font-mono text-cyan-400 font-bold">{res.relevanceScore}% Match</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Category: {res.category} • Match: {res.matchType} • Source: {res.source}
                    </div>
                    <div className="text-xs text-slate-300 font-mono bg-slate-900/60 p-2 rounded border border-slate-800">
                      {res.snippet}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* PANEL 7: CONTEXT-AWARE RETRIEVAL */}
      {activePanel === 'CONTEXT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center space-x-2">
                <Brain className="w-4 h-4 text-emerald-400" />
                <span>Retrieval Scoping</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Requesting Agent Role</label>
                  <select
                    value={contextAgent}
                    onChange={(e) => setContextAgent(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-200"
                  >
                    <option value="PerformanceAgent">Performance Engineer</option>
                    <option value="OperationsAgent">Operations Lead</option>
                    <option value="TrackingAgent">Tracking Specialist</option>
                    <option value="ChiefIntelligenceAgent">Chief Intelligence Officer</option>
                    <option value="TestAgent">Automated Test Orchestrator</option>
                    <option value="IncidentAgent">Incident Commander</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Operational Context Query</label>
                  <textarea
                    rows={4}
                    value={contextInput}
                    onChange={(e) => setContextInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 font-mono text-slate-200"
                  />
                </div>

                <button
                  onClick={handleRunContextRetrieval}
                  className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors flex items-center justify-center space-x-2"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Synthesize Context Dossier</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Contextual Knowledge Dossier</span>
              </h3>

              {retrievedDossier ? (
                <div className="space-y-4 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Requesting Agent: <strong className="text-cyan-400">{retrievedDossier.requestingAgent}</strong></span>
                    <span className="text-slate-400 text-[11px]">{retrievedDossier.items.length} nodes retrieved</span>
                  </div>

                  {retrievedDossier.missingContextWarnings.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800 text-amber-200 text-xs flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>{retrievedDossier.missingContextWarnings[0]}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-[10px] font-mono text-slate-400">RETRIEVED NODES &amp; CITATIONS</div>
                    {retrievedDossier.items.map((node: UniversalKnowledgeNode, idx: number) => (
                      <div key={node.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between font-bold text-white">
                          <span>{node.label}</span>
                          <span className="text-cyan-400 text-[10px] font-mono">{node.classification}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{retrievedDossier.explanations[idx]}</div>
                        <div className="text-[10px] text-emerald-400 font-mono pt-1 border-t border-slate-800/60">
                          {retrievedDossier.citations[idx]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs">
                  Configure operational context on the left and synthesize a scoped dossier.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PANEL 8: KNOWLEDGE CONFLICT MONITOR */}
      {activePanel === 'CONFLICTS' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Knowledge Conflict &amp; Contradiction Monitor</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Preserves original conflicting claims without silent overwriting. All consequential resolutions require human operator sign-off.
            </p>

            <div className="space-y-4">
              {state.activeConflicts.map((conf) => (
                <div
                  key={conf.conflictId}
                  className={`p-4 rounded-xl border ${
                    conf.status === 'RESOLVED'
                      ? 'bg-slate-950/60 border-slate-800'
                      : 'bg-slate-950 border-amber-600/50 shadow-sm shadow-amber-500/10'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        conf.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {conf.status}
                      </span>
                      <h4 className="text-sm font-bold text-white">{conf.subject}</h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{conf.detectedAt.slice(11, 19)}</span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{conf.description}</p>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">SOURCE A (Quality: {conf.evidenceQualityScoreA}%)</div>
                      <div className="text-slate-200 mt-0.5">{conf.opposingSources[0]}</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">SOURCE B (Quality: {conf.evidenceQualityScoreB}%)</div>
                      <div className="text-slate-200 mt-0.5">{conf.opposingSources[1]}</div>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded bg-cyan-950/30 border border-cyan-800/60 text-xs text-cyan-300">
                    <strong>Recommended Resolution:</strong> {conf.recommendedResolution}
                  </div>

                  {conf.status !== 'RESOLVED' && (
                    <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-slate-400">Operator ID:</span>
                        <input
                          type="text"
                          value={operatorName}
                          onChange={(e) => setOperatorName(e.target.value)}
                          className="bg-slate-900 text-cyan-300 border border-slate-700 rounded px-2 py-1 text-xs font-mono w-48"
                        />
                      </div>
                      <button
                        onClick={() => handleResolveConflict(conf.conflictId)}
                        className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center space-x-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Authorize &amp; Resolve Conflict</span>
                      </button>
                    </div>
                  )}

                  {conf.status === 'RESOLVED' && conf.resolutionDetails && (
                    <div className="mt-3 text-xs font-mono text-emerald-400 pt-2 border-t border-slate-800">
                      Resolved by {conf.resolutionDetails.approvedBy}: "{conf.resolutionDetails.rationale}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PANEL 9: SYNCHRONIZATION CENTER */}
      {activePanel === 'SYNC' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              <span>Global Knowledge Synchronization Center</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Truthful synchronization status. Offline changes queue idempotently and re-sync upon connection restoration.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {(['LOCAL_DEVELOPMENT', 'CLOUD_FIRESTORE', 'OFFLINE_FALLBACK'] as const).map((mode) => (
                <div
                  key={mode}
                  onClick={() => syncEngine.setMode(mode)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    state.persistenceMode === mode
                      ? 'border-cyan-500 bg-cyan-950/40 shadow-sm shadow-cyan-500/20'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{mode.replace('_', ' ')}</span>
                    {state.persistenceMode === mode && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500 text-black font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    {mode === 'LOCAL_DEVELOPMENT' && 'In-memory fast execution; zero external cloud dependencies.'}
                    {mode === 'CLOUD_FIRESTORE' && 'Synchronizes knowledge nodes to cloud datastore when credentials configured.'}
                    {mode === 'OFFLINE_FALLBACK' && 'Queues all mutations offline; restores safely on reconnect.'}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Sync ID:</span>
                <span className="text-cyan-400">{state.lastSync.syncId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Sync Status:</span>
                <span className="text-emerald-400 font-bold">{state.lastSync.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Local Version / Cloud Version:</span>
                <span className="text-slate-200">v{state.lastSync.localVersion} / {state.lastSync.cloudVersion ? `v${state.lastSync.cloudVersion}` : 'N/A (Local Only)'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Items Synchronized:</span>
                <span className="text-slate-200">{state.lastSync.itemsSyncedCount} nodes</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANEL 10: GOVERNANCE AND SECURITY */}
      {activePanel === 'GOVERNANCE' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Zero-Trust Knowledge Governance &amp; Security Audit</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Integrates with Phase 32 Zero-Trust. Enforces prompt injection shielding, credential redaction, and 4-tier clearance.
            </p>

            <div className="space-y-2 font-mono text-xs">
              {state.governanceLogs.map((log) => (
                <div key={log.logId} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.securityLevel === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                      log.securityLevel === 'WARN' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-slate-300">{log.details}</span>
                  </div>
                  <span className="text-slate-400 text-[11px] shrink-0">{log.timestamp.slice(11, 19)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
