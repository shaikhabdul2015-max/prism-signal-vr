import * as THREE from 'three';
import {
  CrystalId,
  DecodingState,
  GamePhase,
  HandTrackingStatus,
} from '../types/game';
import { ALIEN_SYMBOLS, CIVILIZATION_STORY } from '../puzzle/puzzleEngine';
import {
  categorizeVRUIActionType,
  GlobalGestureDebouncer,
} from './gestureDebouncer';
import type {
  AccessibilityStateSnapshot,
  CalibrationStateSnapshot,
} from './xrAccessibility';

export type VRUIAction =
  | { type: 'TOGGLE_WRIST_MENU' }
  | { type: 'SNAP_TURN'; deltaYawRadians: number }
  | { type: 'SMOOTH_TURN'; deltaYawRadians: number }
  | { type: 'TOGGLE_TURN_MODE' }
  | { type: 'TOGGLE_POSTURE' }
  | { type: 'TOGGLE_DOMINANT_HAND' }
  | { type: 'START_CALIBRATION' }
  | { type: 'COMPLETE_CALIBRATION' }
  | { type: 'SKIP_CALIBRATION' }
  | { type: 'CANCEL_CALIBRATION' }
  | { type: 'FOCUS_NODE'; target: 'console' | 'ruby' | 'azure' | 'emerald' | 'target' }
  | { type: 'RESET_RIG_VIEW' }
  | { type: 'START_MISSION' }
  | { type: 'PAUSE_MISSION' }
  | { type: 'RESUME_MISSION' }
  | { type: 'RESET_PUZZLE' }
  | { type: 'TOGGLE_BEAM' }
  | { type: 'EXIT_VR' }
  | { type: 'OPEN_DECODER' }
  | { type: 'CLOSE_DECODER' }
  | { type: 'OPEN_STORY' }
  | { type: 'CLOSE_STORY' }
  | { type: 'PLAY_FANFARE' }
  | { type: 'DECODE_SELECT_SYMBOL'; symbolId: string }
  | { type: 'DECODE_REMOVE_SLOT'; index: number }
  | { type: 'DECODE_CLEAR' }
  | { type: 'DECODE_SUBMIT' }
  | { type: 'STORY_PREV_CHAPTER' }
  | { type: 'STORY_NEXT_CHAPTER' };

export interface VRUISyncState {
  phase: GamePhase;
  totalCoherence: number;
  isBeamSourceActive: boolean;
  decodingState: DecodingState;
  storyChapterIndex: number;
  selectedCrystalId: CrystalId | null;
  handTrackingStatus: HandTrackingStatus;
  activeHandsCount: number;
  calibrationState?: CalibrationStateSnapshot;
  accessibilityState?: AccessibilityStateSnapshot;
}

export interface WristAnchorSample {
  visible: boolean;
  wristWorldPos: THREE.Vector3;
  palmUpScore: number; // [-1, 1] dot product toward head
  oppositeIndexTipPos: THREE.Vector3 | null;
  handSide?: 'left' | 'right';
}

export interface VRUIButtonSpec {
  id: string;
  label: string;
  sublabel?: string;
  xNorm: number; // [-0.5, 0.5] panel center coords
  yNorm: number; // [-0.5, 0.5] panel center coords
  wNorm: number;
  hNorm: number;
  accentHex: string;
  disabled?: boolean;
  action: VRUIAction;
}

export interface VRSpatialUIController {
  raycastTargets: THREE.Object3D[];
  syncState(state: VRUISyncState): void;
  setHoveredTarget(target: THREE.Object3D | null): void;
  toggleWristMenu(forceOpen?: boolean): boolean;
  isWristMenuOpen(): boolean;
  triggerActionFromTarget(
    target: THREE.Object3D,
    sourceHand?: 'left' | 'right' | 'controller' | 'system',
    eventToken?: string
  ): VRUIAction | null;
  update(
    delta: number,
    isPresenting: boolean,
    camera: THREE.Camera,
    cameraRig: THREE.Group,
    wristSample: WristAnchorSample,
    onAction: (action: VRUIAction) => void
  ): void;
  dispose(): void;
}

// Pre-allocated math helpers for zero GC allocations in render loop
const _camWorldPos = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _targetPanelPos = new THREE.Vector3();
const _wristMenuTargetPos = new THREE.Vector3();
const _badgePos = new THREE.Vector3();
const _btnWorldPos = new THREE.Vector3();

const WRIST_PANEL_WIDTH = 0.48;
const WRIST_PANEL_HEIGHT = 0.36;
const CHAMBER_PANEL_WIDTH = 1.38;
const CHAMBER_PANEL_HEIGHT = 0.96;

/**
 * Pure button-layout generator for the 3D Wrist/Palm Menu.
 * Exported for deterministic unit testing across all game phases.
 */
