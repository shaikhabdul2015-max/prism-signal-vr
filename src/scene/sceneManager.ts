import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CrystalData,
  CrystalId,
  BeamSegment,
  VRInteractionAdapter,
  HandTrackingStatus,
  DiagnosticsSessionState,
  LightingConditionRecord,
} from '../types/game';
import { createSpaceEnvironment } from './environment';
import { createChamber } from './chamber';
import { createHolographicConsole } from './console';
import { createCrystals, CrystalsManager } from './crystals';
import { createLaserBeams } from './laserBeams';
import { createTargetReceiver, TargetReceiverObject } from './receiver';
import { createHandTracker, HandTracker, HandRecoverySnapshot } from './handInteraction';
import {
  createVRSpatialUI,
  VRSpatialUIController,
  VRUIAction,
  VRUISyncState,
} from './vrSpatialUI';
import {
  AndroidTouchAdapter,
  MetaQuestHandAdapter,
  DualPlatformInputRouter,
} from '../input';
import {
  GlobalGestureDebouncer,
  GestureDebouncerMetrics,
} from './gestureDebouncer';
import {
  GestureCalibrationManager,
  AccessibilityLayoutManager,
  CalibrationStateSnapshot,
  AccessibilityStateSnapshot,
  PostureMode,
  TurnMode,
} from './xrAccessibility';
import { GPUResourceRecoveryManager } from '../engines/GPUResourceRecoveryManager';
import {
  CONSOLE_EMITTER_POS,
  TARGET_RECEIVER_POS,
} from '../puzzle/puzzleEngine';
import { SpatialMappingEngine } from '../spatial/SpatialMappingEngine';
import { SpatialObjectIntelligence } from '../spatial/SpatialObjectIntelligence';
import { SpatialSecurityGuard } from '../spatial/SpatialSecurityGuard';
import { RealTimeWorldAwareness } from '../spatial/RealTimeWorldAwareness';
import { ContextualInteractionSystem } from '../webxr/intelligence/ContextualInteractionSystem';
import type {
  SceneGraphConsistencyReport,
  SpatialCoordinateSpace,
  SpatialPermissionScope,
  Vec3,
  WorldAwarenessSnapshot,
} from '../spatial/types';
import type { WorldSnapshotInput } from '../ai/orchestration/types';

export type HumanInputSource = 'pointer' | 'orbit' | 'xr_controller' | 'hand_tracking';

export const CRYSTAL_TO_MAPPING_NODE_ID: Record<CrystalId, string> = {
  ruby: 'ruby-core',
  azure: 'azure-array',
  emerald: 'emerald-core',
};

export interface SpatialSceneRuntimeOptions {
  spatialMapping?: SpatialMappingEngine;
  spatialObjectIntelligence?: SpatialObjectIntelligence;
  spatialSecurityGuard?: SpatialSecurityGuard;
  worldAwareness?: RealTimeWorldAwareness;
  contextualInteraction?: ContextualInteractionSystem;
  onHumanInputActivity?: (active: boolean, source: HumanInputSource) => void;
  onSpatialSnapshot?: (snapshot: WorldAwarenessSnapshot) => void;
}

export interface SpatialSceneRuntimeState {
  lastSnapshot: WorldAwarenessSnapshot | null;
  consistency: SceneGraphConsistencyReport;
  rejectedTransformCount: number;
  isHumanInputActive: boolean;
  activeInputSource: HumanInputSource | null;
  spatialMapping: SpatialMappingEngine;
  spatialObjectIntelligence: SpatialObjectIntelligence;
  spatialSecurityGuard: SpatialSecurityGuard;
  worldAwareness: RealTimeWorldAwareness;
  contextualInteraction: ContextualInteractionSystem;
}

function isValidVec3(v: Vec3): boolean {
  return (
    Array.isArray(v) &&
    v.length === 3 &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1]) &&
    Number.isFinite(v[2])
  );
}

/**
 * Pure runtime bridge connecting Three.js / crystal transforms cleanly with
 * Stage 7 SpatialMappingEngine, SpatialObjectIntelligence, SpatialSecurityGuard,
 * RealTimeWorldAwareness, and Stage 6 ContextualInteractionSystem without duplicate instances.
 */
