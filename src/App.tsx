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
} from './puzzle/puzzleEngine';
import { initScene, SceneController } from './scene/sceneManager';
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
import { HandDiagnosticsModal } from './components/HandDiagnosticsModal';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneControllerRef = useRef<SceneController | null>(null);

  // Initial Light Simulation
  const initialSim = simulateLightBeamPuzzle(DEFAULT_CRYSTALS, true);

  // Puzzle State
  const [crystals, setCrystals] = useState<CrystalData[]>(initialSim.updatedCrystals);
  const [selectedId, setSelectedId] = useState<CrystalId | null>('ruby');
  const [vrInfoOpen, setVrInfoOpen] = useState(false);
  const [isBeamSourceActive, setIsBeamSourceActive] = useState(true);

  // Phase 5, 6 & 10 WebXR, Hand Tracking and Diagnostics State
  const [vrSupportStatus, setVrSupportStatus] = useState<VRSupportStatus>('checking');
  const [vrErrorMessage, setVrErrorMessage] = useState<string | null>(null);
  const [handTrackingStatus, setHandTrackingStatus] = useState<HandTrackingStatus>('unavailable');
  const [activeHandsCount, setActiveHandsCount] = useState<number>(0);
  const [handTutorialOpen, setHandTutorialOpen] = useState<boolean>(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState<boolean>(false);
  const [isHandInteractionEnabled, setIsHandInteractionEnabled] = useState<boolean>(true);

  // Phase 3 Decoding State
  const [decodingState, setDecodingState] = useState<DecodingState>({
    isUnlocked: initialSim.progress.isTargetReceiverHit,
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
    totalCoherence: initialSim.totalCoherence,
    puzzleProgress: initialSim.progress,
    decodingState: {
      isUnlocked: initialSim.progress.isTargetReceiverHit,
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

  // Sound triggers helper
  const playSoundOnAngleChange = useCallback((id: CrystalId, newAngle: number) => {
    const currentList = crystalsRef.current;
    const crystal = currentList.find((c) => c.id === id);
    if (!crystal) return;

    sound.playRotateTick(crystal.resonancePercent);
  }, []);

  // Update crystal angle and recalculate real light-beam propagation
  const handleCrystalAngleChange = useCallback((id: CrystalId, newAngle: number) => {
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

      return sim.updatedCrystals;
    });
  }, []);

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

        return sim.updatedCrystals;
      });

      return nextActive;
    });
  }, []);

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
    sound.playUIClick();
    if (!sceneControllerRef.current) return;
    const result = await sceneControllerRef.current.startVRSession();
    if (!result.success) {
      setVrErrorMessage(result.error || 'Failed to start WebXR session.');
      setVrSupportStatus('error');
      setVrInfoOpen(true);
    } else {
      setVrErrorMessage(null);
      setVrSupportStatus('active');
    }
  }, []);

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

  // Initialize Three.js scene once on mount
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const controller = initScene({
      container: canvasMountRef.current,
      crystalsData: DEFAULT_CRYSTALS,
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
        if (!active) {
          setHandTrackingStatus('supported');
          setActiveHandsCount(0);
        }
      },
      onHandTrackingStatusChange: (status, count) => {
        setHandTrackingStatus(status);
        setActiveHandsCount(count);
      },
    });

    sceneControllerRef.current = controller;

    // Push initial beam segments to 3D scene
    controller.updateBeamSegments(initialSim.beamSegments, initialSim.progress.isTargetReceiverHit);
    controller.updateCrystalData(initialSim.updatedCrystals, initialSim.totalCoherence);

    // Query WebXR immersive-vr capability asynchronously
    controller.checkVRSupport().then((isSupported) => {
      setVrSupportStatus(isSupported ? 'supported' : 'unsupported');
      if (isSupported) {
        setHandTrackingStatus('supported');
      }
    });

    return () => {
      controller.dispose();
      sceneControllerRef.current = null;
    };
  }, [handleCrystalAngleChange, handleSelectCrystal, handleToggleBeamSource, initialSim, playSoundOnAngleChange]);

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
      } else if (e.key === 'Escape') {
        setMissionState((ms) => ({
          ...ms,
          pauseOpen: false,
          tutorialOpen: false,
        }));
        setVrInfoOpen(false);
        setDiagnosticsOpen(false);
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
        sceneControllerRef.current?.setSelectedCrystalAngle(c.rotationY);
      });
      sceneControllerRef.current.setBeamSourceActive(true);
      sceneControllerRef.current.setDisplayedConsoleGlyphs([]);
      sceneControllerRef.current.updateCrystalData(sim.updatedCrystals, sim.totalCoherence);
      sceneControllerRef.current.updateBeamSegments(sim.beamSegments, false);
      sceneControllerRef.current.resetView();
    }
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

      {/* Phase 10: Optical Hand Tracking Diagnostics and Validation Modal */}
      <HandDiagnosticsModal
        isOpen={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
        getDiagnosticsState={getDiagnosticsState}
        onStartTest={() => sceneControllerRef.current?.startDiagnosticsTest()}
        onStopTest={() => sceneControllerRef.current?.stopDiagnosticsTest()}
        onResetResults={() => sceneControllerRef.current?.resetDiagnosticsResults()}
        onUpdateLightingChecklist={(cl) => sceneControllerRef.current?.setLightingChecklist(cl)}
        onUpdateTesterNotes={(notes) => sceneControllerRef.current?.setTesterNotes(notes)}
        handTrackingStatus={handTrackingStatus}
        isVRActive={vrSupportStatus === 'active'}
      />
    </div>
  );
}