export function buildWristMenuButtons(state: VRUISyncState): VRUIButtonSpec[] {
  const isPlaying = state.phase === 'playing';
  const isPaused = state.phase === 'paused';
  const isIntro = state.phase === 'intro';
  const decoderUnlocked = state.decodingState.isUnlocked || state.totalCoherence >= 100;
  const storyUnlocked = state.decodingState.isSolved;
  const turnMode = state.accessibilityState?.turnMode || 'snap';
  const postureMode = state.accessibilityState?.postureMode || 'seated';
  const domHand = state.calibrationState?.profile.dominantHand || 'right';

  const buttons: VRUIButtonSpec[] = [
    // Row 1: Seated & Standing Turns (No controllers required)
    {
      id: 'wrist-turn-left',
      label: turnMode === 'smooth' ? 'TURN -22' : 'TURN -45',
      sublabel: turnMode === 'smooth' ? 'SMOOTH STEP' : 'SNAP LEFT',
      xNorm: -0.32,
      yNorm: 0.27,
      wNorm: 0.28,
      hNorm: 0.11,
      accentHex: '#38bdf8',
      action:
        turnMode === 'smooth'
          ? { type: 'SMOOTH_TURN', deltaYawRadians: Math.PI / 8 }
          : { type: 'SNAP_TURN', deltaYawRadians: Math.PI / 4 },
    },
    {
      id: 'wrist-reset-view',
      label: 'RE-CENTER',
      sublabel: 'RIG HOME',
      xNorm: 0.0,
      yNorm: 0.27,
      wNorm: 0.28,
      hNorm: 0.11,
      accentHex: '#818cf8',
      action: { type: 'RESET_RIG_VIEW' },
    },
    {
      id: 'wrist-turn-right',
      label: turnMode === 'smooth' ? 'TURN +22' : 'TURN +45',
      sublabel: turnMode === 'smooth' ? 'SMOOTH STEP' : 'SNAP RIGHT',
      xNorm: 0.32,
      yNorm: 0.27,
      wNorm: 0.28,
      hNorm: 0.11,
      accentHex: '#38bdf8',
      action:
        turnMode === 'smooth'
          ? { type: 'SMOOTH_TURN', deltaYawRadians: -Math.PI / 8 }
          : { type: 'SNAP_TURN', deltaYawRadians: -Math.PI / 4 },
    },

    // Row 2: Pedestal Quick-Vantage (reach side/rear crystals from chair or standing)
    {
      id: 'wrist-focus-console',
      label: 'CONSOLE',
      xNorm: -0.36,
      yNorm: 0.12,
      wNorm: 0.21,
      hNorm: 0.10,
      accentHex: '#38bdf8',
      action: { type: 'FOCUS_NODE', target: 'console' },
    },
    {
      id: 'wrist-focus-ruby',
      label: 'RUBY',
      xNorm: -0.12,
      yNorm: 0.12,
      wNorm: 0.21,
      hNorm: 0.10,
      accentHex: '#ef4444',
      action: { type: 'FOCUS_NODE', target: 'ruby' },
    },
    {
      id: 'wrist-focus-azure',
      label: 'AZURE',
      xNorm: 0.12,
      yNorm: 0.12,
      wNorm: 0.21,
      hNorm: 0.10,
      accentHex: '#06b6d4',
      action: { type: 'FOCUS_NODE', target: 'azure' },
    },
    {
      id: 'wrist-focus-emerald',
      label: 'EMERALD',
      xNorm: 0.36,
      yNorm: 0.12,
      wNorm: 0.21,
      hNorm: 0.10,
      accentHex: '#10b981',
      action: { type: 'FOCUS_NODE', target: 'emerald' },
    },

    // Row 3: Accessibility & Calibration Controls
    {
      id: 'wrist-calibrate',
      label: 'CALIBRATE',
      sublabel: state.calibrationState?.profile.isCalibrated ? 'RE-TUNE' : 'HANDS SETUP',
      xNorm: -0.36,
      yNorm: -0.02,
      wNorm: 0.21,
      hNorm: 0.10,
      accentHex: '#a855f7',
      action: { type: 'START_CALIBRATION' },
    },
    {
      id: 'wrist-posture',
      label: postureMode === 'seated' ? 'SEATED' : 'STANDING',
      sublabel: 'POSTURE',
      xNorm: -0.12,
      yNorm: -0.02,
      wNorm: 0.21,
      hNorm: 0.10,
      accentHex: '#10b981',
      action: { type: 'TOGGLE_POSTURE' },
    },
    {
      id: 'wrist-turn-mode',
      label: turnMode === 'snap' ? 'SNAP' : 'SMOOTH',
      sublabel: 'TURN MODE',
      xNorm: 0.12,
      yNorm: -0.02,
      wNorm: 0.21,
      hNorm: 0.10,
      accentHex: '#38bdf8',
      action: { type: 'TOGGLE_TURN_MODE' },
    },
    {
      id: 'wrist-dom-hand',
      label: domHand === 'left' ? 'LEFT DOM' : 'RIGHT DOM',
      sublabel: 'HANDEDNESS',
      xNorm: 0.36,
      yNorm: -0.02,
      wNorm: 0.21,
      hNorm: 0.10,
      accentHex: '#f59e0b',
      action: { type: 'TOGGLE_DOMINANT_HAND' },
    },

    // Row 4: Mission Controls
    {
      id: 'wrist-primary-state',
      label: isIntro ? 'START' : isPaused ? 'RESUME' : 'PAUSE',
      xNorm: -0.32,
      yNorm: -0.17,
      wNorm: 0.28,
      hNorm: 0.11,
      accentHex: isIntro || isPaused ? '#10b981' : '#f59e0b',
      action: isIntro
        ? { type: 'START_MISSION' }
        : isPaused
        ? { type: 'RESUME_MISSION' }
        : { type: 'PAUSE_MISSION' },
    },
    {
      id: 'wrist-beam-toggle',
      label: state.isBeamSourceActive ? 'BEAM: ON' : 'BEAM: OFF',
      xNorm: 0.0,
      yNorm: -0.17,
      wNorm: 0.28,
      hNorm: 0.11,
      accentHex: state.isBeamSourceActive ? '#10b981' : '#f43f5e',
      action: { type: 'TOGGLE_BEAM' },
    },
    {
      id: 'wrist-reset-puzzle',
      label: 'RESET',
      xNorm: 0.32,
      yNorm: -0.17,
      wNorm: 0.28,
      hNorm: 0.11,
      accentHex: '#f59e0b',
      action: { type: 'RESET_PUZZLE' },
    },

    // Row 5: Phase Panels & VR Exit
    {
      id: 'wrist-open-decoder',
      label: isPlaying ? 'CIPHER' : state.phase === 'decoding' ? 'CLOSE UI' : 'CIPHER',
      xNorm: -0.32,
      yNorm: -0.32,
      wNorm: 0.28,
      hNorm: 0.11,
      accentHex: '#a855f7',
      disabled: !decoderUnlocked,
      action: state.phase === 'decoding' ? { type: 'CLOSE_DECODER' } : { type: 'OPEN_DECODER' },
    },
    {
      id: 'wrist-open-story',
      label: state.phase === 'story' ? 'CHAMBER' : 'STORY',
      xNorm: 0.0,
      yNorm: -0.32,
      wNorm: 0.28,
      hNorm: 0.11,
      accentHex: '#10b981',
      disabled: !storyUnlocked,
      action: state.phase === 'story' ? { type: 'CLOSE_STORY' } : { type: 'OPEN_STORY' },
    },
    {
      id: 'wrist-exit-vr',
      label: 'EXIT VR',
      xNorm: 0.32,
      yNorm: -0.32,
      wNorm: 0.28,
      hNorm: 0.11,
      accentHex: '#ef4444',
      action: { type: 'EXIT_VR' },
    },
  ];

  return buttons;
}

/**
 * Pure button-layout generator for the 3D Chamber Phase Panel
 * (supports Gesture Calibration overlay, Intro, Paused, Solved/Victory, Phase 3 Cipher, and Story).
 */
