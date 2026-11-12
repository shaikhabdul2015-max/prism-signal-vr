import React, { useState } from 'react';
import { AutonomousQAAudit, QAAssistedTestChecklist } from '../types/phase15';
import {
  ShieldAlert,
  ShieldCheck,
  CheckSquare,
  Square,
  Download,
  AlertTriangle,
  FileText,
  Terminal,
  RefreshCw,
} from 'lucide-react';

interface AutonomousQAAgentViewProps {
  audit: AutonomousQAAudit;
  onRefreshAudit?: () => void;
}

export const AutonomousQAAgentView: React.FC<AutonomousQAAgentViewProps> = ({
  audit,
  onRefreshAudit,
}) => {
  const [checklist, setChecklist] = useState<QAAssistedTestChecklist[]>(audit.checklist);
  const [exported, setExported] = useState(false);

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleExportReport = () => {
    const reportText = `# PRISM SIGNAL: BEYOND THE VOID — AUTONOMOUS QA AUDIT REPORT
Audit ID: ${audit.auditId}
Timestamp: ${audit.timestamp}
Session ID: ${audit.evaluatedSessionId}
Session Environment: ${audit.sessionType}

## Executive Summary
${audit.executiveSummary}

## Evaluated Categories
${audit.reviewedCategories.map((c) => `- ${c.name.toUpperCase()}: ${c.status} (${c.issuesCount} issues)`).join('\n')}

## Recommended Regression Test Suite
${audit.recommendedRegressions.map((r) => `### [${r.priority.toUpperCase()}] ${r.title}\nRationale: ${r.rationale}`).join('\n\n')}

## Interactive Verification Checklist
${checklist.map((c) => `- [${c.completed ? 'x' : ' '}] (${c.priority.toUpperCase()}) ${c.item} — ${c.notes}`).join('\n')}

## Safety Boundary Notice
${audit.safetyBoundaryNotice}
`;

    const blob = new Blob([reportText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QA_AUDIT_${audit.auditId}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  return (
    <div className="flex flex-col gap-4 bg-slate-950/90 border border-slate-800 rounded-xl p-4 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-mono font-bold tracking-wider uppercase text-emerald-300">
            Autonomous QA Agent // Session Audit
          </h3>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
              audit.sessionType === 'PHYSICAL_HARDWARE'
                ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                : 'bg-slate-900 border border-slate-700 text-slate-400'
            }`}
          >
            {audit.sessionType}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onRefreshAudit && (
            <button
              onClick={onRefreshAudit}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Re-Audit
            </button>
          )}

          <button
            onClick={handleExportReport}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white rounded text-xs font-mono font-bold transition-all shadow-md shadow-emerald-950/40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exported ? 'EXPORTED!' : 'EXPORT REPORT'}</span>
          </button>
        </div>
      </div>

      {/* Safety Boundary Notice (Mandatory Agent Boundary) */}
      <div className="bg-amber-950/30 border border-amber-800/60 rounded-lg p-2.5 flex items-start gap-2 text-[11px] font-mono text-amber-300">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">AGENT BOUNDARY: </span>
          <span>{audit.safetyBoundaryNotice}</span>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3 text-xs font-mono">
        <span className="text-slate-500 block text-[10px] uppercase font-bold">EXECUTIVE SUMMARY:</span>
        <p className="text-slate-200 mt-1">{audit.executiveSummary}</p>
        {audit.historicalComparisonNotes && (
          <p className="text-cyan-400 text-[11px] mt-1.5 border-t border-slate-800 pt-1.5">
            Historical Trend: {audit.historicalComparisonNotes}
          </p>
        )}
      </div>

      {/* Category Review Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
        {audit.reviewedCategories.map((cat) => (
          <div
            key={cat.name}
            className={`p-2.5 rounded-lg border flex flex-col justify-between ${
              cat.status === 'PASS'
                ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300'
                : cat.status === 'FAIL'
                ? 'bg-red-950/30 border-red-800/80 text-red-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <div className="font-bold text-[11px]">{cat.name.replace(/_/g, ' ').toUpperCase()}</div>
            <div className="flex items-center justify-between mt-1 text-[10px]">
              <span className="font-bold">{cat.status}</span>
              <span>{cat.issuesCount} issues</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recommended Regression Suites */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Recommended Regression Test Plan ({audit.recommendedRegressions.length})
        </h4>

        <div className="flex flex-col gap-2">
          {audit.recommendedRegressions.map((reg) => (
            <div
              key={reg.testId}
              className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col gap-1 text-xs font-mono"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">{reg.title}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    reg.priority === 'high'
                      ? 'bg-red-950 text-red-300 border border-red-800'
                      : reg.priority === 'medium'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {reg.priority.toUpperCase()} PRIORITY
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">{reg.rationale}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Verification Checklist */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5">
          <CheckSquare className="w-4 h-4 text-cyan-400" />
          Interactive QA Checklist
        </h4>

        <div className="flex flex-col gap-1.5">
          {checklist.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleChecklistItem(item.id)}
              className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs font-mono cursor-pointer transition-colors ${
                item.completed
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/70'
              }`}
            >
              <button type="button" className="mt-0.5 text-cyan-400 shrink-0">
                {item.completed ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4 text-slate-600" />}
              </button>
              <div className="flex flex-col min-w-0">
                <span className={item.completed ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}>
                  {item.item}
                </span>
                <span className="text-[10px] text-slate-500">
                  [{item.category.toUpperCase()}] • {item.notes}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
