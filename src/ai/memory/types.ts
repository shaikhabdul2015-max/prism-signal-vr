// src/ai/memory/types.ts
/**
 * Types for Stage 6 Player Memory & Personalization
 */

export interface PlayerGameplayRecord {
  puzzleId: string;
  tier: string;
  completionTimeSeconds: number;
  errorCount: number;
  resonanceCoherenceAchieved: number;
  timestamp: number;
}

export interface PlayerPreferences {
  hapticsEnabled: boolean;
  audioVolume: number;
  seatedMode: boolean;
  cinematicModeDefault: boolean;
  highContrastBeams: boolean;
  reducedMotion: boolean;
}

export interface PlayerConsentAuditRecord {
  timestamp: number;
  consentGranted: boolean;
  action: 'GRANTED' | 'REVOKED' | 'DATA_CLEARED';
  dataTypesCovered: string[];
}

export interface PlayerPersonalizationProfile {
  anonymousPlayerId: string;
  consentGranted: boolean;
  preferences: PlayerPreferences;
  gameplayHistory: PlayerGameplayRecord[];
  skillRatingHistory: Array<{ timestamp: number; rating: number }>;
  consentAuditLog: PlayerConsentAuditRecord[];
  lastActiveTimestamp: number;
}
