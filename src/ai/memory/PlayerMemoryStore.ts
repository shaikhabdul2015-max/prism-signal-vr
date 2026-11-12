// src/ai/memory/PlayerMemoryStore.ts
import type {
  PlayerConsentAuditRecord,
  PlayerGameplayRecord,
  PlayerPersonalizationProfile,
  PlayerPreferences,
} from './types';

const DEFAULT_PREFERENCES: PlayerPreferences = {
  hapticsEnabled: true,
  audioVolume: 0.7,
  seatedMode: true,
  cinematicModeDefault: false,
  highContrastBeams: false,
  reducedMotion: false,
};

const BANNED_PII_KEYS = new Set([
  'email',
  'firstname',
  'lastname',
  'fullname',
  'name',
  'phone',
  'phonenumber',
  'ssn',
  'socialsecurity',
  'creditcard',
  'cardnumber',
  'ip',
  'ipaddress',
  'address',
  'zipcode',
  'dateofbirth',
  'dob',
  'biometric',
]);

export class PlayerMemoryStore {
  private profile: PlayerPersonalizationProfile;
  private readonly maxHistoryRecords = 100;

  constructor(anonymousPlayerId = `anon-player-${Date.now()}`, initialConsent = true) {
    this.profile = {
      anonymousPlayerId,
      consentGranted: initialConsent,
      preferences: { ...DEFAULT_PREFERENCES },
      gameplayHistory: [],
      skillRatingHistory: [{ timestamp: Date.now(), rating: 1200 }],
      consentAuditLog: [
        {
          timestamp: Date.now(),
          consentGranted: initialConsent,
          action: initialConsent ? 'GRANTED' : 'REVOKED',
          dataTypesCovered: ['gameplay_telemetry', 'puzzle_solve_times', 'skill_ratings'],
        },
      ],
      lastActiveTimestamp: Date.now(),
    };
  }

  public getProfile(): PlayerPersonalizationProfile {
    return {
      ...this.profile,
      preferences: { ...this.profile.preferences },
      gameplayHistory: [...this.profile.gameplayHistory],
      skillRatingHistory: [...this.profile.skillRatingHistory],
      consentAuditLog: [...this.profile.consentAuditLog],
    };
  }

  public setConsent(granted: boolean): void {
    this.profile.consentGranted = granted;
    const audit: PlayerConsentAuditRecord = {
      timestamp: Date.now(),
      consentGranted: granted,
      action: granted ? 'GRANTED' : 'REVOKED',
      dataTypesCovered: ['gameplay_telemetry', 'puzzle_solve_times', 'skill_ratings'],
    };
    this.profile.consentAuditLog.push(audit);

    // If consent revoked, enforce data minimization and clear history
    if (!granted) {
      this.clearPlayerMemory(false);
    }
  }

  public containsPII(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') return false;
    for (const key of Object.keys(payload as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
      if (BANNED_PII_KEYS.has(normalizedKey)) {
        return true;
      }
      const val = (payload as Record<string, unknown>)[key];
      if (val && typeof val === 'object' && this.containsPII(val)) {
        return true;
      }
    }
    return false;
  }

  public recordGameplay(record: Omit<PlayerGameplayRecord, 'timestamp'> & Record<string, unknown>): boolean {
    if (!this.profile.consentGranted) {
      return false; // Respect privacy minimization
    }

    if (this.containsPII(record)) {
      this.profile.consentAuditLog.push({
        timestamp: Date.now(),
        consentGranted: this.profile.consentGranted,
        action: 'PII_REJECTED' as any,
        dataTypesCovered: ['unauthorized_pii_attempt'],
      });
      return false; // Strictly refuse ingestion of PII
    }

    this.profile.gameplayHistory.push({
      puzzleId: record.puzzleId,
      tier: record.tier,
      completionTimeSeconds: record.completionTimeSeconds,
      errorCount: record.errorCount,
      resonanceCoherenceAchieved: record.resonanceCoherenceAchieved,
      timestamp: Date.now(),
    });

    if (this.profile.gameplayHistory.length > this.maxHistoryRecords) {
      this.profile.gameplayHistory.shift();
    }

    this.profile.lastActiveTimestamp = Date.now();
    return true;
  }

  public recordSkillRating(rating: number): boolean {
    if (!this.profile.consentGranted) {
      return false;
    }

    this.profile.skillRatingHistory.push({
      timestamp: Date.now(),
      rating,
    });

    if (this.profile.skillRatingHistory.length > this.maxHistoryRecords) {
      this.profile.skillRatingHistory.shift();
    }

    this.profile.lastActiveTimestamp = Date.now();
    return true;
  }

  public updatePreferences(prefs: Partial<PlayerPreferences>): void {
    this.profile.preferences = {
      ...this.profile.preferences,
      ...prefs,
    };
    this.profile.lastActiveTimestamp = Date.now();
  }

  public clearPlayerMemory(logAudit = true): void {
    this.profile.gameplayHistory = [];
    this.profile.skillRatingHistory = [{ timestamp: Date.now(), rating: 1200 }];

    if (logAudit) {
      this.profile.consentAuditLog.push({
        timestamp: Date.now(),
        consentGranted: this.profile.consentGranted,
        action: 'DATA_CLEARED',
        dataTypesCovered: ['gameplay_telemetry', 'puzzle_solve_times', 'skill_ratings'],
      });
    }

    this.profile.lastActiveTimestamp = Date.now();
  }

  public isConsentGranted(): boolean {
    return this.profile.consentGranted;
  }

  public getAnonymousPlayerId(): string {
    return this.profile.anonymousPlayerId;
  }
}
