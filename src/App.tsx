/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CrystalData,
  CrystalId,
  MissionState,
  DecodingState,
  VRSupportStatus,
  HandTrackingStatus,
  DiagnosticsSessionState,
} from './types/game';
import {
  DEFAULT_CRYSTALS,
  simulateLightBeamPuzzle,
  ALIEN_SYMBOLS,
  TARGET_DECODING_SEQUENCE,
  validateAlienSequence,
  CIVILIZATION_STORY,
} from './puzzle/puzzleEngine';
import { initScene, SceneController } from './scene/sceneManager';
import type { VRUIAction } from './scene/vrSpatialUI';
import type { CalibrationStateSnapshot, AccessibilityStateSnapshot } from './scene/xrAccessibility';
import { sound } from './audio/soundEngine';
import { TopBar } from './components/TopBar';
import { BottomDock } from './components/BottomDock';
import { IntroScreen } from './components/IntroScreen';
import { TutorialModal } from './components/TutorialModal';
import { PauseModal } from './components/PauseModal';
import { VictoryModal } from './components/VictoryModal';
import { VRInfoModal } from './components/VRInfoModal';
import { DecodingPanel } from './components/DecodingPanel';
import { StoryModal } from './components/StoryModal';
import { HandTrackingTutorialModal } from './components/HandTrackingTutorialModal';
import HandDiagnosticsModal from './components/HandDiagnosticsModal';
import { PerformanceIntelligenceDashboard } from './components/PerformanceIntelligenceDashboard';
import { GlobalCommandCenter } from './components/GlobalCommandCenter';
import { VRTelemetry, LightingPreset } from './types/diagnostics';

const isDevSimulationMode = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
const LazyVirtualXRTestDashboard = isDevSimulationMode
  ? React.lazy(() =>
      import('./components/VirtualXRTestDashboard').then((m) => ({
        default: m.VirtualXRTestDashboard,
      }))
    )
  : null;
import { AgentOrchestrator } from './ai/orchestration/AgentOrchestrator';
import { DynamicDifficultyEngine } from './ai/adaptive/DynamicDifficultyEngine';
import { ContextualInteractionSystem } from './webxr/intelligence/ContextualInteractionSystem';
import { SpatialSecurityGuard } from './spatial/SpatialSecurityGuard';
import { SpatialMappingEngine } from './spatial/SpatialMappingEngine';
import { SpatialObjectIntelligence } from './spatial/SpatialObjectIntelligence';
import { RealTimeWorldAwareness } from './spatial/RealTimeWorldAwareness';
import { Phase36IntegrationCoordinator } from './engines/Phase36IntegrationCoordinator';

interface Stage67AppRuntime {
  securityGuard: SpatialSecurityGuard;
  spatialMapping: SpatialMappingEngine;
  objectIntelligence: SpatialObjectIntelligence;
  worldAwareness: RealTimeWorldAwareness;
  dynamicDifficulty: DynamicDifficultyEngine;
  contextualInteraction: ContextualInteractionSystem;
  agentOrchestrator: AgentOrchestrator;
  phaseStartedAtMs: number;
}

