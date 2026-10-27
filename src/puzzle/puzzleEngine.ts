import { CrystalData, CrystalId, BeamSegment, PuzzleProgressState, AlienSymbol, CivilizationStory } from '../types/game';

// Target Receiver world position on the chamber perimeter spire
export const TARGET_RECEIVER_POS: [number, number, number] = [0, 1.6, -5.8];
export const CONSOLE_EMITTER_POS: [number, number, number] = [0, 1.45, 0];

// Angular tolerance for hitting the next crystal or receiver (approx ±14 degrees)
export const HIT_TOLERANCE_RAD = 0.25;

/**
 * Phase 2 Initial Crystal Configurations
 * Target angles are mathematically computed so that:
 * - Ruby reflects Console beam -> Azure
 * - Azure reflects Ruby beam -> Emerald
 * - Emerald reflects Azure beam -> Target Receiver
 */
export const DEFAULT_CRYSTALS: CrystalData[] = [
  {
    id: 'ruby',
    name: 'Ruby Harmonic Core',
    designation: 'NODE-ALPHA // PRIMARY DEFLECTOR',
    frequency: 440.0,
    hexColor: '#ef4444',
    colorNumber: 0xef4444,
    lightIntensity: 2.0,
    defaultPosition: [3.64, 1.25, -2.1], // Right-front
    currentPosition: [3.64, 1.25, -2.1],
    rotationY: 0.85, // Scrambled starting orientation
    rotationX: 0,
    targetRotationY: 2.1, // Aligns reflected beam towards Azure
    resonancePercent: 20,
    isAligned: false,
    pedestalSlot: 0,
    isReceivingLight: true,
    isReflectingToTarget: false,
  },
  {
    id: 'azure',
    name: 'Azure Resonance Array',
    designation: 'NODE-BETA // SECONDARY PRISM',
    frequency: 659.25,
    hexColor: '#06b6d4',
    colorNumber: 0x06b6d4,
    lightIntensity: 2.0,
    defaultPosition: [0, 1.25, 4.2], // Front-center
    currentPosition: [0, 1.25, 4.2],
    rotationY: 1.15, // Scrambled starting orientation
    rotationX: 0,
    targetRotationY: 4.19, // Aligns reflected beam towards Emerald
    resonancePercent: 15,
    isAligned: false,
    pedestalSlot: 1,
    isReceivingLight: false,
    isReflectingToTarget: false,
  },
  {
    id: 'emerald',
    name: 'Emerald Viridian Prismatic',
    designation: 'NODE-GAMMA // TERMINAL FOCUS PRISM',
    frequency: 554.37,
    hexColor: '#10b981',
    colorNumber: 0x10b981,
    lightIntensity: 2.0,
    defaultPosition: [-3.64, 1.25, -2.1], // Left-front
    currentPosition: [-3.64, 1.25, -2.1],
    rotationY: 3.4, // Scrambled starting orientation
    rotationX: 0,
    targetRotationY: 5.49, // Aligns reflected beam towards Target Receiver
    resonancePercent: 15,
    isAligned: false,
    pedestalSlot: 2,
    isReceivingLight: false,
    isReflectingToTarget: false,
  },
];

/**
 * Normalizes an angle into [0, 2*PI)
 */
export function normalizeAngle(angle: number): number {
  let a = angle % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a;
}

/**
 * Shortest angular difference between two angles in radians [0, PI]
 */
export function angularDistance(a: number, b: number): number {
  const normA = normalizeAngle(a);
  const normB = normalizeAngle(b);
  let diff = Math.abs(normA - normB);
  if (diff > Math.PI) {
    diff = Math.PI * 2 - diff;
  }
  return diff;
}

/**
 * Calculates crystal resonance percentage (0 - 100%)
 * based on angular distance to target angle.
 */
export function calculateCrystalResonance(currentRotY: number, targetRotY: number): number {
  const diff = angularDistance(currentRotY, targetRotY);

  if (diff <= HIT_TOLERANCE_RAD) {
    // Within alignment window: 80% to 100%
    const ratio = 1 - diff / HIT_TOLERANCE_RAD;
    return Math.round(80 + ratio * 20);
  } else if (diff <= 0.85) {
    const factor = (0.85 - diff) / (0.85 - HIT_TOLERANCE_RAD);
    return Math.round(15 + factor * 65);
  } else {
    return Math.round(Math.max(5, 15 * (1 - (diff - 0.85) / (Math.PI - 0.85))));
  }
}

