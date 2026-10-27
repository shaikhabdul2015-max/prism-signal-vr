import * as THREE from 'three';

export interface HolographicConsoleObject {
  group: THREE.Group;
  emitterPosition: THREE.Vector3;
  raycastTarget: THREE.Object3D;
  isBeamActive: boolean;
  setBeamActive(active: boolean): void;
  toggleBeamActive(): boolean;
  setDisplayedGlyphs(glyphs: string[]): void;
  update(time: number, delta: number, signalCoherence: number): void;
  dispose(): void;
}

export function createHolographicConsole(scene: THREE.Scene, isSoftwareGl: boolean): HolographicConsoleObject {
  const group = new THREE.Group();
  group.name = 'HolographicConsole';
  group.position.set(0, 0, 0);
  scene.add(group);

  let isBeamActive = true;

  // Emitter world tip position (where carrier laser beams originate)
  const emitterPosition = new THREE.Vector3(0, 1.45, 0);

  // 1. Console Pedestal Base (Composite 5-part structure)
  const pedestalBaseGeom = new THREE.CylinderGeometry(1.2, 1.4, 0.4, 8);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.92,
    roughness: 0.18,
  });
  const pedestalBase = new THREE.Mesh(pedestalBaseGeom, baseMat);
  pedestalBase.position.y = 0.2;
  pedestalBase.receiveShadow = !isSoftwareGl;
  group.add(pedestalBase);

  // Mid Pillar
  const midGeom = new THREE.CylinderGeometry(0.75, 0.95, 0.5, 8);
  const midMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.88,
    roughness: 0.22,
  });
  const midMesh = new THREE.Mesh(midGeom, midMat);
  midMesh.position.y = 0.65;
  group.add(midMesh);

  // Power Conduit Core Glass Ring
  const coreGlassGeom = new THREE.CylinderGeometry(0.6, 0.6, 0.25, 24);
  const coreGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
    roughness: 0.1,
    metalness: 0.1,
    transmission: isSoftwareGl ? 0 : 0.85,
    transparent: true,
    opacity: isSoftwareGl ? 0.45 : 0.9,
    ior: 1.5,
  });
  const coreGlassMesh = new THREE.Mesh(coreGlassGeom, coreGlassMat);
  coreGlassMesh.position.y = 1.0;
  group.add(coreGlassMesh);

  // Top Collar Cap
  const topCollarGeom = new THREE.CylinderGeometry(0.85, 0.7, 0.15, 8);
  const topCollar = new THREE.Mesh(topCollarGeom, baseMat);
  topCollar.position.y = 1.2;
  group.add(topCollar);

  // Focus Crystal Emitter Tip (Interactive Light Source Target)
  const tipGeom = new THREE.OctahedronGeometry(0.25, 0);
  const tipMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xff0044,
    emissiveIntensity: 1.4,
    roughness: 0.1,
    metalness: 0.8,
  });
  const tipMesh = new THREE.Mesh(tipGeom, tipMat);
  tipMesh.position.y = 1.45;
  tipMesh.userData = { isConsoleEmitter: true };
  group.add(tipMesh);

  // Light Source Emitter Aura / Corona
  const coronaGeom = new THREE.SphereGeometry(0.38, 16, 16);
  const coronaMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
  const coronaMesh = new THREE.Mesh(coronaGeom, coronaMat);
  coronaMesh.position.y = 1.45;
  group.add(coronaMesh);

  // 2. Holographic Projection Rings
  // Ring 1 (Horizontal equator)
  const holoRing1Geom = new THREE.TorusGeometry(1.05, 0.015, 8, 48);
  const holoRingMat1 = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
  });
  const holoRing1 = new THREE.Mesh(holoRing1Geom, holoRingMat1);
  holoRing1.rotation.x = Math.PI / 2;
  holoRing1.position.y = 1.45;
  group.add(holoRing1);

  // Ring 2 (Tilted pitch)
  const holoRing2Geom = new THREE.TorusGeometry(1.25, 0.012, 8, 48);
  const holoRingMat2 = new THREE.MeshBasicMaterial({
    color: 0x818cf8,
    transparent: true,
    opacity: 0.75,
  });
  const holoRing2 = new THREE.Mesh(holoRing2Geom, holoRingMat2);
  holoRing2.rotation.x = Math.PI / 3;
  holoRing2.position.y = 1.45;
  group.add(holoRing2);

  // Ring 3 (Outer planetary gimbal)
  const holoRing3Geom = new THREE.TorusGeometry(1.45, 0.01, 8, 48);
  const holoRingMat3 = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.65,
  });
  const holoRing3 = new THREE.Mesh(holoRing3Geom, holoRingMat3);
  holoRing3.rotation.z = Math.PI / 4;
  holoRing3.position.y = 1.45;
  group.add(holoRing3);

  // 3. Floating Holographic Data Waveform Rings
  const waveCanvas = document.createElement('canvas');
  waveCanvas.width = 512;
  waveCanvas.height = 128;
  const wCtx = waveCanvas.getContext('2d')!;
  const waveTexture = new THREE.CanvasTexture(waveCanvas);
  waveTexture.colorSpace = THREE.SRGBColorSpace;

  const waveCylinderGeom = new THREE.CylinderGeometry(1.15, 1.15, 0.35, 32, 1, true);
  const waveCylinderMat = new THREE.MeshBasicMaterial({
    map: waveTexture,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.85,
  });
  const waveCylinder = new THREE.Mesh(waveCylinderGeom, waveCylinderMat);
  waveCylinder.position.y = 1.85;
  group.add(waveCylinder);

  // Point Light at Console Core
  const consoleLight = new THREE.PointLight(0xef4444, 2.0, 7);
  consoleLight.position.set(0, 1.5, 0);
  group.add(consoleLight);

  let currentGlyphs: string[] = [];

  return {
    group,
    emitterPosition,
    raycastTarget: tipMesh,
    isBeamActive,
    setBeamActive(active: boolean) {
      isBeamActive = active;
    },
    toggleBeamActive() {
      isBeamActive = !isBeamActive;
      return isBeamActive;
    },
    setDisplayedGlyphs(glyphs: string[]) {
      currentGlyphs = glyphs;
    },
    update(time: number, delta: number, signalCoherence: number) {
      // Rotate gimbal rings
      holoRing1.rotation.z += delta * (isBeamActive ? 0.6 : 0.15);
      holoRing2.rotation.y += delta * (isBeamActive ? 0.8 : 0.2);
      holoRing3.rotation.x += delta * (isBeamActive ? 0.5 : 0.1);

      // Pulse emitter tip
      tipMesh.rotation.y += delta * (isBeamActive ? 2.0 : 0.5);
      tipMesh.rotation.x = Math.sin(time * 2) * 0.2;

      if (isBeamActive) {
        const pulse = 1.2 + Math.sin(time * 5) * 0.3 + (signalCoherence / 100) * 0.5;
        tipMat.emissiveIntensity = pulse * 1.5;
        coronaMat.opacity = 0.35 + Math.sin(time * 6) * 0.15;
        consoleLight.intensity = 2.0 + (signalCoherence / 100) * 1.0;
        consoleLight.color.setHex(signalCoherence > 90 ? 0x10b981 : 0xef4444);
        tipMat.color.setHex(signalCoherence > 90 ? 0x10b981 : 0xef4444);
        tipMat.emissive.setHex(signalCoherence > 90 ? 0x10b981 : 0xff0044);
      } else {
        tipMat.emissiveIntensity = 0.2;
        coronaMat.opacity = 0.05;
        consoleLight.intensity = 0.4;
      }

      // Redraw alien waveform canvas
      wCtx.clearRect(0, 0, 512, 128);
      wCtx.fillStyle = 'rgba(14, 165, 233, 0.08)';
      wCtx.fillRect(0, 0, 512, 128);

      wCtx.lineWidth = 2.5;
      wCtx.strokeStyle = !isBeamActive
        ? '#64748b'
        : signalCoherence >= 100
        ? '#10b981'
        : '#06b6d4';

      wCtx.beginPath();
      for (let x = 0; x < 512; x += 4) {
        const freq1 = Math.sin((x * 0.05) + (time * 5));
        const freq2 = Math.cos((x * 0.12) - (time * 3)) * (1 - signalCoherence / 120);
        const y = 64 + (isBeamActive ? (freq1 + freq2) * (18 + (signalCoherence / 100) * 12) : 0);
        if (x === 0) wCtx.moveTo(x, y);
        else wCtx.lineTo(x, y);
      }
      wCtx.stroke();

      // Signal status text on holo-cylinder
      wCtx.fillStyle = '#ffffff';
      wCtx.font = 'bold 12px monospace';
      const statusText = !isBeamActive
        ? 'LIGHT SOURCE: OFFLINE'
        : signalCoherence >= 100
        ? 'TARGET RECEIVER REACHED // 100%'
        : `BEAM COHERENCE: ${Math.round(signalCoherence)}%`;
      wCtx.fillText(statusText, 120, 24);

      // Render Alien Symbols Sequence on Holographic Cylinder (Phase 3)
      if (currentGlyphs.length > 0 || signalCoherence >= 100) {
        wCtx.fillStyle = '#67e8f9';
        wCtx.font = 'bold 22px sans-serif';
        wCtx.textAlign = 'center';
        const displaySlots = [0, 1, 2, 3];
        displaySlots.forEach((slotIdx) => {
          const x = 176 + slotIdx * 54;
          const glyph = currentGlyphs[slotIdx] || '·';
          wCtx.fillText(glyph, x, 72);
          wCtx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          wCtx.lineWidth = 1.5;
          wCtx.strokeRect(x - 20, 50, 40, 32);
        });
        wCtx.font = '10px monospace';
        wCtx.fillStyle = '#38bdf8';
        wCtx.fillText('ALIEN CIPHER STREAM', 256, 102);
      }

      waveTexture.needsUpdate = true;

      // Slow bob of hologram
      waveCylinder.position.y = 1.85 + Math.sin(time * 2.5) * 0.04;
      waveCylinder.rotation.y += delta * 0.2;
    },
    dispose() {
      pedestalBaseGeom.dispose();
      baseMat.dispose();
      midGeom.dispose();
      midMat.dispose();
      coreGlassGeom.dispose();
      coreGlassMat.dispose();
      topCollarGeom.dispose();
      tipGeom.dispose();
      tipMat.dispose();
      coronaGeom.dispose();
      coronaMat.dispose();
      holoRing1Geom.dispose();
      holoRingMat1.dispose();
      holoRing2Geom.dispose();
      holoRingMat2.dispose();
      holoRing3Geom.dispose();
      holoRingMat3.dispose();
      waveCanvas.remove();
      waveTexture.dispose();
      waveCylinderGeom.dispose();
      waveCylinderMat.dispose();
      scene.remove(group);
    },
  };
}