// Stable Initial Light Simulation constant across renders
const INITIAL_SIM = simulateLightBeamPuzzle(DEFAULT_CRYSTALS, true);

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneControllerRef = useRef<SceneController | null>(null);
  const stage67RuntimeRef = useRef<Stage67AppRuntime | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Puzzle State
  const [crystals, setCrystals] = useState<CrystalData[]>(INITIAL_SIM.updatedCrystals);
  const [selectedId, setSelectedId] = useState<CrystalId | null>('ruby');
  const [vrInfoOpen, setVrInfoOpen] = useState(false);
  const [isBeamSourceActive, setIsBeamSourceActive] = useState(true);

  // Phase 5, 6, 10 & 13 WebXR, Hand Tracking and Diagnostics State
  const [vrSupportStatus, setVrSupportStatus] = useState<VRSupportStatus>('checking');
  const [isStartingVR, setIsStartingVR] = useState<boolean>(false);
  const [vrErrorMessage, setVrErrorMessage] = useState<string | null>(null);
  const [handTrackingStatus, setHandTrackingStatus] = useState<HandTrackingStatus>('unavailable');
  const [activeHandsCount, setActiveHandsCount] = useState<number>(0);
  const [handTutorialOpen, setHandTutorialOpen] = useState<boolean>(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState<boolean>(false);
  const [virtualXROpen, setVirtualXROpen] = useState<boolean>(false);
  const [isHandInteractionEnabled, setIsHandInteractionEnabled] = useState<boolean>(true);
  const [calibrationState, setCalibrationState] = useState<CalibrationStateSnapshot | undefined>(undefined);
  const [accessibilityState, setAccessibilityState] = useState<AccessibilityStateSnapshot | undefined>(undefined);
  const [storyChapterIndex, setStoryChapterIndex] = useState<number>(0);
  const vrUIActionHandlerRef = useRef<(action: VRUIAction) => void>(() => {});

  // Phase 3 Decoding State
  const [decodingState, setDecodingState] = useState<DecodingState>({
    isUnlocked: INITIAL_SIM.progress.isTargetReceiverHit,
    selectedSequence: [],
    targetSequence: TARGET_DECODING_SEQUENCE,
    isSolved: false,
    attempts: 0,
    lastFeedback: {
      status: 'idle',
      message: '',
      correctCount: 0,
    },
    cluesScannerOpen: false,
  });

  const [missionState, setMissionState] = useState<MissionState>({
    phase: 'intro',
    started: false,
    totalCoherence: INITIAL_SIM.totalCoherence,
    puzzleProgress: INITIAL_SIM.progress,
    decodingState: {
      isUnlocked: INITIAL_SIM.progress.isTargetReceiverHit,
      selectedSequence: [],
      targetSequence: TARGET_DECODING_SEQUENCE,
      isSolved: false,
      attempts: 0,
      lastFeedback: {
        status: 'idle',
        message: '',
        correctCount: 0,
      },
      cluesScannerOpen: false,
    },
    selectedCrystalId: 'ruby',
    tutorialOpen: false,
    tutorialStep: 0,
    pauseOpen: false,
    audioMuted: false,
    audioVolume: 0.35,
    cinematicMode: false,
    seatedMode: true,
    transmissionDecoded: false,
  });

  // Keep a ref to mutable state for scene callbacks
  const crystalsRef = useRef(crystals);
  crystalsRef.current = crystals;
  const isBeamActiveRef = useRef(isBeamSourceActive);
  isBeamActiveRef.current = isBeamSourceActive;

  // Error-isolated Stage 6 & 7 intelligence telemetry & orchestration pass
  const runStage67TelemetryPass = useCallback(
    (
      actionName: string,
      coherencePercent: number,
      activeSegmentCount: number,
      gamePhase: string,
      behaviorEventType: 'grab' | 'rotate' | 'release' | 'ray_dwell' | 'misalignment' | 'success' | 'idle' = 'rotate',
      isSuccessful?: boolean,
      targetId?: string
    ) => {
      const rt = stage67RuntimeRef.current;
      if (!rt || !isMountedRef.current) return;

      try {
        const now = Date.now();
        const analyzer = rt.dynamicDifficulty.getAnalyzer();
        analyzer.recordEvent({
          type: behaviorEventType,
          timestamp: now,
          targetId,
          isSuccessful,
        });
        const metrics = analyzer.analyze(now);
        rt.dynamicDifficulty.evaluateAndAdjust(now);

        const skillProfile = rt.dynamicDifficulty.getSkillEstimator().getProfile();
        const rigNode = rt.spatialMapping.getNode('playerCameraRig');
        const playerPosition: [number, number, number] = rigNode?.worldTransform.position || [0, 1.3, 4.5];

        void rt.agentOrchestrator
          .executeCycleWithTimeout({
            gamePhase,
            coherencePercent,
            activeSegmentCount,
            timeInPhaseMs: Math.max(0, now - rt.phaseStartedAtMs),
            playerFrustration: metrics.frustrationIndex,
            playerBoredom: metrics.boredomIndex,
            playerSkillRating: skillProfile.skillRating,
            lastPlayerAction: actionName,
            spatialContext: {
              playerPosition,
              playerGazeDirection: [0, 0, -1],
              isHumanInputActive: rt.agentOrchestrator.isHumanControlActive(),
            },
          })
          .catch(() => {
            // Isolated from React UI lifecycle
          });
      } catch {
        // Non-blocking error isolation
      }
    },
    []
  );

  // Sound triggers helper
  const playSoundOnAngleChange = useCallback((id: CrystalId, newAngle: number) => {
    const currentList = crystalsRef.current;
    const crystal = currentList.find((c) => c.id === id);
    if (!crystal) return;

    sound.playRotateTick(crystal.resonancePercent);
  }, []);

  // Update crystal angle and recalculate real light-beam propagation
  const handleCrystalAngleChange = useCallback(
    (id: CrystalId, newAngle: number) => {
      setCrystals((prev) => {
        const angleUpdated = prev.map((c) => (c.id === id ? { ...c, rotationY: newAngle } : c));
        const sim = simulateLightBeamPuzzle(angleUpdated, isBeamActiveRef.current);

        // Check if newly connected or solved
        setMissionState((ms) => {
          const wasTargetHit = ms.puzzleProgress.isTargetReceiverHit;
          const nowTargetHit = sim.progress.isTargetReceiverHit;

          if (!wasTargetHit && nowTargetHit) {
            sound.playAlignmentLock();
            sound.playSignalDecodedFanfare();
          } else if (
            !ms.puzzleProgress.beamChainStatus.rubyToAzure &&
            sim.progress.beamChainStatus.rubyToAzure
          ) {
            sound.playAlignmentLock();
          } else if (
            !ms.puzzleProgress.beamChainStatus.azureToEmerald &&
            sim.progress.beamChainStatus.azureToEmerald
          ) {
            sound.playAlignmentLock();
          }

          const nextDecoding = {
            ...ms.decodingState,
            isUnlocked: ms.decodingState.isUnlocked || nowTargetHit,
          };

          return {
            ...ms,
            totalCoherence: sim.totalCoherence,
            puzzleProgress: sim.progress,
            decodingState: nextDecoding,
            phase: nowTargetHit && ms.phase !== 'decoding' && ms.phase !== 'story' ? 'solved' : ms.phase,
            transmissionDecoded: ms.transmissionDecoded || nowTargetHit,
          };
        });

        setDecodingState((ds) => ({
          ...ds,
          isUnlocked: ds.isUnlocked || sim.progress.isTargetReceiverHit,
        }));

        if (sceneControllerRef.current) {
          sceneControllerRef.current.updateCrystalData(sim.updatedCrystals, sim.totalCoherence);
          sceneControllerRef.current.updateBeamSegments(sim.beamSegments, sim.progress.isTargetReceiverHit);
        }

        const updatedCrystal = sim.updatedCrystals.find((c) => c.id === id);
        runStage67TelemetryPass(
          `rotate_${id}`,
          sim.totalCoherence,
          sim.beamSegments.length,
          sim.progress.isTargetReceiverHit ? 'solved' : 'playing',
          updatedCrystal?.isAligned ? 'success' : 'rotate',
          updatedCrystal?.isAligned,
          id
        );

        return sim.updatedCrystals;
      });
    },
    [runStage67TelemetryPass]
  );

  // Toggle Console Light Source
  const handleToggleBeamSource = useCallback(() => {
    setIsBeamSourceActive((prevActive) => {
      const nextActive = !prevActive;
      isBeamActiveRef.current = nextActive;
      sound.playUIClick();

      if (sceneControllerRef.current) {
        sceneControllerRef.current.setBeamSourceActive(nextActive);
      }

      setCrystals((prev) => {
        const sim = simulateLightBeamPuzzle(prev, nextActive);
        setMissionState((ms) => ({
          ...ms,
          totalCoherence: sim.totalCoherence,
          puzzleProgress: sim.progress,
        }));

        if (sceneControllerRef.current) {
          sceneControllerRef.current.updateCrystalData(sim.updatedCrystals, sim.totalCoherence);
          sceneControllerRef.current.updateBeamSegments(sim.beamSegments, sim.progress.isTargetReceiverHit);
        }

        runStage67TelemetryPass(
          nextActive ? 'beam_activated' : 'beam_deactivated',
          sim.totalCoherence,
          sim.beamSegments.length,
          sim.progress.isTargetReceiverHit ? 'solved' : 'playing',
          'grab',
          true,
          'console-emitter'
        );

        return sim.updatedCrystals;
      });

      return nextActive;
    });
  }, [runStage67TelemetryPass]);

  // Handle crystal selection (from 3D scene tap or HUD tab)
  const handleSelectCrystal = useCallback((id: CrystalId | null) => {
    setSelectedId(id);
    setMissionState((ms) => ({ ...ms, selectedCrystalId: id }));
    if (sceneControllerRef.current) {
      sceneControllerRef.current.selectCrystal(id);
    }
    if (id) {
      const c = crystalsRef.current.find((item) => item.id === id);
      if (c) {
        sound.playCrystalChime(c.frequency, c.resonancePercent / 100);
      }
    }
  }, []);

  // ==========================================
  // PHASE 3: ALIEN SYMBOL DECODING HANDLERS
  // ==========================================

  const updateConsoleGlyphsDisplay = (symbolIds: string[]) => {
    const glyphs = symbolIds.map((id) => {
      const sym = ALIEN_SYMBOLS.find((s) => s.id === id);
      return sym ? sym.glyph : '·';
    });
    if (sceneControllerRef.current) {
      sceneControllerRef.current.setDisplayedConsoleGlyphs(glyphs);
    }
  };

  const handleSelectSymbol = (symbolId: string) => {
    setDecodingState((prev) => {
      if (prev.selectedSequence.includes(symbolId) || prev.selectedSequence.length >= 4) {
        return prev;
      }
      const nextSeq = [...prev.selectedSequence, symbolId];
      updateConsoleGlyphsDisplay(nextSeq);

      return {
        ...prev,
        selectedSequence: nextSeq,
        lastFeedback: {
          status: 'idle',
          message: '',
          correctCount: 0,
        },
      };
    });
  };

  const handleRemoveSymbolSlot = (index: number) => {
    setDecodingState((prev) => {
      const nextSeq = prev.selectedSequence.filter((_, idx) => idx !== index);
      updateConsoleGlyphsDisplay(nextSeq);

      return {
        ...prev,
        selectedSequence: nextSeq,
        lastFeedback: {
          status: 'idle',
          message: '',
          correctCount: 0,
        },
      };
    });
  };

  const handleClearSequence = () => {
    setDecodingState((prev) => {
      updateConsoleGlyphsDisplay([]);
      return {
        ...prev,
        selectedSequence: [],
        lastFeedback: {
          status: 'idle',
          message: '',
          correctCount: 0,
        },
      };
    });
  };

  const handleValidateSequence = () => {
    const result = validateAlienSequence(decodingState.selectedSequence);

    if (result.isCorrect) {
      sound.playSequenceSuccess();
      setDecodingState((prev) => ({
        ...prev,
        isSolved: true,
        lastFeedback: {
          status: 'success',
          message: result.message,
          correctCount: 4,
        },
      }));

      setMissionState((ms) => ({
        ...ms,
        phase: 'story',
        transmissionDecoded: true,
      }));

      stage67RuntimeRef.current?.dynamicDifficulty.getSkillEstimator().recordPuzzleResult({
        puzzleId: 'alien_cipher_sequence',
        tier: stage67RuntimeRef.current.dynamicDifficulty.getState().currentTier,
        solved: true,
        timeTakenSeconds: Math.max(
          1,
          Math.round((Date.now() - (stage67RuntimeRef.current?.phaseStartedAtMs ?? Date.now())) / 1000)
        ),
        expectedTimeSeconds: 60,
        errorCount: decodingState.attempts,
        precisionRadiansDelta: 0,
      });
      runStage67TelemetryPass(
        'sequence_decoded_success',
        missionState.totalCoherence,
        3,
        'story',
        'success',
        true,
        'console-emitter'
      );
    } else {
      sound.playSequenceError();
      setDecodingState((prev) => ({
        ...prev,
        attempts: prev.attempts + 1,
        lastFeedback: {
          status: result.correctCount > 0 ? 'partial' : 'error',
          message: result.message,
          correctCount: result.correctCount,
        },
      }));
      runStage67TelemetryPass(
        'sequence_decoded_error',
        missionState.totalCoherence,
        3,
        'decoding',
        'misalignment',
        false,
        'console-emitter'
      );
    }
  };

  const handleFocusChamberNode = (nodeKey: 'ruby' | 'azure' | 'emerald' | 'target') => {
    sound.playUIClick();
    if (!sceneControllerRef.current) return;
    if (nodeKey === 'ruby') {
      sceneControllerRef.current.focusOnCrystal('ruby');
    } else if (nodeKey === 'azure') {
      sceneControllerRef.current.focusOnCrystal('azure');
    } else if (nodeKey === 'emerald') {
      sceneControllerRef.current.focusOnCrystal('emerald');
    } else if (nodeKey === 'target') {
      sceneControllerRef.current.focusOnTargetReceiver();
    }
  };

  const handleOpenDecoder = () => {
    sound.playUIClick();
    if (sceneControllerRef.current) {
      sceneControllerRef.current.focusOnConsole();
    }
    setMissionState((ms) => ({ ...ms, phase: 'decoding' }));
  };

  const handleOpenStory = () => {
    sound.playUIClick();
    setMissionState((ms) => ({ ...ms, phase: 'story' }));
  };

  // WebXR Session Action Handlers
  const handleEnterVR = useCallback(async () => {
    if (isStartingVR) return;
    sound.playUIClick();
    if (!sceneControllerRef.current) return;

    setIsStartingVR(true);
    setVrErrorMessage(null);

    try {
      const result = await sceneControllerRef.current.startVRSession();
      if (!result.success) {
        setVrErrorMessage(result.error || 'Compatible WebXR headset not detected or session request was cancelled.');
        setVrSupportStatus('error');
        setVrInfoOpen(true);
      } else {
        setVrErrorMessage(null);
        setVrSupportStatus('active');
        // If initiating from IntroScreen, transition into active playing mode while XR calibration runs in-VR
        setMissionState((ms) => (ms.phase === 'intro' ? { ...ms, phase: 'playing', started: true } : ms));
      }
    } catch (err: any) {
      setVrErrorMessage(err?.message || 'Compatible WebXR headset not detected. Standard 2D controls remain fully functional.');
      setVrSupportStatus('error');
      setVrInfoOpen(true);
    } finally {
      setIsStartingVR(false);
    }
  }, [isStartingVR]);

  const handleExitVR = useCallback(async () => {
    sound.playUIClick();
    if (!sceneControllerRef.current) return;
    await sceneControllerRef.current.endVRSession();
    setVrSupportStatus('supported');
  }, []);

  const getDiagnosticsState = useCallback((): DiagnosticsSessionState => {
    if (sceneControllerRef.current) {
      return sceneControllerRef.current.getDiagnosticsState();
    }
    return {
      isActive: false,
      startTime: null,
      durationMs: 0,
      frameDeltaMs: 16.6,
      avgFrameDeltaMs: 16.6,
      minFrameDeltaMs: 16.6,
      maxFrameDeltaMs: 16.6,
      fps: 60,
      leftHand: {
        hand: 'left',
        isTracking: false,
        trackingState: 'untracked',
        availableJointsCount: 0,
        totalJointsExpected: 25,
        missingJoints: [],
        invalidJoints: [],
        wristPosition: null,
        indexTipPosition: null,
        thumbTipPosition: null,
        pinchDistanceMeters: null,
        isPinching: false,
        heldCrystalId: null,
        interruptionCount: 0,
        totalInterruptionDurationMs: 0,
        lastInterruptionTimestamp: null,
        lastRecoveryTimestamp: null,
        sampleIntervalMs: 0,
        avgSampleIntervalMs: 0,
        minSampleIntervalMs: 0,
        maxSampleIntervalMs: 0,
        rollingIntervals: [],
      },
      rightHand: {
        hand: 'right',
        isTracking: false,
        trackingState: 'untracked',
        availableJointsCount: 0,
        totalJointsExpected: 25,
        missingJoints: [],
        invalidJoints: [],
        wristPosition: null,
        indexTipPosition: null,
        thumbTipPosition: null,
        pinchDistanceMeters: null,
        isPinching: false,
        heldCrystalId: null,
        interruptionCount: 0,
        totalInterruptionDurationMs: 0,
        lastInterruptionTimestamp: null,
        lastRecoveryTimestamp: null,
        sampleIntervalMs: 0,
        avgSampleIntervalMs: 0,
        minSampleIntervalMs: 0,
        maxSampleIntervalMs: 0,
        rollingIntervals: [],
      },
      lightingChecklist: {
        bright: { condition: 'bright', tested: false, rating: 'untested', notes: '' },
        dim: { condition: 'dim', tested: false, rating: 'untested', notes: '' },
        uneven: { condition: 'uneven', tested: false, rating: 'untested', notes: '' },
      },
      testerNotes: '',
    };
  }, []);

  const getLiveVRTelemetry = useCallback((): VRTelemetry => {
    const diag = getDiagnosticsState();
    const maxJoints = Math.max(diag.leftHand.availableJointsCount, diag.rightHand.availableJointsCount);
    const joints = Array.from({ length: 25 }, (_, i) => ({
      jointId: `joint_${i}`,
      tracked: i < maxJoints,
      confidence: i < maxJoints ? 0.95 : null,
    }));

    const lightingPreset: LightingPreset | null = diag.lightingChecklist.bright.tested
      ? 'bright_studio'
      : diag.lightingChecklist.dim.tested
      ? 'low_light'
      : diag.lightingChecklist.uneven.tested
      ? 'backlit_glare'
      : null;

    return {
      sessionId: `vr-session-${Date.now()}`,
      startedAt: new Date(Date.now() - Math.max(1000, diag.durationMs)).toISOString(),
      completedAt: null,
      expectedJointCount: 25,
      joints,
      frames: [
        {
          timestampMs: Date.now(),
          frameDurationMs: diag.frameDeltaMs || 13.8,
          dropped: diag.fps < 60,
        },
      ],
      trackingEvents: [
        {
          timestampMs: Date.now(),
          tracking: diag.leftHand.isTracking || diag.rightHand.isTracking,
        },
      ],
      latencySamples: [
        {
          timestampMs: Date.now(),
          latencyMs: diag.avgFrameDeltaMs || 13.8,
        },
      ],
      lightingPreset,
      causationEvidence: null,
      thresholds: {
        minTrackedJoints: 25,
        maxLatencyMs: 33,
        maxFrameDurationMs: 16.6,
        maxRecoveryTimeMs: 100,
      },
      executedCategories: [
        'skeleton_integrity',
        'tracking_continuity',
        'frame_performance',
        'latency',
        'environmental_conditions',
        'test_execution',
      ],
      autoSavedAt: new Date().toISOString(),
    };
  }, [getDiagnosticsState]);

  const saveTelemetrySnapshot = useCallback(async (telemetry: VRTelemetry) => {
    try {
      localStorage.setItem('PRISM_LAST_VR_TELEMETRY', JSON.stringify(telemetry));
    } catch (err) {
      console.warn('Failed to save telemetry to localStorage:', err);
    }
  }, []);

  // Initialize Three.js scene and Stage 6/7 Intelligence Runtime once on mount
  useEffect(() => {
    if (!canvasMountRef.current) return;
    isMountedRef.current = true;

    // Initialize shared Stage 6 & Stage 7 runtime instances cleanly without duplicate singletons
    if (!stage67RuntimeRef.current) {
      const securityGuard = new SpatialSecurityGuard();
      const spatialMapping = new SpatialMappingEngine(undefined, securityGuard);
      const objectIntelligence = new SpatialObjectIntelligence(securityGuard);
      const worldAwareness = new RealTimeWorldAwareness(spatialMapping, objectIntelligence);
      const dynamicDifficulty = new DynamicDifficultyEngine();
      const contextualInteraction = new ContextualInteractionSystem();
      const agentOrchestrator = new AgentOrchestrator({
        worldAwareness,
        securityGuard,
      });

      stage67RuntimeRef.current = {
        securityGuard,
        spatialMapping,
        objectIntelligence,
        worldAwareness,
        dynamicDifficulty,
        contextualInteraction,
        agentOrchestrator,
        phaseStartedAtMs: Date.now(),
      };
    }

    const runtime = stage67RuntimeRef.current;

    const controller = initScene({
      container: canvasMountRef.current,
      crystalsData: DEFAULT_CRYSTALS,
      spatialMapping: runtime.spatialMapping,
      spatialObjectIntelligence: runtime.objectIntelligence,
      spatialSecurityGuard: runtime.securityGuard,
      worldAwareness: runtime.worldAwareness,
      contextualInteraction: runtime.contextualInteraction,
      onHumanInputActivity: (active, source) => {
        if (!isMountedRef.current || !stage67RuntimeRef.current) return;
        if (active) {
          stage67RuntimeRef.current.agentOrchestrator.notifyHumanInputStart(source);
        } else {
          stage67RuntimeRef.current.agentOrchestrator.notifyHumanInputEnd();
        }
      },
      onSelectCrystal: (id) => {
        handleSelectCrystal(id);
      },
      onCrystalAngleChange: (id, angle) => {
        playSoundOnAngleChange(id, angle);
        handleCrystalAngleChange(id, angle);
      },
      onToggleBeamSource: () => {
        handleToggleBeamSource();
      },
      onVRSessionChange: (active) => {
        setVrSupportStatus(active ? 'active' : 'supported');
        runtime.contextualInteraction.setInputMode(
          active ? 'xr_tracked_pointer' : 'desktop_mouse_touch'
        );
        if (!active) {
          setHandTrackingStatus('supported');
          setActiveHandsCount(0);
        }
        Phase36IntegrationCoordinator.getInstance().notifyChange();
      },
      onHandTrackingStatusChange: (status, count) => {
        setHandTrackingStatus(status);
        setActiveHandsCount(count);
        if (count > 0) {
          runtime.contextualInteraction.setInputMode('xr_hand_tracking');
        }
      },
      onVRUIAction: (action) => {
        vrUIActionHandlerRef.current(action);
      },
      onXRAccessibilityChange: (cal, acc) => {
        if (!isMountedRef.current) return;
        setCalibrationState(cal);
        setAccessibilityState(acc);
        setMissionState((ms) =>
          ms.seatedMode === (acc.postureMode === 'seated')
            ? ms
            : { ...ms, seatedMode: acc.postureMode === 'seated' }
        );
      },
    });

    sceneControllerRef.current = controller;
    setCalibrationState(controller.getCalibrationState());
    setAccessibilityState(controller.getAccessibilityState());

    // Bind initialized Stage 6/7 runtime to Phase 36 Integration Coordinator
    const coordinator = Phase36IntegrationCoordinator.getInstance();
    coordinator.connectStage67Runtime({
      agentOrchestrator: runtime.agentOrchestrator,
      spatialMapping: runtime.spatialMapping,
      spatialObjectIntelligence: runtime.objectIntelligence,
      spatialSecurityGuard: runtime.securityGuard,
      worldAwareness: runtime.worldAwareness,
      dynamicDifficulty: runtime.dynamicDifficulty,
      contextualInteraction: runtime.contextualInteraction,
      isVRSessionActive: () => controller.isVRSessionActive(),
      getActiveControllersCount: () => (controller.isVRSessionActive() ? 2 : 0),
    });

    // Push initial beam segments to 3D scene
    controller.updateBeamSegments(INITIAL_SIM.beamSegments, INITIAL_SIM.progress.isTargetReceiverHit);
    controller.updateCrystalData(INITIAL_SIM.updatedCrystals, INITIAL_SIM.totalCoherence);

    // Run initial non-blocking Stage 6/7 telemetry pass
    runStage67TelemetryPass(
      'scene_initialized',
      INITIAL_SIM.totalCoherence,
      INITIAL_SIM.beamSegments.length,
      'intro',
      'idle'
    );

    // Query WebXR immersive-vr capability asynchronously
    controller.checkVRSupport().then((isSupported) => {
      if (!isMountedRef.current) return;
      setVrSupportStatus(isSupported ? 'supported' : 'unsupported');
      if (isSupported) {
        setHandTrackingStatus('supported');
      }
      Phase36IntegrationCoordinator.getInstance().notifyChange();
    });

    return () => {
      isMountedRef.current = false;
      Phase36IntegrationCoordinator.getInstance().disconnectStage67Runtime();
      controller.dispose();
      sceneControllerRef.current = null;
      stage67RuntimeRef.current = null;
    };
  }, [handleCrystalAngleChange, handleSelectCrystal, handleToggleBeamSource, playSoundOnAngleChange, runStage67TelemetryPass]);

  // Synchronize React mission/decoding/story/XR calibration state into the 3D WebXR Spatial UI
  useEffect(() => {
    sceneControllerRef.current?.syncVRUIState({
      phase: missionState.phase,
      totalCoherence: missionState.totalCoherence,
      isBeamSourceActive,
      decodingState,
      storyChapterIndex,
      selectedCrystalId: selectedId,
      handTrackingStatus,
      activeHandsCount,
      calibrationState,
      accessibilityState,
    });
  }, [
    missionState.phase,
    missionState.totalCoherence,
    isBeamSourceActive,
    decodingState,
    storyChapterIndex,
    selectedId,
    handTrackingStatus,
    activeHandsCount,
    calibrationState,
    accessibilityState,
  ]);

  // Keyboard shortcut listener ('H' for Hide/Show HUD, 'Escape' to close dialogs, 'P' to pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'h' || e.key === 'H') {
        setMissionState((ms) => ({ ...ms, cinematicMode: !ms.cinematicMode }));
      } else if (e.key === 'p' || e.key === 'P') {
        setMissionState((ms) => ({
          ...ms,
          pauseOpen: !ms.pauseOpen,
          phase: !ms.pauseOpen ? 'paused' : ms.puzzleProgress.isTargetReceiverHit ? 'solved' : 'playing',
        }));
      } else if (e.key === 'd' || e.key === 'D') {
        setDiagnosticsOpen((prev) => !prev);
      } else if ((e.key === 'v' || e.key === 'V') && isDevSimulationMode) {
        setVirtualXROpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setMissionState((ms) => ({
          ...ms,
          pauseOpen: false,
          tutorialOpen: false,
        }));
        setVrInfoOpen(false);
        setDiagnosticsOpen(false);
        setVirtualXROpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Control handlers
  const handleStartMission = () => {
    sound.startSpaceDrone();
    sound.playUIClick();
    setMissionState((ms) => ({
      ...ms,
      phase: 'playing',
      started: true,
    }));
  };

  const handleRotateDelta = (deltaDeg: number) => {
    if (!selectedId || !sceneControllerRef.current) return;
    const deltaRad = (deltaDeg * Math.PI) / 180;
    sceneControllerRef.current.rotateSelectedCrystal(deltaRad);
    const curr = crystals.find((c) => c.id === selectedId);
    if (curr) {
      const nextAngle = (curr.rotationY + deltaRad) % (Math.PI * 2);
      handleCrystalAngleChange(selectedId, nextAngle);
      playSoundOnAngleChange(selectedId, nextAngle);
    }
  };

  const handleSetRotationAngle = (deg: number) => {
    if (!selectedId || !sceneControllerRef.current) return;
    const rad = (deg * Math.PI) / 180;
    sceneControllerRef.current.setSelectedCrystalAngle(rad);
    handleCrystalAngleChange(selectedId, rad);
  };

  const handleFocusCrystal = () => {
    sound.playUIClick();
    if (sceneControllerRef.current) {
      sceneControllerRef.current.focusOnCrystal(selectedId);
    }
  };

  const handleFocusTarget = () => {
    sound.playUIClick();
    if (sceneControllerRef.current) {
      sceneControllerRef.current.focusOnTargetReceiver();
    }
  };

  const handleResetOrientation = () => {
    sound.playUIClick();
    if (!selectedId) return;
    handleSetRotationAngle(0);
  };

  const handleResetPuzzle = () => {
    sound.playUIClick();
    setStoryChapterIndex(0);
    // Scramble angles away from target angles
    const scrambled = DEFAULT_CRYSTALS.map((c) => ({
      ...c,
      rotationY: (c.targetRotationY + Math.PI * 0.75 + Math.random() * 0.5) % (Math.PI * 2),
    }));

    const sim = simulateLightBeamPuzzle(scrambled, true);
    setIsBeamSourceActive(true);
    isBeamActiveRef.current = true;
    setCrystals(sim.updatedCrystals);

    setDecodingState({
      isUnlocked: false,
      selectedSequence: [],
      targetSequence: TARGET_DECODING_SEQUENCE,
      isSolved: false,
      attempts: 0,
      lastFeedback: {
        status: 'idle',
        message: '',
        correctCount: 0,
      },
      cluesScannerOpen: false,
    });

    setMissionState((ms) => ({
      ...ms,
      totalCoherence: sim.totalCoherence,
      puzzleProgress: sim.progress,
      decodingState: {
        isUnlocked: false,
        selectedSequence: [],
        targetSequence: TARGET_DECODING_SEQUENCE,
        isSolved: false,
        attempts: 0,
        lastFeedback: {
          status: 'idle',
          message: '',
          correctCount: 0,
        },
        cluesScannerOpen: false,
      },
      phase: 'playing',
      pauseOpen: false,
      transmissionDecoded: false,
    }));

    if (sceneControllerRef.current) {
      sim.updatedCrystals.forEach((c) => {
        sceneControllerRef.current?.selectCrystal(c.id);
        sceneControllerRef.current?.setSelectedCrystalAngle(c.rotationY);
      });
      sceneControllerRef.current.selectCrystal(selectedId);
      sceneControllerRef.current.setBeamSourceActive(true);
      sceneControllerRef.current.setDisplayedConsoleGlyphs([]);
      sceneControllerRef.current.updateCrystalData(sim.updatedCrystals, sim.totalCoherence);
      sceneControllerRef.current.updateBeamSegments(sim.beamSegments, false);
      sceneControllerRef.current.resetView();
    }

    if (stage67RuntimeRef.current) {
      stage67RuntimeRef.current.phaseStartedAtMs = Date.now();
    }
    runStage67TelemetryPass(
      'puzzle_reset',
      sim.totalCoherence,
      sim.beamSegments.length,
      'playing',
      'idle'
    );
  };

  const handleToggleAudio = () => {
    const nextMuted = !missionState.audioMuted;
    sound.setMuted(nextMuted);
    setMissionState((ms) => ({ ...ms, audioMuted: nextMuted }));
  };

  const handleChangeVolume = (vol: number) => {
    sound.setVolume(vol);
    setMissionState((ms) => ({ ...ms, audioVolume: vol }));
  };

  // Wire controller-free 3D WebXR Spatial UI actions directly into React game handlers
  vrUIActionHandlerRef.current = (action: VRUIAction) => {
    switch (action.type) {
      case 'START_MISSION':
        handleStartMission();
        break;
      case 'PAUSE_MISSION':
        sound.playUIClick();
        setMissionState((ms) => ({ ...ms, pauseOpen: true, phase: 'paused' }));
        break;
      case 'RESUME_MISSION':
        sound.playUIClick();
        setMissionState((ms) => ({
          ...ms,
          pauseOpen: false,
          phase: ms.puzzleProgress.isTargetReceiverHit ? 'solved' : 'playing',
        }));
        break;
      case 'RESET_PUZZLE':
        handleResetPuzzle();
        break;
      case 'TOGGLE_BEAM':
        handleToggleBeamSource();
        break;
      case 'EXIT_VR':
        handleExitVR();
        break;
      case 'OPEN_DECODER':
        handleOpenDecoder();
        break;
      case 'CLOSE_DECODER':
        sound.playUIClick();
        setMissionState((ms) => ({ ...ms, phase: 'playing' }));
        break;
      case 'OPEN_STORY':
        handleOpenStory();
        break;
      case 'CLOSE_STORY':
        sound.playUIClick();
        setMissionState((ms) => ({ ...ms, phase: 'playing' }));
        break;
      case 'PLAY_FANFARE':
        sound.playSignalDecodedFanfare();
        break;
      case 'DECODE_SELECT_SYMBOL': {
        const idx = ALIEN_SYMBOLS.findIndex((s) => s.id === action.symbolId);
        if (idx >= 0) sound.playSymbolClick(idx);
        handleSelectSymbol(action.symbolId);
        break;
      }
      case 'DECODE_REMOVE_SLOT':
        sound.playUIClick();
        handleRemoveSymbolSlot(action.index);
        break;
      case 'DECODE_CLEAR':
        sound.playUIClick();
        handleClearSequence();
        break;
      case 'DECODE_SUBMIT':
        handleValidateSequence();
        break;
      case 'STORY_PREV_CHAPTER':
        sound.playUIClick();
        setStoryChapterIndex((c) => Math.max(0, c - 1));
        break;
      case 'STORY_NEXT_CHAPTER':
        sound.playUIClick();
        setStoryChapterIndex((c) => Math.min(CIVILIZATION_STORY.chapters.length - 1, c + 1));
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Mounting Container (Isolated ref, zero DOM re-renders inside) */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top HUD Bar */}
      {missionState.phase !== 'intro' && (
        <TopBar
          state={{ ...missionState, decodingState }}
          onOpenTutorial={() => setMissionState((ms) => ({ ...ms, tutorialOpen: true }))}
          onTogglePause={() =>
            setMissionState((ms) => ({
              ...ms,
              pauseOpen: !ms.pauseOpen,
              phase: !ms.pauseOpen ? 'paused' : 'playing',
            }))
          }
          onToggleAudio={handleToggleAudio}
          onToggleCinematic={() => setMissionState((ms) => ({ ...ms, cinematicMode: !ms.cinematicMode }))}
          onOpenVRInfo={() => setVrInfoOpen(true)}
          onToggleBeamSource={handleToggleBeamSource}
          onResetPuzzle={handleResetPuzzle}
          onFocusTarget={handleFocusTarget}
          onOpenDecoder={handleOpenDecoder}
          onOpenStory={handleOpenStory}
          onEnterVR={handleEnterVR}
          onExitVR={handleExitVR}
          vrSupportStatus={vrSupportStatus}
          handTrackingStatus={handTrackingStatus}
          onOpenHandsGuide={() => setHandTutorialOpen(true)}
          onOpenDiagnostics={() => setDiagnosticsOpen(true)}
          onOpenVirtualXR={isDevSimulationMode ? () => setVirtualXROpen(true) : undefined}
          isStartingVR={isStartingVR}
        />
      )}

      {/* Bottom Collapsible Control Dock (Shown during normal play) */}
      {missionState.phase !== 'intro' && missionState.phase !== 'decoding' && !missionState.cinematicMode && (
        <BottomDock
          crystals={crystals}
          selectedId={selectedId}
          puzzleProgress={missionState.puzzleProgress}
          onSelectCrystal={handleSelectCrystal}
          onRotateSelected={handleRotateDelta}
          onSetRotationAngle={handleSetRotationAngle}
          onFocusCrystal={handleFocusCrystal}
          onFocusTarget={handleFocusTarget}
          onResetOrientation={handleResetOrientation}
          onResetPuzzle={handleResetPuzzle}
          onToggleBeamSource={handleToggleBeamSource}
          onOpenDecoder={handleOpenDecoder}
          isDecoderUnlocked={decodingState.isUnlocked || missionState.puzzleProgress.isTargetReceiverHit}
          isCollapsed={missionState.cinematicMode}
          onToggleCollapse={() => setMissionState((ms) => ({ ...ms, cinematicMode: !ms.cinematicMode }))}
        />
      )}

      {/* Phase 3: Alien Cipher Decoding Overlay / Panel */}
      {missionState.phase === 'decoding' && !missionState.cinematicMode && (
        <div className="fixed inset-x-0 bottom-4 z-30 px-3 md:px-6 animate-in fade-in slide-in-from-bottom duration-300 pointer-events-auto">
          <div className="flex justify-end max-w-4xl mx-auto mb-1.5">
            <button
              onClick={() => {
                sound.playUIClick();
                setMissionState((ms) => ({ ...ms, phase: 'playing' }));
              }}
              className="px-3 py-1 bg-slate-900/90 border border-slate-700 hover:border-cyan-400 rounded-lg text-xs font-mono text-slate-300 hover:text-white transition-colors"
            >
              <span>✕ CLOSE DECODER (BACK TO PRISMS)</span>
            </button>
          </div>

          <DecodingPanel
            decodingState={decodingState}
            onSelectSymbol={handleSelectSymbol}
            onRemoveSymbolSlot={handleRemoveSymbolSlot}
            onClearSequence={handleClearSequence}
            onValidateSequence={handleValidateSequence}
            onFocusChamberNode={handleFocusChamberNode}
            onOpenStory={handleOpenStory}
          />
        </div>
      )}

      {/* Cinematic Zen Mode Restore Pill */}
      {missionState.phase !== 'intro' && missionState.cinematicMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => setMissionState((ms) => ({ ...ms, cinematicMode: false }))}
            className="flex items-center gap-2 px-4 py-2 bg-slate-950/90 border border-cyan-700/80 hover:border-cyan-400 rounded-full text-xs font-mono text-cyan-300 transition-colors shadow-lg"
          >
            <span>EXPAND CONTROLS (OR PRESS 'H')</span>
          </button>
        </div>
      )}

      {/* Initial Mission Intro Screen */}
      {missionState.phase === 'intro' && (
        <IntroScreen
          onStart={handleStartMission}
          onOpenTutorial={() => setMissionState((ms) => ({ ...ms, tutorialOpen: true }))}
          onEnterVR={handleEnterVR}
          onOpenVRInfo={() => setVrInfoOpen(true)}
          isVRSupported={vrSupportStatus === 'supported'}
          vrSupportStatus={vrSupportStatus}
          isStartingVR={isStartingVR}
        />
      )}

      {/* Interactive Briefing & Tutorial Modal */}
      <TutorialModal
        isOpen={missionState.tutorialOpen}
        onClose={() => setMissionState((ms) => ({ ...ms, tutorialOpen: false }))}
      />

      {/* Pause Menu Modal */}
      <PauseModal
        isOpen={missionState.pauseOpen}
        state={{ ...missionState, decodingState }}
        crystals={crystals}
        onResume={() => setMissionState((ms) => ({ ...ms, pauseOpen: false, phase: 'playing' }))}
        onRestart={handleResetPuzzle}
        onToggleAudio={handleToggleAudio}
        onChangeVolume={handleChangeVolume}
      />

      {/* Victory Transmission Deciphered Modal (Triggered on Phase 2 completion) */}
      <VictoryModal
        isOpen={missionState.phase === 'solved'}
        onContinue={() => {
          sound.playUIClick();
          handleOpenDecoder();
        }}
        onRestart={handleResetPuzzle}
      />

      {/* Phase 3: Original Science-Fiction Story Modal */}
      <StoryModal
        isOpen={missionState.phase === 'story'}
        onClose={() => {
          sound.playUIClick();
          setMissionState((ms) => ({ ...ms, phase: 'playing' }));
        }}
        onRestartMission={handleResetPuzzle}
        activeChapter={storyChapterIndex}
        onChangeChapter={setStoryChapterIndex}
      />

      {/* VR Architecture Specification Modal */}
      <VRInfoModal
        isOpen={vrInfoOpen}
        onClose={() => setVrInfoOpen(false)}
        onEnterVR={handleEnterVR}
        onExitVR={handleExitVR}
        vrSupportStatus={vrSupportStatus}
        vrErrorMessage={vrErrorMessage}
        handTrackingStatus={handTrackingStatus}
        onOpenHandsGuide={() => setHandTutorialOpen(true)}
        isStartingVR={isStartingVR}
      />

      {/* Phase 6: Hand-Tracking Controls & Gestures Tutorial Modal */}
      <HandTrackingTutorialModal
        isOpen={handTutorialOpen}
        onClose={() => setHandTutorialOpen(false)}
        handTrackingStatus={handTrackingStatus}
        activeHandsCount={activeHandsCount}
        isHandInteractionEnabled={isHandInteractionEnabled}
        onToggleHandInteraction={(enabled) => {
          setIsHandInteractionEnabled(enabled);
          if (sceneControllerRef.current) {
            sceneControllerRef.current.setHandInteractionEnabled(enabled);
          }
        }}
        onEnterVR={handleEnterVR}
        isVRSupported={vrSupportStatus === 'supported'}
        onOpenDiagnostics={() => setDiagnosticsOpen(true)}
      />

      {/* Phase 17: Global VR Intelligence Command Center */}
      {diagnosticsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-6xl bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-2xl overflow-y-auto max-h-[96vh]">
            <GlobalCommandCenter
              telemetry={getLiveVRTelemetry()}
              saveTelemetry={saveTelemetrySnapshot}
              onClose={() => setDiagnosticsOpen(false)}
              isPhysicalVRActive={vrSupportStatus === 'active'}
            />
          </div>
        </div>
      )}

      {/* Development-Only Virtual WebXR Test Dashboard */}
      {isDevSimulationMode && LazyVirtualXRTestDashboard && virtualXROpen && (
        <React.Suspense fallback={null}>
          <LazyVirtualXRTestDashboard
            isOpen={virtualXROpen}
            onClose={() => setVirtualXROpen(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
}
