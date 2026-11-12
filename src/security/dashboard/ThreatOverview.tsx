/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Threat Overview Component
 */

import React from 'react';
import { Shield, AlertTriangle, AlertOctagon, CheckCircle2, Zap } from 'lucide-react';

interface ThreatOverviewProps {
  threatCounts: Record<string, number>;
  activeIncidentsCount: number;
  activeMitigationsCount: number;
  isKillSwitchEngaged: boolean;
  onToggleKillSwitch?: () => void;
}

export const ThreatOverview: React.FC<ThreatOverviewProps> = ({
  threatCounts,
  activeIncidentsCount,
  activeMitigationsCount,
  isKillSwitchEngaged,
  onToggleKillSwitch,
}) => {
  const critical = threatCounts.CRITICAL || 0;
  const high = threatCounts.HIGH || 0;
  const medium = threatCounts.MEDIUM || 0;
  const low = threatCounts.LOW || 0;

  // Posture score: 100 minus weighted active threats
  const postureScore = Math.max(0, 100 - (critical * 25 + high * 10 + medium * 3));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Security Health Posture */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Security Health</span>
          <Shield className={`w-5 h-5 ${postureScore >= 80 ? 'text-emerald-400' : postureScore >= 50 ? 'text-amber-400' : 'text-rose-400'}`} />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-white">{postureScore}%</span>
          <span className="text-xs text-slate-400">
            {postureScore >= 90 ? 'OPTIMAL' : postureScore >= 70 ? 'ELEVATED_RISK' : 'UNDER_ATTACK'}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              postureScore >= 80 ? 'bg-emerald-500' : postureScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${postureScore}%` }}
          />
        </div>
      </div>

      {/* Active Incidents */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Active Incidents</span>
          <AlertOctagon className={`w-5 h-5 ${activeIncidentsCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-white">{activeIncidentsCount}</span>
          <span className="text-xs text-slate-400">{critical} Critical</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {activeIncidentsCount === 0 ? 'All services nominal' : 'Investigation active'}
        </p>
      </div>

      {/* Autonomous Mitigations */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Active Mitigations</span>
          <Zap className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-white">{activeMitigationsCount}</span>
          <span className="text-xs text-slate-400">Enforced</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Rate limits & quarantined IPs</p>
      </div>

      {/* Emergency Kill Switch Status */}
      <div className={`border rounded-xl p-5 shadow-lg transition-colors ${
        isKillSwitchEngaged ? 'bg-rose-950/40 border-rose-700' : 'bg-slate-900/90 border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Kill Switch</span>
          <AlertTriangle className={`w-5 h-5 ${isKillSwitchEngaged ? 'text-rose-400' : 'text-emerald-400'}`} />
        </div>
        <div className="flex items-center justify-between mt-1">
          <div>
            <span className={`text-lg font-bold ${isKillSwitchEngaged ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isKillSwitchEngaged ? 'ENGAGED' : 'ARMED'}
            </span>
            <p className="text-[11px] text-slate-400">
              {isKillSwitchEngaged ? 'Autonomous mitigations frozen' : 'Autonomous policy active'}
            </p>
          </div>
          {onToggleKillSwitch && (
            <button
              onClick={onToggleKillSwitch}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                isKillSwitchEngaged
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-slate-800 hover:bg-rose-900/50 text-slate-300 border border-slate-700'
              }`}
            >
              {isKillSwitchEngaged ? 'Reset Switch' : 'Engage Freeze'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
