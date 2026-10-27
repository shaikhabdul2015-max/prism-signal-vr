import * as THREE from 'three';

export interface TargetReceiverObject {
  group: THREE.Group;
  targetPosition: THREE.Vector3;
  update(time: number, delta: number, isHit: boolean): void;
  dispose(): void;
}

export function createTargetReceiver(scene: THREE.Scene, isSoftwareGl: boolean): TargetReceiverObject {
  const group = new THREE.Group();
  group.name = 'TargetReceiver';

  // Positioned on the chamber perimeter north spire overlooking space
  const targetPosition = new THREE.Vector3(0, 1.6, -5.8);
  group.position.copy(targetPosition);
  scene.add(group);

  // 1. Heavy Pedestal Anchor Mount
  const mountGeom = new THREE.CylinderGeometry(0.72, 0.95, 0.42, 8);
  const mountMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.92,
    roughness: 0.18,
  });
  const mountMesh = new THREE.Mesh(mountGeom, mountMat);
  mountMesh.rotation.x = Math.PI / 2;
  mountMesh.position.z = -0.25;
  group.add(mountMesh);

  // 2. Parabolic Outer Collector Ring
  const dishGeom = new THREE.TorusGeometry(0.88, 0.085, 12, 36);
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.95,
    roughness: 0.14,
  });
  const dishMesh = new THREE.Mesh(dishGeom, dishMat);
  group.add(dishMesh);

  // 3. Status Conduit Ring (Changes color between offline amber and locked emerald)
  const statusRingGeom = new THREE.TorusGeometry(0.74, 0.035, 8, 36);
  const statusRingMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b, // Amber standby
    transparent: true,
    opacity: 0.85,
  });
  const statusRing = new THREE.Mesh(statusRingGeom, statusRingMat);
  group.add(statusRing);

  // 4. Central Optical Focusing Prism / Receptor Core
  const lensGeom = new THREE.SphereGeometry(0.36, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.45,
    roughness: 0.04,
    metalness: 0.12,
    transmission: isSoftwareGl ? 0 : 0.92,
    transparent: true,
    opacity: isSoftwareGl ? 0.6 : 0.95,
    ior: 1.65,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  const lensMesh = new THREE.Mesh(lensGeom, lensMat);
  lensMesh.rotation.x = -Math.PI / 2;
  group.add(lensMesh);

  // 5. Targeting Reticle Crosshair
  const reticleCanvas = document.createElement('canvas');
  reticleCanvas.width = 256;
  reticleCanvas.height = 256;
  const rCtx = reticleCanvas.getContext('2d')!;

  rCtx.clearRect(0, 0, 256, 256);
  rCtx.strokeStyle = '#38bdf8';
  rCtx.lineWidth = 4;
  rCtx.beginPath();
  rCtx.arc(128, 128, 110, 0, Math.PI * 2);
  rCtx.stroke();

  // Crosshair notches
  rCtx.lineWidth = 6;
  rCtx.beginPath();
  rCtx.moveTo(128, 8); rCtx.lineTo(128, 48);
  rCtx.moveTo(128, 208); rCtx.lineTo(128, 248);
  rCtx.moveTo(8, 128); rCtx.lineTo(48, 128);
  rCtx.moveTo(208, 128); rCtx.lineTo(248, 128);
  rCtx.stroke();

  rCtx.fillStyle = '#38bdf8';
  rCtx.font = 'bold 20px monospace';
  rCtx.textAlign = 'center';
  rCtx.fillText('TARGET RECEIVER', 128, 115);
  rCtx.fillText('BEACON NODE 01', 128, 145);

  const reticleTex = new THREE.CanvasTexture(reticleCanvas);
  reticleTex.colorSpace = THREE.SRGBColorSpace;

  const reticleGeom = new THREE.PlaneGeometry(1.65, 1.65);
  const reticleMat = new THREE.MeshBasicMaterial({
    map: reticleTex,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const reticleMesh = new THREE.Mesh(reticleGeom, reticleMat);
  reticleMesh.position.z = 0.08;
  group.add(reticleMesh);

  // Inscribed Cipher IV Clue Plaque
  const clueCanvas = document.createElement('canvas');
  clueCanvas.width = 256;
  clueCanvas.height = 128;
  const cCtx = clueCanvas.getContext('2d')!;
  cCtx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  cCtx.fillRect(0, 0, 256, 128);
  cCtx.strokeStyle = '#c084fc';
  cCtx.lineWidth = 4;
  cCtx.strokeRect(4, 4, 248, 120);

  cCtx.fillStyle = '#ffffff';
  cCtx.font = 'bold 44px sans-serif';
  cCtx.textAlign = 'center';
  cCtx.fillText('◬', 128, 54);

  cCtx.font = 'bold 16px monospace';
  cCtx.fillStyle = '#e9d5ff';
  cCtx.fillText('CIPHER IV', 128, 84);
  cCtx.font = '12px monospace';
  cCtx.fillText('COSMIC HORIZON', 128, 108);

  const clueTex = new THREE.CanvasTexture(clueCanvas);
  clueTex.colorSpace = THREE.SRGBColorSpace;
  const plaqueGeom = new THREE.PlaneGeometry(0.85, 0.42);
  const plaqueMat = new THREE.MeshBasicMaterial({
    map: clueTex,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  const plaqueMesh = new THREE.Mesh(plaqueGeom, plaqueMat);
  plaqueMesh.position.set(0, -0.92, 0.2);
  group.add(plaqueMesh);

  // 6. Rotating Mechanical Iris Blades
  const bladeGroup = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const bladeGeom = new THREE.ConeGeometry(0.12, 0.48, 3);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.9,
      roughness: 0.2,
    });
    const blade = new THREE.Mesh(bladeGeom, bladeMat);
    blade.position.set(Math.cos(angle) * 0.46, Math.sin(angle) * 0.46, 0.05);
    blade.rotation.z = angle + Math.PI / 2;
    bladeGroup.add(blade);
  }
  group.add(bladeGroup);

  // 7. Dynamic Local Point Light & Impact Flare
  const targetLight = new THREE.PointLight(0xf59e0b, 0.8, 5);
  targetLight.position.set(0, 0, 0.35);
  group.add(targetLight);

  // Impact flare ring
  const flareGeom = new THREE.RingGeometry(0.05, 0.6, 32);
  const flareMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const flareMesh = new THREE.Mesh(flareGeom, flareMat);
  flareMesh.position.z = 0.12;
  group.add(flareMesh);

  // Phase 7: Expanding Quantum Lock Shockwave Ring
  const shockwaveGeom = new THREE.RingGeometry(0.5, 0.58, 36);
  const shockwaveMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const shockwaveMesh = new THREE.Mesh(shockwaveGeom, shockwaveMat);
  shockwaveMesh.position.z = 0.14;
  group.add(shockwaveMesh);

  // 8. Vertical Sky Beacon Column
  const beaconPillarGeom = new THREE.CylinderGeometry(0.12, 0.32, 80, 16, 1, true);
  const beaconPillarMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beaconPillar = new THREE.Mesh(beaconPillarGeom, beaconPillarMat);
  beaconPillar.position.set(0, 40, 0);
  group.add(beaconPillar);

  // Orient group to face towards center console
  group.lookAt(0, 1.45, 0);

  let shockwaveScale = 1.0;

  return {
    group,
    targetPosition,
    update(time: number, delta: number, isHit: boolean) {
      // Rotate iris blades
      bladeGroup.rotation.z += delta * (isHit ? 2.8 : 0.6);

      // Pulse reticle
      reticleMesh.rotation.z = Math.sin(time * 0.5) * 0.05;

      if (isHit) {
        // Active locked state: brilliant emerald / cyan illumination
        statusRingMat.color.setHex(0x10b981);
        lensMat.emissive.setHex(0x10b981);
        lensMat.emissiveIntensity = 1.8 + Math.sin(time * 6) * 0.4;
        targetLight.color.setHex(0x10b981);
        targetLight.intensity = 3.2 + Math.sin(time * 8) * 0.6;

        flareMat.opacity = 0.8 + Math.sin(time * 10) * 0.2;
        flareMesh.scale.setScalar(1 + Math.sin(time * 8) * 0.15);

        // Phase 7: Expanding shockwave pulse
        shockwaveScale += delta * 1.8;
        if (shockwaveScale > 2.8) shockwaveScale = 0.8;
        shockwaveMesh.scale.setScalar(shockwaveScale);
        shockwaveMat.opacity = Math.max(0, (2.8 - shockwaveScale) / 2.0) * 0.75;

        // Sky beacon column fires
        beaconPillarMat.opacity = 0.88 + Math.sin(time * 4) * 0.12;
        beaconPillar.rotation.y += delta * 0.85;
      } else {
        // Idle standby state: subtle amber glow
        statusRingMat.color.setHex(0xf59e0b);
        lensMat.emissive.setHex(0x0284c7);
        lensMat.emissiveIntensity = 0.35 + Math.sin(time * 2) * 0.15;
        targetLight.color.setHex(0xf59e0b);
        targetLight.intensity = 0.75;

        flareMat.opacity = 0;
        shockwaveMat.opacity = 0;
        shockwaveScale = 1.0;
        beaconPillarMat.opacity = 0;
      }
    },
    dispose() {
      mountGeom.dispose();
      mountMat.dispose();
      dishGeom.dispose();
      dishMat.dispose();
      statusRingGeom.dispose();
      statusRingMat.dispose();
      lensGeom.dispose();
      lensMat.dispose();
      reticleCanvas.remove();
      reticleTex.dispose();
      reticleGeom.dispose();
      reticleMat.dispose();
      clueCanvas.remove();
      clueTex.dispose();
      plaqueGeom.dispose();
      plaqueMat.dispose();
      flareGeom.dispose();
      flareMat.dispose();
      shockwaveGeom.dispose();
      shockwaveMat.dispose();
      beaconPillarGeom.dispose();
      beaconPillarMat.dispose();
      scene.remove(group);
    },
  };
}
