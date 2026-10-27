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
import { createHandTracker, HandTracker } from './handInteraction';

export interface SceneManagerOptions {
  container: HTMLDivElement;
  crystalsData: CrystalData[];
  onSelectCrystal: (id: CrystalId | null) => void;
  onCrystalAngleChange: (id: CrystalId, newAngle: number) => void;
  onToggleBeamSource?: () => void;
  onVRSessionChange?: (active: boolean) => void;
  onHandTrackingStatusChange?: (status: HandTrackingStatus, activeCount: number) => void;
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
  resetView: () => void;
  startVRSession: () => Promise<{ success: boolean; error?: string }>;
  endVRSession: () => Promise<void>;
  checkVRSupport: () => Promise<boolean>;
  isVRSessionActive: () => boolean;
  handTracker: HandTracker;
  setHandInteractionEnabled: (enabled: boolean) => void;
  getHandTrackingStatus: () => HandTrackingStatus;
  getDiagnosticsState: () => DiagnosticsSessionState;
  startDiagnosticsTest: () => void;
  stopDiagnosticsTest: () => void;
  resetDiagnosticsResults: () => void;
  setLightingChecklist: (checklist: Record<'bright' | 'dim' | 'uneven', LightingConditionRecord>) => void;
  setTesterNotes: (notes: string) => void;
  vrAdapter: VRInteractionAdapter;
  dispose: () => void;
}

