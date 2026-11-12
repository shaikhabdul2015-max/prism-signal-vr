import React, { useState, useEffect } from 'react';
import { VRTelemetry } from '../types/diagnostics';
import { RecordedSession, ReplayEvent, SessionComparisonResult } from '../types/phase15';
import { SessionReplayManager } from '../utils/sessionReplayManager';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  AlertTriangle,
  Zap,
  Activity,
  Layers,
  CheckCircle2,
  GitCompare,
} from 'lucide-react';

interface SessionReplayViewProps {
  telemetry: VRTelemetry;
  replayManager: SessionReplayManager;
  onTimeUpdate?: (timeMs: number, snapshot: VRTelemetry | null) => void;
}

export const SessionReplayView: React.FC<SessionReplayViewProps> = ({
  telemetry,
  replayManager,
  onTimeUpdate,
}) => {
  const [currentSession, setCurrentSession] = useState<RecordedSession | null>(null);
  const [playbackTimeMs, setPlaybackTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [compareSessionId, setCompareSessionId] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<SessionComparisonResult | null>(null);

  // Initialize or update current session from telemetry
  useEffect(() => {
    let session = replayManager.getCurrentSession();
    if (!session) {
      session = replayManager.createRecordedSession([telemetry], {
        title: `Live Session ${new Date().toLocaleTimeString()}`,
        isPhysicalHardware: false, // Default preview unless explicitly WebXR active
        detectedHeadset: 'WebXR Emulated Client',
      });
    }
    setCurrentSession(session);
    setPlaybackTimeMs(0);
  }, [telemetry, replayManager]);

  // Playback Animation Loop
  useEffect(() => {
    if (!isPlaying || !currentSession) return;

    const interval = 50; // 50ms tick
    const timer = setInterval(() => {
      setPlaybackTimeMs((prev) => {
        const nextTime = prev + interval * playbackSpeed;
        if (nextTime >= currentSession.durationMs) {
          setIsPlaying(false);
          return currentSession.durationMs;
        }
        if (onTimeUpdate) {
          const snap = replayManager.getSnapshotAtTime(nextTime);
          onTimeUpdate(nextTime, snap);
        }
        return nextTime;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, currentSession, replayManager, onTimeUpdate]);

  const handleSeek = (newTimeMs: number) => {
    if (!currentSession) return;
    const clamped = Math.max(0, Math.min(currentSession.durationMs, newTimeMs));
    setPlaybackTimeMs(clamped);
    replayManager.setPlaybackTimeMs(clamped);
    if (onTimeUpdate) {
      const snap = replayManager.getSnapshotAtTime(clamped);
      onTimeUpdate(clamped, snap);
    }
  };

  const handleTogglePlay = () => {
    if (!currentSession) return;
    if (playbackTimeMs >= currentSession.durationMs) {
      handleSeek(0);
    }
    setIsPlaying((prev) => !prev);
  };

  // Compare sessions
  const handleCompare = (otherSessionId: string) => {
    if (!currentSession) return;
    const other = replayManager.getHistory().find((s) => s.id === otherSessionId);
    if (!other) return;
    const res = replayManager.compareSessions(currentSession, other);
    setCompareSessionId(otherSessionId);
    setComparisonResult(res);
  };

  if (!currentSession) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono">
        No recorded session telemetry available.
      </div>
    );
  }

  const durationSec = (currentSession.durationMs / 1000).toFixed(1);
  const currentSec = (playbackTimeMs / 1000).toFixed(1);
  const progressPercent = (playbackTimeMs / currentSession.durationMs) * 100;

  return (
    <div className="flex flex-col gap-4 bg-slate-950/90 border border-slate-800 rounded-xl p-4 text-slate-200">
      {/* Replay Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-mono font-bold tracking-wider uppercase text-purple-300">
            Intelligent Session Replay & Timeline
          </h3>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
              currentSession.isPhysicalHardware
                ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                : 'bg-amber-950/60 border border-amber-600/60 text-amber-300'
            }`}
          >
            {currentSession.isPhysicalHardware ? 'PHYSICAL VR' : 'SIMULATED / PREVIEW'}
          </span>
        </div>

        {/* Playback Speed Controls */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs font-mono">
          {[0.5, 1.0, 2.0].map((spd) => (
            <button
              key={spd}
              onClick={() => {
                setPlaybackSpeed(spd);
                replayManager.setPlaybackSpeed(spd);
              }}
              className={`px-2 py-1 rounded transition-colors ${
                playbackSpeed === spd ? 'bg-purple-900 text-purple-200 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Scrubbable Timeline */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs font-mono text-slate-400">
          <span>{currentSec}s</span>
          <span className="text-purple-300 font-bold">{progressPercent.toFixed(0)}%</span>
          <span>{durationSec}s</span>
        </div>

        {/* Timeline Slider Track with Event Markers */}
        <div className="relative w-full h-8 flex items-center">
          {/* Base Track */}
          <input
            type="range"
            min={0}
            max={currentSession.durationMs}
            value={playbackTimeMs}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 z-10"
          />

          {/* Event Flags on Timeline */}
          {currentSession.events.map((ev) => {
            const leftPct = (ev.timestampMs / currentSession.durationMs) * 100;
            const isLoss = ev.type === 'tracking_loss';
            const isFrameDrop = ev.type === 'frame_drop';
            const isRecovery = ev.type === 'recovery';

            return (
              <div
                key={ev.id}
                style={{ left: `${leftPct}%` }}
                title={`${ev.title} at ${(ev.timestampMs / 1000).toFixed(1)}s`}
                className={`absolute w-2 h-4 -top-1 rounded-sm transform -translate-x-1/2 cursor-help z-20 ${
                  isLoss
                    ? 'bg-red-500 shadow-sm shadow-red-500/50'
                    : isFrameDrop
                    ? 'bg-amber-400'
                    : isRecovery
                    ? 'bg-emerald-400'
                    : 'bg-cyan-400'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Playback Controls & Timestamp Stepper */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white rounded-lg text-xs font-mono font-bold transition-all shadow-md shadow-purple-900/30"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY REPLAY'}</span>
          </button>

          <button
            onClick={() => handleSeek(0)}
            title="Rewind to Start"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs font-mono"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleSeek(playbackTimeMs + 500)}
            title="Step Forward 0.5s"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs font-mono"
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Loss
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Hiccup
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Recovery
          </div>
        </div>
      </div>

      {/* Event Log at Current Scrub Time */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">
          Timeline Events Recorded ({currentSession.events.length})
        </h4>

        {currentSession.events.length === 0 ? (
          <div className="text-xs font-mono text-slate-500 italic p-3 bg-slate-900/40 rounded border border-slate-800">
            Zero abnormal tracking loss or frame degradation events recorded in this session.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
            {currentSession.events.map((ev) => (
              <div
                key={ev.id}
                onClick={() => handleSeek(ev.timestampMs)}
                className={`flex items-center justify-between p-2 rounded text-xs font-mono border cursor-pointer transition-colors ${
                  Math.abs(playbackTimeMs - ev.timestampMs) < 400
                    ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {ev.type === 'tracking_loss' ? (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  ) : ev.type === 'frame_drop' ? (
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">{ev.title}</span>
                    <span className="text-slate-500 ml-2">@ {(ev.timestampMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 hidden sm:inline">{ev.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Comparison Module */}
      <div className="mt-2 pt-3 border-t border-slate-800 flex flex-col gap-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase">
              Historical Session Comparison
            </h4>
          </div>

          {/* Session Selector to Compare */}
          {replayManager.getHistory().length > 1 && (
            <select
              value={compareSessionId || ''}
              onChange={(e) => handleCompare(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono rounded px-2 py-1"
            >
              <option value="">Compare with past session...</option>
              {replayManager.getHistory().map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === currentSession.id}>
                  {s.title} ({s.isPhysicalHardware ? 'Physical' : 'Simulated'})
                </option>
              ))}
            </select>
          )}
        </div>

        {comparisonResult && (
          <div className="bg-slate-900/90 border border-cyan-900/80 rounded-lg p-3 text-xs font-mono flex flex-col gap-2">
            <div className="font-bold text-cyan-200">{comparisonResult.summaryVerdict}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">FPS DELTA</span>
                <span className={comparisonResult.fpsDelta >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {comparisonResult.fpsDelta >= 0 ? `+${comparisonResult.fpsDelta}` : comparisonResult.fpsDelta} FPS
                </span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">LATENCY DELTA</span>
                <span className={comparisonResult.latencyDeltaMs <= 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {comparisonResult.latencyDeltaMs > 0 ? `+${comparisonResult.latencyDeltaMs}` : comparisonResult.latencyDeltaMs} ms
                </span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">LOSS DELTA</span>
                <span className={comparisonResult.trackingLossDelta <= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {comparisonResult.trackingLossDelta > 0 ? `+${comparisonResult.trackingLossDelta}` : comparisonResult.trackingLossDelta} events
                </span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block">COVERAGE DELTA</span>
                <span className={comparisonResult.jointCoverageDelta >= 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {comparisonResult.jointCoverageDelta >= 0 ? `+${comparisonResult.jointCoverageDelta}` : comparisonResult.jointCoverageDelta}%
                </span>
              </div>
            </div>

            <ul className="list-disc list-inside text-slate-400 text-[11px] flex flex-col gap-1">
              {comparisonResult.keyDifferences.map((diff, i) => (
                <li key={i}>{diff}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