export function createSpatialSceneRuntime(
  initialCrystals: CrystalData[],
  options: SpatialSceneRuntimeOptions = {}
) {
  const worldSubsystems = options.worldAwareness?.getSubsystems();
  const securityGuard =
    options.spatialSecurityGuard ||
    options.spatialMapping?.getSecurityGuard() ||
    worldSubsystems?.mappingEngine.getSecurityGuard() ||
    new SpatialSecurityGuard();

  const spatialMapping =
    options.spatialMapping ||
    worldSubsystems?.mappingEngine ||
    new SpatialMappingEngine(undefined, securityGuard);

  const spatialObjectIntelligence =
    options.spatialObjectIntelligence ||
    worldSubsystems?.objectIntelligence ||
    new SpatialObjectIntelligence(securityGuard);

  const worldAwareness =
    options.worldAwareness ||
    new RealTimeWorldAwareness(spatialMapping, spatialObjectIntelligence);

  const contextualInteraction =
    options.contextualInteraction || new ContextualInteractionSystem();

  let lastSnapshot: WorldAwarenessSnapshot | null = null;
  let rejectedTransformCount = 0;
  let isHumanInputActive = false;
  let activeInputSource: HumanInputSource | null = null;
  let disposed = false;

  // Register baseline non-crystal scene anchors in SpatialMappingEngine & ContextualInteractionSystem
  const ensureNodeRegistered = (
    id: string,
    name: string,
    type: 'INTERACTION_PANEL' | 'REFLECTOR_ARRAY' | 'SENSOR_RIG',
    interactionType: 'console_switch' | 'lore_beacon',
    position: Vec3,
    boundingRadius: number,
    isInteractable: boolean
  ) => {
    if (!spatialMapping.getNode(id)) {
      spatialMapping.registerSpatialNode({
        id,
        name,
        type,
        childrenIds: [],
        localTransform: {
          position: [...position],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        worldTransform: {
          position: [...position],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        boundingRadius,
        isInteractable,
      });
    }
    contextualInteraction.registerEntity({
      id,
      name,
      position: [...position],
      boundingRadiusMeters: boundingRadius,
      isInteractable,
      interactionType,
      metadata: { source: 'sceneManager' },
    });
  };

  ensureNodeRegistered('console-emitter', 'Holographic Emitter Console', 'INTERACTION_PANEL', 'console_switch', CONSOLE_EMITTER_POS, 0.45, true);
  ensureNodeRegistered('target-receiver', 'Void Spire Target Receiver', 'REFLECTOR_ARRAY', 'lore_beacon', TARGET_RECEIVER_POS, 0.6, false);
  ensureNodeRegistered('playerCameraRig', 'Player Camera Rig', 'SENSOR_RIG', 'lore_beacon', [0, 1.3, 4.5], 0.35, false);

  const syncCrystalTransform = (
    id: CrystalId,
    position: Vec3,
    rotationY: number,
    isAligned?: boolean
  ): { accepted: boolean; reason?: string } => {
    if (!isValidVec3(position) || !Number.isFinite(rotationY)) {
      rejectedTransformCount++;
      return { accepted: false, reason: 'Invalid non-finite spatial transform rejected' };
    }

    const bounds = spatialMapping.checkBoundaryProximity(position);
    if (!bounds.isWithinBounds) {
      rejectedTransformCount++;
      return { accepted: false, reason: 'Transform outside PRISM chamber boundaries rejected' };
    }

    const mappingId = CRYSTAL_TO_MAPPING_NODE_ID[id] || id;
    spatialMapping.updateNodeTransform(mappingId, {
      position: [...position],
      rotation: [0, rotationY, 0],
    });

    const summary =
      isAligned === undefined
        ? undefined
        : isAligned
        ? 'Aligned to next harmonic node.'
        : 'Requires rotational alignment.';

    spatialObjectIntelligence.updateObjectState(id, {
      position: [...position],
      rotationY,
      ...(summary ? { stateSummary: summary } : {}),
    });

    const existingEntity = contextualInteraction.getEntity(id);
    contextualInteraction.registerEntity({
      id,
      name: existingEntity?.name || `${id.charAt(0).toUpperCase() + id.slice(1)} Crystal`,
      position: [...position],
      boundingRadiusMeters: existingEntity?.boundingRadiusMeters ?? 0.45,
      isInteractable: true,
      interactionType: 'crystal_rotator',
      metadata: {
        ...(existingEntity?.metadata || {}),
        rotationY,
        isAligned: Boolean(isAligned),
      },
    });

    return { accepted: true };
  };

  const syncAllCrystals = (crystalsList: CrystalData[]) => {
    let updated = 0;
    let rejected = 0;
    for (const c of crystalsList) {
      const existing = spatialObjectIntelligence.getObject(c.id);
      const pos: Vec3 = existing?.position || c.defaultPosition;
      const res = syncCrystalTransform(c.id, pos, c.rotationY, c.isAligned);
      if (res.accepted) updated++;
      else rejected++;
    }
    return { updated, rejected };
  };

  // Seed initial crystals cleanly
  syncAllCrystals(initialCrystals);

  const swapCrystalPositions = (
    idA: CrystalId,
    posA: Vec3,
    idB: CrystalId,
    posB: Vec3
  ): boolean => {
    if (!isValidVec3(posA) || !isValidVec3(posB)) {
      rejectedTransformCount++;
      return false;
    }
    const objA = spatialObjectIntelligence.getObject(idA);
    const objB = spatialObjectIntelligence.getObject(idB);
    const resA = syncCrystalTransform(idA, posA, objA?.rotationY ?? 0);
    const resB = syncCrystalTransform(idB, posB, objB?.rotationY ?? 0);
    return resA.accepted && resB.accepted;
  };

  const syncPlayerCamera = (position: Vec3, gazeDirection: Vec3): boolean => {
    if (!isValidVec3(position) || !isValidVec3(gazeDirection)) {
      rejectedTransformCount++;
      return false;
    }
    const yaw = Math.atan2(gazeDirection[0], -gazeDirection[2]);
    spatialMapping.updateNodeTransform('playerCameraRig', {
      position: [...position],
      rotation: [0, Number.isFinite(yaw) ? yaw : 0, 0],
    });
    return true;
  };

  const setHumanInputActive = (active: boolean, source: HumanInputSource): void => {
    if (disposed) return;
    const changed = isHumanInputActive !== active || (active && activeInputSource !== source);
    isHumanInputActive = active;
    activeInputSource = active ? source : null;

    if (changed && options.onHumanInputActivity) {
      try {
        options.onHumanInputActivity(active, source);
      } catch {
        // Isolate callback exceptions from render loop
      }
    }
  };

  const evaluateTick = (
    frameDeltaMs: number,
    gameSnapshot: WorldSnapshotInput,
    force = false
  ): WorldAwarenessSnapshot | null => {
    if (disposed) return null;
    const optimizer = spatialMapping.getOptimizer();
    const nowMs = Date.now();
    if (!force && !optimizer.shouldProcessFrame(nowMs, true)) {
      return lastSnapshot;
    }

    const startEval = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const rigPos = spatialMapping.getNode('playerCameraRig')?.worldTransform.position || [0, 1.3, 4.5];
      const safePos: Vec3 = isValidVec3(gameSnapshot.spatialContext?.playerPosition || rigPos)
        ? (gameSnapshot.spatialContext?.playerPosition || rigPos)
        : [0, 1.3, 4.5];
      const safeGaze: Vec3 = isValidVec3(gameSnapshot.spatialContext?.playerGazeDirection || [0, 0, -1])
        ? (gameSnapshot.spatialContext?.playerGazeDirection || [0, 0, -1])
        : [0, 0, -1];

      const snapshot = worldAwareness.evaluateWorldState({
        playerPosition: safePos,
        playerGazeDirection: safeGaze,
        gameSnapshot: {
          ...gameSnapshot,
          spatialContext: {
            playerPosition: safePos,
            playerGazeDirection: safeGaze,
            isHumanInputActive,
          },
        },
      });
      lastSnapshot = snapshot;

      const evalEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
      optimizer.recordFrameBudget(frameDeltaMs, Math.max(0.1, evalEnd - startEval), nowMs);

      if (options.onSpatialSnapshot) {
        try {
          options.onSpatialSnapshot(snapshot);
        } catch {
          // Isolate snapshot listener errors
        }
      }
      return snapshot;
    } catch {
      return lastSnapshot;
    }
  };

  const checkHardwarePermission = (scope: SpatialPermissionScope, operationName: string) => {
    try {
      return securityGuard.checkAccess(scope, operationName);
    } catch (err) {
      return {
        allowed: false,
        status: 'unavailable' as const,
        reason: err instanceof Error ? err.message : 'Spatial security check failed closed',
      };
    }
  };

  const syncXRSecurityState = (xrSupported: boolean, isPresenting: boolean) => {
    securityGuard.setPermission(
      'spatial_anchors',
      isPresenting && xrSupported ? 'granted' : 'prompt',
      xrSupported,
      isPresenting ? 'Active WebXR session anchor capability detected.' : 'Virtual session-local anchors active.'
    );
    securityGuard.setPermission(
      'hand_tracking',
      isPresenting && xrSupported ? 'granted' : 'prompt',
      xrSupported,
      isPresenting ? 'WebXR hand tracking session active.' : 'WebXR hand tracking inactive outside XR session.'
    );
  };

  return {
    syncCrystalTransform,
    syncAllCrystals,
    swapCrystalPositions,
    syncPlayerCamera,
    setHumanInputActive,
    evaluateTick,
    checkHardwarePermission,
    syncXRSecurityState,
    getState: (): SpatialSceneRuntimeState => ({
      lastSnapshot,
      consistency: spatialMapping.validateSceneGraphConsistency(),
      rejectedTransformCount,
      isHumanInputActive,
      activeInputSource,
      spatialMapping,
      spatialObjectIntelligence,
      spatialSecurityGuard: securityGuard,
      worldAwareness,
      contextualInteraction,
    }),
    dispose: () => {
      if (isHumanInputActive) {
        setHumanInputActive(false, activeInputSource || 'pointer');
      }
      disposed = true;
      lastSnapshot = null;
    },
  };
}

export interface SceneManagerOptions extends SpatialSceneRuntimeOptions {
  container: HTMLDivElement;
  crystalsData: CrystalData[];
  onSelectCrystal: (id: CrystalId | null) => void;
  onCrystalAngleChange: (id: CrystalId, newAngle: number) => void;
  onToggleBeamSource?: () => void;
  onVRSessionChange?: (active: boolean) => void;
  onHandTrackingStatusChange?: (status: HandTrackingStatus, activeCount: number) => void;
  onVRUIAction?: (action: VRUIAction) => void;
  onXRAccessibilityChange?: (
    calibration: CalibrationStateSnapshot,
    accessibility: AccessibilityStateSnapshot
  ) => void;
}

export interface SceneController {
  selectCrystal: (id: CrystalId | null) => void;
  rotateSelectedCrystal: (deltaAngle: number) => void;
  setSelectedCrystalAngle: (angle: number) => void;
  swapCrystalSlots: (idA: CrystalId, idB: CrystalId) => void;
  updateCrystalData: (crystals: CrystalData[], totalCoherence: number) => void;
  updateBeamSegments: (segments: BeamSegment[], isTargetHit: boolean) => void;
  setBeamSourceActive: (active: boolean) => void;
  toggleBeamSource: () => boolean;
  focusOnCrystal: (id: CrystalId | null) => void;
  focusOnTargetReceiver: () => void;
  focusOnConsole: () => void;
  setDisplayedConsoleGlyphs: (glyphs: string[]) => void;
  syncVRUIState: (state: VRUISyncState) => void;
  resetView: () => void;
  startVRSession: () => Promise<{ success: boolean; error?: string }>;
  endVRSession: () => Promise<void>;
  checkVRSupport: () => Promise<boolean>;
  isVRSessionActive: () => boolean;
  handTracker: HandTracker;
  vrSpatialUI: VRSpatialUIController;
  setHandInteractionEnabled: (enabled: boolean) => void;
  getHandTrackingStatus: () => HandTrackingStatus;
  getCalibrationState: () => CalibrationStateSnapshot;
  getAccessibilityState: () => AccessibilityStateSnapshot;
  getDebouncerMetrics: () => GestureDebouncerMetrics;
  getHandRecoveryStates: () => Record<'left' | 'right', HandRecoverySnapshot>;
  startCalibration: () => CalibrationStateSnapshot;
  setPostureMode: (mode: PostureMode) => AccessibilityStateSnapshot;
  setTurnMode: (mode: TurnMode) => AccessibilityStateSnapshot;
  getDiagnosticsState: () => DiagnosticsSessionState;
  startDiagnosticsTest: () => void;
  stopDiagnosticsTest: () => void;
  resetDiagnosticsResults: () => void;
  setLightingChecklist: (checklist: Record<'bright' | 'dim' | 'uneven', LightingConditionRecord>) => void;
  setTesterNotes: (notes: string) => void;
  inputRouter: DualPlatformInputRouter;
  androidTouchAdapter: AndroidTouchAdapter;
  metaQuestHandAdapter: MetaQuestHandAdapter;
  vrAdapter: VRInteractionAdapter;
  gpuRecoveryManager: GPUResourceRecoveryManager;
  simulateContextLoss: () => void;
  simulateContextRestored: () => Promise<boolean>;
  getSpatialRuntimeState: () => SpatialSceneRuntimeState;
  dispose: () => void;
}

export function initScene(options: SceneManagerOptions): SceneController {
  const { container, crystalsData, onSelectCrystal, onCrystalAngleChange, onToggleBeamSource, onVRSessionChange } = options;

  // Stage 6/7 Spatial Runtime Bridge (reuses injected instances cleanly without duplicate managers)
  const spatialRuntime = createSpatialSceneRuntime(crystalsData, options);

  // 1. Detect software WebGL as per Three.js guidelines
  const isSoftwareGl = (() => {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return false;
    }
  })();

  // 2. Initialize Three.js WebGLRenderer
  const isMobileDevice = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const maxDpr = isSoftwareGl ? 1 : isMobileDevice ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setPixelRatio(maxDpr);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.touchAction = 'none';

  // Enable WebXR on WebGLRenderer
  renderer.xr.enabled = true;
  try {
    renderer.xr.setReferenceSpaceType('local-floor');
  } catch {
    try {
      renderer.xr.setReferenceSpaceType('local');
    } catch {
      // Non-fatal fallback for platforms without XR support
    }
  }
  if ('setFramebufferScaleFactor' in renderer.xr) {
    (renderer.xr as any).setFramebufferScaleFactor(1.0);
  }

  container.appendChild(renderer.domElement);

  // 3. Scene & Fog Setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#030712'); // Deep cosmic void
  scene.fog = new THREE.FogExp2('#030712', 0.012);

  // 4. Procedural Studio Environment Reflection (RoomEnvironment)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();

  // 5. Seated Camera Position & Camera Rig (Comfortable eye-height & natural seated perspective)
  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    600
  );
  // Default seated position overlooking console, crystals and target receiver
  const defaultCamPos = new THREE.Vector3(0, 2.6, 6.4);
  const defaultCamTarget = new THREE.Vector3(0, 1.3, 0);
  camera.position.copy(defaultCamPos);

  // Seated Camera Rig (for WebXR stereo presentation and seated player positioning)
  const cameraRig = new THREE.Group();
  cameraRig.name = 'playerCameraRig';
  cameraRig.position.set(0, 0, 0);
  scene.add(cameraRig);
  cameraRig.add(camera);

  // 6. WebXR Controllers & Visible Pointer Rays (Seated Controller Support)
  const controllers: THREE.XRTargetRaySpace[] = [];
  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    // Cyan targeting pointer ray
    const rayGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -4.5),
    ]);
    const rayMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
    });
    const rayLine = new THREE.Line(rayGeom, rayMat);
    rayLine.name = `rayLine_${i}`;
    controller.add(rayLine);

    controller.addEventListener('selectstart', () => {
      spatialRuntime.setHumanInputActive(true, 'xr_controller');
      try {
        const matrix = new THREE.Matrix4();
        matrix.identity().extractRotation(controller.matrixWorld);
        const rayOrigin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
        const rayDirection = new THREE.Vector3(0, 0, -1).applyMatrix4(matrix).normalize();
        vrAdapter.onSelectRay?.(
          [rayOrigin.x, rayOrigin.y, rayOrigin.z],
          [rayDirection.x, rayDirection.y, rayDirection.z]
        );
      } catch {
        // Isolate WebXR ray errors
      }
    });

    controller.addEventListener('selectend', () => {
      spatialRuntime.setHumanInputActive(false, 'xr_controller');
    });

    const onControllerConnected = (event: any) => {
      rayLine.visible = true;
      console.log(`[WebXR] Controller ${i} connected:`, event.data?.profiles);
    };
    const onControllerDisconnected = () => {
      rayLine.visible = false;
      spatialRuntime.setHumanInputActive(false, 'xr_controller');
      console.log(`[WebXR] Controller ${i} disconnected.`);
    };
    controller.addEventListener('connected', onControllerConnected);
    controller.addEventListener('disconnected', onControllerDisconnected);

    cameraRig.add(controller);
    controllers.push(controller);
  }

  // 7. Orbit Controls with Seated Boundary Limits
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.05;
  controls.target.copy(defaultCamTarget);
  controls.minDistance = 2.8;
  controls.maxDistance = 11.5;
  controls.maxPolarAngle = Math.PI / 2 + 0.08; // Keep above floor
  controls.minPolarAngle = 0.2;

  const onControlsStart = () => {
    spatialRuntime.setHumanInputActive(true, 'orbit');
  };
  const onControlsEnd = () => {
    spatialRuntime.setHumanInputActive(false, 'orbit');
  };
  controls.addEventListener('start', onControlsStart);
  controls.addEventListener('end', onControlsEnd);

  // 7. Balanced Lighting Rig
  const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x020617, 0.7);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffedd5, 1.4);
  keyLight.position.set(5, 8, 4);
  keyLight.castShadow = !isSoftwareGl;
  if (!isSoftwareGl) {
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
  }
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.9);
  rimLight.position.set(-6, 3, -6);
  scene.add(rimLight);

  // 8. Construct Procedural Modules
  const spaceEnv = createSpaceEnvironment(scene);
  const chamber = createChamber(scene, isSoftwareGl);
  const consoleObj = createHolographicConsole(scene, isSoftwareGl);
  const crystals = createCrystals(scene, crystalsData, isSoftwareGl);
  const laserBeams = createLaserBeams(scene);
  const targetReceiver = createTargetReceiver(scene, isSoftwareGl);
  const gestureDebouncer = new GlobalGestureDebouncer();
  const calibrationManager = new GestureCalibrationManager();
  const accessibilityManager = new AccessibilityLayoutManager();
  let lastVRUISyncState: VRUISyncState | null = null;
  let lastReportedRefHeightY = 1.25;
  let lastHeightAdaptMs = 0;

  const vrSpatialUI = createVRSpatialUI(scene, renderer, gestureDebouncer);

  // Seated WebXR cameraRig state (starts behind Azure pedestal so all 3 crystals + console are in forward FOV)
  const defaultSeatedRigPos = new THREE.Vector3(0, 0, 5.2);
  const vrRigTargetPos = defaultSeatedRigPos.clone();
  let vrRigTargetYaw = 0;

  function focusSeatedRigOn(target: 'console' | 'ruby' | 'azure' | 'emerald' | 'target') {
    if (target === 'console') {
      vrRigTargetPos.set(0, 0, 3.2);
      vrRigTargetYaw = 0;
    } else if (target === 'azure') {
      vrRigTargetPos.set(0, 0, 5.5);
      vrRigTargetYaw = 0;
    } else if (target === 'ruby') {
      vrRigTargetPos.set(1.9, 0, -1.1);
      vrRigTargetYaw = Math.atan2(-(3.64 - 1.9), -(-2.1 - -1.1));
    } else if (target === 'emerald') {
      vrRigTargetPos.set(-1.9, 0, -1.1);
      vrRigTargetYaw = Math.atan2(-(-3.64 - -1.9), -(-2.1 - -1.1));
    } else if (target === 'target') {
      vrRigTargetPos.set(0, 0, -3.2);
      vrRigTargetYaw = 0;
    }
  }

  function applyAccessibilityAndCalibration() {
    const calState = calibrationManager.getState();
    accessibilityManager.syncCalibrationReach(calState.profile.comfortableReachMeters);
    const accState = accessibilityManager.getState();

    handTracker.setInteractionTuning({
      pinchStartThreshold: calState.profile.pinchStartThreshold,
      pinchEndThreshold: calState.profile.pinchEndThreshold,
      directReachRadiusMeters: accState.layout.directReachRadiusMeters,
      rotationSensitivity: calState.profile.rotationSensitivity,
      airSwipeThresholdMeters: calState.profile.airSwipeThresholdMeters,
      wristMenuHand: calState.profile.wristMenuHand,
      turnMode: accState.turnMode,
      smoothTurnRateRadPerSec: accState.layout.smoothTurnRateRadPerSec,
    });

    crystals.setPedestalElevation(accState.layout.crystalElevationY);
    vrAdapter.seatedEyeHeight = accState.layout.effectiveEyeHeightMeters;

    if (lastVRUISyncState) {
      vrSpatialUI.syncState({
        ...lastVRUISyncState,
        calibrationState: calState,
        accessibilityState: accState,
      });
    }
    options.onXRAccessibilityChange?.(calState, accState);
  }

  function handleVRUIAction(action: VRUIAction) {
    if (action.type === 'TOGGLE_WRIST_MENU') {
      vrSpatialUI.toggleWristMenu();
      return;
    }
    if (action.type === 'SNAP_TURN' || action.type === 'SMOOTH_TURN') {
      vrRigTargetYaw += action.deltaYawRadians;
      return;
    }
    if (action.type === 'TOGGLE_TURN_MODE') {
      accessibilityManager.toggleTurnMode();
      applyAccessibilityAndCalibration();
      return;
    }
    if (action.type === 'TOGGLE_POSTURE') {
      accessibilityManager.togglePostureMode();
      const layout = accessibilityManager.computeLayout();
      vrRigTargetPos.z = layout.seatedRigSpawnPos[2];
      applyAccessibilityAndCalibration();
      return;
    }
    if (action.type === 'TOGGLE_DOMINANT_HAND') {
      const currentDom = calibrationManager.getProfile().dominantHand;
      calibrationManager.setDominantHand(currentDom === 'left' ? 'right' : 'left');
      applyAccessibilityAndCalibration();
      return;
    }
    if (action.type === 'START_CALIBRATION') {
      calibrationManager.recalibrate();
      applyAccessibilityAndCalibration();
      return;
    }
    if (action.type === 'COMPLETE_CALIBRATION') {
      calibrationManager.completeCalibration();
      applyAccessibilityAndCalibration();
      return;
    }
    if (action.type === 'SKIP_CALIBRATION') {
      calibrationManager.skipCalibration();
      applyAccessibilityAndCalibration();
      return;
    }
    if (action.type === 'CANCEL_CALIBRATION') {
      calibrationManager.cancelCalibration();
      applyAccessibilityAndCalibration();
      return;
    }
    if (action.type === 'FOCUS_NODE') {
      focusSeatedRigOn(action.target);
      if (action.target === 'ruby' || action.target === 'azure' || action.target === 'emerald') {
        selectedCrystalId = action.target;
        crystals.setSelection(action.target);
        onSelectCrystal(action.target);
      }
      return;
    }
    if (action.type === 'RESET_RIG_VIEW') {
      vrRigTargetPos.copy(defaultSeatedRigPos);
      vrRigTargetYaw = 0;
      return;
    }
    options.onVRUIAction?.(action);
  }

  // 9. Procedural WebXR Controller-Free Hand Tracking Manager (Phase 6+)
  const handTracker = createHandTracker({
    renderer,
    scene,
    camera,
    cameraRig,
    raycastTargets: crystals.raycastTargets,
    consoleRaycastTarget: consoleObj.raycastTarget,
    uiRaycastTargets: vrSpatialUI.raycastTargets,
    debouncer: gestureDebouncer,
    onSelectCrystal: (id) => {
      selectedCrystalId = id;
      crystals.setSelection(id);
      if (id) {
        spatialRuntime.setHumanInputActive(true, 'hand_tracking');
      }
      onSelectCrystal(id);
    },
    onRotateCrystal: (id, deltaAngle) => {
      spatialRuntime.setHumanInputActive(true, 'hand_tracking');
      crystals.rotateCrystal(id, deltaAngle);
      const inst = crystals.instances.get(id);
      if (inst) {
        const p = inst.group.position;
        spatialRuntime.syncCrystalTransform(id, [p.x, p.y, p.z], inst.targetRotationY);
        onCrystalAngleChange(id, inst.targetRotationY);
      }
    },
    onToggleBeamSource: () => {
      if (onToggleBeamSource) {
        onToggleBeamSource();
      } else {
        consoleObj.toggleBeamActive();
      }
    },
    onUIHover: (target) => {
      vrSpatialUI.setHoveredTarget(target);
    },
    onUIPinch: (target, handName, eventToken) => {
      const action = vrSpatialUI.triggerActionFromTarget(target, handName, eventToken);
      if (!action) return false;
      handleVRUIAction(action);
      return true;
    },
    onSnapTurn: (deltaYawRadians) => {
      vrRigTargetYaw += deltaYawRadians;
    },
    onSmoothTurn: (deltaYawRadians) => {
      vrRigTargetYaw += deltaYawRadians;
    },
    onFrameHandSamples: (samples) => {
      const calBefore = calibrationManager.getState();
      if (calBefore.status === 'in_progress') {
        calibrationManager.sampleFrame({
          headPosition: samples.headPos,
          leftHand: samples.left,
          rightHand: samples.right,
        });
        const calAfter = calibrationManager.getState();
        if (
          calAfter.progressPercent !== calBefore.progressPercent ||
          calAfter.step !== calBefore.step ||
          calAfter.status !== calBefore.status
        ) {
          applyAccessibilityAndCalibration();
        }
      }
    },
    onStatusChange: (status, count) => {
      vrAdapter.handTrackingStatus = status;
      vrAdapter.activeHandsCount = count;
      if (count === 0) {
        spatialRuntime.setHumanInputActive(false, 'hand_tracking');
      }
      if (options.onHandTrackingStatusChange) {
        options.onHandTrackingStatusChange(status, count);
      }
    },
  });

  // 10. Raycaster & Pointer Interaction
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerDownTime = 0;
  let pointerDownPos = { x: 0, y: 0 };
  let selectedCrystalId: CrystalId | null = null;
  let currentCoherence = 0;
  let currentSegments: BeamSegment[] = [];
  let isTargetHitState = false;

  // Camera animated transition target
  let camTargetPos = defaultCamPos.clone();
  let camLookTarget = defaultCamTarget.clone();
  let isTransitioningCamera = false;

  const onPointerDown = (e: MouseEvent | TouchEvent) => {
    spatialRuntime.setHumanInputActive(true, 'pointer');
    pointerDownTime = performance.now();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    pointerDownPos = { x: clientX, y: clientY };
  };

  const onWindowPointerRelease = () => {
    spatialRuntime.setHumanInputActive(false, 'pointer');
  };

  const onPointerUp = (e: MouseEvent | TouchEvent) => {
    spatialRuntime.setHumanInputActive(false, 'pointer');
    const isTouchEvent = 'changedTouches' in e;
    const clientX = isTouchEvent ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
    const clientY = isTouchEvent ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;
    const elapsed = performance.now() - pointerDownTime;
    const dist = Math.hypot(clientX - pointerDownPos.x, clientY - pointerDownPos.y);

    // Dynamic thresholds: touch interactions naturally have wider contact area and slight movement
    const maxTapDist = isTouchEvent ? 24 : 12;
    const maxTapDuration = isTouchEvent ? 450 : 350;

    // Only register as tap/click if pointer wasn't dragged
    if (elapsed < maxTapDuration && dist < maxTapDist) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      // Check click on console emitter tip
      const consoleHits = raycaster.intersectObject(consoleObj.raycastTarget, true);
      if (consoleHits.length > 0) {
        if (onToggleBeamSource) {
          onToggleBeamSource();
        } else {
          consoleObj.toggleBeamActive();
        }
        return;
      }

      // Check click on crystals
      const intersects = raycaster.intersectObjects(crystals.raycastTargets, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData?.crystalId) {
          obj = obj.parent;
        }
        if (obj && obj.userData?.crystalId) {
          const id = obj.userData.crystalId as CrystalId;
          selectedCrystalId = id;
          crystals.setSelection(id);
          onSelectCrystal(id);
          return;
        }
      }
    }
  };

  // 10b. Dual-Platform Input Subsystem (Android Touch + Meta Quest Hands-First WebXR)
  const androidTouchAdapter = new AndroidTouchAdapter({
    onSelectEntity: (entityId) => {
      if (entityId === 'console') {
        if (onToggleBeamSource) {
          onToggleBeamSource();
        } else {
          consoleObj.toggleBeamActive();
        }
      } else if (entityId) {
        selectedCrystalId = entityId;
        crystals.setSelection(entityId);
        onSelectCrystal(entityId);
      }
    },
    onRotateSelectedCrystal: (deltaAngleRad) => {
      if (!selectedCrystalId || !Number.isFinite(deltaAngleRad)) return;
      crystals.rotateCrystal(selectedCrystalId, deltaAngleRad);
      const inst = crystals.instances.get(selectedCrystalId);
      if (inst) {
        const p = inst.group.position;
        spatialRuntime.syncCrystalTransform(selectedCrystalId, [p.x, p.y, p.z], inst.targetRotationY);
        onCrystalAngleChange(selectedCrystalId, inst.targetRotationY);
      }
    },
    onToggleBeamSource: () => {
      if (onToggleBeamSource) {
        onToggleBeamSource();
      } else {
        consoleObj.toggleBeamActive();
      }
    },
    onSwipeTurn: (direction) => {
      const deltaYaw = direction === 'left' ? Math.PI / 4 : -Math.PI / 4;
      vrRigTargetYaw += deltaYaw;
    },
    onTouchActivity: (active) => {
      spatialRuntime.setHumanInputActive(active, 'pointer');
    },
  });

  const metaQuestHandAdapter = new MetaQuestHandAdapter({
    renderer,
    scene,
    camera,
    cameraRig,
    raycastTargets: crystals.raycastTargets,
    consoleRaycastTarget: consoleObj.raycastTarget,
    debouncer: gestureDebouncer,
    calibrationManager,
    accessibilityManager,
    onSelectCrystal: (id) => {
      selectedCrystalId = id;
      crystals.setSelection(id);
      if (id) {
        spatialRuntime.setHumanInputActive(true, 'hand_tracking');
      }
      onSelectCrystal(id);
    },
    onRotateCrystal: (id, deltaAngle) => {
      spatialRuntime.setHumanInputActive(true, 'hand_tracking');
      crystals.rotateCrystal(id, deltaAngle);
      const inst = crystals.instances.get(id);
      if (inst) {
        const p = inst.group.position;
        spatialRuntime.syncCrystalTransform(id, [p.x, p.y, p.z], inst.targetRotationY);
        onCrystalAngleChange(id, inst.targetRotationY);
      }
    },
    onToggleBeamSource: () => {
      if (onToggleBeamSource) {
        onToggleBeamSource();
      } else {
        consoleObj.toggleBeamActive();
      }
    },
    onVRUIAction: handleVRUIAction,
    onSnapTurn: (deltaYawRadians) => {
      vrRigTargetYaw += deltaYawRadians;
    },
    onSmoothTurn: (deltaYawRadians) => {
      vrRigTargetYaw += deltaYawRadians;
    },
    onStatusChange: (status, count) => {
      vrAdapter.handTrackingStatus = status;
      vrAdapter.activeHandsCount = count;
      if (count === 0) {
        spatialRuntime.setHumanInputActive(false, 'hand_tracking');
      }
      if (options.onHandTrackingStatusChange) {
        options.onHandTrackingStatusChange(status, count);
      }
    },
  });

  const inputRouter = new DualPlatformInputRouter(androidTouchAdapter, metaQuestHandAdapter, false);

  const canvasEl = renderer.domElement;
  androidTouchAdapter.attach(canvasEl, camera, crystals.raycastTargets, consoleObj.raycastTarget);

  canvasEl.addEventListener('mousedown', onPointerDown);
  canvasEl.addEventListener('mouseup', onPointerUp);
  window.addEventListener('mouseup', onWindowPointerRelease);

  // Centralized GPU Resource Recovery Manager
  const gpuRecoveryManager = GPUResourceRecoveryManager.getInstance();
  let isContextLost = false;

  gpuRecoveryManager.attach({
    canvas: canvasEl,
    renderer,
    scene,
    camera,
    onSuspendRendering() {
      isContextLost = true;
      renderer.setAnimationLoop(null);
      console.warn('[WebGL] Context lost detected. Rendering loop suspended by GPUResourceRecoveryManager.');
    },
    onResumeRendering() {
      isContextLost = false;
      renderer.setAnimationLoop(tick);
      onResize();
      console.log('[WebGL] Context restored & resources recompiled. Rendering loop resumed.');
    },
    onUnrecoverableFailure(err) {
      vrAdapter.errorMessage = err.message;
      vrAdapter.vrSupportStatus = 'error';
      console.error('[WebGL] Unrecoverable GPU failure:', err);
    },
  });

  // Register procedural module recovery hooks
  gpuRecoveryManager.registerResource({
    id: 'console-canvas-glyphs',
    type: 'TEXTURE',
    name: 'Holographic Console Canvas Glyphs',
    restoreFn: () => {
      consoleObj.update(clock.getElapsedTime(), 0.016, currentCoherence);
    },
  });
  gpuRecoveryManager.registerResource({
    id: 'chamber-materials',
    type: 'MATERIAL',
    name: 'Resonance Chamber Materials',
    restoreFn: () => {
      chamber.update(clock.getElapsedTime(), 0.016);
    },
  });

  // 11. Window & Orientation Resize Handler
  const onResize = () => {
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  // 12. Clock & Animation State
  const clock = new THREE.Clock();

  // 13. WebXR Session Event Listeners
  renderer.xr.addEventListener('sessionstart', () => {
    console.log('[WebXR] sessionstart event fired - VR active presentation begun.');
    vrAdapter.isSessionActive = true;
    vrAdapter.vrSupportStatus = 'active';
    controls.enabled = false;
    isTransitioningCamera = false;

    const activeRefSpace = ((renderer.xr as any).getReferenceSpaceType?.() ||
      'local-floor') as SpatialCoordinateSpace;
    const session = renderer.xr.getSession();
    const caps = calibrationManager.detectCapabilitiesFromSession(
      vrAdapter.isVRAvailable,
      session,
      activeRefSpace
    );
    accessibilityManager.updateReferenceSpace(activeRefSpace);
    const layout = accessibilityManager.computeLayout();

    // In WebXR, cameraRig defines the seated/standing base station in room space.
    // Position camera rig behind Azure pedestal so all 3 crystals and console are ahead of user.
    cameraRig.position.set(...layout.seatedRigSpawnPos);
    cameraRig.rotation.set(0, 0, 0);
    vrRigTargetPos.set(...layout.seatedRigSpawnPos);
    vrRigTargetYaw = 0;
    // Camera local transform must be reset so WebXR HMD pose is not double-offset into void
    camera.position.set(0, 0, 0);
    camera.quaternion.identity();
    camera.updateProjectionMatrix();

    // Begin non-blocking interactive XRHand calibration at session start
    calibrationManager.beginCalibration(caps);
    applyAccessibilityAndCalibration();

    spatialRuntime.syncXRSecurityState(vrAdapter.isVRAvailable, true);
    spatialRuntime.syncPlayerCamera([0, layout.effectiveEyeHeightMeters, layout.seatedRigSpawnPos[2]], [0, 0, -1]);

    // Route active input exclusively to Meta Quest Hands-First adapter during VR session
    inputRouter.synchronizeRouting(true);

    if (onVRSessionChange) onVRSessionChange(true);
  });

  renderer.xr.addEventListener('sessionend', () => {
    console.log('[WebXR] sessionend event fired - returning to 2D desktop/mobile presentation.');
    vrAdapter.isSessionActive = false;
    vrAdapter.vrSupportStatus = 'supported';
    controls.enabled = true;
    isTransitioningCamera = false;
    handTracker.releaseGrabbedCrystal();
    if (calibrationManager.getState().status === 'in_progress') {
      calibrationManager.cancelCalibration();
      applyAccessibilityAndCalibration();
    }
    spatialRuntime.setHumanInputActive(false, 'xr_controller');
    spatialRuntime.setHumanInputActive(false, 'hand_tracking');
    spatialRuntime.syncXRSecurityState(vrAdapter.isVRAvailable, false);

    // Restore desktop/mobile camera view
    cameraRig.position.set(0, 0, 0);
    cameraRig.rotation.set(0, 0, 0);
    vrRigTargetPos.copy(defaultSeatedRigPos);
    vrRigTargetYaw = 0;
    camera.position.copy(defaultCamPos);
    camera.updateProjectionMatrix();
    controls.target.copy(defaultCamTarget);
    controls.update();

    // Re-synchronize 2D canvas dimensions
    onResize();

    // Restore Android Touch primary adapter when exiting VR to 2D
    inputRouter.synchronizeRouting(false);

    if (onVRSessionChange) onVRSessionChange(false);
  });

  // 14. VR Interaction Adapter
  const vrAdapter: VRInteractionAdapter = {
    isVRAvailable: false,
    isSessionActive: false,
    vrSupportStatus: 'checking',
    handTrackingStatus: 'unavailable',
    activeHandsCount: 0,
    seatedEyeHeight: 1.25,
    onSelectRay(origin, direction) {
      if (!origin.every(Number.isFinite) || !direction.every(Number.isFinite)) {
        return;
      }
      const rayOrigin = new THREE.Vector3(...origin);
      const rayDir = new THREE.Vector3(...direction).normalize();
      raycaster.set(rayOrigin, rayDir);

      // Check 3D VR UI panels first (also supports hybrid controller pointer)
      const uiHits = raycaster.intersectObjects(vrSpatialUI.raycastTargets, true);
      if (uiHits.length > 0 && uiHits[0].distance < 12.0) {
        let uiObj: THREE.Object3D | null = uiHits[0].object;
        while (uiObj && !uiObj.userData?.isVRUIButton) uiObj = uiObj.parent;
        if (uiObj?.userData?.isVRUIButton) {
          const action = vrSpatialUI.triggerActionFromTarget(uiObj, 'controller');
          if (action) {
            handleVRUIAction(action);
            return;
          }
        }
      }

      // Check click/trigger on console emitter tip
      const consoleHits = raycaster.intersectObject(consoleObj.raycastTarget, true);
      if (consoleHits.length > 0) {
        const beamCheck = gestureDebouncer.tryExecute({
          category: 'beam_toggle',
          targetId: 'console-emitter',
          hand: 'controller',
        });
        if (beamCheck.allowed) {
          if (onToggleBeamSource) {
            onToggleBeamSource();
          } else {
            consoleObj.toggleBeamActive();
          }
        }
        return;
      }

      // Check click/trigger on crystals
      const hits = raycaster.intersectObjects(crystals.raycastTargets, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData?.crystalId) obj = obj.parent;
        if (obj?.userData?.crystalId) {
          const id = obj.userData.crystalId as CrystalId;
          const selCheck = gestureDebouncer.tryExecute({
            category: 'crystal_select',
            targetId: id,
            hand: 'controller',
          });
          if (selCheck.allowed) {
            selectedCrystalId = id;
            crystals.setSelection(id);
            onSelectCrystal(id);
          }
        }
      }
    },
    onRotateObject(crystalId, deltaAngle) {
      if (!Number.isFinite(deltaAngle)) return;
      crystals.rotateCrystal(crystalId, deltaAngle);
      const inst = crystals.instances.get(crystalId);
      if (inst) {
        const p = inst.group.position;
        spatialRuntime.syncCrystalTransform(crystalId, [p.x, p.y, p.z], inst.targetRotationY);
        onCrystalAngleChange(crystalId, inst.targetRotationY);
      }
    },
    onTranslateObject(crystalId, deltaPos) {
      if (!deltaPos.every(Number.isFinite)) return;
      const inst = crystals.instances.get(crystalId);
      if (inst) {
        const nextPos: Vec3 = [
          inst.targetPosition.x + deltaPos[0],
          inst.targetPosition.y + deltaPos[1],
          inst.targetPosition.z + deltaPos[2],
        ];
        const validation = spatialRuntime.syncCrystalTransform(crystalId, nextPos, inst.targetRotationY);
        if (!validation.accepted) return;
        inst.targetPosition.set(nextPos[0], nextPos[1], nextPos[2]);
      }
    },
    onHandPinch(_hand, origin, direction) {
      spatialRuntime.setHumanInputActive(true, 'hand_tracking');
      vrAdapter.onSelectRay?.(origin, direction);
    },
    onHandGrabCrystal(_hand, crystalId) {
      spatialRuntime.setHumanInputActive(true, 'hand_tracking');
      selectedCrystalId = crystalId;
      crystals.setSelection(crystalId);
      onSelectCrystal(crystalId);
    },
    onHandReleaseCrystal(_hand, _crystalId) {
      handTracker.releaseGrabbedCrystal();
      spatialRuntime.setHumanInputActive(false, 'hand_tracking');
    },
    onHandPoseUpdate(_hand, _joints) {
      // Joint poses are continuously handled by handTracker
    },
  };

  // Concurrent session guard
  let isStartingSession = false;

  // Check initial WebXR availability asynchronously
  async function checkVRSupport(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('xr' in navigator) || !navigator.xr) {
      vrAdapter.isVRAvailable = false;
      vrAdapter.vrSupportStatus = 'unsupported';
      spatialRuntime.syncXRSecurityState(false, false);
      return false;
    }
    try {
      const supported = await navigator.xr.isSessionSupported('immersive-vr');
      vrAdapter.isVRAvailable = supported;
      // isSessionSupported only indicates browser engine WebXR capability, not active headset presence
      vrAdapter.vrSupportStatus = supported ? 'supported' : 'unsupported';
      spatialRuntime.syncXRSecurityState(supported, renderer.xr.isPresenting);
      return supported;
    } catch {
      vrAdapter.isVRAvailable = false;
      vrAdapter.vrSupportStatus = 'unsupported';
      spatialRuntime.syncXRSecurityState(false, false);
      return false;
    }
  }
  checkVRSupport();

  async function startVRSession(): Promise<{ success: boolean; error?: string }> {
    if (isStartingSession) {
      return { success: false, error: 'WebXR session startup is already in progress.' };
    }

    if (typeof navigator === 'undefined' || !('xr' in navigator) || !navigator.xr) {
      const msg = 'WebXR is not supported in this browser. Use Meta Quest Browser or Chrome with a connected VR headset.';
      vrAdapter.errorMessage = msg;
      vrAdapter.vrSupportStatus = 'unsupported';
      return { success: false, error: msg };
    }

    isStartingSession = true;

    try {
      if (!vrAdapter.isVRAvailable) {
        let supported = false;
        try {
          supported = await navigator.xr.isSessionSupported('immersive-vr');
        } catch {
          supported = false;
        }
        vrAdapter.isVRAvailable = supported;

        if (!supported) {
          const msg = 'WebXR immersive-vr mode is not supported by your browser or no compatible VR runtime is detected. Standard 2D mode remains active.';
          vrAdapter.errorMessage = msg;
          vrAdapter.vrSupportStatus = 'unsupported';
          return { success: false, error: msg };
        }
      }

      // Request immersive VR session directly within user-activation gesture with graceful feature fallback
      let session: XRSession;
      try {
        session = await navigator.xr.requestSession('immersive-vr', {
          optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
        });
      } catch (reqErr: any) {
        const msg = reqErr?.message || 'Compatible WebXR headset not detected or VR session permission denied.';
        vrAdapter.errorMessage = msg;
        vrAdapter.vrSupportStatus = 'error';
        return { success: false, error: msg };
      }

      // Configure reference space with graceful fallback from local-floor to local
      try {
        renderer.xr.setReferenceSpaceType('local-floor');
      } catch {
        try {
          renderer.xr.setReferenceSpaceType('local');
        } catch {
          // Non-fatal reference space fallback
        }
      }

      // Attach session to Three.js WebXR renderer
      try {
        await renderer.xr.setSession(session);
        vrAdapter.isSessionActive = true;
        vrAdapter.vrSupportStatus = 'active';
        vrAdapter.errorMessage = null;
        console.log('[WebXR] Immersive VR session attached successfully.');
        return { success: true };
      } catch (attachErr: any) {
        // If renderer attachment fails, terminate orphaned session immediately to avoid canvas black-screen
        try {
          await session.end();
        } catch {
          // Ignore secondary session end errors
        }
        onResize();
        const msg = attachErr?.message || 'WebXR renderer failed to attach session. Returning to 2D view.';
        vrAdapter.errorMessage = msg;
        vrAdapter.vrSupportStatus = 'error';
        vrAdapter.isSessionActive = false;
        return { success: false, error: msg };
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to start WebXR session. Please verify headset connection and permissions.';
      vrAdapter.errorMessage = msg;
      vrAdapter.vrSupportStatus = 'error';
      return { success: false, error: msg };
    } finally {
      isStartingSession = false;
    }
  }

  async function endVRSession(): Promise<void> {
    const session = renderer.xr.getSession();
    if (session) {
      await session.end();
    }
  }

  // Pre-allocated tick vectors for zero GC overhead in 90Hz XR render loop
  const _tickCamWorldPos = new THREE.Vector3();
  const _tickCamWorldDir = new THREE.Vector3();

  // 13. Render Loop (Unified WebXR & Desktop Rendering)
  function tick() {
    // Avoid unnecessary rendering cycles when tab is backgrounded (unless presenting in WebXR)
    if (typeof document !== 'undefined' && document.hidden && !renderer.xr.isPresenting) {
      return;
    }

    const delta = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsedTime();

    // In VR, poll active input source thumbsticks to rotate selected crystal
    if (renderer.xr.isPresenting && selectedCrystalId) {
      const session = renderer.xr.getSession();
      if (session) {
        for (const source of session.inputSources) {
          if (source.gamepad && source.gamepad.axes && source.gamepad.axes.length >= 2) {
            const axisX = source.gamepad.axes[2] ?? source.gamepad.axes[0] ?? 0;
            if (Math.abs(axisX) > 0.18) {
              vrAdapter.onRotateObject?.(selectedCrystalId, axisX * delta * 2.0);
            }
          }
        }
      }
    }

    // Smooth camera transition if active (only when not presenting in VR)
    if (!renderer.xr.isPresenting && isTransitioningCamera) {
      camera.position.lerp(camTargetPos, delta * 3.5);
      controls.target.lerp(camLookTarget, delta * 3.5);
      if (camera.position.distanceTo(camTargetPos) < 0.05) {
        isTransitioningCamera = false;
      }
    }

    if (!renderer.xr.isPresenting) {
      controls.update();
    } else {
      // Smoothly damp seated/standing cameraRig snap/smooth turns & pedestal vantage orbits
      cameraRig.rotation.y = THREE.MathUtils.damp(cameraRig.rotation.y, vrRigTargetYaw, 10, delta);
      const rigLerp = 1 - Math.exp(-delta * 8);
      cameraRig.position.lerp(vrRigTargetPos, rigLerp);

      // Dynamically adapt layout if HMD eye height shifts between seated & standing in floor-level space
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (nowMs - lastHeightAdaptMs > 500 && Math.abs(camera.position.y - lastReportedRefHeightY) > 0.14) {
        lastHeightAdaptMs = nowMs;
        lastReportedRefHeightY = camera.position.y;
        const activeRefSpace = ((renderer.xr as any).getReferenceSpaceType?.() ||
          'local-floor') as SpatialCoordinateSpace;
        accessibilityManager.updateReferenceSpace(activeRefSpace, camera.position.y);
        applyAccessibilityAndCalibration();
      }
    }

    // Update scene systems
    spaceEnv.update(time, delta);
    chamber.update(time, delta);
    consoleObj.update(time, delta, currentCoherence);
    crystals.update(time, delta);
    laserBeams.update(time, delta, currentSegments, isTargetHitState);
    targetReceiver.update(time, delta, isTargetHitState);
    handTracker.update(delta);
    const wristSample = handTracker.getWristAnchorSample(camera);
    vrSpatialUI.update(
      delta,
      renderer.xr.isPresenting,
      camera,
      cameraRig,
      wristSample,
      handleVRUIAction
    );

    // Sync camera & evaluate Stage 7 spatial awareness cleanly (throttled + error-isolated)
    camera.getWorldPosition(_tickCamWorldPos);
    camera.getWorldDirection(_tickCamWorldDir);
    spatialRuntime.syncPlayerCamera(
      [_tickCamWorldPos.x, _tickCamWorldPos.y, _tickCamWorldPos.z],
      [_tickCamWorldDir.x, _tickCamWorldDir.y, _tickCamWorldDir.z]
    );
    spatialRuntime.evaluateTick(delta * 1000, {
      gamePhase: isTargetHitState ? 'solved' : 'playing',
      coherencePercent: currentCoherence,
      activeSegmentCount: currentSegments.length,
      timeInPhaseMs: Math.round(time * 1000),
      playerFrustration: 0.1,
      playerBoredom: 0.1,
      playerSkillRating: 1200,
      lastPlayerAction: 'render_tick',
      spatialContext: {
        playerPosition: [_tickCamWorldPos.x, _tickCamWorldPos.y, _tickCamWorldPos.z],
        playerGazeDirection: [_tickCamWorldDir.x, _tickCamWorldDir.y, _tickCamWorldDir.z],
      },
    });

    // Verify valid dimensions before rendering to prevent WebGL viewport errors
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      renderer.render(scene, camera);
    }
  }

  // Pre-warm shaders
  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // Unified Three.js animation loop for both Desktop/Mobile and WebXR presentation
  renderer.setAnimationLoop(tick);

  return {
    selectCrystal(id: CrystalId | null) {
      selectedCrystalId = id;
      crystals.setSelection(id);
    },
    rotateSelectedCrystal(deltaAngle: number) {
      if (!selectedCrystalId || !Number.isFinite(deltaAngle)) return;
      crystals.rotateCrystal(selectedCrystalId, deltaAngle);
      const inst = crystals.instances.get(selectedCrystalId);
      if (inst) {
        const p = inst.group.position;
        spatialRuntime.syncCrystalTransform(selectedCrystalId, [p.x, p.y, p.z], inst.targetRotationY);
        onCrystalAngleChange(selectedCrystalId, inst.targetRotationY);
      }
    },
    setSelectedCrystalAngle(angle: number) {
      if (!selectedCrystalId || !Number.isFinite(angle)) return;
      crystals.setCrystalRotation(selectedCrystalId, angle);
      const inst = crystals.instances.get(selectedCrystalId);
      if (inst) {
        const p = inst.group.position;
        spatialRuntime.syncCrystalTransform(selectedCrystalId, [p.x, p.y, p.z], angle);
      }
      onCrystalAngleChange(selectedCrystalId, angle);
    },
    swapCrystalSlots(idA: CrystalId, idB: CrystalId) {
      const instA = crystals.instances.get(idA);
      const instB = crystals.instances.get(idB);
      if (!instA || !instB) return;

      const slotA = instA.data.pedestalSlot;
      const slotB = instB.data.pedestalSlot;
      const posA = chamber.pedestalPositions[slotB].clone().setY(1.25);
      const posB = chamber.pedestalPositions[slotA].clone().setY(1.25);

      spatialRuntime.swapCrystalPositions(
        idA,
        [posA.x, posA.y, posA.z],
        idB,
        [posB.x, posB.y, posB.z]
      );
      crystals.repositionCrystal(idA, slotB, posA);
      crystals.repositionCrystal(idB, slotA, posB);
    },
    updateCrystalData(newCrystalsData: CrystalData[], totalCoherence: number) {
      currentCoherence = totalCoherence;
      newCrystalsData.forEach((c) => {
        const inst = crystals.instances.get(c.id);
        if (inst) {
          inst.data = c;
          inst.targetRotationY = c.rotationY;
          const p = inst.group.position;
          spatialRuntime.syncCrystalTransform(c.id, [p.x, p.y, p.z], c.rotationY, c.isAligned);
        }
      });
    },
    updateBeamSegments(segments: BeamSegment[], isTargetHit: boolean) {
      currentSegments = segments;
      isTargetHitState = isTargetHit;
    },
    setBeamSourceActive(active: boolean) {
      consoleObj.setBeamActive(active);
    },
    toggleBeamSource() {
      return consoleObj.toggleBeamActive();
    },
    focusOnCrystal(id: CrystalId | null) {
      if (renderer.xr.isPresenting) return;
      if (!id) {
        camTargetPos.copy(defaultCamPos);
        camLookTarget.copy(defaultCamTarget);
        isTransitioningCamera = true;
        return;
      }
      const inst = crystals.instances.get(id);
      if (inst) {
        const p = inst.group.position;
        camLookTarget.set(p.x, p.y, p.z);
        camTargetPos.set(p.x * 1.5, p.y + 0.8, p.z * 1.5);
        isTransitioningCamera = true;
      }
    },
    focusOnTargetReceiver() {
      if (renderer.xr.isPresenting) return;
      camLookTarget.copy(targetReceiver.targetPosition);
      camTargetPos.set(0, 2.5, -2.5);
      isTransitioningCamera = true;
    },
    focusOnConsole() {
      if (renderer.xr.isPresenting) return;
      camLookTarget.set(0, 1.45, 0);
      camTargetPos.set(0, 2.6, 2.8);
      isTransitioningCamera = true;
    },
    setDisplayedConsoleGlyphs(glyphs: string[]) {
      consoleObj.setDisplayedGlyphs(glyphs);
    },
    syncVRUIState(uiState: VRUISyncState) {
      lastVRUISyncState = uiState;
      vrSpatialUI.syncState({
        ...uiState,
        calibrationState: uiState.calibrationState || calibrationManager.getState(),
        accessibilityState: uiState.accessibilityState || accessibilityManager.getState(),
      });
    },
    resetView() {
      if (renderer.xr.isPresenting) {
        vrRigTargetPos.copy(defaultSeatedRigPos);
        vrRigTargetYaw = 0;
        return;
      }
      camTargetPos.copy(defaultCamPos);
      camLookTarget.copy(defaultCamTarget);
      isTransitioningCamera = true;
    },
    startVRSession,
    endVRSession,
    checkVRSupport,
    isVRSessionActive() {
      return renderer.xr.isPresenting || vrAdapter.isSessionActive;
    },
    handTracker,
    vrSpatialUI,
    setHandInteractionEnabled(enabled: boolean) {
      handTracker.setHandInteractionEnabled(enabled);
    },
    getHandTrackingStatus() {
      return handTracker.getTrackingStatus();
    },
    getCalibrationState() {
      return calibrationManager.getState();
    },
    getAccessibilityState() {
      return accessibilityManager.getState();
    },
    getDebouncerMetrics() {
      return gestureDebouncer.getMetrics();
    },
    getHandRecoveryStates() {
      return handTracker.getRecoveryStates();
    },
    startCalibration() {
      calibrationManager.recalibrate();
      applyAccessibilityAndCalibration();
      return calibrationManager.getState();
    },
    setPostureMode(mode: PostureMode) {
      accessibilityManager.setPostureMode(mode);
      applyAccessibilityAndCalibration();
      return accessibilityManager.getState();
    },
    setTurnMode(mode: TurnMode) {
      accessibilityManager.setTurnMode(mode);
      applyAccessibilityAndCalibration();
      return accessibilityManager.getState();
    },
    getDiagnosticsState() {
      return handTracker.getDiagnosticsState();
    },
    startDiagnosticsTest() {
      handTracker.startDiagnosticsTest();
    },
    stopDiagnosticsTest() {
      handTracker.stopDiagnosticsTest();
    },
    resetDiagnosticsResults() {
      handTracker.resetDiagnosticsResults();
    },
    setLightingChecklist(checklist: Record<'bright' | 'dim' | 'uneven', LightingConditionRecord>) {
      handTracker.setLightingChecklist(checklist);
    },
    setTesterNotes(notes: string) {
      handTracker.setTesterNotes(notes);
    },
    inputRouter,
    androidTouchAdapter,
    metaQuestHandAdapter,
    vrAdapter,
    gpuRecoveryManager,
    simulateContextLoss() {
      gpuRecoveryManager.simulateContextLoss();
    },
    async simulateContextRestored() {
      return gpuRecoveryManager.simulateContextRestored();
    },
    getSpatialRuntimeState() {
      return spatialRuntime.getState();
    },
    dispose() {
      renderer.setAnimationLoop(null);

      const activeSession = renderer.xr.getSession();
      if (activeSession) {
        activeSession.end().catch(() => {});
      }

      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.removeEventListener('mouseup', onWindowPointerRelease);
      gpuRecoveryManager.detach();
      canvasEl.removeEventListener('mousedown', onPointerDown);
      canvasEl.removeEventListener('mouseup', onPointerUp);
      controls.removeEventListener('start', onControlsStart);
      controls.removeEventListener('end', onControlsEnd);

      inputRouter.dispose();
      spatialRuntime.dispose();
      controls.dispose();
      vrSpatialUI.dispose();
      handTracker.dispose();
      spaceEnv.dispose();
      chamber.dispose();
      consoleObj.dispose();
      crystals.dispose();
      laserBeams.dispose();
      targetReceiver.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