export function initScene(options: SceneManagerOptions): SceneController {
  const { container, crystalsData, onSelectCrystal, onCrystalAngleChange, onToggleBeamSource, onVRSessionChange } = options;

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
      const matrix = new THREE.Matrix4();
      matrix.identity().extractRotation(controller.matrixWorld);
      const rayOrigin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
      const rayDirection = new THREE.Vector3(0, 0, -1).applyMatrix4(matrix).normalize();
      vrAdapter.onSelectRay?.(
        [rayOrigin.x, rayOrigin.y, rayOrigin.z],
        [rayDirection.x, rayDirection.y, rayDirection.z]
      );
    });

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

  // 9. Procedural WebXR Controller-Free Hand Tracking Manager (Phase 6)
  const handTracker = createHandTracker({
    renderer,
    scene,
    cameraRig,
    raycastTargets: crystals.raycastTargets,
    consoleRaycastTarget: consoleObj.raycastTarget,
    onSelectCrystal: (id) => {
      selectedCrystalId = id;
      crystals.setSelection(id);
      onSelectCrystal(id);
    },
    onRotateCrystal: (id, deltaAngle) => {
      crystals.rotateCrystal(id, deltaAngle);
      const inst = crystals.instances.get(id);
      if (inst) {
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
    onStatusChange: (status, count) => {
      vrAdapter.handTrackingStatus = status;
      vrAdapter.activeHandsCount = count;
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
    pointerDownTime = performance.now();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    pointerDownPos = { x: clientX, y: clientY };
  };

  const onPointerUp = (e: MouseEvent | TouchEvent) => {
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

  const canvasEl = renderer.domElement;
  canvasEl.addEventListener('mousedown', onPointerDown);
  canvasEl.addEventListener('mouseup', onPointerUp);
  canvasEl.addEventListener('touchstart', onPointerDown, { passive: true });
  canvasEl.addEventListener('touchend', onPointerUp, { passive: true });

  // 11. Window Resize Handler
  const onResize = () => {
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  window.addEventListener('resize', onResize);

  // 12. Clock & Animation State
  const clock = new THREE.Clock();

  // 13. WebXR Session Event Listeners
  renderer.xr.addEventListener('sessionstart', () => {
    console.log('[WebXR] sessionstart event fired - VR active presentation begun.');
    vrAdapter.isSessionActive = true;
    vrAdapter.vrSupportStatus = 'active';
    controls.enabled = false;
    isTransitioningCamera = false;

    // In WebXR, cameraRig defines the seated base station in room space.
    // Position camera rig 3.2m away facing center console.
    cameraRig.position.set(0, 0, 3.2);
    // Camera local transform must be reset so WebXR HMD pose is not double-offset into void
    camera.position.set(0, 0, 0);
    camera.quaternion.identity();
    camera.updateProjectionMatrix();

    if (onVRSessionChange) onVRSessionChange(true);
  });

  renderer.xr.addEventListener('sessionend', () => {
    console.log('[WebXR] sessionend event fired - returning to 2D desktop/mobile presentation.');
    vrAdapter.isSessionActive = false;
    vrAdapter.vrSupportStatus = 'supported';
    controls.enabled = true;
    isTransitioningCamera = false;
    handTracker.releaseGrabbedCrystal();

    // Restore desktop/mobile camera view
    cameraRig.position.set(0, 0, 0);
    camera.position.copy(defaultCamPos);
    camera.updateProjectionMatrix();
    controls.target.copy(defaultCamTarget);
    controls.update();

    // Re-synchronize 2D canvas dimensions
    onResize();

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
      const rayOrigin = new THREE.Vector3(...origin);
      const rayDir = new THREE.Vector3(...direction).normalize();
      raycaster.set(rayOrigin, rayDir);

      // Check click/trigger on console emitter tip
      const consoleHits = raycaster.intersectObject(consoleObj.raycastTarget, true);
      if (consoleHits.length > 0) {
        if (onToggleBeamSource) {
          onToggleBeamSource();
        } else {
          consoleObj.toggleBeamActive();
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
          selectedCrystalId = id;
          crystals.setSelection(id);
          onSelectCrystal(id);
        }
      }
    },
    onRotateObject(crystalId, deltaAngle) {
      crystals.rotateCrystal(crystalId, deltaAngle);
      const inst = crystals.instances.get(crystalId);
      if (inst) {
        onCrystalAngleChange(crystalId, inst.targetRotationY);
      }
    },
    onTranslateObject(crystalId, deltaPos) {
      const inst = crystals.instances.get(crystalId);
      if (inst) {
        inst.targetPosition.x += deltaPos[0];
        inst.targetPosition.y += deltaPos[1];
        inst.targetPosition.z += deltaPos[2];
      }
    },
    onHandPinch(_hand, origin, direction) {
      vrAdapter.onSelectRay?.(origin, direction);
    },
    onHandGrabCrystal(_hand, crystalId) {
      selectedCrystalId = crystalId;
      crystals.setSelection(crystalId);
      onSelectCrystal(crystalId);
    },
    onHandReleaseCrystal(_hand, _crystalId) {
      handTracker.releaseGrabbedCrystal();
    },
    onHandPoseUpdate(_hand, _joints) {
      // Joint poses are continuously handled by handTracker
    },
  };

  // Check initial WebXR availability asynchronously
  async function checkVRSupport(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('xr' in navigator) || !navigator.xr) {
      vrAdapter.isVRAvailable = false;
      vrAdapter.vrSupportStatus = 'unsupported';
      return false;
    }
    try {
      const supported = await navigator.xr.isSessionSupported('immersive-vr');
      vrAdapter.isVRAvailable = supported;
      vrAdapter.vrSupportStatus = supported ? 'supported' : 'unsupported';
      return supported;
    } catch {
      vrAdapter.isVRAvailable = false;
      vrAdapter.vrSupportStatus = 'unsupported';
      return false;
    }
  }
  checkVRSupport();

  async function startVRSession(): Promise<{ success: boolean; error?: string }> {
    if (typeof navigator === 'undefined' || !('xr' in navigator) || !navigator.xr) {
      const msg = 'WebXR is not supported in this browser. Use Meta Quest Browser or Chrome with a connected VR headset.';
      vrAdapter.errorMessage = msg;
      vrAdapter.vrSupportStatus = 'unsupported';
      return { success: false, error: msg };
    }
    try {
      const supported = await navigator.xr.isSessionSupported('immersive-vr');
      if (!supported) {
        const msg = 'Immersive VR headset session is not supported on this device. Ensure your VR headset is active.';
        vrAdapter.errorMessage = msg;
        vrAdapter.vrSupportStatus = 'unsupported';
        return { success: false, error: msg };
      }
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      });
      await renderer.xr.setSession(session);
      vrAdapter.isSessionActive = true;
      vrAdapter.vrSupportStatus = 'active';
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Failed to initiate immersive WebXR session. Please check device connection and permissions.';
      vrAdapter.errorMessage = msg;
      vrAdapter.vrSupportStatus = 'error';
      return { success: false, error: msg };
    }
  }

  async function endVRSession(): Promise<void> {
    const session = renderer.xr.getSession();
    if (session) {
      await session.end();
    }
  }

  // 13. Render Loop (Unified WebXR & Desktop Rendering)
  function tick() {
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
    }

    // Update scene systems
    spaceEnv.update(time, delta);
    chamber.update(time, delta);
    consoleObj.update(time, delta, currentCoherence);
    crystals.update(time, delta);
    laserBeams.update(time, delta, currentSegments, isTargetHitState);
    targetReceiver.update(time, delta, isTargetHitState);
    handTracker.update(delta);

    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(tick);
    }
  }

  // Pre-warm shaders
  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  if (isSoftwareGl) {
    tick();
  } else {
    renderer.setAnimationLoop(tick);
  }

  return {
    selectCrystal(id: CrystalId | null) {
      selectedCrystalId = id;
      crystals.setSelection(id);
    },
    rotateSelectedCrystal(deltaAngle: number) {
      if (!selectedCrystalId) return;
      crystals.rotateCrystal(selectedCrystalId, deltaAngle);
      const inst = crystals.instances.get(selectedCrystalId);
      if (inst) {
        onCrystalAngleChange(selectedCrystalId, inst.targetRotationY);
      }
    },
    setSelectedCrystalAngle(angle: number) {
      if (!selectedCrystalId) return;
      crystals.setCrystalRotation(selectedCrystalId, angle);
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
    resetView() {
      if (renderer.xr.isPresenting) return;
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
    setHandInteractionEnabled(enabled: boolean) {
      handTracker.setHandInteractionEnabled(enabled);
    },
    getHandTrackingStatus() {
      return handTracker.getTrackingStatus();
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
    vrAdapter,
    dispose() {
      if (isSoftwareGl) {
        clearTimeout(frameId);
      } else {
        renderer.setAnimationLoop(null);
      }

      const activeSession = renderer.xr.getSession();
      if (activeSession) {
        activeSession.end().catch(() => {});
      }

      window.removeEventListener('resize', onResize);
      canvasEl.removeEventListener('mousedown', onPointerDown);
      canvasEl.removeEventListener('mouseup', onPointerUp);
      canvasEl.removeEventListener('touchstart', onPointerDown);
      canvasEl.removeEventListener('touchend', onPointerUp);

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
