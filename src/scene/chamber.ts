import * as THREE from 'three';

export interface ChamberObject {
  pedestalPositions: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  update(time: number, delta: number): void;
  dispose(): void;
}

export function createChamber(scene: THREE.Scene, isSoftwareGl: boolean): ChamberObject {
  const group = new THREE.Group();
  group.name = 'Chamber';
  scene.add(group);

  // Pedestal world positions: arranged at 120-degree intervals around center console
  const radius = 4.2;
  const pedestalPositions: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
    new THREE.Vector3(Math.cos(-Math.PI / 6) * radius, 1.1, Math.sin(-Math.PI / 6) * radius), // Ruby: Right-front
    new THREE.Vector3(Math.cos(Math.PI / 2) * radius, 1.1, Math.sin(Math.PI / 2) * radius),   // Azure: Front-center
    new THREE.Vector3(Math.cos((7 * Math.PI) / 6) * radius, 1.1, Math.sin((7 * Math.PI) / 6) * radius), // Emerald: Left-front
  ];

  // 1. Procedural Chamber Deck Floor Texture
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 1024;
  floorCanvas.height = 1024;
  const fCtx = floorCanvas.getContext('2d')!;

  // Dark metallic base
  fCtx.fillStyle = '#0a0e17';
  fCtx.fillRect(0, 0, 1024, 1024);

  // Concentric sci-fi circuit circles
  fCtx.lineWidth = 3;
  fCtx.strokeStyle = 'rgba(56, 189, 248, 0.35)'; // Cyan conduit glow
  for (let r = 80; r <= 480; r += 80) {
    fCtx.beginPath();
    fCtx.arc(512, 512, r, 0, Math.PI * 2);
    fCtx.stroke();
  }

  // Radial grid lines
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    fCtx.beginPath();
    fCtx.moveTo(512 + Math.cos(angle) * 80, 512 + Math.sin(angle) * 80);
    fCtx.lineTo(512 + Math.cos(angle) * 500, 512 + Math.sin(angle) * 500);
    fCtx.stroke();
  }

  // Sci-fi tech markings & corner brackets
  fCtx.fillStyle = 'rgba(56, 189, 248, 0.7)';
  fCtx.font = '14px monospace';
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const x = 512 + Math.cos(angle) * 360;
    const y = 512 + Math.sin(angle) * 360;
    fCtx.fillText(`[ALIGN_NODE_0${i + 1}]`, x - 45, y);
  }

  const floorTex = new THREE.CanvasTexture(floorCanvas);
  floorTex.colorSpace = THREE.SRGBColorSpace;
  floorTex.wrapS = THREE.ClampToEdgeWrapping;
  floorTex.wrapT = THREE.ClampToEdgeWrapping;

  // Primary Platform Deck (Hexagonal Cylinder)
  const deckGeom = new THREE.CylinderGeometry(6.5, 7.2, 0.6, 6);
  const deckMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.35,
    metalness: 0.85,
  });
  const deckMesh = new THREE.Mesh(deckGeom, deckMat);
  deckMesh.position.y = -0.3;
  deckMesh.receiveShadow = !isSoftwareGl;
  group.add(deckMesh);

  // Outer Decorative Ring / Platform Rim
  const rimGeom = new THREE.TorusGeometry(6.6, 0.15, 16, 64);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.9,
    roughness: 0.2,
  });
  const rimMesh = new THREE.Mesh(rimGeom, rimMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = 0.02;
  group.add(rimMesh);

  // Glowing Outer Energy Boundary Rail
  const boundaryGeom = new THREE.TorusGeometry(6.8, 0.04, 8, 64);
  const boundaryMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.8,
  });
  const boundaryMesh = new THREE.Mesh(boundaryGeom, boundaryMat);
  boundaryMesh.rotation.x = Math.PI / 2;
  boundaryMesh.position.y = 0.05;
  group.add(boundaryMesh);

  // Sub-floor contact shadow disc
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d')!;
  const sGrad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 64);
  sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  sGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.4)');
  sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 128, 128);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowGeom = new THREE.PlaneGeometry(16, 16);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.75,
  });
  const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -0.62;
  group.add(shadowMesh);

  // 2. Observatory Pylons / Observation Arches framing space
  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.25,
  });
  const pylonGlowMat = new THREE.MeshBasicMaterial({
    color: 0x0ea5e9,
    wireframe: false,
  });

  const pylonAngles = [Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3, 0];
  const pylonGroup = new THREE.Group();

  pylonAngles.forEach((angle) => {
    const px = Math.cos(angle) * 6.3;
    const pz = Math.sin(angle) * 6.3;

    // Upright Spire
    const colGeom = new THREE.BoxGeometry(0.3, 3.2, 0.4);
    const colMesh = new THREE.Mesh(colGeom, pylonMat);
    colMesh.position.set(px, 1.4, pz);
    colMesh.lookAt(0, 1.4, 0);
    pylonGroup.add(colMesh);

    // Glowing conduit inset on each spire
    const lightStripGeom = new THREE.BoxGeometry(0.08, 2.8, 0.05);
    const lightStrip = new THREE.Mesh(lightStripGeom, pylonGlowMat);
    lightStrip.position.set(px * 0.96, 1.4, pz * 0.96);
    lightStrip.lookAt(0, 1.4, 0);
    pylonGroup.add(lightStrip);

    // Cantilever sensor head
    const headGeom = new THREE.ConeGeometry(0.25, 0.6, 4);
    const headMesh = new THREE.Mesh(headGeom, pylonMat);
    headMesh.position.set(px, 3.2, pz);
    headMesh.rotation.x = Math.PI;
    pylonGroup.add(headMesh);
  });
  group.add(pylonGroup);

  // 3. Floating Crystal Pedestals (3 Node Bases)
  const pedestalMeshes: THREE.Group[] = [];
  const pedestalColors = [0xef4444, 0x06b6d4, 0x10b981]; // Ruby, Azure, Emerald

  pedestalPositions.forEach((pos, idx) => {
    const pedGroup = new THREE.Group();
    pedGroup.position.set(pos.x, 0, pos.z);

    // Base collar
    const baseGeom = new THREE.CylinderGeometry(0.85, 0.95, 0.25, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.95,
      roughness: 0.15,
    });
    const baseMesh = new THREE.Mesh(baseGeom, baseMat);
    baseMesh.position.y = 0.125;
    pedGroup.add(baseMesh);

    // Floating containment ring
    const ringGeom = new THREE.TorusGeometry(0.7, 0.04, 8, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.2,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.35;
    pedGroup.add(ringMesh);

    // Active power emitter disc
    const emitGeom = new THREE.CylinderGeometry(0.45, 0.45, 0.04, 16);
    const emitMat = new THREE.MeshBasicMaterial({
      color: pedestalColors[idx],
      transparent: true,
      opacity: 0.7,
    });
    const emitMesh = new THREE.Mesh(emitGeom, emitMat);
    emitMesh.position.y = 0.26;
    pedGroup.add(emitMesh);

    // Upward target alignment reticle (floor projection)
    const reticleGeom = new THREE.RingGeometry(0.75, 0.85, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: pedestalColors[idx],
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const reticleMesh = new THREE.Mesh(reticleGeom, reticleMat);
    reticleMesh.rotation.x = -Math.PI / 2;
    reticleMesh.position.y = 0.28;
    pedGroup.add(reticleMesh);

    // Holographic Inscription Clue Plaque (Phase 3 Clue)
    const clueInfo = [
      { step: 'I', glyph: '⟁', label: 'STELLAR ORIGIN' },
      { step: 'II', glyph: '✧', label: 'HARMONIC BRIDGE' },
      { step: 'III', glyph: '⎔', label: 'PRISMATIC VECTOR' },
    ][idx];

    const clueCanvas = document.createElement('canvas');
    clueCanvas.width = 256;
    clueCanvas.height = 128;
    const cCtx = clueCanvas.getContext('2d')!;
    cCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    cCtx.fillRect(0, 0, 256, 128);
    cCtx.strokeStyle = idx === 0 ? '#ef4444' : idx === 1 ? '#06b6d4' : '#10b981';
    cCtx.lineWidth = 4;
    cCtx.strokeRect(4, 4, 248, 120);

    cCtx.fillStyle = '#ffffff';
    cCtx.font = 'bold 44px sans-serif';
    cCtx.textAlign = 'center';
    cCtx.fillText(clueInfo.glyph, 128, 54);

    cCtx.font = 'bold 16px monospace';
    cCtx.fillStyle = idx === 0 ? '#fca5a5' : idx === 1 ? '#67e8f9' : '#6ee7b7';
    cCtx.fillText(`CIPHER ${clueInfo.step}`, 128, 84);
    cCtx.font = '12px monospace';
    cCtx.fillText(clueInfo.label, 128, 108);

    const clueTex = new THREE.CanvasTexture(clueCanvas);
    clueTex.colorSpace = THREE.SRGBColorSpace;
    const plaqueGeom = new THREE.PlaneGeometry(0.8, 0.4);
    const plaqueMat = new THREE.MeshBasicMaterial({
      map: clueTex,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const plaqueMesh = new THREE.Mesh(plaqueGeom, plaqueMat);
    plaqueMesh.position.set(0, 0.55, 0.95);
    plaqueMesh.rotation.x = -0.35;
    pedGroup.add(plaqueMesh);

    pedestalMeshes.push(pedGroup);
    group.add(pedGroup);
  });

  // 4. Floating Chamber Energy Motes (Subtle particulate atmosphere)
  const moteCount = 60;
  const moteGeom = new THREE.BufferGeometry();
  const motePos = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    const r = Math.random() * 5.5;
    const a = Math.random() * Math.PI * 2;
    motePos[i * 3] = Math.cos(a) * r;
    motePos[i * 3 + 1] = 0.2 + Math.random() * 2.8;
    motePos[i * 3 + 2] = Math.sin(a) * r;
  }
  moteGeom.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 0.08,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });
  const motePoints = new THREE.Points(moteGeom, moteMat);
  group.add(motePoints);

  return {
    pedestalPositions,
    update(time: number, delta: number) {
      // Gentle floating animation for pedestal containment rings
      pedestalMeshes.forEach((ped, idx) => {
        const ring = ped.children[1] as THREE.Mesh;
        if (ring) {
          ring.position.y = 0.35 + Math.sin(time * 2 + idx) * 0.03;
          ring.rotation.z += delta * 0.4 * (idx % 2 === 0 ? 1 : -1);
        }
      });

      // Slowly drift motes
      const positions = moteGeom.attributes.position.array as Float32Array;
      for (let i = 0; i < moteCount; i++) {
        positions[i * 3 + 1] += Math.sin(time + i) * 0.002;
        if (positions[i * 3 + 1] > 3.0) positions[i * 3 + 1] = 0.2;
      }
      moteGeom.attributes.position.needsUpdate = true;
    },
    dispose() {
      deckGeom.dispose();
      deckMat.dispose();
      floorTex.dispose();
      rimGeom.dispose();
      rimMat.dispose();
      boundaryGeom.dispose();
      boundaryMat.dispose();
      shadowGeom.dispose();
      shadowMat.dispose();
      shadowTex.dispose();
      moteGeom.dispose();
      moteMat.dispose();
      scene.remove(group);
    },
  };
}
