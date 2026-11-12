/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Master Security Dashboard
 * High-performance, responsive Zero-Trust security monitoring and autonomous mitigation interface.
 */

import React, { useState, useEffect } from 'react';
import { ThreatOverview } from './ThreatOverview';
import { SecurityEventFeed } from './SecurityEventFeed';
import { IncidentPanel } from './IncidentPanel';
import { ResponseStatus } from './ResponseStatus';
import { ThreatDetectionEngine } from '../threat-detection/ThreatDetectionEngine';
import { ThreatEvent } from '../threat-detection/ThreatEvent';
import { IncidentManager, SecurityIncident } from '../incidents/IncidentManager';
import { IncidentStatus } from '../incidents/IncidentWorkflow';
import { EmergencyKillSwitch } from '../response/EmergencyKillSwitch';
import { ResponseRollbackManager, ActiveMitigation } from '../response/ResponseRollback';
import { ResponseApprovalManager, PendingApprovalRequest } from '../response/ResponseApproval';
import { Shield, RefreshCw, Zap, AlertTriangle, Layers } from 'lucide-react';

export const SecurityDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'FEED' | 'INCIDENTS' | 'MITIGATIONS'>('FEED');
  const [threatEvents, setThreatEvents] = useState<ThreatEvent[]>([]);
  const [threatCounts, setThreatCounts] = useState<Record<string, number>>({});
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [activeMitigations, setActiveMitigations] = useState<ActiveMitigation[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalRequest[]>([]);
  const [isKillSwitchEngaged, setIsKillSwitchEngaged] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString());

  const refreshData = () => {
    try {
      const threatEngine = ThreatDetectionEngine.getInstance();
      setThreatEvents(threatEngine.getRecentThreats(50));
      setThreatCounts(threatEngine.getThreatCountBySeverity());

      const incidentMgr = IncidentManager.getInstance();
      setIncidents(incidentMgr.getAllIncidents());

      const rollbackMgr = ResponseRollbackManager.getInstance();
      setActiveMitigations(rollbackMgr.getActiveMitigations());

      const approvalMgr = ResponseApprovalManager.getInstance();
      setPendingApprovals(approvalMgr.getPendingRequests());

      const killSwitch = EmergencyKillSwitch.getInstance();
      setIsKillSwitchEngaged(killSwitch.isKillSwitchActive());

      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('[SecurityDashboard] Refresh error:', err);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleKillSwitch = () => {
    const killSwitch = EmergencyKillSwitch.getInstance();
    if (killSwitch.isKillSwitchActive()) {
      // Disengage with dual operator signatures (mock operator IDs in UI)
      killSwitch.disengage('operator-admin-01', 'operator-secops-02', 'Manual UI recovery reset');
    } else {
      killSwitch.engage('operator-admin-01', 'Manual operator freeze triggered from Security Dashboard');
    }
    refreshData();
  };

  const handleUpdateIncidentStatus = (incidentId: string, status: IncidentStatus) => {
    const incidentMgr = IncidentManager.getInstance();
    incidentMgr.updateIncidentStatus(incidentId, status, 'operator-admin-01', 'Status updated from dashboard');
    refreshData();
  };

  const handleVerifyRemediation = async (incidentId: string) => {
    const incidentMgr = IncidentManager.getInstance();
    await incidentMgr.verifyIncidentRemediation(incidentId);
    refreshData();
  };

  const handleRollbackMitigation = (mitigationId: string) => {
    const rollbackMgr = ResponseRollbackManager.getInstance();
    rollbackMgr.rollbackMitigation(mitigationId, 'operator-admin-01', 'Manual operator rollback');
    refreshData();
  };

  const handleApproveRequest = (requestId: string) => {
    const approvalMgr = ResponseApprovalManager.getInstance();
    approvalMgr.approveRequest(requestId, 'operator-admin-01', 'Approved via Security Dashboard');
    refreshData();
  };

  const handleRejectRequest = (requestId: string) => {
    const approvalMgr = ResponseApprovalManager.getInstance();
    approvalMgr.rejectRequest(requestId, 'operator-admin-01', 'Rejected via Security Dashboard');
    refreshData();
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-950/80 border border-indigo-700/50 rounded-xl shadow-inner">
              <Shield className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                PRISM SIGNAL <span className="text-indigo-400 font-mono text-sm px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800">STAGE 5.3</span>
              </h1>
              <p className="text-xs text-slate-400">Autonomous Threat Mitigation & Zero-Trust Defense Command</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[11px] font-mono text-slate-500">Updated: {lastRefreshed}</span>
            <button
              onClick={refreshData}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-colors"
              title="Refresh Security Telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Threat Overview Metric Cards */}
        <ThreatOverview
          threatCounts={threatCounts}
          activeIncidentsCount={incidents.filter((i) => i.status !== 'CLOSED').length}
          activeMitigationsCount={activeMitigations.length}
          isKillSwitchEngaged={isKillSwitchEngaged}
          onToggleKillSwitch={handleToggleKillSwitch}
        />

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('FEED')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'FEED'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Threat Feed ({threatEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('INCIDENTS')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'INCIDENTS'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Incidents ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('MITIGATIONS')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'MITIGATIONS'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Autonomous Mitigations ({activeMitigations.length})
            {pendingApprovals.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>

        {/* Tab Panels */}
        {activeTab === 'FEED' && <SecurityEventFeed events={threatEvents} />}
        {activeTab === 'INCIDENTS' && (
          <IncidentPanel
            incidents={incidents}
            onUpdateStatus={handleUpdateIncidentStatus}
            onVerifyRemediation={handleVerifyRemediation}
          />
        )}
        {activeTab === 'MITIGATIONS' && (
          <ResponseStatus
            activeMitigations={activeMitigations}
            pendingApprovals={pendingApprovals}
            onRollbackMitigation={handleRollbackMitigation}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
          />
        )}
      </div>
    </div>
  );
};
export default SecurityDashboard;
