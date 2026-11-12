/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 20: Collective Intelligence Center (Tab 11).
 * Displays Six Agent statuses, live Agent-to-Agent communication feed,
 * Multi-Agent debate results, Mission planning with Human Approval Queue,
 * Explainable AI decisions, and persistent Shared Intelligence Memory.
 */

import React, { useState, useEffect } from 'react';
import { VRTelemetry } from '../types/diagnostics';
import { AgentRole } from '../types/phase17';
import {
  CollectiveIntelligenceSnapshot,
  MissionPriority,
  VRIntelligenceMission,
  ExplainableDecision,
} from '../types/phase20';
import { collectiveIntelligence, SIX_SPECIALIST_ROLES } from '../utils/CollectiveIntelligenceEngine';
import { agentDebateEngine } from '../utils/AgentDebateEngine';
import { missionPlanningEngine } from '../utils/MissionPlanningEngine';
import {
  Brain,
  MessageSquare,
  Scale,
  Target,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Sparkles,
  Shield,
  Layers,
  ChevronRight,
  TrendingUp,
  Award,
  Play,
  RotateCcw,
} from 'lucide-react';

interface CollectiveIntelligenceCenterProps {
  telemetry: VRTelemetry;
}

export const CollectiveIntelligenceCenter: React.FC<CollectiveIntelligenceCenterProps> = ({
  telemetry,
}) => {
  const [snapshot, setSnapshot] = useState<CollectiveIntelligenceSnapshot>(() =>
    collectiveIntelligence.getSnapshot()
  );
  const [selectedAgentSender, setSelectedAgentSender] = useState<AgentRole>('ChiefIntelligenceAgent');
  const [selectedRecipient, setSelectedRecipient] = useState<AgentRole | 'BROADCAST'>('BROADCAST');
  const [messageText, setMessageText] = useState('');
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionObjective, setNewMissionObjective] = useState('');
  const [newMissionPriority, setNewMissionPriority] = useState<MissionPriority>('HIGH');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'missions' | 'debates' | 'feed' | 'memory' | 'decisions'>('overview');
  const [memorySearch, setMemorySearch] = useState('');

  useEffect(() => {
    return collectiveIntelligence.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
    });
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    collectiveIntelligence.sendMessage(
      selectedAgentSender,
      selectedRecipient,
      'STATUS_UPDATE',
      messageText.trim()
    );
    setMessageText('');
  };

  const handleTriggerDebate = () => {
    agentDebateEngine.conductDebate(
      'Evaluating Real-Time Cadence Pacing vs Skeletal Stability',
      { timestamp: new Date().toISOString() },
      telemetry
    );
  };

  const handleCreateMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMissionTitle.trim() || !newMissionObjective.trim()) return;

    missionPlanningEngine.planMission(
      newMissionTitle.trim(),
      newMissionObjective.trim(),
      newMissionPriority
    );
    setNewMissionTitle('');
    setNewMissionObjective('');
  };

  const handleSynthesizeDecision = () => {
    collectiveIntelligence.synthesizeCollectiveDecision(
      'Operational Optimization for Active WebXR Session',
      telemetry,
      true // requires approval
    );
  };

  const filteredMemory = snapshot.memoryItems.filter(
    (item) =>
      item.title.toLowerCase().includes(memorySearch.toLowerCase()) ||
      item.summary.toLowerCase().includes(memorySearch.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(memorySearch.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-4 text-xs font-mono">
      {/* Top Collective Intelligence Header Strip */}
      <div className="bg-slate-900/90 border border-cyan-800/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-400">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-cyan-300 uppercase">
                Collective Autonomous Intelligence Center
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                PHASE 20 ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              6 Specialist Agents • Cross-Agent Debate • Autonomous Mission Planning • Human Approval Gates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerDebate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-cyan-700/70 text-cyan-300 rounded-lg transition-colors cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Trigger Agent Debate</span>
          </button>
          <button
            onClick={handleSynthesizeDecision}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Synthesize Collective Decision</span>
          </button>
        </div>
      </div>

      {/* KPI Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">CONSENSUS SCORE</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-emerald-400">
              {(snapshot.consensusAverageScore * 100).toFixed(0)}%
            </span>
            <span className="text-slate-500 text-[10px]">avg agreement</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">ACTIVE AGENTS</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-cyan-400">6 / 6</span>
            <span className="text-slate-500 text-[10px]">collaborating</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">ACTIVE MISSIONS</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-purple-400">
              {snapshot.activeMissions.length}
            </span>
            <span className="text-slate-500 text-[10px]">orchestrated</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">APPROVAL QUEUE</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold ${snapshot.pendingApprovalCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>
              {snapshot.pendingApprovalCount}
            </span>
            <span className="text-slate-500 text-[10px]">pending operator</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">SHARED MEMORY</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-indigo-400">
              {snapshot.memoryItems.length}
            </span>
            <span className="text-slate-500 text-[10px]">verified items</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-1.5 overflow-x-auto">
        {[
          { id: 'overview', label: '1. AGENT WORKLOAD & STATUS' },
          { id: 'feed', label: `2. AGENT COMMUNICATION (${snapshot.recentMessages.length})` },
          { id: 'debates', label: `3. MULTI-AGENT DEBATES (${snapshot.recentDebates.length})` },
          { id: 'missions', label: `4. MISSION PLANNING & APPROVALS (${snapshot.activeMissions.length})` },
          { id: 'decisions', label: `5. EXPLAINABLE DECISIONS (${snapshot.recentDecisions.length})` },
          { id: 'memory', label: `6. SHARED MEMORY (${snapshot.memoryItems.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-cyan-950 border border-cyan-500 text-cyan-200 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: AGENT WORKLOAD & OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SIX_SPECIALIST_ROLES.map((role) => {
            const workload = snapshot.workloads[role];
            return (
              <div
                key={role}
                className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                    <span className="font-bold text-cyan-300">{role}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                      AVAILABLE
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Active Task Load:</span>
                      <span className="font-bold">{workload?.currentTaskCount || 0} / {workload?.maxCapacity || 4}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Communication:</span>
                      <span className="text-slate-400">
                        {workload?.lastActiveTimestamp
                          ? new Date(workload.lastActiveTimestamp).toLocaleTimeString()
                          : 'Online'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Autonomy: Level 4</span>
                  <span className="text-cyan-400">Ready</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUB-TAB 2: AGENT-TO-AGENT COMMUNICATION FEED */}
      {activeSubTab === 'feed' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col">
            <h3 className="text-xs font-bold text-cyan-300 uppercase mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              Live Agent-to-Agent Message Bus
            </h3>
            <div className="flex-1 overflow-y-auto max-h-96 space-y-2 pr-1">
              {snapshot.recentMessages.map((msg) => (
                <div
                  key={msg.messageId}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-cyan-300">{msg.sender}</span>
                      <span className="text-slate-500">&rarr;</span>
                      <span className="text-indigo-300 font-semibold">{msg.recipient}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-200 text-[11px] leading-relaxed">{msg.content}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/40">
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                      {msg.messageType}
                    </span>
                    {msg.requiresAck && !msg.acknowledged && (
                      <button
                        onClick={() => collectiveIntelligence.acknowledgeMessage(msg.messageId)}
                        className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
                      >
                        Acknowledge Task
                      </button>
                    )}
                    {msg.acknowledged && (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Acknowledged
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Agent Message Composer */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase mb-3 flex items-center gap-2">
              <Send className="w-4 h-4 text-cyan-400" />
              Dispatch Inter-Agent Directive
            </h3>
            <form onSubmit={handleSendMessage} className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Sender Agent</label>
                <select
                  value={selectedAgentSender}
                  onChange={(e) => setSelectedAgentSender(e.target.value as AgentRole)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs"
                >
                  {SIX_SPECIALIST_ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Recipient</label>
                <select
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value as AgentRole | 'BROADCAST')}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs"
                >
                  <option value="BROADCAST">BROADCAST (All Agents)</option>
                  {SIX_SPECIALIST_ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Directive Content</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Enter structured operational directive..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!messageText.trim()}
                className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold rounded text-xs transition-colors cursor-pointer"
              >
                Send Message Across Bus
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MULTI-AGENT DEBATES */}
      {activeSubTab === 'debates' && (
        <div className="space-y-3">
          {snapshot.recentDebates.map((debate) => (
            <div
              key={debate.topicId}
              className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <h4 className="text-sm font-bold text-white">{debate.title}</h4>
                  <span className="text-[10px] text-slate-400">
                    Initiated: {new Date(debate.initiatedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase block">Consensus Score</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {((debate.resolution?.consensusScore || 0.85) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Debate Arguments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {debate.arguments.map((arg) => (
                  <div
                    key={arg.argumentId}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-cyan-300">{arg.agent}</span>
                        <span className="text-[10px] text-slate-400">{(arg.confidence * 100).toFixed(0)}% Conf</span>
                      </div>
                      <p className="text-white font-semibold text-[11px] mb-1">{arg.position}</p>
                      <ul className="list-disc list-inside text-[10px] text-slate-400 space-y-0.5">
                        {arg.evidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-800/50 text-[10px] text-indigo-400">
                      Recommendation: {arg.recommendedAction}
                    </div>
                  </div>
                ))}
              </div>

              {/* Debate Resolution */}
              {debate.resolution && (
                <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/60">
                  <span className="text-[10px] uppercase font-bold text-cyan-300 block mb-1">
                    Winning Evidence-Weighted Synthesis (Non-Majority Voting)
                  </span>
                  <p className="text-slate-200 text-[11px]">{debate.resolution.winningSynthesis}</p>
                  <p className="text-[10px] text-slate-400 mt-1 italic">{debate.resolution.justification}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 4: MISSION PLANNING & HUMAN APPROVAL QUEUE */}
      {activeSubTab === 'missions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            {snapshot.activeMissions.map((mission) => (
              <div
                key={mission.missionId}
                className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{mission.title}</h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          mission.priority === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        }`}
                      >
                        {mission.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{mission.objective}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-purple-400">{mission.progressPercent}%</span>
                    <span className="text-[10px] text-slate-500 block uppercase">{mission.state}</span>
                  </div>
                </div>

                {/* Task Breakdown */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Decomposed Task Workflows</span>
                  {mission.tasks.map((task) => (
                    <div
                      key={task.taskId}
                      className="p-2 rounded bg-slate-900 border border-slate-800/80 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{task.title}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300">
                            {task.assignedAgent}
                          </span>
                          {task.isHighImpact && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold">
                              HIGH IMPACT
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{task.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {task.isHighImpact && !task.operatorApproved && (
                          <button
                            onClick={() => missionPlanningEngine.approveTask(mission.missionId, task.taskId)}
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded text-[10px] cursor-pointer"
                          >
                            Approve High Impact Task
                          </button>
                        )}
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            task.status === 'COMPLETED'
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : task.status === 'READY'
                              ? 'text-cyan-400 bg-cyan-500/10'
                              : 'text-slate-400 bg-slate-800'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* New Mission Creator */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              Plan Autonomous Mission
            </h3>
            <form onSubmit={handleCreateMission} className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Mission Title</label>
                <input
                  type="text"
                  value={newMissionTitle}
                  onChange={(e) => setNewMissionTitle(e.target.value)}
                  placeholder="e.g. Optical Skeleton Recalibration Pass"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Operational Objective</label>
                <textarea
                  value={newMissionObjective}
                  onChange={(e) => setNewMissionObjective(e.target.value)}
                  placeholder="Describe the desired objective and target outcomes..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Priority</label>
                <select
                  value={newMissionPriority}
                  onChange={(e) => setNewMissionPriority(e.target.value as MissionPriority)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!newMissionTitle.trim() || !newMissionObjective.trim()}
                className="w-full py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-bold rounded text-xs transition-colors cursor-pointer"
              >
                Decompose & Plan Mission
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: EXPLAINABLE AI DECISIONS */}
      {activeSubTab === 'decisions' && (
        <div className="space-y-3">
          {snapshot.recentDecisions.map((dec) => (
            <div
              key={dec.decisionId}
              className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <h4 className="text-sm font-bold text-white">{dec.title}</h4>
                  <span className="text-[10px] text-slate-400">
                    Formulated: {new Date(dec.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-emerald-400 font-bold">
                    {(dec.confidenceScore * 100).toFixed(0)}% Confidence
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      dec.humanApprovalStatus === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : dec.humanApprovalStatus === 'PENDING'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {dec.humanApprovalStatus}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-cyan-300 block mb-1">
                  Collective Decision Summary
                </span>
                <p className="text-slate-200 text-[11px] leading-relaxed">{dec.decisionSummary}</p>
                <p className="text-slate-400 text-[10px] mt-1">{dec.primaryRecommendation}</p>
              </div>

              {/* Supporting Evidence */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Synthesized Evidence & Invariants
                </span>
                <ul className="list-disc list-inside text-[10px] text-slate-400 space-y-0.5">
                  {dec.supportingEvidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>

              {/* Alternative Recommendations & Trade-Offs */}
              {dec.alternativeRecommendations.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Evaluated Alternative Recommendations & Trade-offs
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dec.alternativeRecommendations.map((alt, i) => (
                      <div key={i} className="p-2 rounded bg-slate-900/60 border border-slate-800 text-[10px]">
                        <span className="font-bold text-indigo-300">{alt.agent}:</span> {alt.recommendation}
                        <p className="text-slate-500 mt-0.5 italic">Trade-off: {alt.tradeOff}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approval Buttons */}
              {dec.humanApprovalStatus === 'PENDING' && (
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => collectiveIntelligence.rejectDecision(dec.decisionId)}
                    className="px-3 py-1 bg-red-950/80 hover:bg-red-900 border border-red-700/70 text-red-300 rounded text-xs cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => collectiveIntelligence.approveDecision(dec.decisionId)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-xs cursor-pointer"
                  >
                    Grant Operator Approval
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 6: SHARED INTELLIGENCE MEMORY */}
      {activeSubTab === 'memory' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              value={memorySearch}
              onChange={(e) => setMemorySearch(e.target.value)}
              placeholder="Search collective intelligence memory by tag, category, or title..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredMemory.map((mem) => (
              <div
                key={mem.memoryId}
                className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase font-bold">
                      {mem.category}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(mem.recordedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-xs mb-1">{mem.title}</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2">{mem.summary}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 flex-wrap gap-1">
                  <div className="flex items-center gap-1">
                    {mem.tags.map((t) => (
                      <span key={t} className="px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <span className="text-emerald-400 font-bold">{(mem.confidenceScore * 100).toFixed(0)}% Conf</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