export interface LightSimulationResult {
  updatedCrystals: CrystalData[];
  beamSegments: BeamSegment[];
  progress: PuzzleProgressState;
  totalCoherence: number;
}

/**
 * Real optical ray simulation through the crystal chain:
 * 1. Console Emitter -> Crystal 1 (Ruby)
 * 2. Ruby Reflected Beam -> checks if aimed at Azure
 * 3. If Azure is hit, Azure Reflected Beam -> checks if aimed at Emerald
 * 4. If Emerald is hit, Emerald Reflected Beam -> checks if aimed at Target Receiver
 * 5. If Target Receiver is hit, puzzle is SOLVED!
 */
export function simulateLightBeamPuzzle(
  crystals: CrystalData[],
  isBeamSourceActive: boolean = true
): LightSimulationResult {
  const ruby = crystals.find((c) => c.id === 'ruby') || crystals[0];
  const azure = crystals.find((c) => c.id === 'azure') || crystals[1];
  const emerald = crystals.find((c) => c.id === 'emerald') || crystals[2];

  const segments: BeamSegment[] = [];

  // Check Ruby alignment
  const rubyDiff = angularDistance(ruby.rotationY, ruby.targetRotationY);
  const rubyHitsAzure = isBeamSourceActive && rubyDiff <= HIT_TOLERANCE_RAD;

  // Check Azure alignment
  const azureDiff = angularDistance(azure.rotationY, azure.targetRotationY);
  const azureHitsEmerald = rubyHitsAzure && azureDiff <= HIT_TOLERANCE_RAD;

  // Check Emerald alignment
  const emeraldDiff = angularDistance(emerald.rotationY, emerald.targetRotationY);
  const emeraldHitsTarget = azureHitsEmerald && emeraldDiff <= HIT_TOLERANCE_RAD;

  // Segment 0: Console to Ruby (always active if source is on)
  if (isBeamSourceActive) {
    segments.push({
      from: CONSOLE_EMITTER_POS,
      to: ruby.currentPosition,
      color: 0xef4444,
      intensity: 1.0,
      hitsTarget: true,
      targetId: 'ruby',
    });
  }

  // Segment 1: Ruby Reflection
  if (isBeamSourceActive) {
    if (rubyHitsAzure) {
      segments.push({
        from: ruby.currentPosition,
        to: azure.currentPosition,
        color: 0xef4444,
        intensity: 1.2,
        hitsTarget: true,
        targetId: 'azure',
      });
    } else {
      // Beam points in actual reflected direction into space
      // Direction vector calculated from ruby's current rotation
      const angle = ruby.rotationY;
      const beamDirX = Math.cos(angle);
      const beamDirZ = Math.sin(angle);
      const reach = 8.0;
      segments.push({
        from: ruby.currentPosition,
        to: [
          ruby.currentPosition[0] + beamDirX * reach,
          ruby.currentPosition[1],
          ruby.currentPosition[2] + beamDirZ * reach,
        ],
        color: 0xef4444,
        intensity: 0.65,
        hitsTarget: false,
        targetId: 'void',
      });
    }
  }

  // Segment 2: Azure Reflection
  if (rubyHitsAzure) {
    if (azureHitsEmerald) {
      segments.push({
        from: azure.currentPosition,
        to: emerald.currentPosition,
        color: 0x06b6d4,
        intensity: 1.3,
        hitsTarget: true,
        targetId: 'emerald',
      });
    } else {
      const angle = azure.rotationY;
      const beamDirX = Math.cos(angle);
      const beamDirZ = Math.sin(angle);
      const reach = 8.0;
      segments.push({
        from: azure.currentPosition,
        to: [
          azure.currentPosition[0] + beamDirX * reach,
          azure.currentPosition[1],
          azure.currentPosition[2] + beamDirZ * reach,
        ],
        color: 0x06b6d4,
        intensity: 0.7,
        hitsTarget: false,
        targetId: 'void',
      });
    }
  }

  // Segment 3: Emerald Reflection
  if (azureHitsEmerald) {
    if (emeraldHitsTarget) {
      segments.push({
        from: emerald.currentPosition,
        to: TARGET_RECEIVER_POS,
        color: 0x10b981,
        intensity: 1.5,
        hitsTarget: true,
        targetId: 'target_receiver',
      });
    } else {
      const angle = emerald.rotationY;
      const beamDirX = Math.cos(angle);
      const beamDirZ = Math.sin(angle);
      const reach = 8.0;
      segments.push({
        from: emerald.currentPosition,
        to: [
          emerald.currentPosition[0] + beamDirX * reach,
          emerald.currentPosition[1],
          emerald.currentPosition[2] + beamDirZ * reach,
        ],
        color: 0x10b981,
        intensity: 0.75,
        hitsTarget: false,
        targetId: 'void',
      });
    }
  }

  // Update crystal states
  const updatedCrystals: CrystalData[] = crystals.map((c) => {
    let receiving = false;
    let reflecting = false;
    let targetAngle = c.targetRotationY;

    if (c.id === 'ruby') {
      receiving = isBeamSourceActive;
      reflecting = rubyHitsAzure;
    } else if (c.id === 'azure') {
      receiving = rubyHitsAzure;
      reflecting = azureHitsEmerald;
    } else if (c.id === 'emerald') {
      receiving = azureHitsEmerald;
      reflecting = emeraldHitsTarget;
    }

    const res = calculateCrystalResonance(c.rotationY, targetAngle);

    return {
      ...c,
      isReceivingLight: receiving,
      isReflectingToTarget: reflecting,
      resonancePercent: res,
      isAligned: reflecting,
    };
  });

  // Calculate overall progress
  let activeSegments = 0;
  if (isBeamSourceActive) activeSegments += 1; // Console -> Ruby
  if (rubyHitsAzure) activeSegments += 1; // Ruby -> Azure
  if (azureHitsEmerald) activeSegments += 1; // Azure -> Emerald
  if (emeraldHitsTarget) activeSegments += 1; // Emerald -> Target

  const progressPercent = Math.min(
    100,
    emeraldHitsTarget ? 100 : Math.round(((activeSegments - 1) / 3) * 100)
  );

  const progress: PuzzleProgressState = {
    isBeamSourceActive,
    activeSegmentCount: activeSegments,
    totalSegments: 4,
    isRubyPowered: isBeamSourceActive,
    isAzurePowered: rubyHitsAzure,
    isEmeraldPowered: azureHitsEmerald,
    isTargetReceiverHit: emeraldHitsTarget,
    overallProgressPercent: Math.max(0, progressPercent),
    beamChainStatus: {
      consoleToRuby: isBeamSourceActive,
      rubyToAzure: rubyHitsAzure,
      azureToEmerald: azureHitsEmerald,
      emeraldToTarget: emeraldHitsTarget,
    },
  };

  const totalCoherence = emeraldHitsTarget ? 100 : Math.max(10, progressPercent);

  return {
    updatedCrystals,
    beamSegments: segments,
    progress,
    totalCoherence,
  };
}

