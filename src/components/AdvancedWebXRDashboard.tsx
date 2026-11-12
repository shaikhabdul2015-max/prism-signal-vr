/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Advanced WebXR Reality Dashboard (Phase 29)
 * Enterprise-grade Command & Control visualization for:
 * 1. XR System Overview & Hardware Probe
 * 2. Spatial Intelligence Monitor (Coordinates & Hierarchy)
 * 3. Immersive Environment Selector with Live Interactive 3D Three.js Canvas
 * 4. VR Multimodal Interaction & Raycasting Controls
 * 5. Spatial Physics & Collision Monitor
 * 6. Adaptive Reality Quality Controller
 * 7. Spatial Audio Intelligence & Positional Attenuation
 * 8. XR Device Compatibility & Reference Spaces
 * 9. Real-Time Performance Monitor
 * 10. Spatial Telemetry Provenance History
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';
import {
  EnvironmentPresetId,
  VisualQualityLevel,
  InputMode,
  SpatialTelemetrySnapshot,
  XRDeviceCapabilities,
  SpatialObjectNode,
} from '../types/phase29';
import { advancedSpatialIntelligenceEngine } from '../engines/AdvancedSpatialIntelligenceEngine';
import { immersiveEnvironmentEngine, IMMERSIVE_PRESETS } from '../engines/ImmersiveEnvironmentEngine';
import { advancedVRInteractionEngine } from '../engines/AdvancedVRInteractionEngine';
import { spatialPhysicsEngine } from '../engines/SpatialPhysicsEngine';
import { adaptiveRealityEngine } from '../engines/AdaptiveRealityEngine';
import { spatialAudioIntelligence } from '../engines/SpatialAudioIntelligence';
import { xrSessionManager } from '../engines/XRSessionManager';
import { spatialTelemetryEngine } from '../engines/SpatialTelemetryEngine';
import {
  Glasses,
  Compass,
  Layers,
  Sparkles,
  Move,
  Activity,
  Volume2,
  VolumeX,
  ShieldCheck,
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Box,
  Eye,
  Zap,
  Sliders,
  Radio,
  Crosshair,
} from 'lucide-react';

interface AdvancedWebXRDashboardProps {
  telemetry: VRTelemetry;
  activeIncidents?: IncidentRecord[];
  isPhysicalVRActive?: boolean;
}

