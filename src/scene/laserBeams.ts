import * as THREE from 'three';
import { BeamSegment } from '../types/game';

export interface LaserSystem {
  group: THREE.Group;
  update(time: number, delta: number, segments: BeamSegment[], isTargetHit: boolean): void;
  dispose(): void;
}

export function createLaserBeams(scene: THREE.Scene): LaserSystem {
  const group = new THREE.Group();
  group.name = 'LaserBeamsSystem';
  scene.add(group);

  // 1. Procedural beam glow canvas texture with energy pulses
  const beamCanvas = document.createElement('canvas');
  beamCanvas.width = 128;
  beamCanvas.height = 512;
  const bCtx = beamCanvas.getContext('2d')!;

  const bGrad = bCtx.createLinearGradient(0, 0, 128, 0);
  bGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  bGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.2)');
  bGrad.addColorStop(0.42, 'rgba(255, 255, 255, 0.7)');
  bGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
  bGrad.addColorStop(0.58, 'rgba(255, 255, 255, 0.7)');
  bGrad.addColorStop(0.75, 'rgba(255, 255, 255, 0.2)');
  bGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  bCtx.fillStyle = bGrad;
  bCtx.fillRect(0, 0, 128, 512);

  // Add subtle periodic chevron energy patterns along the beam length
  bCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  for (let y = 0; y < 512; y += 32) {
    bCtx.beginPath();
    bCtx.moveTo(64, y);
    bCtx.lineTo(52, y + 14);
    bCtx.lineTo(64, y + 10);
    bCtx.lineTo(76, y + 14);
    bCtx.closePath();
    bCtx.fill();
  }

  const beamTex = new THREE.CanvasTexture(beamCanvas);
  beamTex.colorSpace = THREE.SRGBColorSpace;
  beamTex.wrapS = THREE.RepeatWrapping;
  beamTex.wrapT = THREE.RepeatWrapping;

  const MAX_BEAMS = 6;
  interface BeamVisual {
    mesh: THREE.Mesh;
    coreLine: THREE.Line;
    impactLight: THREE.PointLight;
    impactFlare: THREE.Mesh;
    sparkRing: THREE.Mesh;
  }

  const beamPool: BeamVisual[] = [];

  // Impact flare geometry & spark ring
  const flareGeom = new THREE.SphereGeometry(0.22, 12, 12);
  const flareMatBase = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const sparkRingGeom = new THREE.RingGeometry(0.06, 0.38, 16);
  const sparkRingMatBase = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  for (let i = 0; i < MAX_BEAMS; i++) {
    // Outer cylinder beam
    const cylGeom = new THREE.CylinderGeometry(0.038, 0.038, 1, 8, 1, true);
    const cylMat = new THREE.MeshBasicMaterial({
      map: beamTex,
      color: 0xef4444,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(cylGeom, cylMat);
    mesh.visible = false;
    group.add(mesh);

    // Inner bright core line
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
    });
    const coreLine = new THREE.Line(lineGeom, lineMat);
    coreLine.visible = false;
    group.add(coreLine);

    // Dynamic point light at beam impact point
    const impactLight = new THREE.PointLight(0xffffff, 0, 4.5);
    group.add(impactLight);

    // Impact flare mesh
    const impactFlare = new THREE.Mesh(flareGeom, flareMatBase.clone());
    impactFlare.visible = false;
    group.add(impactFlare);

    // Spark burst ring
    const sparkRing = new THREE.Mesh(sparkRingGeom, sparkRingMatBase.clone());
    sparkRing.visible = false;
    group.add(sparkRing);

    beamPool.push({
      mesh,
      coreLine,
      impactLight,
      impactFlare,
      sparkRing,
    });
  }

  // Pre-allocated math objects for zero GC per frame
  const _from = new THREE.Vector3();
  const _to = new THREE.Vector3();
  const _mid = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _up = new THREE.Vector3(0, 1, 0);

  return {
    group,
    update(time: number, delta: number, segments: BeamSegment[], isTargetHit: boolean) {
      beamTex.offset.y = -time * 2.8;

      for (let i = 0; i < MAX_BEAMS; i++) {
        const visual = beamPool[i];
        if (i < segments.length) {
          const seg = segments[i];
          _from.set(seg.from[0], seg.from[1], seg.from[2]);
          _to.set(seg.to[0], seg.to[1], seg.to[2]);

          const dist = _from.distanceTo(_to);
          _mid.addVectors(_from, _to).multiplyScalar(0.5);
          _dir.subVectors(_to, _from).normalize();

          // Position & orient beam cylinder
          visual.mesh.visible = true;
          visual.mesh.position.copy(_mid);
          visual.mesh.scale.set(
            seg.hitsTarget ? 1.3 : 0.9,
            dist,
            seg.hitsTarget ? 1.3 : 0.9
          );
          visual.mesh.quaternion.setFromUnitVectors(_up, _dir);

          // Beam color and pulsing
          const mat = visual.mesh.material as THREE.MeshBasicMaterial;
          mat.color.setHex(seg.color);
          mat.opacity = 0.55 + Math.sin(time * 9 + i) * 0.15 + (seg.hitsTarget ? 0.35 : 0.1);

          // Update core line
          visual.coreLine.visible = true;
          const posAttr = visual.coreLine.geometry.attributes.position as THREE.BufferAttribute;
          posAttr.setXYZ(0, _from.x, _from.y, _from.z);
          posAttr.setXYZ(1, _to.x, _to.y, _to.z);
          posAttr.needsUpdate = true;

          // Impact flare and light at terminal point
          if (seg.hitsTarget) {
            visual.impactFlare.visible = true;
            visual.impactFlare.position.copy(_to);
            (visual.impactFlare.material as THREE.MeshBasicMaterial).color.setHex(seg.color);
            visual.impactFlare.scale.setScalar(0.85 + Math.sin(time * 12 + i) * 0.2);

            visual.sparkRing.visible = true;
            visual.sparkRing.position.copy(_to);
            visual.sparkRing.quaternion.setFromUnitVectors(_up, _dir);
            visual.sparkRing.rotation.z += delta * 3.0;
            (visual.sparkRing.material as THREE.MeshBasicMaterial).color.setHex(seg.color);
            (visual.sparkRing.material as THREE.MeshBasicMaterial).opacity = 0.65 + Math.sin(time * 14) * 0.25;

            visual.impactLight.position.copy(_to);
            visual.impactLight.color.setHex(seg.color);
            visual.impactLight.intensity = 2.0 + Math.sin(time * 10) * 0.5;
          } else {
            visual.impactFlare.visible = false;
            visual.sparkRing.visible = false;
            visual.impactLight.intensity = 0;
          }
        } else {
          visual.mesh.visible = false;
          visual.coreLine.visible = false;
          visual.impactFlare.visible = false;
          visual.sparkRing.visible = false;
          visual.impactLight.intensity = 0;
        }
      }
    },
    dispose() {
      beamTex.dispose();
      beamCanvas.remove();
      flareGeom.dispose();
      flareMatBase.dispose();
      sparkRingGeom.dispose();
      sparkRingMatBase.dispose();
      beamPool.forEach((v) => {
        v.mesh.geometry.dispose();
        (v.mesh.material as THREE.Material).dispose();
        v.coreLine.geometry.dispose();
        (v.coreLine.material as THREE.Material).dispose();
        (v.impactFlare.material as THREE.Material).dispose();
        (v.sparkRing.material as THREE.Material).dispose();
      });
      scene.remove(group);
    },
  };
}