// ==========================================
// PHASE 3: ALIEN SYMBOL DECODING & STORY
// ==========================================

export const ALIEN_SYMBOLS: AlienSymbol[] = [
  {
    id: 'origin',
    name: 'Stellar Origin',
    glyph: '⟁',
    meaning: 'The Inception Point // The Birth of Stellar Resonance',
    color: '#ef4444',
    chamberClueLocation: 'Inscribed on Node-Alpha (Ruby Pedestal Collar)',
    clueStep: 1,
  },
  {
    id: 'bridge',
    name: 'Harmonic Bridge',
    glyph: '✧',
    meaning: 'The Coherent Link Between Disparate Matter & Light',
    color: '#06b6d4',
    chamberClueLocation: 'Etched into Node-Beta (Azure Pedestal Ring)',
    clueStep: 2,
  },
  {
    id: 'prism',
    name: 'Prismatic Vector',
    glyph: '⎔',
    meaning: 'The Triangulation & Amplification of Cosmic Beams',
    color: '#10b981',
    chamberClueLocation: 'Carved across Node-Gamma (Emerald Pedestal Deck)',
    clueStep: 3,
  },
  {
    id: 'horizon',
    name: 'Cosmic Horizon',
    glyph: '◬',
    meaning: 'The Transcendent Threshold Beyond the Outer Void',
    color: '#c084fc',
    chamberClueLocation: 'Engraved onto the Target Receiver Lens Bezel',
    clueStep: 4,
  },
  {
    id: 'chronos',
    name: 'Chrono Helix',
    glyph: '☍',
    meaning: 'The Eternal Cycle of Stellar Expansion & Decay',
    color: '#f59e0b',
    chamberClueLocation: 'Decorative Glyph on Perimeter Spire Pillar',
    clueStep: 0, // Distractor
  },
  {
    id: 'singularity',
    name: 'Void Core',
    glyph: '◉',
    meaning: 'The Silent Gravitational Heart of Uncharted Space',
    color: '#38bdf8',
    chamberClueLocation: 'Sub-floor Energy Conduit Calibration Marking',
    clueStep: 0, // Distractor
  },
];

