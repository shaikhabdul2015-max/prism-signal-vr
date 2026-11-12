/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Security Event Feed
 */

import React, { useState } from 'react';
import { ThreatEvent } from '../threat-detection/ThreatEvent';
import { ShieldAlert, Filter, Clock, Globe } from 'lucide-react';

interface SecurityEventFeedProps {
  events: ThreatEvent[];
}

export const SecurityEventFeed: React.FC<SecurityEventFeedProps> = ({ events }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredEvents = events.filter((e) => {
    if (filterSeverity === 'ALL') return true;
    return e.severity === filterSeverity;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-white">Live Security Threat Feed</h3>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
            {filteredEvents.length} events
          </span>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      <div className="divide-y divide-slate-800/60 max-h-[480px] overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No threat events detected matching current criteria.
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <div key={evt.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-slate-800/20 px-2 rounded-lg transition-colors">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider ${
                      evt.severity === 'CRITICAL'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : evt.severity === 'HIGH'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : evt.severity === 'MEDIUM'
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {evt.severity}
                  </span>
                  <span className="text-xs font-semibold text-white">{evt.title}</span>
                  <span className="text-[11px] font-mono text-slate-400">({evt.category})</span>
                </div>
                <p className="text-xs text-slate-400">{evt.description}</p>
                <div className="flex items-center space-x-4 text-[11px] text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" /> {evt.sourceIp}
                  </span>
                  {evt.endpoint && <span>Endpoint: {evt.endpoint}</span>}
                  {evt.userId && <span>User: {evt.userId}</span>}
                </div>
              </div>

              <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center shrink-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-slate-500 uppercase">Risk Score</span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      evt.riskScore >= 80 ? 'text-rose-400' : evt.riskScore >= 50 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {evt.riskScore}/100
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-[10px] text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
