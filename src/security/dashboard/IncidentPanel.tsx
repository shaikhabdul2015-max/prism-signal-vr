/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Incident Panel Component
 */

import React from 'react';
import { SecurityIncident } from '../incidents/IncidentManager';
import { IncidentStatus } from '../incidents/IncidentWorkflow';
import { AlertCircle, CheckCircle, Clock, ShieldCheck, UserCheck } from 'lucide-react';

interface IncidentPanelProps {
  incidents: SecurityIncident[];
  onUpdateStatus?: (incidentId: string, status: IncidentStatus) => void;
  onVerifyRemediation?: (incidentId: string) => void;
}

export const IncidentPanel: React.FC<IncidentPanelProps> = ({
  incidents,
  onUpdateStatus,
  onVerifyRemediation,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <h3 className="font-semibold text-white">Security Incidents & Evidence</h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {incidents.filter((i) => i.status !== 'CLOSED').length} Active
        </span>
      </div>

      <div className="space-y-4 max-h-[480px] overflow-y-auto">
        {incidents.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No security incidents recorded. System running nominal.
          </div>
        ) : (
          incidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-slate-800/40 border border-slate-800 rounded-lg p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        inc.status === 'DETECTED'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : inc.status === 'CONTAINED'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : inc.status === 'REMEDIATED'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {inc.status}
                    </span>
                    <h4 className="text-sm font-semibold text-white">{inc.title}</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    ID: {inc.id} • Target IP: {inc.sourceIp}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {onUpdateStatus && inc.status === 'DETECTED' && (
                    <button
                      onClick={() => onUpdateStatus(inc.id, 'CONTAINED')}
                      className="px-2.5 py-1 text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-700/50 rounded-lg transition-colors"
                    >
                      Mark Contained
                    </button>
                  )}
                  {onVerifyRemediation && inc.status === 'CONTAINED' && (
                    <button
                      onClick={() => onVerifyRemediation(inc.id)}
                      className="px-2.5 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-700/50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Verify Remediation
                    </button>
                  )}
                  {onUpdateStatus && (inc.status === 'CONTAINED' || inc.status === 'REMEDIATED') && (
                    <button
                      onClick={() => onUpdateStatus(inc.id, 'CLOSED')}
                      className="px-2.5 py-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-700/50 rounded-lg transition-colors"
                    >
                      Close Incident
                    </button>
                  )}
                </div>
              </div>

              {/* Evidence Hash Summary */}
              {inc.evidence && inc.evidence.length > 0 && (
                <div className="bg-slate-900/60 rounded p-2 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>SHA-256 Evidence Seal: {inc.evidence[0].sha256Hash.substring(0, 24)}...</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Integrity Verified
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