export const AdvancedWebXRDashboard: React.FC<AdvancedWebXRDashboardProps> = ({
  telemetry,
  activeIncidents = [],
  isPhysicalVRActive = false,
}) => {
  const [activeSubView, setActiveSubView] = useState<
    | 'overview'
    | 'spatial'
    | 'environment'
    | 'interaction'
    | 'physics'
    | 'adaptive'
    | 'audio'
    | 'compatibility'
    | 'performance'
    | 'telemetry_history'
  >('overview');

  // Engine states
  const [environmentConfig, setEnvironmentConfig] = useState(() =>
    immersiveEnvironmentEngine.getActiveConfig()
  );
  const [adaptivePolicy, setAdaptivePolicy] = useState(() =>
    adaptiveRealityEngine.getPolicy()
  );
  const [interactionState, setInteractionState] = useState(() =>
    advancedVRInteractionEngine.getState()
  );
  const [xrCaps, setXrCaps] = useState<XRDeviceCapabilities>(() =>
    xrSessionManager.getCapabilities()
  );
  const [telemetrySnapshot, setTelemetrySnapshot] = useState<SpatialTelemetrySnapshot>(() =>
    spatialTelemetryEngine.evaluateSnapshot(telemetry, isPhysicalVRActive)
  );

  const [spatialObjects, setSpatialObjects] = useState<SpatialObjectNode[]>(() =>
    advancedSpatialIntelligenceEngine.getAllObjects()
  );

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(spatialAudioIntelligence.isUnlocked());

  // Canvas Ref for Live 3D Preview
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Sync reactive states
  const refreshAll = useCallback(() => {
    setEnvironmentConfig(immersiveEnvironmentEngine.getActiveConfig());
    setAdaptivePolicy(adaptiveRealityEngine.evaluateAdaptivePolicy(telemetry, activeIncidents));
    setInteractionState(advancedVRInteractionEngine.getState());
    setXrCaps(xrSessionManager.getCapabilities());
    setTelemetrySnapshot(spatialTelemetryEngine.evaluateSnapshot(telemetry, isPhysicalVRActive));
    setSpatialObjects(advancedSpatialIntelligenceEngine.getAllObjects());
  }, [telemetry, activeIncidents, isPhysicalVRActive]);

  useEffect(() => {
    refreshAll();
    const unsubEnv = immersiveEnvironmentEngine.subscribe(setEnvironmentConfig);
    const unsubAdapt = adaptiveRealityEngine.subscribe(setAdaptivePolicy);
    const unsubInteract = advancedVRInteractionEngine.subscribe(setInteractionState);
    const unsubXR = xrSessionManager.subscribe(setXrCaps);
    const unsubTelem = spatialTelemetryEngine.subscribe(setTelemetrySnapshot);

    return () => {
      unsubEnv();
      unsubAdapt();
      unsubInteract();
      unsubXR();
      unsubTelem();
    };
  }, [refreshAll]);

  // Live 3D Scene Initialization
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = 300;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 3.5, 7.5);
    camera.lookAt(0, 1.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Ambient and Directional Light
    const ambientLight = new THREE.AmbientLight(
      environmentConfig.atmosphere.ambientLightHex,
      environmentConfig.atmosphere.ambientIntensity
    );
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(
      environmentConfig.atmosphere.primaryLightHex,
      environmentConfig.atmosphere.primaryLightIntensity
    );
    dirLight.position.set(...environmentConfig.atmosphere.primaryLightPosition);
    scene.add(dirLight);

    // Floor Grid
    const grid = new THREE.GridHelper(16, 16, environmentConfig.gridColorHex, '#1e293b');
    grid.position.y = 0;
    scene.add(grid);

    // 1. Ruby Harmonic Core
    const rubyGeo = new THREE.OctahedronGeometry(0.55, 0);
    const rubyMat = new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#dc2626',
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const rubyMesh = new THREE.Mesh(rubyGeo, rubyMat);
    rubyMesh.position.set(3.64, 1.25, -2.1);
    scene.add(rubyMesh);

    // 2. Azure Resonance Array
    const azureGeo = new THREE.CylinderGeometry(0.4, 0.6, 1.1, 8);
    const azureMat = new THREE.MeshStandardMaterial({
      color: '#06b6d4',
      emissive: '#0891b2',
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.9,
    });
    const azureMesh = new THREE.Mesh(azureGeo, azureMat);
    azureMesh.position.set(0, 1.25, 4.2);
    scene.add(azureMesh);

    // 3. Emerald Core Station
    const emeraldGeo = new THREE.IcosahedronGeometry(0.55, 0);
    const emeraldMat = new THREE.MeshStandardMaterial({
      color: '#10b981',
      emissive: '#059669',
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const emeraldMesh = new THREE.Mesh(emeraldGeo, emeraldMat);
    emeraldMesh.position.set(-3.64, 1.25, -2.1);
    scene.add(emeraldMesh);

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      rubyMesh.rotation.y += delta * 0.8;
      rubyMesh.rotation.x += delta * 0.3;

      azureMesh.rotation.y -= delta * 0.5;

      emeraldMesh.rotation.y += delta * 0.7;
      emeraldMesh.rotation.z += delta * 0.2;

      // Update physics
      spatialPhysicsEngine.updatePhysics(delta);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
      renderer.dispose();
      rubyGeo.dispose();
      rubyMat.dispose();
      azureGeo.dispose();
      azureMat.dispose();
      emeraldGeo.dispose();
      emeraldMat.dispose();
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [environmentConfig]);

  const handleSwitchPreset = (presetId: EnvironmentPresetId) => {
    immersiveEnvironmentEngine.switchPreset(presetId);
    setStatusMessage(`Environment preset switched to ${presetId}.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleTestRaycast = () => {
    // Perform simulated center-view raycast towards Ruby Core
    const hit = advancedVRInteractionEngine.performRaycast([0, 1.6, 0], [0.8, -0.1, -0.6]);
    if (hit) {
      setStatusMessage(`Raycast HIT: ${hit.hitObjectId} at ${hit.distance}m`);
    } else {
      setStatusMessage('Raycast: Miss (No interactable objects intersected).');
    }
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleUnlockAudio = async () => {
    const success = await spatialAudioIntelligence.unlockAudio();
    setAudioUnlocked(success);
    if (success) {
      spatialAudioIntelligence.playHarmonicAlignmentPulse(523.25);
      setStatusMessage('Web Audio Context unlocked & harmonic pulse synthesized.');
    } else {
      setStatusMessage('Web Audio unlock failed or not permitted.');
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleRequestVR = async () => {
    const res = await xrSessionManager.requestImmersiveSession();
    setStatusMessage(res.message);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  return (
    <div className="flex flex-col gap-4 text-xs font-mono text-slate-200">
      {/* Executive Command Header */}
      <div className="bg-slate-950/90 border border-cyan-800/80 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Glasses className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="text-sm font-bold text-cyan-300 uppercase tracking-wider">
              PRISM SIGNAL // Phase 29 Advanced WebXR Reality Engine
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-slate-900 border border-cyan-700/60 px-2.5 py-1 rounded text-cyan-400">
              XR SESSION: <strong className={xrCaps.sessionState === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-400'}>{xrCaps.sessionState}</strong>
            </span>
            <span className="text-[10px] bg-slate-900 border border-slate-700 px-2.5 py-1 rounded text-slate-400">
              PROVENANCE: <strong className={telemetrySnapshot.currentMetrics.provenance === 'REAL_DEVICE_TELEMETRY' ? 'text-emerald-400' : 'text-cyan-400'}>
                {telemetrySnapshot.currentMetrics.provenance}
              </strong>
            </span>
            <button
              onClick={refreshAll}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-600 rounded text-cyan-300 text-[11px] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync XR
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-slate-400 text-[11px] pt-1">
          <p>
            Immersive WebXR reality engine: 5 environment presets, analytical spatial physics, multimodal interaction raycasting, and adaptive quality governors.
          </p>
          <span className="text-[10px] text-slate-500">
            Engine Version: 1.29.0 // WebGL / WebXR Native
          </span>
        </div>

        {statusMessage && (
          <div className="mt-1 p-2 bg-emerald-950/80 border border-emerald-500/80 rounded text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* KPI Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">CADENCE</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold ${telemetrySnapshot.currentMetrics.fps >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
              ~{telemetrySnapshot.currentMetrics.fps}
            </span>
            <span className="text-slate-500 text-[10px]">FPS ({telemetrySnapshot.currentMetrics.frameDeltaMs}ms)</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">ACTIVE ENVIRONMENT</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-cyan-300 truncate">{environmentConfig.presetId}</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">INPUT MODE</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-purple-300">{interactionState.inputMode}</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">PHYSICS COLLIDERS</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-emerald-400">{spatialPhysicsEngine.getAllColliders().length}</span>
            <span className="text-slate-500 text-[10px]">active bodies</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">ADAPTIVE QUALITY</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-cyan-400">{adaptivePolicy.qualityLevel}</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">SPATIAL AUDIO</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold ${audioUnlocked ? 'text-emerald-400' : 'text-amber-400'}`}>
              {audioUnlocked ? 'UNLOCKED' : 'SUSPENDED'}
            </span>
          </div>
        </div>
      </div>

      {/* Subview Navigation Buttons */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 pb-2 text-xs">
        {[
          { id: 'overview', label: '1. XR OVERVIEW', icon: Compass },
          { id: 'environment', label: '2. 3D ENVIRONMENT', icon: Layers },
          { id: 'spatial', label: '3. SPATIAL OBJECTS', icon: Box },
          { id: 'interaction', label: '4. VR INTERACTION', icon: Crosshair },
          { id: 'physics', label: '5. SPATIAL PHYSICS', icon: Activity },
          { id: 'adaptive', label: '6. ADAPTIVE REALITY', icon: Sliders },
          { id: 'audio', label: '7. SPATIAL AUDIO', icon: Volume2 },
          { id: 'compatibility', label: '8. XR COMPATIBILITY', icon: Glasses },
          { id: 'performance', label: '9. PERFORMANCE MONITOR', icon: Zap },
          { id: 'telemetry_history', label: '10. TELEMETRY HISTORY', icon: Radio },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubView(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                activeSubView === tab.id
                  ? 'bg-cyan-950 border border-cyan-500 text-cyan-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBVIEW 1: XR OVERVIEW & 3D PREVIEW */}
      {activeSubView === 'overview' && (
        <div className="flex flex-col gap-4">
          {/* Live Interactive 3D Canvas */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Box className="w-4 h-4 text-cyan-400" />
                Live PRISM WebXR Spatial Chamber (Three.js WebGL Core)
              </span>
              <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-emerald-400">
                ACTIVE PRESET: {environmentConfig.presetId}
              </span>
            </div>

            <div
              ref={mountRef}
              className="w-full h-[300px] rounded-lg overflow-hidden border border-slate-800 bg-slate-950 relative"
            />

            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Entities: Ruby Harmonic Core (Red), Azure Resonance Array (Cyan), Emerald Core (Green)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestRaycast}
                  className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 rounded text-cyan-300 text-[10px]"
                >
                  Test Raycast
                </button>
                <button
                  onClick={handleUnlockAudio}
                  className="px-2.5 py-1 bg-purple-950 hover:bg-purple-900 border border-purple-700 rounded text-purple-300 text-[10px]"
                >
                  {audioUnlocked ? 'Synthesize Pulse' : 'Unlock Spatial Audio'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Environment Selector Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {Object.keys(IMMERSIVE_PRESETS).map((pId) => {
              const p = IMMERSIVE_PRESETS[pId as EnvironmentPresetId];
              const isSelected = environmentConfig.presetId === pId;
              return (
                <button
                  key={pId}
                  onClick={() => handleSwitchPreset(pId as EnvironmentPresetId)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'bg-cyan-950/80 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.15)] text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold text-xs block mb-1 text-cyan-300">{p.name}</span>
                  <span className="text-[10px] text-slate-400 line-clamp-2">{p.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBVIEW 2: 3D ENVIRONMENT */}
      {activeSubView === 'environment' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                Immersive Environment Configuration & Atmosphere
              </span>
              <span className="text-[10px] text-slate-400">Target Cadence: {environmentConfig.targetCadenceFps} FPS</span>
            </div>
            <p className="text-slate-300 text-xs">{environmentConfig.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-cyan-300 text-xs uppercase border-b border-slate-800 pb-1">Atmospheric Parameters</h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">FOG COLOR</span>
                  <span className="font-bold text-cyan-400">{environmentConfig.atmosphere.fogColorHex}</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">FOG DENSITY</span>
                  <span className="font-bold text-slate-200">{environmentConfig.atmosphere.fogDensity}</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">PRIMARY LIGHT</span>
                  <span className="font-bold text-amber-400">{environmentConfig.atmosphere.primaryLightHex}</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">PARTICLE COUNT</span>
                  <span className="font-bold text-purple-400">{environmentConfig.atmosphere.particleDensity}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-cyan-300 text-xs uppercase border-b border-slate-800 pb-1">Preset Switcher</h4>
              <div className="space-y-2">
                {Object.keys(IMMERSIVE_PRESETS).map((pId) => (
                  <button
                    key={pId}
                    onClick={() => handleSwitchPreset(pId as EnvironmentPresetId)}
                    className={`w-full text-left p-2 rounded text-xs border flex justify-between items-center ${
                      environmentConfig.presetId === pId
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-200 font-bold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <span>{IMMERSIVE_PRESETS[pId as EnvironmentPresetId].name}</span>
                    <span className="text-[10px] text-slate-500">{pId}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 3: SPATIAL OBJECTS */}
      {activeSubView === 'spatial' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Box className="w-4 h-4 text-cyan-400" />
                Spatial Objects & Coordinate Hierarchy
              </span>
              <span className="text-[10px] text-slate-400">Total Entities: {spatialObjects.length}</span>
            </div>
            <p className="text-slate-400 text-xs">
              World and local 3D transformations resolved with Three.js matrix hierarchies within the 16x16m PRISM chamber boundary.
            </p>
          </div>

          <div className="space-y-3">
            {spatialObjects.map((obj) => (
              <div key={obj.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{obj.name}</span>
                    <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-cyan-400">
                      {obj.type}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">ID: {obj.id}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800">
                  <div>
                    <span className="text-slate-500 text-[10px] block">WORLD POSITION [X, Y, Z]</span>
                    <span className="font-bold text-emerald-400">
                      [{obj.worldTransform.position.map((v) => v.toFixed(2)).join(', ')}]
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">BOUNDING RADIUS</span>
                    <span className="font-bold text-cyan-400">{obj.boundingRadius}m</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 4: VR INTERACTION */}
      {activeSubView === 'interaction' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                Multimodal Input Handling & Raycast Hit Testing
              </span>
              <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-cyan-400">
                ACTIVE MODE: {interactionState.inputMode}
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Supports XR 6-DoF controllers, optical hand-pinch gestures, and desktop/touchscreen raycasting fallbacks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-cyan-300 text-xs uppercase border-b border-slate-800 pb-1">Input Mode Switcher</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(['XR_CONTROLLER', 'XR_HAND', 'MOUSE_POINTER', 'TOUCH_SCREEN', 'KEYBOARD_FALLBACK'] as InputMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => advancedVRInteractionEngine.setInputMode(mode)}
                    className={`p-2 rounded text-xs border text-left ${
                      interactionState.inputMode === mode
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-200 font-bold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-cyan-300 text-xs uppercase border-b border-slate-800 pb-1">Interactive Raycast Actions</h4>
              <div className="flex gap-2">
                <button
                  onClick={handleTestRaycast}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-xs"
                >
                  Fire Test Raycast
                </button>
                <button
                  onClick={() => {
                    const res = advancedVRInteractionEngine.triggerPress();
                    setStatusMessage(`Trigger Press: ${res?.hitObjectId || 'None'}`);
                    setTimeout(() => setStatusMessage(null), 3000);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs"
                >
                  Simulate Select
                </button>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 text-[11px] space-y-1">
                <div>Hovered Object: <strong className="text-emerald-400">{interactionState.hoveredObjectId || 'None'}</strong></div>
                <div>Grabbed Object: <strong className="text-cyan-400">{interactionState.grabbedObjectId || 'None'}</strong></div>
                <div>Ray Origin: [{interactionState.pointerRayOrigin.map((v) => v.toFixed(2)).join(', ')}]</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 5: SPATIAL PHYSICS */}
      {activeSubView === 'physics' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                Real-Time Spatial Physics & Collision Detection
              </span>
              <span className="text-[10px] text-slate-400">
                Recent Collisions: {spatialPhysicsEngine.getRecentCollisions().length}
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Continuous pair-wise analytical sphere & bounding volume collision checks with kinetic restitution.
            </p>
          </div>

          <div className="space-y-3">
            {spatialPhysicsEngine.getAllColliders().map((col) => (
              <div key={col.objectId} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <span className="font-bold text-slate-200">{col.objectId}</span>
                  <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-purple-300">
                    {col.isStatic ? 'STATIC BODY' : 'DYNAMIC KINETIC'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[10px]">SHAPE & RADIUS</span>
                    <span className="font-bold text-slate-200">{col.shape} ({col.radius}m)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">MASS</span>
                    <span className="font-bold text-cyan-400">{col.massKg} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">RESTITUTION</span>
                    <span className="font-bold text-emerald-400">{col.restitution}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">VELOCITY</span>
                    <span className="font-bold text-amber-400">[{col.velocity.map((v) => v.toFixed(2)).join(', ')}]</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 6: ADAPTIVE REALITY */}
      {activeSubView === 'adaptive' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Adaptive Reality & Visual Quality Policy
              </span>
              <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-cyan-400">
                QUALITY: {adaptivePolicy.qualityLevel}
              </span>
            </div>
            <p className="text-slate-300 text-xs">{adaptivePolicy.adaptiveReason}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">RENDER SCALE</span>
              <span className="text-base font-bold text-emerald-400">{(adaptivePolicy.renderScale * 100).toFixed(0)}%</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">DYNAMIC SHADOWS</span>
              <span className={`text-base font-bold ${adaptivePolicy.dynamicShadowsEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                {adaptivePolicy.dynamicShadowsEnabled ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">PARTICLE DENSITY</span>
              <span className="text-base font-bold text-purple-400">{(adaptivePolicy.particleDensityScale * 100).toFixed(0)}%</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">FOVEATION SCALE</span>
              <span className="text-base font-bold text-cyan-400">{adaptivePolicy.foveatedRenderingScale}x</span>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 7: SPATIAL AUDIO */}
      {activeSubView === 'audio' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                Spatial Audio Intelligence & Web Audio API
              </span>
              <button
                onClick={handleUnlockAudio}
                className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                  audioUnlocked
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-amber-600 border-amber-500 text-black hover:bg-amber-500'
                }`}
              >
                {audioUnlocked ? 'Synthesize Pulse (523Hz)' : 'Unlock Audio Context'}
              </button>
            </div>
            <p className="text-slate-400 text-xs">
              Distance-based attenuation calculates real-time perceived decibel roll-off as operator moves around crystal sources.
            </p>
          </div>

          <div className="space-y-3">
            {spatialAudioIntelligence.getAllSources().map((src) => {
              const attenuatedVol = spatialAudioIntelligence.calculateAttenuatedVolume(src.id);
              return (
                <div key={src.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span className="font-bold text-slate-200">{src.name}</span>
                    <span className="text-[10px] text-cyan-400 font-bold">
                      Perceived Volume: {Math.round(attenuatedVol * 100)}%
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span>Position: [{src.position.join(', ')}]</span>
                    <span>Max Distance: {src.maxDistance}m</span>
                    <span>Rolloff Factor: {src.rolloffFactor}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBVIEW 8: XR COMPATIBILITY */}
      {activeSubView === 'compatibility' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Glasses className="w-4 h-4 text-cyan-400" />
                WebXR Hardware Probe & Capability Matrix
              </span>
              <button
                onClick={handleRequestVR}
                disabled={!xrCaps.immersiveVRSupported}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded text-xs transition-colors"
              >
                Enter Immersive VR
              </button>
            </div>
            <p className="text-slate-400 text-xs">
              Queries native WebXR Device API interfaces to determine headset type, reference space features, and controller availability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-cyan-300 text-xs uppercase border-b border-slate-800 pb-1">Browser XR Detection</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">WebXR Device API:</span>
                  <span className={xrCaps.isWebXRAvailable ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                    {xrCaps.isWebXRAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Immersive VR Mode:</span>
                  <span className={xrCaps.immersiveVRSupported ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    {xrCaps.immersiveVRSupported ? 'SUPPORTED' : 'UNSUPPORTED (DESKTOP MODE)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Detected Headset:</span>
                  <span className="text-cyan-300">{xrCaps.detectedHeadsetBrand || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Refresh Rate:</span>
                  <span className="text-slate-200">{xrCaps.maxRefreshRateHz} Hz</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-cyan-300 text-xs uppercase border-b border-slate-800 pb-1">Session Reference Space</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Space Type:</span>
                  <span className="text-purple-300 font-mono">{xrCaps.activeReferenceSpaceType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Session Status:</span>
                  <span className="text-emerald-400 font-bold">{xrCaps.sessionState}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 9: PERFORMANCE MONITOR */}
      {activeSubView === 'performance' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">DRAW CALLS</span>
              <span className="text-lg font-bold text-emerald-400">{telemetrySnapshot.currentMetrics.drawCalls}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">TRIANGLE COUNT</span>
              <span className="text-lg font-bold text-cyan-400">{telemetrySnapshot.currentMetrics.trianglesCount}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">CADENCE STABILITY</span>
              <span className="text-lg font-bold text-purple-400">{telemetrySnapshot.cadenceStabilityScore}%</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">PERFORMANCE HEALTH</span>
              <span className="text-lg font-bold text-emerald-400">{telemetrySnapshot.overallPerformanceHealth}</span>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 10: TELEMETRY HISTORY */}
      {activeSubView === 'telemetry_history' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-cyan-400" />
                Spatial Telemetry Provenance Records
              </span>
              <span className="text-[10px] text-slate-400">Total Samples: {telemetrySnapshot.history.length}</span>
            </div>
            <p className="text-slate-400 text-xs">
              Every sample is strictly verified and stamped with its authentic provenance tier to prevent simulated data contamination.
            </p>
          </div>

          <div className="space-y-2">
            {telemetrySnapshot.history.map((m, i) => (
              <div key={i} className="bg-slate-950/80 border border-slate-800 rounded p-2.5 text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-200">~{m.fps} FPS ({m.frameDeltaMs}ms delta)</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Draw calls: {m.drawCalls} // Triangles: {m.trianglesCount} // Objects: {m.spatialObjectsCount}
                  </span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  m.provenance === 'REAL_DEVICE_TELEMETRY'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                    : m.provenance === 'SIMULATED_TELEMETRY'
                    ? 'bg-amber-950 text-amber-400 border border-amber-600'
                    : 'bg-cyan-950 text-cyan-400 border border-cyan-600'
                }`}>
                  {m.provenance}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
