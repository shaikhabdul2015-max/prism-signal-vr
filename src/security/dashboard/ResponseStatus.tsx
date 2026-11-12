/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Response Status Component
 */

import React from 'react';
import { ActiveMitigation } from '../response/ResponseRollback';
import { PendingApprovalRequest } from '../response/ResponseApproval';
import { Zap, Clock, UserCheck, XCircle, CheckCircle, ShieldAlert } from 'lucide-react';

interface ResponseStatusProps {
  activeMitigations: ActiveMitigation[];
  pendingApprovals: PendingApprovalRequest[];
  onRollbackMitigation?: (mitigationId: string) => void;
  onApproveRequest?: (requestId: string) => void;
  onRejectRequest?: (requestId: string) => void;
}

export const ResponseStatus: React.FC<ResponseStatusProps> = ({
  activeMitigations,
  pendingApprovals,
  onRollbackMitigation,
  onApproveRequest,
  onRejectRequest,
}) => {
  return (
    <div className="space-y-6">
      {/* Pending Human Approvals (Critical Response Gate) */}
      {pendingApprovals.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-600/40 rounded-xl p-5 shadow-lg">
          <div className="flex items-center space-x-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-white">Pending Human Approvals (Level 4 Critical)</h3>
            <span className="text-xs bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full">
              {pendingApprovals.length} Action Required
            </span>
          </div>
          <p className="text-xs text-amber-300/80 mb-4">
            Destructive or critical containment actions require explicit operator approval before execution.
          </p>

          <div className="space-y-3">
            {pendingApprovals.map((req) => (
              <div
                key={req.id}
                className="bg-slate-900/80 border border-amber-800/40 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-amber-300 font-mono">{req.action}</span>
                    <span className="text-xs text-slate-400">Target: {req.target}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{req.rationale}</p>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Expires: {new Date(req.expiresAt).toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {onApproveRequest && (
                    <button
                      onClick={() => onApproveRequest(req.id)}
                      className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}
                  {onRejectRequest && (
                    <button
                      onClick={() => onRejectRequest(req.id)}
                      className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg font-semibold transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Autonomous Mitigations */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white">Active Autonomous Mitigations</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {activeMitigations.length} Active Rules
          </span>
        </div>

        <div className="space-y-3 max-h-[380px] overflow-y-auto">
          {activeMitigations.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No active mitigations enforced. All clients nominal.
            </div>
          ) : (
            activeMitigations.map((mit) => {
              const remainingSeconds = Math.max(
                0,
                Math.round((new Date(mit.expiresAt).getTime() - Date.now()) / 1000)
              );

              return (
                <div
                  key={mit.id}
                  className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white">{mit.actionType}</span>
                      <span className="text-xs text-indigo-400 font-mono">Target: {mit.target}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" /> TTL: {remainingSeconds}s remaining
                      </span>
                      <span>Threat: {mit.threatId}</span>
                    </div>
                  </div>

                  {onRollbackMitigation && (
                    <button
                      onClick={() => onRollbackMitigation(mit.id)}
                      className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors"
                    >
                      Rollback
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
