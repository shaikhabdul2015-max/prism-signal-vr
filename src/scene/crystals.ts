import * as THREE from 'three';
import { CrystalData, CrystalId } from '../types/game';

export interface CrystalMeshInstance {
  data: CrystalData;
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  innerMesh: THREE.Mesh;
  haloMesh: THREE.Mesh;
  light: THREE.PointLight;
  selectionRing: THREE.Mesh;
  compassRing: THREE.Mesh;
  targetReticle: THREE.Mesh;
  facetSparkMesh: THREE.Mesh;
  targetRotationY: number;
  currentRotationY: number;
  targetPosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
}

export interface CrystalsManager {
  instances: Map<CrystalId, CrystalMeshInstance>;
  raycastTargets: THREE.Object3D[];
  setSelection(id: CrystalId | null): void;
  rotateCrystal(id: CrystalId, deltaAngle: number): void;
  setCrystalRotation(id: CrystalId, angle: number): void;
  repositionCrystal(id: CrystalId, newSlot: number, newPos: THREE.Vector3): void;
  update(time: number, delta: number): void;
  dispose(): void;
}

export function createCrystals(
  scene: THREE.Scene,
  initialData: CrystalData[],
  isSoftwareGl: boolean
): CrystalsManager {
  const instances = new Map<CrystalId, CrystalMeshInstance>();
  const raycastTargets: THREE.Object3D[] = [];
  const crystalsMasterGroup = new THREE.Group();
  crystalsMasterGroup.name = 'CrystalsMaster';
  scene.add(crystalsMasterGroup);

  // Procedural canvas texture for holographic compass ring
  const compassCanvas = document.createElement('canvas');
  compassCanvas.width = 256;
  compassCanvas.height = 256;
  const cCtx = compassCanvas.getContext('2d')!;
  cCtx.clearRect(0, 0, 256, 256);
  cCtx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
  cCtx.lineWidth = 2;
  cCtx.beginPath();
  cCtx.arc(128, 128, 115, 0, Math.PI * 2);
  cCtx.stroke();
  for (let a = 0; a < 360; a += 15) {
    const rad = (a * Math.PI) / 180;
    const isMajor = a % 45 === 0;
    const len = isMajor ? 14 : 7;
    const r1 = 115;
    const r2 = 115 - len;
    cCtx.beginPath();
    cCtx.moveTo(128 + Math.cos(rad) * r1, 128 + Math.sin(rad) * r1);
    cCtx.lineTo(128 + Math.cos(rad) * r2, 128 + Math.sin(rad) * r2);
    cCtx.stroke();
  }
  const compassTex = new THREE.CanvasTexture(compassCanvas);
  compassTex.colorSpace = THREE.SRGBColorSpace;

  initialData.forEach((data) => {
    const crystalGroup = new THREE.Group();
    crystalGroup.name = `Crystal_${data.id}`;
    crystalGroup.position.set(data.defaultPosition[0], data.defaultPosition[1], data.defaultPosition[2]);

    // 1. Faceted Multi-Part Crystal Spire
    const outerGeom = new THREE.OctahedronGeometry(0.56, 1);
    outerGeom.scale(0.8, 1.48, 0.8);

    const outerMat = new THREE.MeshPhysicalMaterial({
      color: data.colorNumber,
      emissive: data.colorNumber,
      emissiveIntensity: 0.38,
      roughness: 0.08,
      metalness: 0.16,
      transmission: isSoftwareGl ? 0 : 0.92,
      transparent: true,
      opacity: isSoftwareGl ? 0.65 : 0.95,
      ior: 2.18,
      thickness: 1.4,
      attenuationColor: new THREE.Color(data.colorNumber),
      attenuationDistance: 0.75,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
    const coreMesh = new THREE.Mesh(outerGeom, outerMat);
    coreMesh.castShadow = !isSoftwareGl;
    coreMesh.userData = { crystalId: data.id };
    crystalGroup.add(coreMesh);
    raycastTargets.push(coreMesh);

    // 2. Inner Glowing Refraction Core
    const innerGeom = new THREE.OctahedronGeometry(0.24, 0);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: false,
    });
    const innerMesh = new THREE.Mesh(innerGeom, innerMat);
    crystalGroup.add(innerMesh);

    // 3. Floating Halo / Glow Aura
    const haloGeom = new THREE.SphereGeometry(0.72, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: data.colorNumber,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const haloMesh = new THREE.Mesh(haloGeom, haloMat);
    crystalGroup.add(haloMesh);

    // 4. Orbiting Geometric Containment Brackets
    const bracketGeom = new THREE.TorusGeometry(0.78, 0.022, 6, 28);
    const bracketMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.95,
      roughness: 0.15,
    });
    const bracket1 = new THREE.Mesh(bracketGeom, bracketMat);
    bracket1.rotation.x = Math.PI / 4;
    bracket1.name = 'bracket1';
    crystalGroup.add(bracket1);

    const bracket2 = new THREE.Mesh(bracketGeom, bracketMat);
    bracket2.rotation.y = Math.PI / 4;
    bracket2.name = 'bracket2';
    crystalGroup.add(bracket2);

    // 5. Selection Ring Indicator
    const selectRingGeom = new THREE.TorusGeometry(0.92, 0.028, 8, 36);
    const selectRingMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const selectionRing = new THREE.Mesh(selectRingGeom, selectRingMat);
    selectionRing.rotation.x = Math.PI / 2;
    selectionRing.position.y = -0.05;
    crystalGroup.add(selectionRing);

    // 6. Holographic Degree Compass Ring
    const compassGeom = new THREE.PlaneGeometry(2.1, 2.1);
    const compassMat = new THREE.MeshBasicMaterial({
      map: compassTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const compassRing = new THREE.Mesh(compassGeom, compassMat);
    compassRing.rotation.x = -Math.PI / 2;
    compassRing.position.y = -0.72;
    crystalGroup.add(compassRing);

    // 7. Target Alignment Arrow / Reticle
    const reticleGeom = new THREE.ConeGeometry(0.09, 0.28, 3);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: data.colorNumber,
      transparent: true,
      opacity: 0.75,
    });
    const targetReticle = new THREE.Mesh(reticleGeom, reticleMat);
    targetReticle.rotation.x = Math.PI / 2;
    targetReticle.position.set(0, -0.65, 0.72);
    crystalGroup.add(targetReticle);

    // 8. Dynamic Local Point Light
    const light = new THREE.PointLight(data.colorNumber, 1.8, 5.5);
    light.position.set(0, 0, 0);
    crystalGroup.add(light);

    // 9. Facet Impact Spark Disc
    const facetSparkGeom = new THREE.RingGeometry(0.03, 0.26, 16);
    const facetSparkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const facetSparkMesh = new THREE.Mesh(facetSparkGeom, facetSparkMat);
    facetSparkMesh.position.set(0, 0.1, 0.48);
    crystalGroup.add(facetSparkMesh);

    crystalsMasterGroup.add(crystalGroup);

    instances.set(data.id, {
      data,
      group: crystalGroup,
      coreMesh,
      innerMesh,
      haloMesh,
      light,
      selectionRing,
      compassRing,
      targetReticle,
      facetSparkMesh,
      targetRotationY: data.rotationY,
      currentRotationY: data.rotationY,
      targetPosition: new THREE.Vector3(...data.currentPosition),
      currentPosition: new THREE.Vector3(...data.currentPosition),
    });
  });

  return {
    instances,
    raycastTargets,
    setSelection(selectedId: CrystalId | null) {
      instances.forEach((inst, id) => {
        const isSelected = id === selectedId;
        const ringMat = inst.selectionRing.material as THREE.MeshBasicMaterial;
        const compMat = inst.compassRing.material as THREE.MeshBasicMaterial;
        ringMat.opacity = isSelected ? 0.95 : 0;
        compMat.opacity = isSelected ? 0.8 : 0;
      });
    },
    rotateCrystal(id: CrystalId, deltaAngle: number) {
      const inst = instances.get(id);
      if (inst) {
        inst.targetRotationY = (inst.targetRotationY + deltaAngle) % (Math.PI * 2);
        if (inst.targetRotationY < 0) inst.targetRotationY += Math.PI * 2;
      }
    },
    setCrystalRotation(id: CrystalId, angle: number) {
      const inst = instances.get(id);
      if (inst) {
        inst.targetRotationY = angle % (Math.PI * 2);
        if (inst.targetRotationY < 0) inst.targetRotationY += Math.PI * 2;
      }
    },
    repositionCrystal(id: CrystalId, newSlot: number, newPos: THREE.Vector3) {
      const inst = instances.get(id);
      if (inst) {
        inst.data.pedestalSlot = newSlot;
        inst.targetPosition.copy(newPos);
      }
    },
    update(time: number, delta: number) {
      instances.forEach((inst, id) => {
        // Smooth exponential damping for rotation
        const diff = THREE.MathUtils.euclideanModulo(inst.targetRotationY - inst.currentRotationY + Math.PI, Math.PI * 2) - Math.PI;
        inst.currentRotationY += diff * Math.min(1, delta * 9);
        inst.group.rotation.y = inst.currentRotationY;

        // Smooth position interpolation
        inst.currentPosition.lerp(inst.targetPosition, Math.min(1, delta * 6));
        inst.group.position.x = inst.currentPosition.x;
        inst.group.position.z = inst.currentPosition.z;

        // Floating hover harmonic bobbing
        const phase = id === 'ruby' ? 0 : (id === 'emerald' ? 2 : 4);
        inst.group.position.y = inst.currentPosition.y + Math.sin(time * 2 + phase) * 0.07;

        // Internal core counter-rotation
        inst.coreMesh.rotation.y = time * 0.22;
        inst.coreMesh.rotation.z = Math.sin(time * 1.5) * 0.07;
        inst.innerMesh.rotation.y = -time * 0.5;

        // Orbiting bracket rotation
        const spinMultiplier = inst.data.isReceivingLight ? 1.8 : 0.8;
        const b1 = inst.group.getObjectByName('bracket1');
        const b2 = inst.group.getObjectByName('bracket2');
        if (b1) b1.rotation.z = time * spinMultiplier;
        if (b2) b2.rotation.x = -time * spinMultiplier * 0.75;

        // Spin selection ring if active
        if ((inst.selectionRing.material as THREE.MeshBasicMaterial).opacity > 0) {
          inst.selectionRing.rotation.z = time * 2.2;
          inst.compassRing.rotation.z = -time * 0.3;
        }

        // Pulse resonance & beam excitation
        const coreMat = inst.coreMesh.material as THREE.MeshPhysicalMaterial;
        const sparkMat = inst.facetSparkMesh.material as THREE.MeshBasicMaterial;
        const reticleMat = inst.targetReticle.material as THREE.MeshBasicMaterial;

        if (inst.data.isReceivingLight) {
          const beamPulse = Math.sin(time * 8) * 0.2;
          coreMat.emissiveIntensity = 0.88 + beamPulse + (inst.data.isReflectingToTarget ? 0.6 : 0.2);
          inst.light.intensity = 2.6 + (inst.data.isReflectingToTarget ? 0.9 : 0);
          sparkMat.opacity = 0.75 + Math.sin(time * 12) * 0.25;
          inst.facetSparkMesh.scale.setScalar(1.0 + Math.sin(time * 10) * 0.25);
        } else {
          coreMat.emissiveIntensity = 0.32;
          inst.light.intensity = 1.0;
          sparkMat.opacity = 0;
        }

        // Target reticle visual alignment feedback
        if (inst.data.isReflectingToTarget) {
          reticleMat.color.setHex(0x10b981); // Emerald lock
          reticleMat.opacity = 0.95;
        } else {
          reticleMat.color.setHex(inst.data.colorNumber);
          reticleMat.opacity = 0.6;
        }
      });
    },
    dispose() {
      compassTex.dispose();
      compassCanvas.remove();
      instances.forEach((inst) => {
        inst.coreMesh.geometry.dispose();
        (inst.coreMesh.material as THREE.Material).dispose();
        inst.innerMesh.geometry.dispose();
        (inst.innerMesh.material as THREE.Material).dispose();
        inst.haloMesh.geometry.dispose();
        (inst.haloMesh.material as THREE.Material).dispose();
        inst.selectionRing.geometry.dispose();
        (inst.selectionRing.material as THREE.Material).dispose();
        inst.compassRing.geometry.dispose();
        (inst.compassRing.material as THREE.Material).dispose();
        inst.targetReticle.geometry.dispose();
        (inst.targetReticle.material as THREE.Material).dispose();
        inst.facetSparkMesh.geometry.dispose();
        (inst.facetSparkMesh.material as THREE.Material).dispose();
      });
      scene.remove(crystalsMasterGroup);
    },
  };
}