export function buildChamberPhaseButtons(state: VRUISyncState): VRUIButtonSpec[] {
  const calStatus = state.calibrationState?.status;
  if (calStatus === 'in_progress' || calStatus === 'interrupted_fallback') {
    const dom = state.calibrationState?.profile.dominantHand || 'right';
    const posture = state.accessibilityState?.postureMode || 'seated';
    return [
      {
        id: 'cal-toggle-hand',
        label: dom === 'left' ? 'HANDED: LEFT' : 'HANDED: RIGHT',
        sublabel: 'SWITCH DOMINANT',
        xNorm: -0.30,
        yNorm: -0.06,
        wNorm: 0.28,
        hNorm: 0.14,
        accentHex: '#38bdf8',
        action: { type: 'TOGGLE_DOMINANT_HAND' },
      },
      {
        id: 'cal-toggle-posture',
        label: posture === 'seated' ? 'MODE: SEATED' : 'MODE: STANDING',
        sublabel: 'HEIGHT PROFILE',
        xNorm: 0.0,
        yNorm: -0.06,
        wNorm: 0.28,
        hNorm: 0.14,
        accentHex: '#10b981',
        action: { type: 'TOGGLE_POSTURE' },
      },
      {
        id: 'cal-toggle-turn',
        label: state.accessibilityState?.turnMode === 'smooth' ? 'TURN: SMOOTH' : 'TURN: SNAP',
        sublabel: 'ROTATION STYLE',
        xNorm: 0.30,
        yNorm: -0.06,
        wNorm: 0.28,
        hNorm: 0.14,
        accentHex: '#f59e0b',
        action: { type: 'TOGGLE_TURN_MODE' },
      },
      {
        id: 'cal-confirm',
        label: calStatus === 'interrupted_fallback' ? 'RETRY CALIBRATION' : 'CONFIRM & SAVE',
        sublabel: 'PINCH TO APPLY',
        xNorm: -0.24,
        yNorm: -0.28,
        wNorm: 0.34,
        hNorm: 0.15,
        accentHex: '#10b981',
        action:
          calStatus === 'interrupted_fallback'
            ? { type: 'START_CALIBRATION' }
            : { type: 'COMPLETE_CALIBRATION' },
      },
      {
        id: 'cal-skip',
        label: 'USE DEFAULTS',
        xNorm: 0.10,
        yNorm: -0.28,
        wNorm: 0.24,
        hNorm: 0.15,
        accentHex: '#06b6d4',
        action: { type: 'SKIP_CALIBRATION' },
      },
      {
        id: 'cal-cancel',
        label: 'CANCEL',
        xNorm: 0.35,
        yNorm: -0.28,
        wNorm: 0.20,
        hNorm: 0.15,
        accentHex: '#ef4444',
        action: { type: 'CANCEL_CALIBRATION' },
      },
    ];
  }

  if (state.phase === 'playing') {
    return [];
  }

  if (state.phase === 'intro') {
    return [
      {
        id: 'chamber-start-mission',
        label: 'START MISSION',
        sublabel: 'PINCH TO BEGIN',
        xNorm: 0,
        yNorm: -0.24,
        wNorm: 0.44,
        hNorm: 0.18,
        accentHex: '#06b6d4',
        action: { type: 'START_MISSION' },
      },
    ];
  }

  if (state.phase === 'paused') {
    return [
      {
        id: 'chamber-resume',
        label: 'RESUME',
        xNorm: -0.30,
        yNorm: -0.24,
        wNorm: 0.26,
        hNorm: 0.16,
        accentHex: '#10b981',
        action: { type: 'RESUME_MISSION' },
      },
      {
        id: 'chamber-restart',
        label: 'RESET PUZZLE',
        xNorm: 0.0,
        yNorm: -0.24,
        wNorm: 0.28,
        hNorm: 0.16,
        accentHex: '#f59e0b',
        action: { type: 'RESET_PUZZLE' },
      },
      {
        id: 'chamber-exit-vr',
        label: 'EXIT VR',
        xNorm: 0.30,
        yNorm: -0.24,
        wNorm: 0.26,
        hNorm: 0.16,
        accentHex: '#ef4444',
        action: { type: 'EXIT_VR' },
      },
    ];
  }

  if (state.phase === 'solved') {
    return [
      {
        id: 'chamber-victory-fanfare',
        label: 'PLAY AUDIO',
        xNorm: -0.31,
        yNorm: -0.26,
        wNorm: 0.26,
        hNorm: 0.15,
        accentHex: '#38bdf8',
        action: { type: 'PLAY_FANFARE' },
      },
      {
        id: 'chamber-victory-proceed',
        label: 'OPEN CIPHER',
        sublabel: 'PHASE 3',
        xNorm: 0.01,
        yNorm: -0.26,
        wNorm: 0.32,
        hNorm: 0.17,
        accentHex: '#10b981',
        action: { type: 'OPEN_DECODER' },
      },
      {
        id: 'chamber-victory-restart',
        label: 'RESTART',
        xNorm: 0.33,
        yNorm: -0.26,
        wNorm: 0.24,
        hNorm: 0.15,
        accentHex: '#f59e0b',
        action: { type: 'RESET_PUZZLE' },
      },
    ];
  }

  if (state.phase === 'decoding') {
    const buttons: VRUIButtonSpec[] = [];
    const seq = state.decodingState.selectedSequence;

    // 4 Slot buttons (clicking filled slot removes glyph)
    for (let i = 0; i < 4; i++) {
      const symId = seq[i];
      const sym = symId ? ALIEN_SYMBOLS.find((s) => s.id === symId) : null;
      buttons.push({
        id: `cipher-slot-${i}`,
        label: sym ? `${sym.glyph} ${sym.name.split(' ')[0].toUpperCase()}` : `SLOT 0${i + 1}`,
        sublabel: sym ? 'PINCH TO REMOVE' : 'EMPTY',
        xNorm: -0.33 + i * 0.22,
        yNorm: 0.24,
        wNorm: 0.20,
        hNorm: 0.14,
        accentHex: sym ? sym.color : '#475569',
        disabled: !sym,
        action: { type: 'DECODE_REMOVE_SLOT', index: i },
      });
    }

    // 6 Alien Glyph Tiles (2 rows x 3 columns)
    ALIEN_SYMBOLS.forEach((sym, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const isSelected = seq.includes(sym.id);
      const isFull = seq.length >= 4;
      buttons.push({
        id: `cipher-glyph-${sym.id}`,
        label: `${sym.glyph} ${sym.name.toUpperCase()}`,
        sublabel: isSelected ? 'SELECTED' : 'INSERT',
        xNorm: -0.30 + col * 0.30,
        yNorm: row === 0 ? 0.04 : -0.11,
        wNorm: 0.27,
        hNorm: 0.12,
        accentHex: sym.color,
        disabled: isSelected || isFull,
        action: { type: 'DECODE_SELECT_SYMBOL', symbolId: sym.id },
      });
    });

    // Action Bar
    if (!state.decodingState.isSolved) {
      buttons.push(
        {
          id: 'cipher-submit',
          label: 'TRANSMIT CIPHER',
          xNorm: -0.22,
          yNorm: -0.36,
          wNorm: 0.34,
          hNorm: 0.13,
          accentHex: '#10b981',
          disabled: seq.length !== 4,
          action: { type: 'DECODE_SUBMIT' },
        },
        {
          id: 'cipher-clear',
          label: 'CLEAR',
          xNorm: 0.09,
          yNorm: -0.36,
          wNorm: 0.18,
          hNorm: 0.13,
          accentHex: '#f59e0b',
          disabled: seq.length === 0,
          action: { type: 'DECODE_CLEAR' },
        },
        {
          id: 'cipher-close',
          label: 'PRISMS',
          xNorm: 0.33,
          yNorm: -0.36,
          wNorm: 0.22,
          hNorm: 0.13,
          accentHex: '#64748b',
          action: { type: 'CLOSE_DECODER' },
        }
      );
    } else {
      buttons.push(
        {
          id: 'cipher-open-story',
          label: 'OPEN STORY ARCHIVE',
          xNorm: -0.16,
          yNorm: -0.36,
          wNorm: 0.42,
          hNorm: 0.13,
          accentHex: '#10b981',
          action: { type: 'OPEN_STORY' },
        },
        {
          id: 'cipher-close',
          label: 'BACK TO PRISMS',
          xNorm: 0.26,
          yNorm: -0.36,
          wNorm: 0.28,
          hNorm: 0.13,
          accentHex: '#64748b',
          action: { type: 'CLOSE_DECODER' },
        }
      );
    }

    return buttons;
  }

  if (state.phase === 'story') {
    const ch = state.storyChapterIndex;
    const maxCh = CIVILIZATION_STORY.chapters.length - 1;
    return [
      {
        id: 'story-prev',
        label: '< PREV',
        xNorm: -0.35,
        yNorm: -0.35,
        wNorm: 0.20,
        hNorm: 0.13,
        accentHex: '#38bdf8',
        disabled: ch <= 0,
        action: { type: 'STORY_PREV_CHAPTER' },
      },
      {
        id: 'story-next',
        label: 'NEXT >',
        xNorm: -0.12,
        yNorm: -0.35,
        wNorm: 0.20,
        hNorm: 0.13,
        accentHex: '#38bdf8',
        disabled: ch >= maxCh,
        action: { type: 'STORY_NEXT_CHAPTER' },
      },
      {
        id: 'story-close',
        label: 'CHAMBER',
        xNorm: 0.14,
        yNorm: -0.35,
        wNorm: 0.22,
        hNorm: 0.13,
        accentHex: '#10b981',
        action: { type: 'CLOSE_STORY' },
      },
      {
        id: 'story-restart',
        label: 'RESTART',
        xNorm: 0.37,
        yNorm: -0.35,
        wNorm: 0.19,
        hNorm: 0.13,
        accentHex: '#ef4444',
        action: { type: 'RESET_PUZZLE' },
      },
    ];
  }

  return [];
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

export function createVRSpatialUI(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  debouncer: GlobalGestureDebouncer = new GlobalGestureDebouncer()
): VRSpatialUIController {
  const maxAnisotropy = Math.min(8, renderer.capabilities?.getMaxAnisotropy?.() || 1);

  const rootGroup = new THREE.Group();
  rootGroup.name = 'VRSpatialUIRoot';
  rootGroup.visible = false;
  scene.add(rootGroup);

  // ---------------------------------------------------
  // 1. Wrist Holobadge Orb (always accessible on tracked wrist)
  // ---------------------------------------------------
  const wristBadgeGroup = new THREE.Group();
  wristBadgeGroup.name = 'VRWristBadge';
  wristBadgeGroup.visible = false;
  rootGroup.add(wristBadgeGroup);

  const badgeGeom = new THREE.OctahedronGeometry(0.026, 1);
  const badgeMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.88,
    wireframe: false,
  });
  const badgeMesh = new THREE.Mesh(badgeGeom, badgeMat);
  badgeMesh.userData = {
    isVRUIButton: true,
    buttonId: 'wrist-badge-toggle',
    vrAction: { type: 'TOGGLE_WRIST_MENU' } as VRUIAction,
    disabled: false,
  };
  wristBadgeGroup.add(badgeMesh);

  const badgeRingGeom = new THREE.RingGeometry(0.032, 0.038, 24);
  const badgeRingMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
  });
  const badgeRingMesh = new THREE.Mesh(badgeRingGeom, badgeRingMat);
  wristBadgeGroup.add(badgeRingMesh);

  // ---------------------------------------------------
  // 2. Wrist Menu Panel (Interactive 3D Hand-Menu)
  // ---------------------------------------------------
  const wristGroup = new THREE.Group();
  wristGroup.name = 'VRWristMenuPanel';
  wristGroup.visible = false;
  rootGroup.add(wristGroup);

  const wristCanvas =
    typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (wristCanvas) {
    wristCanvas.width = 768;
    wristCanvas.height = 576;
  }
  const wristCtx = wristCanvas ? wristCanvas.getContext('2d') : null;
  const wristTexture = wristCanvas
    ? new THREE.CanvasTexture(wristCanvas)
    : new THREE.Texture();
  wristTexture.colorSpace = THREE.SRGBColorSpace;
  wristTexture.anisotropy = maxAnisotropy;

  const wristPlaneGeom = new THREE.PlaneGeometry(WRIST_PANEL_WIDTH, WRIST_PANEL_HEIGHT);
  const wristPlaneMat = new THREE.MeshBasicMaterial({
    map: wristTexture,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide,
  });
  const wristPlaneMesh = new THREE.Mesh(wristPlaneGeom, wristPlaneMat);
  wristGroup.add(wristPlaneMesh);

  // ---------------------------------------------------
  // 3. Chamber Phase Panel (Intro, Paused, Solved, Decoding, Story)
  // ---------------------------------------------------
  const chamberGroup = new THREE.Group();
  chamberGroup.name = 'VRChamberPhasePanel';
  chamberGroup.visible = false;
  rootGroup.add(chamberGroup);

  const chamberCanvas =
    typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (chamberCanvas) {
    chamberCanvas.width = 1024;
    chamberCanvas.height = 712;
  }
  const chamberCtx = chamberCanvas ? chamberCanvas.getContext('2d') : null;
  const chamberTexture = chamberCanvas
    ? new THREE.CanvasTexture(chamberCanvas)
    : new THREE.Texture();
  chamberTexture.colorSpace = THREE.SRGBColorSpace;
  chamberTexture.anisotropy = maxAnisotropy;

  const chamberPlaneGeom = new THREE.PlaneGeometry(CHAMBER_PANEL_WIDTH, CHAMBER_PANEL_HEIGHT);
  const chamberPlaneMat = new THREE.MeshBasicMaterial({
    map: chamberTexture,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide,
  });
  const chamberPlaneMesh = new THREE.Mesh(chamberPlaneGeom, chamberPlaneMat);
  chamberGroup.add(chamberPlaneMesh);

  // Active hit-box pools
  const raycastTargets: THREE.Object3D[] = [badgeMesh];
  const wristHitMeshes: THREE.Mesh[] = [];
  const chamberHitMeshes: THREE.Mesh[] = [];
  const sharedHitGeom = new THREE.PlaneGeometry(1, 1);

  let currentState: VRUISyncState = {
    phase: 'intro',
    totalCoherence: 0,
    isBeamSourceActive: true,
    decodingState: {
      isUnlocked: false,
      selectedSequence: [],
      targetSequence: ['origin', 'bridge', 'prism', 'horizon'],
      isSolved: false,
      attempts: 0,
      lastFeedback: { status: 'idle', message: '', correctCount: 0 },
      cluesScannerOpen: false,
    },
    storyChapterIndex: 0,
    selectedCrystalId: null,
    handTrackingStatus: 'unavailable',
    activeHandsCount: 0,
  };

  let hoveredButtonId: string | null = null;
  let wristMenuPinnedOpen = false;
  let wristMenuVisible = false;
  let chamberDirty = true;
  let wristDirty = true;
  let lastWristPosInitialized = false;

  function rebuildHitMeshes(
    specs: VRUIButtonSpec[],
    pool: THREE.Mesh[],
    parentGroup: THREE.Group,
    panelW: number,
    panelH: number
  ) {
    for (const oldMesh of pool) {
      oldMesh.removeFromParent();
      (oldMesh.material as THREE.Material).dispose();
    }
    pool.length = 0;

    for (const btn of specs) {
      const mat = new THREE.MeshBasicMaterial({
        color: btn.accentHex,
        transparent: true,
        opacity: hoveredButtonId === btn.id && !btn.disabled ? 0.24 : 0.02,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(sharedHitGeom, mat);
      mesh.position.set(btn.xNorm * panelW, btn.yNorm * panelH, 0.005);
      mesh.scale.set(btn.wNorm * panelW, btn.hNorm * panelH, 1);
      mesh.userData = {
        isVRUIButton: true,
        buttonId: btn.id,
        vrAction: btn.action,
        disabled: Boolean(btn.disabled),
        halfW: (btn.wNorm * panelW) * 0.5,
        halfH: (btn.hNorm * panelH) * 0.5,
      };
      parentGroup.add(mesh);
      pool.push(mesh);
    }

    syncRaycastTargetsList();
  }

  function syncRaycastTargetsList() {
    raycastTargets.length = 0;
    if (wristBadgeGroup.visible) {
      raycastTargets.push(badgeMesh);
    }
    if (wristGroup.visible) {
      for (const m of wristHitMeshes) raycastTargets.push(m);
    }
    if (chamberGroup.visible) {
      for (const m of chamberHitMeshes) raycastTargets.push(m);
    }
  }

  function drawButtonsOnCanvas(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    specs: VRUIButtonSpec[]
  ) {
    for (const btn of specs) {
      const cx = (btn.xNorm + 0.5) * w;
      const cy = (0.5 - btn.yNorm) * h;
      const bw = btn.wNorm * w;
      const bh = btn.hNorm * h;
      const x = cx - bw / 2;
      const y = cy - bh / 2;

      const isHovered = hoveredButtonId === btn.id && !btn.disabled;
      ctx.save();
      ctx.fillStyle = btn.disabled
        ? 'rgba(15, 23, 42, 0.45)'
        : isHovered
        ? 'rgba(14, 116, 144, 0.55)'
        : 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = btn.disabled ? '#334155' : isHovered ? '#ffffff' : btn.accentHex;
      ctx.lineWidth = isHovered ? 3.5 : 2;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, bw, bh, 12);
      } else {
        ctx.rect(x, y, bw, bh);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = btn.disabled ? '#64748b' : '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${bh > 80 ? 22 : 18}px monospace`;
      ctx.fillText(btn.label, cx, btn.sublabel ? cy - 10 : cy);

      if (btn.sublabel) {
        ctx.fillStyle = btn.disabled ? '#475569' : btn.accentHex;
        ctx.font = 'bold 12px monospace';
        ctx.fillText(btn.sublabel, cx, cy + 16);
      }
      ctx.restore();
    }
  }

  function redrawWristPanel() {
    const specs = buildWristMenuButtons(currentState);
    rebuildHitMeshes(specs, wristHitMeshes, wristGroup, WRIST_PANEL_WIDTH, WRIST_PANEL_HEIGHT);

    if (!wristCtx || !wristCanvas) return;
    const w = wristCanvas.width;
    const h = wristCanvas.height;

    wristCtx.clearRect(0, 0, w, h);
    wristCtx.fillStyle = 'rgba(2, 6, 23, 0.94)';
    wristCtx.strokeStyle = '#06b6d4';
    wristCtx.lineWidth = 5;
    wristCtx.beginPath();
    if (typeof wristCtx.roundRect === 'function') {
      wristCtx.roundRect(4, 4, w - 8, h - 8, 22);
    } else {
      wristCtx.rect(4, 4, w - 8, h - 8);
    }
    wristCtx.fill();
    wristCtx.stroke();

    // Header
    wristCtx.fillStyle = '#38bdf8';
    wristCtx.font = 'bold 20px monospace';
    wristCtx.textAlign = 'left';
    wristCtx.fillText('PRISM WRIST CONSOLE', 28, 38);

    wristCtx.fillStyle = '#cbd5e1';
    wristCtx.font = '16px monospace';
    wristCtx.textAlign = 'right';
    wristCtx.fillText(
      `PHASE: ${currentState.phase.toUpperCase()} | COHERENCE: ${Math.round(currentState.totalCoherence)}%`,
      w - 28,
      38
    );

    wristCtx.fillStyle = '#94a3b8';
    wristCtx.font = '14px monospace';
    wristCtx.textAlign = 'left';
    wristCtx.fillText(
      'HANDS: PINCH AIR & SWIPE LEFT/RIGHT TO SNAP-TURN | PINCH OR POKE BUTTONS',
      28,
      68
    );

    drawButtonsOnCanvas(wristCtx, w, h, specs);
    wristTexture.needsUpdate = true;
    wristDirty = false;
  }

  function redrawChamberPanel() {
    const specs = buildChamberPhaseButtons(currentState);
    rebuildHitMeshes(
      specs,
      chamberHitMeshes,
      chamberGroup,
      CHAMBER_PANEL_WIDTH,
      CHAMBER_PANEL_HEIGHT
    );

    if (!chamberCtx || !chamberCanvas) return;
    const w = chamberCanvas.width;
    const h = chamberCanvas.height;

    chamberCtx.clearRect(0, 0, w, h);
    const calStatus = currentState.calibrationState?.status;
    if (
      currentState.phase === 'playing' &&
      calStatus !== 'in_progress' &&
      calStatus !== 'interrupted_fallback'
    ) {
      chamberTexture.needsUpdate = true;
      chamberDirty = false;
      return;
    }

    chamberCtx.fillStyle = 'rgba(2, 6, 23, 0.95)';
    chamberCtx.strokeStyle = currentState.phase === 'solved' ? '#10b981' : '#06b6d4';
    chamberCtx.lineWidth = 6;
    chamberCtx.beginPath();
    if (typeof chamberCtx.roundRect === 'function') {
      chamberCtx.roundRect(6, 6, w - 12, h - 12, 26);
    } else {
      chamberCtx.rect(6, 6, w - 12, h - 12);
    }
    chamberCtx.fill();
    chamberCtx.stroke();

    chamberCtx.textAlign = 'center';

    if (calStatus === 'in_progress' || calStatus === 'interrupted_fallback') {
      const cal = currentState.calibrationState!;
      const progress = cal.progressPercent;
      chamberCtx.fillStyle = calStatus === 'interrupted_fallback' ? '#f59e0b' : '#a855f7';
      chamberCtx.font = 'bold 22px monospace';
      chamberCtx.fillText(
        calStatus === 'interrupted_fallback'
          ? 'HAND TRACKING INTERRUPTED // SAFE DEFAULT THRESHOLDS ACTIVE'
          : 'XRHAND CALIBRATION // PERSONALIZED INTERACTION TUNING',
        w / 2,
        62
      );

      chamberCtx.fillStyle = '#ffffff';
      chamberCtx.font = 'bold 34px monospace';
      chamberCtx.fillText(
        cal.step === 'comfort_reach'
          ? 'STEP 1: EXTEND HAND COMFORTABLY'
          : 'STEP 2: PINCH INDEX & THUMB TO LOCK',
        w / 2,
        118
      );

      chamberCtx.fillStyle = '#cbd5e1';
      chamberCtx.font = '18px monospace';
      const reachText =
        cal.lastReachSampleMeters !== null
          ? `${cal.lastReachSampleMeters.toFixed(2)}m`
          : `${cal.profile.comfortableReachMeters.toFixed(2)}m`;
      const pinchText =
        cal.lastPinchSampleMeters !== null
          ? `${(cal.lastPinchSampleMeters * 100).toFixed(1)}cm`
          : `${(cal.profile.pinchStartThreshold * 100).toFixed(1)}cm`;
      chamberCtx.fillText(
        `REACH: ${reachText}  |  PINCH: ${pinchText}  |  XRHAND: ${
          cal.capabilities.handTrackingGranted ? 'READY' : 'FALLBACK/CHECKING'
        }`,
        w / 2,
        168
      );

      // Visual Progress Bar
      const barW = w - 200;
      const barX = 100;
      const barY = 202;
      chamberCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      chamberCtx.fillRect(barX, barY, barW, 24);
      chamberCtx.fillStyle = calStatus === 'interrupted_fallback' ? '#f59e0b' : '#38bdf8';
      chamberCtx.fillRect(barX + 2, barY + 2, ((barW - 4) * progress) / 100, 20);
      chamberCtx.fillStyle = '#f8fafc';
      chamberCtx.font = 'bold 14px monospace';
      chamberCtx.fillText(`CALIBRATION PROGRESS: ${progress}%`, w / 2, barY + 46);

      if (cal.interruptedReason) {
        chamberCtx.fillStyle = '#fbbf24';
        chamberCtx.font = '15px monospace';
        chamberCtx.fillText(cal.interruptedReason, w / 2, 276);
      }

      drawButtonsOnCanvas(chamberCtx, w, h, specs);
      chamberTexture.needsUpdate = true;
      chamberDirty = false;
      return;
    }

    if (currentState.phase === 'intro') {
      chamberCtx.fillStyle = '#38bdf8';
      chamberCtx.font = 'bold 22px monospace';
      chamberCtx.fillText('DEEP-SPACE ARRAY // CONTROLLER-FREE VR READY', w / 2, 74);

      chamberCtx.fillStyle = '#ffffff';
      chamberCtx.font = 'bold 54px monospace';
      chamberCtx.fillText('PRISM SIGNAL', w / 2, 146);

      chamberCtx.fillStyle = '#cbd5e1';
      chamberCtx.font = '24px sans-serif';
      const lines = wrapTextLines(
        chamberCtx,
        'Align Ruby, Azure, and Emerald crystals with pinch gestures to route the beam into the Void Receiver, then decode the Aethelgard Cipher.',
        w - 140,
        4
      );
      lines.forEach((line, idx) => chamberCtx.fillText(line, w / 2, 230 + idx * 38));

      chamberCtx.fillStyle = '#94a3b8';
      chamberCtx.font = '18px monospace';
      chamberCtx.fillText('RAISE NON-DOMINANT WRIST OR PINCH WRIST ORB FOR TURN & MENU', w / 2, 410);
    } else if (currentState.phase === 'paused') {
      chamberCtx.fillStyle = '#f59e0b';
      chamberCtx.font = 'bold 42px monospace';
      chamberCtx.fillText('MISSION PAUSED', w / 2, 130);

      chamberCtx.fillStyle = '#cbd5e1';
      chamberCtx.font = '24px monospace';
      chamberCtx.fillText(`BEAM COHERENCE: ${Math.round(currentState.totalCoherence)}%`, w / 2, 220);
      chamberCtx.fillText(
        `BEAM SOURCE: ${currentState.isBeamSourceActive ? 'ONLINE' : 'OFFLINE'}`,
        w / 2,
        265
      );
    } else if (currentState.phase === 'solved') {
      chamberCtx.fillStyle = '#10b981';
      chamberCtx.font = 'bold 24px monospace';
      chamberCtx.fillText('PHASE 2 COMPLETE // CIRCUIT LOCKED', w / 2, 78);

      chamberCtx.fillStyle = '#ffffff';
      chamberCtx.font = 'bold 44px monospace';
      chamberCtx.fillText('TARGET RECEIVER ACTIVATED', w / 2, 148);

      chamberCtx.fillStyle = '#cbd5e1';
      chamberCtx.font = '22px monospace';
      chamberCtx.fillText('HARMONY: A-MAJOR TRIAD (440 + 554 + 659 Hz)', w / 2, 230);
      chamberCtx.fillStyle = '#c084fc';
      chamberCtx.fillText('ALIEN CIPHER DECODER UNLOCKED — CONTINUE IN VR', w / 2, 280);
    } else if (currentState.phase === 'decoding') {
      chamberCtx.fillStyle = '#38bdf8';
      chamberCtx.font = 'bold 26px monospace';
      chamberCtx.fillText('PHASE 3 // ALIEN CIPHER DECODER', w / 2, 54);

      chamberCtx.fillStyle = '#94a3b8';
      chamberCtx.font = '16px monospace';
      chamberCtx.fillText(
        `CLUES: [I] RUBY: ⟁ ORIGIN  |  [II] AZURE: ✧ BRIDGE  |  [III] EMERALD: ⎔ PRISM  |  [IV] RECEIVER: ◬ HORIZON`,
        w / 2,
        92
      );

      // Feedback banner
      const fb = currentState.decodingState.lastFeedback;
      if (fb.status !== 'idle') {
        chamberCtx.fillStyle =
          fb.status === 'success'
            ? '#10b981'
            : fb.status === 'partial'
            ? '#f59e0b'
            : '#ef4444';
        chamberCtx.font = 'bold 18px monospace';
        chamberCtx.fillText(fb.message, w / 2, 515);
      } else {
        chamberCtx.fillStyle = '#cbd5e1';
        chamberCtx.font = '16px monospace';
        chamberCtx.fillText(
          `ATTEMPTS: ${currentState.decodingState.attempts}  |  SELECT 4 GLYPHS IN CHAMBER CLUE ORDER`,
          w / 2,
          515
        );
      }
    } else if (currentState.phase === 'story') {
      const chapter =
        CIVILIZATION_STORY.chapters[currentState.storyChapterIndex] ||
        CIVILIZATION_STORY.chapters[0];
      chamberCtx.fillStyle = '#10b981';
      chamberCtx.font = 'bold 22px monospace';
      chamberCtx.fillText('MISSION COMPLETE // DEEP TRANSMISSION ARCHIVE', w / 2, 56);

      chamberCtx.fillStyle = '#ffffff';
      chamberCtx.font = 'bold 28px monospace';
      chamberCtx.fillText(CIVILIZATION_STORY.title, w / 2, 102);

      chamberCtx.fillStyle = '#38bdf8';
      chamberCtx.font = 'bold 22px monospace';
      chamberCtx.fillText(
        `${chapter.heading} (${currentState.storyChapterIndex + 1}/${CIVILIZATION_STORY.chapters.length})`,
        w / 2,
        152
      );

      chamberCtx.fillStyle = '#e2e8f0';
      chamberCtx.font = '21px sans-serif';
      const bodyLines = wrapTextLines(chamberCtx, chapter.body, w - 120, 9);
      bodyLines.forEach((line, idx) => {
        chamberCtx.fillText(line, w / 2, 205 + idx * 32);
      });
    }

    drawButtonsOnCanvas(chamberCtx, w, h, specs);
    chamberTexture.needsUpdate = true;
    chamberDirty = false;
  }

  return {
    raycastTargets,
    syncState(state: VRUISyncState) {
      currentState = {
        ...state,
        decodingState: {
          ...state.decodingState,
          selectedSequence: [...state.decodingState.selectedSequence],
          lastFeedback: { ...state.decodingState.lastFeedback },
        },
      };
      wristDirty = true;
      chamberDirty = true;
    },
    setHoveredTarget(target: THREE.Object3D | null) {
      const nextId = target?.userData?.isVRUIButton ? (target.userData.buttonId as string) : null;
      if (nextId !== hoveredButtonId) {
        hoveredButtonId = nextId;
        wristDirty = true;
        chamberDirty = true;
      }
    },
    toggleWristMenu(forceOpen?: boolean) {
      wristMenuPinnedOpen = forceOpen !== undefined ? forceOpen : !wristMenuPinnedOpen;
      wristMenuVisible = wristMenuPinnedOpen;
      wristGroup.visible = wristMenuVisible;
      wristDirty = true;
      syncRaycastTargetsList();
      return wristMenuVisible;
    },
    isWristMenuOpen() {
      return wristMenuVisible;
    },
    triggerActionFromTarget(
      target: THREE.Object3D,
      sourceHand: 'left' | 'right' | 'controller' | 'system' = 'system',
      eventToken?: string
    ): VRUIAction | null {
      const data = target?.userData;
      if (!data?.isVRUIButton || data.disabled || !data.vrAction) {
        return null;
      }
      const action = data.vrAction as VRUIAction;
      const category = categorizeVRUIActionType(action.type);
      const check = debouncer.tryExecute({
        category,
        targetId: String(data.buttonId || action.type),
        hand: sourceHand,
        eventToken,
      });
      if (!check.allowed) {
        return null;
      }
      return action;
    },
    update(delta, isPresenting, camera, _cameraRig, wristSample, onAction) {
      debouncer.updateCooldowns();
      rootGroup.visible = isPresenting;
      if (!isPresenting) {
        wristBadgeGroup.visible = false;
        wristGroup.visible = false;
        chamberGroup.visible = false;
        syncRaycastTargetsList();
        return;
      }

      const calStatus = currentState.calibrationState?.status;
      const showCalibrationPanel =
        calStatus === 'in_progress' || calStatus === 'interrupted_fallback';
      const layout = currentState.accessibilityState?.layout;
      const panelDistance = layout?.chamberPanelDistanceMeters ?? 1.85;
      const wristOffsetY = layout?.wristMenuOffsetY ?? 0.27;
      const wristPullHead = layout?.wristMenuPullTowardHeadMeters ?? 0.09;

      // 1. Update Chamber Phase Panel visibility & ergonomic placement facing player
      const showChamberPanel = currentState.phase !== 'playing' || showCalibrationPanel;
      const chamberJustShown = showChamberPanel && !chamberGroup.visible;
      chamberGroup.visible = showChamberPanel;

      if (showChamberPanel) {
        camera.getWorldPosition(_camWorldPos);
        camera.getWorldDirection(_camForward);
        _camForward.y = 0;
        if (_camForward.lengthSq() < 1e-6) _camForward.set(0, 0, -1);
        _camForward.normalize();

        _targetPanelPos.copy(_camWorldPos).addScaledVector(_camForward, panelDistance);
        const minPanelY = layout?.postureMode === 'standing' ? 1.35 : 1.18;
        _targetPanelPos.y = Math.max(minPanelY, Math.min(2.18, _camWorldPos.y - 0.04));

        if (chamberJustShown) {
          chamberGroup.position.copy(_targetPanelPos);
        } else {
          const lerpAlpha = 1 - Math.exp(-Math.min(delta, 0.1) * 5.0);
          chamberGroup.position.lerp(_targetPanelPos, lerpAlpha);
        }
        chamberGroup.lookAt(_camWorldPos.x, chamberGroup.position.y + 0.05, _camWorldPos.z);
      }

      // 2. Update Wrist Holobadge + Wrist/Palm Menu
      wristBadgeGroup.visible = wristSample.visible;
      if (wristSample.visible) {
        _badgePos.copy(wristSample.wristWorldPos);
        _badgePos.y += 0.075;
        wristBadgeGroup.position.copy(_badgePos);
        badgeMesh.rotation.y += delta * 1.8;

        camera.getWorldPosition(_camWorldPos);
        badgeRingMesh.lookAt(_camWorldPos);

        // Allow direct opposite-hand index fingertip poke on the Wrist Holobadge Orb (debounced)
        if (wristSample.oppositeIndexTipPos) {
          badgeMesh.getWorldPosition(_btnWorldPos);
          if (_btnWorldPos.distanceTo(wristSample.oppositeIndexTipPos) < 0.045) {
            const pokeCheck = debouncer.tryExecute({
              category: 'wrist_menu',
              targetId: 'wrist-badge-toggle',
              hand: wristSample.handSide === 'left' ? 'right' : 'left',
            });
            if (pokeCheck.allowed) {
              this.toggleWristMenu();
            }
          }
        }

        // Palm-up auto-reveal unless explicitly dismissed by toggle
        const autoPalmOpen = wristSample.palmUpScore > 0.62;
        const shouldShowMenu = wristMenuPinnedOpen || autoPalmOpen;
        if (shouldShowMenu !== wristMenuVisible) {
          wristMenuVisible = shouldShowMenu;
          wristDirty = true;
        }
        wristGroup.visible = wristMenuVisible;

        if (wristMenuVisible) {
          _wristMenuTargetPos.copy(wristSample.wristWorldPos);
          _wristMenuTargetPos.y += wristOffsetY;
          camera.getWorldPosition(_camWorldPos);
          _camForward.subVectors(_camWorldPos, wristSample.wristWorldPos).normalize();
          _wristMenuTargetPos.addScaledVector(_camForward, wristPullHead);

          if (!lastWristPosInitialized) {
            wristGroup.position.copy(_wristMenuTargetPos);
            lastWristPosInitialized = true;
          } else {
            const wristLerp = 1 - Math.exp(-Math.min(delta, 0.1) * 10.0);
            wristGroup.position.lerp(_wristMenuTargetPos, wristLerp);
          }
          wristGroup.lookAt(_camWorldPos);

          // Direct opposite-hand index fingertip poke detection on wrist menu buttons (globally debounced)
          if (wristSample.oppositeIndexTipPos) {
            const pokeHand = wristSample.handSide === 'left' ? 'right' : 'left';
            for (const btnMesh of wristHitMeshes) {
              if (btnMesh.userData.disabled) continue;
              btnMesh.getWorldPosition(_btnWorldPos);
              const dist = _btnWorldPos.distanceTo(wristSample.oppositeIndexTipPos);
              if (dist < 0.042) {
                const action = btnMesh.userData.vrAction as VRUIAction;
                const pokeCheck = debouncer.tryExecute({
                  category: 'ui_poke',
                  targetId: String(btnMesh.userData.buttonId || action.type),
                  hand: pokeHand,
                });
                if (pokeCheck.allowed) {
                  if (action.type === 'TOGGLE_WRIST_MENU') {
                    this.toggleWristMenu();
                  } else {
                    onAction(action);
                  }
                }
                break;
              }
            }
          }
        }
      } else {
        wristGroup.visible = wristMenuPinnedOpen;
        if (!wristMenuPinnedOpen) {
          lastWristPosInitialized = false;
        }
      }

      if (wristDirty) redrawWristPanel();
      if (chamberDirty) redrawChamberPanel();
      syncRaycastTargetsList();
    },
    dispose() {
      for (const m of wristHitMeshes) {
        m.removeFromParent();
        (m.material as THREE.Material).dispose();
      }
      for (const m of chamberHitMeshes) {
        m.removeFromParent();
        (m.material as THREE.Material).dispose();
      }
      sharedHitGeom.dispose();
      badgeGeom.dispose();
      badgeMat.dispose();
      badgeRingGeom.dispose();
      badgeRingMat.dispose();
      wristPlaneGeom.dispose();
      wristPlaneMat.dispose();
      wristTexture.dispose();
      chamberPlaneGeom.dispose();
      chamberPlaneMat.dispose();
      chamberTexture.dispose();
      rootGroup.removeFromParent();
    },
  };
}
