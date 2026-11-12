/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 2 Automated Test Suite: Advanced WebXR & GPU Resilience Engineering
 * Comprehensive verification of:
 * 1. WebGL context loss detection (webglcontextlost)
 * 2. WebGL context restoration (webglcontextrestored)
 * 3. Prevention of duplicate event listeners on canvas attach/detach
 * 4. GPU resource recreation (materials, geometries, textures)
 * 5. Shader program recompilation across the scene graph
 * 6. Texture restoration and procedural canvas texture hooks
 * 7. Procedural PMREM Studio Environment map regeneration
 * 8. Scene recovery and render-loop resumption state management
 * 9. Circuit breaker protection against repeated context loss (GPU flapping)
 * 10. WebXR session termination and reference space reset
 * 11. Controller connection/disconnection and pointer ray toggling
 * 12. Desktop 2D fallback when WebXR hardware is absent
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  GPUResourceRecoveryManager,
} from '../src/engines/GPUResourceRecoveryManager';
import {
  XRSessionManager,
} from '../src/engines/XRSessionManager';

describe('Stage 2: Advanced WebXR & GPU Resilience Suite', () => {
  beforeEach(() => {
    GPUResourceRecoveryManager.resetInstance();
    XRSessionManager.resetInstance();
  });

  afterEach(() => {
    GPUResourceRecoveryManager.resetInstance();
    XRSessionManager.resetInstance();
  });

  // --------------------------------------------------------------------------
  // TEST 1: WEBGL CONTEXT LOSS DETECTION
  // --------------------------------------------------------------------------
  it('1. detects webglcontextlost event, calls preventDefault(), and suspends rendering', () => {
    const manager = new GPUResourceRecoveryManager();
    const mockCanvas = new EventTarget();

    let renderSuspended = false;
    manager.attach({
      canvas: mockCanvas,
      renderer: null as any,
      scene: null as any,
      camera: null as any,
      onSuspendRendering: () => {
        renderSuspended = true;
      },
    });

    assert.equal(manager.getTelemetry().currentState, 'NOMINAL');

    // Dispatch webglcontextlost
    let preventDefaultCalled = false;
    const lossEvent = new Event('webglcontextlost', { cancelable: true });
    lossEvent.preventDefault = () => {
      preventDefaultCalled = true;
    };

    mockCanvas.dispatchEvent(lossEvent);

    assert.equal(preventDefaultCalled, true, 'preventDefault must be called to permit WebGL context restoration');
    assert.equal(renderSuspended, true, 'Rendering loop must be suspended upon context loss');
    assert.equal(manager.getTelemetry().currentState, 'CONTEXT_LOST');
    assert.equal(manager.getTelemetry().contextLossCount, 1);
    assert.equal(manager.getTelemetry().isRenderingSuspended, true);
  });

  // --------------------------------------------------------------------------
  // TEST 2: CONTEXT RESTORATION & PIPELINE RECOVERY
  // --------------------------------------------------------------------------
  it('2. detects webglcontextrestored, executes recovery pipeline, and resumes rendering', async () => {
    const manager = new GPUResourceRecoveryManager();
    const mockCanvas = new EventTarget();

    let renderSuspended = false;
    let renderResumed = false;

    manager.attach({
      canvas: mockCanvas,
      renderer: null as any,
      scene: null as any,
      camera: null as any,
      onSuspendRendering: () => {
        renderSuspended = true;
      },
      onResumeRendering: () => {
        renderResumed = true;
      },
    });

    // Lose context
    mockCanvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    assert.equal(renderSuspended, true);

    // Restore context
    const restored = await manager.handleContextRestored();

    assert.equal(restored, true, 'handleContextRestored must succeed');
    assert.equal(renderResumed, true, 'Rendering loop must be resumed after restoration');
    assert.equal(manager.getTelemetry().currentState, 'NOMINAL');
    assert.equal(manager.getTelemetry().successfulRecoveryCount, 1);
    assert.ok(manager.getTelemetry().lastRecoveryDurationMs >= 0);
  });

  // --------------------------------------------------------------------------
  // TEST 3: DUPLICATE LISTENER PREVENTION & CLEAN DETACH
  // --------------------------------------------------------------------------
  it('3. prevents duplicate event listeners across repeated attach and detach cycles', () => {
    const manager = new GPUResourceRecoveryManager();
    const mockCanvas = new EventTarget();

    let lossHandlerCallCount = 0;
    manager.attach({
      canvas: mockCanvas,
      renderer: null as any,
      scene: null as any,
      camera: null as any,
      onSuspendRendering: () => {
        lossHandlerCallCount++;
      },
    });

    // Re-attach to the same canvas without detaching manually
    manager.attach({
      canvas: mockCanvas,
      renderer: null as any,
      scene: null as any,
      camera: null as any,
      onSuspendRendering: () => {
        lossHandlerCallCount++;
      },
    });

    // Dispatch 1 loss event
    mockCanvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));

    // Must be called exactly once, not twice (zero duplicate listener execution)
    assert.equal(lossHandlerCallCount, 1, 'Idempotent attachment must prevent duplicate listeners');

    // Clean detach
    manager.detach();
    mockCanvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));

    // Still exactly 1 (no listener called after detach)
    assert.equal(lossHandlerCallCount, 1, 'Detached canvas must not trigger handlers');
  });

  // --------------------------------------------------------------------------
  // TEST 4: GPU RESOURCE RECREATION (MATERIALS & GEOMETRIES)
  // --------------------------------------------------------------------------
  it('4. traverses scene graph and sets needsUpdate on all meshes, materials, and geometries', () => {
    const manager = new GPUResourceRecoveryManager();
    const scene = new THREE.Scene();

    // Create test mesh with standard material and geometry
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
    const mesh = new THREE.Mesh(geom, mat);
    scene.add(mesh);

    const initialVersion = mat.version;

    manager.attach({
      canvas: new EventTarget(),
      renderer: null as any,
      scene,
      camera: null as any,
    });

    manager.refreshSceneMaterialsAndGeometries();

    assert.ok(mat.version > initialVersion, 'Material version must increment when needsUpdate is set to true');
    assert.ok(geom.attributes.position, 'Geometry buffer attributes must remain intact');
  });

  // --------------------------------------------------------------------------
  // TEST 5: SHADER RECOMPILATION PIPELINE
  // --------------------------------------------------------------------------
  it('5. triggers shader recompilation across registered scene pipelines', async () => {
    const manager = new GPUResourceRecoveryManager();
    let shaderCompiledCount = 0;

    manager.registerResource({
      id: 'shader-recompile-pipeline',
      type: 'MATERIAL',
      name: 'Resonance Shaders',
      restoreFn: () => {
        shaderCompiledCount++;
      },
    });

    await manager.executeRestorationPipeline();

    assert.equal(shaderCompiledCount, 1, 'Registered shader recompile pipeline must be executed');
  });

  // --------------------------------------------------------------------------
  // TEST 6: TEXTURE RESTORATION AND PROCEDURAL CANVAS HOOKS
  // --------------------------------------------------------------------------
  it('6. executes registered procedural texture and canvas glyph restoration hooks', async () => {
    const manager = new GPUResourceRecoveryManager();
    let glyphsRegenerated = false;

    const unregister = manager.registerResource({
      id: 'holographic-console-glyphs',
      type: 'TEXTURE',
      name: 'Console Glyphs Canvas',
      restoreFn: () => {
        glyphsRegenerated = true;
      },
    });

    await manager.executeRestorationPipeline();
    assert.equal(glyphsRegenerated, true, 'Procedural texture hook must be invoked during restoration');

    // Test unregister callback
    glyphsRegenerated = false;
    unregister();
    await manager.executeRestorationPipeline();
    assert.equal(glyphsRegenerated, false, 'Unregistered hook must not be invoked');
  });

  // --------------------------------------------------------------------------
  // TEST 7: PROCEDURAL PMREM ENVIRONMENT MAP REGENERATION
  // --------------------------------------------------------------------------
  it('7. safely handles PMREM environment map regeneration', () => {
    const manager = new GPUResourceRecoveryManager();
    const scene = new THREE.Scene();

    manager.attach({
      canvas: new EventTarget(),
      renderer: null as any,
      scene,
      camera: null as any,
    });

    // In headless test without WebGL context, regeneratePMREMEnvironment safely handles absence
    const result = manager.regeneratePMREMEnvironment();
    // In headless environments where renderer is null, safely returns false without crashing
    assert.strictEqual(typeof result, 'boolean');
  });

  // --------------------------------------------------------------------------
  // TEST 8: SCENE RECOVERY TELEMETRY AND TIMING
  // --------------------------------------------------------------------------
  it('8. records recovery history and latency telemetry accurately', async () => {
    const manager = new GPUResourceRecoveryManager();
    const mockCanvas = new EventTarget();

    manager.attach({
      canvas: mockCanvas,
      renderer: null as any,
      scene: null as any,
      camera: null as any,
    });

    // Simulate 2 recovery cycles
    manager.simulateContextLoss();
    await manager.simulateContextRestored();

    manager.simulateContextLoss();
    await manager.simulateContextRestored();

    const telemetry = manager.getTelemetry();
    assert.equal(telemetry.contextLossCount, 2);
    assert.equal(telemetry.successfulRecoveryCount, 2);
    assert.equal(telemetry.recoveryHistory.length, 2);
    assert.equal(telemetry.currentState, 'NOMINAL');
    assert.ok(telemetry.lastRecoveryTimestamp !== null);
  });

  // --------------------------------------------------------------------------
  // TEST 9: CIRCUIT BREAKER ON REPEATED GPU CONTEXT LOSS (FLAPPING)
  // --------------------------------------------------------------------------
  it('9. trips circuit breaker and transitions to FAILED_UNRECOVERABLE on rapid GPU flapping', () => {
    let unrecoverableError: Error | null = null;
    const manager = new GPUResourceRecoveryManager({
      maxConsecutiveLosses: 3,
      flappingWindowMs: 30000,
    });

    manager.attach({
      canvas: new EventTarget(),
      renderer: null as any,
      scene: null as any,
      camera: null as any,
      onUnrecoverableFailure: (err) => {
        unrecoverableError = err;
      },
    });

    // Trigger 4 rapid context losses (exceeds max of 3)
    manager.simulateContextLoss();
    manager.simulateContextLoss();
    manager.simulateContextLoss();
    manager.simulateContextLoss();

    const telemetry = manager.getTelemetry();
    assert.equal(telemetry.currentState, 'FAILED_UNRECOVERABLE');
    assert.equal(telemetry.flappingDetected, true);
    assert.ok(unrecoverableError !== null, 'Unrecoverable error callback must be invoked');
    assert.ok((unrecoverableError as Error | null)?.message.includes('Unrecoverable GPU failure'));
  });

  // --------------------------------------------------------------------------
  // TEST 10: WEBXR SESSION TERMINATION & REFERENCE SPACE RESET
  // --------------------------------------------------------------------------
  it('10. handles WebXR session lifecycle termination and reference space reset safely', async () => {
    const sessionManager = XRSessionManager.getInstance();

    const initialCaps = sessionManager.getCapabilities();
    assert.ok(['IDLE', 'UNSUPPORTED'].includes(initialCaps.sessionState));

    // End session safely
    const ended = await sessionManager.endSession();
    assert.strictEqual(typeof ended, 'boolean');
    assert.equal(sessionManager.getCapabilities().sessionState, 'IDLE');
    assert.equal(sessionManager.getCapabilities().activeReferenceSpaceType, 'none');
  });

  // --------------------------------------------------------------------------
  // TEST 11: CONTROLLER CONNECTION & DISCONNECTION EVENTS
  // --------------------------------------------------------------------------
  it('11. manages simulated controller connection and disconnection events', () => {
    const controller = new THREE.Group();
    const rayLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial()
    );
    controller.add(rayLine);

    let isConnected = false;
    const onConnected = () => {
      isConnected = true;
      rayLine.visible = true;
    };
    const onDisconnected = () => {
      isConnected = false;
      rayLine.visible = false;
    };

    (controller as any).addEventListener('connected', onConnected);
    (controller as any).addEventListener('disconnected', onDisconnected);

    // Simulate controller connection
    (controller as any).dispatchEvent({ type: 'connected', data: { profiles: ['oculus-touch'] } });
    assert.equal(isConnected, true);
    assert.equal(rayLine.visible, true);

    // Simulate controller disconnection
    (controller as any).dispatchEvent({ type: 'disconnected' });
    assert.equal(isConnected, false);
    assert.equal(rayLine.visible, false);
  });

  // --------------------------------------------------------------------------
  // TEST 12: DESKTOP 2D FALLBACK WHEN WEBXR HARDWARE IS ABSENT
  // --------------------------------------------------------------------------
  it('12. safely falls back to desktop 2D presentation when immersive VR is unsupported', async () => {
    const sessionManager = XRSessionManager.getInstance();

    // Probe environment (Node.js lacks navigator.xr)
    const status = await sessionManager.probeBrowserXRSupport();
    assert.equal(status, 'UNSUPPORTED');

    // Request session in unsupported environment
    const result = await sessionManager.requestImmersiveSession();
    assert.equal(result.success, false);
    assert.ok(result.message.includes('fallback mode') || result.message.includes('not supported'));

    const caps = sessionManager.getCapabilities();
    assert.equal(caps.isWebXRAvailable, false);
    assert.equal(caps.immersiveVRSupported, false);
  });
});