export const TARGET_DECODING_SEQUENCE: string[] = ['origin', 'bridge', 'prism', 'horizon'];

export function validateAlienSequence(selectedIds: string[]): {
  isCorrect: boolean;
  correctCount: number;
  message: string;
} {
  if (selectedIds.length !== TARGET_DECODING_SEQUENCE.length) {
    return {
      isCorrect: false,
      correctCount: 0,
      message: `INCOMPLETE SEQUENCE: ${selectedIds.length} / 4 GLYPHS ENTERED`,
    };
  }

  let correctCount = 0;
  for (let i = 0; i < TARGET_DECODING_SEQUENCE.length; i++) {
    if (selectedIds[i] === TARGET_DECODING_SEQUENCE[i]) {
      correctCount++;
    }
  }

  if (correctCount === TARGET_DECODING_SEQUENCE.length) {
    return {
      isCorrect: true,
      correctCount: 4,
      message: 'CIPHER SYNCHRONIZED: ALIEN SIGNAL ARCHIVE DECRYPTED (4/4)',
    };
  } else {
    return {
      isCorrect: false,
      correctCount,
      message: `SEQUENCE MISMATCH: ${correctCount} / 4 GLYPHS IN CORRECT ORDER // CONSULT CHAMBER CLUES`,
    };
  }
}

export const CIVILIZATION_STORY: CivilizationStory = {
  title: 'THE AETHELGARD: LIGHT-WEAVERS OF THE CYGNUS RIFT',
  civilizationName: 'The Aethelgard Synarchy',
  epoch: 'Circa 2.1 Billion BCE (Early Galactic Habitable Era)',
  originCoordinates: 'Cygnus-X3 Resonance Deep // Void Sector 09',
  summary:
    'Two billion years before the emergence of terrestrial life, the Aethelgard civilization constructed a web of autonomous crystalline relay chambers across the void. Before abandoning their physical forms to migrate beyond the cosmic event horizon, they left behind this message for whichever intelligent species would next learn to bend coherent starlight.',
  chapters: [
    {
      heading: 'I. THE DAWN OF THE HARMONIC WEB',
      body:
        'When the stars of the Cygnus Rift were young and violent, our people learned that light is not merely illumination—it is the universal neural fabric of spacetime. We built resonant chambers like this one not of metal and silicon, but of quantum-faceted minerals tuned to the fundamental harmonics of creation (440Hz, 554Hz, 659Hz). Through these conduits, we spoke across hundred-light-year gulfs in milliseconds without displacing a single atom of the void.',
    },
    {
      heading: 'II. THE GREAT ENTROPY & THE CONVERGENCE',
      body:
        'Over countless millennia, our stellar nurseries cooled. We foresaw the slowing of the cosmos and the great dispersion of worlds. Rather than struggle against galactic decay, we devised the Transcendent Shift: encoding our collective consciousness into self-sustaining tachyonic standing waves. Before departing the material realm, we seeded eighty thousand relay chambers at cosmic crossroads, awaiting travelers patient enough to align the light and decipher our heraldry.',
    },
    {
      heading: 'III. THE TESTAMENT TO THE NEXT TRAVELERS',
      body:
        'To you who have rotated these prisms, connected the carrier laser, and deciphered this fourfold cipher (Origin, Bridge, Prism, Horizon): know that you are not alone in the dark. The universe is not an empty desert; it is a dormant instrument waiting for hands to play it. The beacon you have activated now ripples outward to forty distant star systems. We leave you this chamber, this knowledge, and our blessing: reach for the horizon, for the void is only empty until you shine your light upon it.',
    },
  ],
};
