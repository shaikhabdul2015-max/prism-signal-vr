import * as THREE from 'three';

/**
 * Creates the deep space cinematic environment:
 * - Distant ringed alien gas giant
 * - Distant moon
 * - Procedural multi-hued starfield (3000+ stars)
 * - Subtle nebula haze particles
 */
export function createSpaceEnvironment(scene: THREE.Scene): {
  update(time: number, delta: number): void;
  dispose(): void;
} {
  const group = new THREE.Group();
  group.name = 'SpaceEnvironment';
  scene.add(group);

  // 1. Procedural Starfield
  const starCount = 3500;
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);

  const starPalettes = [
    new THREE.Color('#e0f2fe'), // crisp ice blue
    new THREE.Color('#ffffff'), // pure white
    new THREE.Color('#fef08a'), // warm gold
    new THREE.Color('#c084fc'), // violet
    new THREE.Color('#38bdf8'), // electric cyan
  ];

  for (let i = 0; i < starCount; i++) {
    // Distribute on distant sphere
    const radius = 250 + Math.random() * 80;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = radius * Math.cos(phi);

    const c = starPalettes[Math.floor(Math.random() * starPalettes.length)];
    starColors[i * 3] = c.r;
    starColors[i * 3 + 1] = c.g;
    starColors[i * 3 + 2] = c.b;

    starSizes[i] = Math.random() * 2.2 + 0.8;
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

  // Circular point texture generated on canvas
  const starCanvas = document.createElement('canvas');
  starCanvas.width = 32;
  starCanvas.height = 32;
  const ctx = starCanvas.getContext('2d')!;
  const radGrad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  radGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  radGrad.addColorStop(0.3, 'rgba(220, 240, 255, 0.8)');
  radGrad.addColorStop(0.8, 'rgba(100, 180, 255, 0.15)');
  radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, 32, 32);

  const starTex = new THREE.CanvasTexture(starCanvas);
  starTex.colorSpace = THREE.SRGBColorSpace;

  const starMaterial = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    map: starTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const starPoints = new THREE.Points(starGeometry, starMaterial);
  group.add(starPoints);

  // 2. Distant Majestic Ringed Gas Giant
  const planetGroup = new THREE.Group();
  planetGroup.position.set(-140, 60, -180);

  // Procedural Gas Giant Texture
  const planetCanvas = document.createElement('canvas');
  planetCanvas.width = 512;
  planetCanvas.height = 256;
  const pCtx = planetCanvas.getContext('2d')!;
  
  // Bands gradient
  const pGrad = pCtx.createLinearGradient(0, 0, 0, 256);
  pGrad.addColorStop(0.0, '#0c1a2e');
  pGrad.addColorStop(0.2, '#1e3a5f');
  pGrad.addColorStop(0.35, '#0e2439');
  pGrad.addColorStop(0.5, '#2a4365');
  pGrad.addColorStop(0.65, '#1a365d');
  pGrad.addColorStop(0.8, '#0f2942');
  pGrad.addColorStop(1.0, '#081426');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 512, 256);

  // Add subtle swirl noise bands
  for (let y = 0; y < 256; y += 4) {
    pCtx.fillStyle = `rgba(180, 220, 255, ${Math.sin(y * 0.1) * 0.08 + 0.05})`;
    pCtx.fillRect(0, y, 512, 2);
  }

  const planetTexture = new THREE.CanvasTexture(planetCanvas);
  planetTexture.colorSpace = THREE.SRGBColorSpace;

  const planetGeom = new THREE.SphereGeometry(36, 48, 48);
  const planetMat = new THREE.MeshStandardMaterial({
    map: planetTexture,
    roughness: 0.85,
    metalness: 0.1,
  });
  const planetMesh = new THREE.Mesh(planetGeom, planetMat);
  planetGroup.add(planetMesh);

  // Gas Giant Atmosphere Rim
  const atmoGeom = new THREE.SphereGeometry(37.5, 40, 40);
  const atmoMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
  const atmoMesh = new THREE.Mesh(atmoGeom, atmoMat);
  planetGroup.add(atmoMesh);

  // Planet Rings
  const ringGeom = new THREE.RingGeometry(48, 85, 64);
  // Rotate ring geometry to lie flat
  ringGeom.rotateX(Math.PI / 2.3);

  const ringCanvas = document.createElement('canvas');
  ringCanvas.width = 256;
  ringCanvas.height = 1;
  const rCtx = ringCanvas.getContext('2d')!;
  const rGrad = rCtx.createLinearGradient(0, 0, 256, 0);
  rGrad.addColorStop(0.0, 'rgba(0,0,0,0)');
  rGrad.addColorStop(0.1, 'rgba(165, 205, 255, 0.5)');
  rGrad.addColorStop(0.3, 'rgba(120, 170, 230, 0.7)');
  rGrad.addColorStop(0.45, 'rgba(0,0,0,0.1)'); // Cassini division gap
  rGrad.addColorStop(0.55, 'rgba(190, 225, 255, 0.6)');
  rGrad.addColorStop(0.9, 'rgba(90, 140, 200, 0.4)');
  rGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
  rCtx.fillStyle = rGrad;
  rCtx.fillRect(0, 0, 256, 1);

  const ringTex = new THREE.CanvasTexture(ringCanvas);
  ringTex.colorSpace = THREE.SRGBColorSpace;

  const ringMat = new THREE.MeshStandardMaterial({
    map: ringTex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    roughness: 0.9,
  });
  const ringMesh = new THREE.Mesh(ringGeom, ringMat);
  planetGroup.add(ringMesh);

  // Planet tilt
  planetGroup.rotation.z = 0.35;
  planetGroup.rotation.x = 0.2;
  group.add(planetGroup);

  // 3. Small Orbiting Moon
  const moonGeom = new THREE.SphereGeometry(6, 24, 24);
  const moonMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.95,
    metalness: 0.15,
  });
  const moonMesh = new THREE.Mesh(moonGeom, moonMat);
  moonMesh.position.set(70, 25, -90);
  planetGroup.add(moonMesh);

  // 4. Subtle Cosmic Nebula Haze
  const nebulaCount = 120;
  const nebulaGeom = new THREE.BufferGeometry();
  const nebulaPositions = new Float32Array(nebulaCount * 3);
  const nebulaColors = new Float32Array(nebulaCount * 3);

  const nebColor1 = new THREE.Color('#4338ca'); // deep indigo
  const nebColor2 = new THREE.Color('#0284c7'); // sky cyan
  const nebColor3 = new THREE.Color('#9333ea'); // purple

  for (let i = 0; i < nebulaCount; i++) {
    nebulaPositions[i * 3] = (Math.random() - 0.5) * 320;
    nebulaPositions[i * 3 + 1] = (Math.random() - 0.2) * 160;
    nebulaPositions[i * 3 + 2] = -160 + (Math.random() - 0.5) * 180;

    const mix = Math.random();
    const c = mix < 0.4 ? nebColor1 : (mix < 0.8 ? nebColor2 : nebColor3);
    nebulaColors[i * 3] = c.r;
    nebulaColors[i * 3 + 1] = c.g;
    nebulaColors[i * 3 + 2] = c.b;
  }

  nebulaGeom.setAttribute('position', new THREE.BufferAttribute(nebulaPositions, 3));
  nebulaGeom.setAttribute('color', new THREE.BufferAttribute(nebulaColors, 3));

  const nebMat = new THREE.PointsMaterial({
    size: 28,
    vertexColors: true,
    map: starTex,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const nebulaPoints = new THREE.Points(nebulaGeom, nebMat);
  group.add(nebulaPoints);

  return {
    update(time: number) {
      starPoints.rotation.y = time * 0.003;
      planetGroup.rotation.y = time * 0.015;
      planetMesh.rotation.y = time * 0.04;
      nebulaPoints.rotation.y = time * 0.002;
    },
    dispose() {
      starGeometry.dispose();
      starMaterial.dispose();
      starTex.dispose();
      planetGeom.dispose();
      planetMat.dispose();
      planetTexture.dispose();
      atmoGeom.dispose();
      atmoMat.dispose();
      ringGeom.dispose();
      ringMat.dispose();
      ringTex.dispose();
      moonGeom.dispose();
      moonMat.dispose();
      nebulaGeom.dispose();
      nebMat.dispose();
      scene.remove(group);
    },
  };
}
