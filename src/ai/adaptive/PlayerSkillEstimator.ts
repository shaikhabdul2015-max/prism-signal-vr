// src/ai/adaptive/PlayerSkillEstimator.ts
import type { PlayerSkillProfile, SkillTier } from './types';

export interface PuzzleResultInput {
  puzzleId: string;
  tier: SkillTier;
  solved: boolean;
  timeTakenSeconds: number;
  expectedTimeSeconds: number;
  errorCount: number;
  precisionRadiansDelta: number;
}

export class PlayerSkillEstimator {
  private profile: PlayerSkillProfile;

  constructor(playerId = 'default-player', initialRating = 1200) {
    this.profile = {
      playerId,
      skillRating: initialRating,
      spatialDexterityScore: 70,
      cognitiveSpeedScore: 70,
      puzzleResilienceScore: 75,
      totalPuzzlesSolved: 0,
      totalAttempts: 0,
      averageSolveTimeSeconds: 45,
      lastUpdated: Date.now(),
    };
  }

  public getProfile(): PlayerSkillProfile {
    return { ...this.profile };
  }

  public recordPuzzleResult(result: PuzzleResultInput): PlayerSkillProfile {
    this.profile.totalAttempts++;
    if (result.solved) {
      this.profile.totalPuzzlesSolved++;
    }

    // Tier base rating for Elo calculation
    const tierRatings: Record<SkillTier, number> = {
      novice: 1000,
      apprentice: 1300,
      adept: 1650,
      master: 2000,
    };
    const puzzleBaseRating = tierRatings[result.tier];

    // Elo expected score: 1 / (1 + 10^((puzzle - player)/400))
    const expectedScore = 1 / (1 + Math.pow(10, (puzzleBaseRating - this.profile.skillRating) / 400));
    const actualScore = result.solved ? 1.0 : 0.0;

    // K-factor dynamically adapts based on experience
    const kFactor = this.profile.totalAttempts < 10 ? 40 : 24;
    const ratingChange = Math.round(kFactor * (actualScore - expectedScore));
    this.profile.skillRating = Math.max(800, Math.min(2400, this.profile.skillRating + ratingChange));

    // Update Average Solve Time
    if (result.solved) {
      const prevTotalTime = this.profile.averageSolveTimeSeconds * (this.profile.totalPuzzlesSolved - 1);
      this.profile.averageSolveTimeSeconds = Number(((prevTotalTime + result.timeTakenSeconds) / this.profile.totalPuzzlesSolved).toFixed(1));
    }

    // Spatial Dexterity (based on precisionRadiansDelta and errorCount)
    const dexterityGain = Math.max(-10, Math.min(10, 5 - (result.precisionRadiansDelta * 20) - (result.errorCount * 1.5)));
    this.profile.spatialDexterityScore = Math.max(10, Math.min(100, Math.round(this.profile.spatialDexterityScore + dexterityGain)));

    // Cognitive Speed (based on timeTakenSeconds vs expectedTimeSeconds)
    const speedRatio = result.expectedTimeSeconds / Math.max(1, result.timeTakenSeconds);
    const speedDelta = speedRatio > 1.2 ? 4 : speedRatio < 0.8 ? -4 : 0;
    this.profile.cognitiveSpeedScore = Math.max(10, Math.min(100, Math.round(this.profile.cognitiveSpeedScore + speedDelta)));

    // Resilience (rebounding after errors)
    if (result.errorCount > 3 && result.solved) {
      this.profile.puzzleResilienceScore = Math.min(100, this.profile.puzzleResilienceScore + 5);
    } else if (!result.solved && result.errorCount > 5) {
      this.profile.puzzleResilienceScore = Math.max(20, this.profile.puzzleResilienceScore - 2);
    }

    this.profile.lastUpdated = Date.now();
    return this.getProfile();
  }

  public getRecommendedTier(): SkillTier {
    if (this.profile.skillRating < 1100) return 'novice';
    if (this.profile.skillRating < 1450) return 'apprentice';
    if (this.profile.skillRating < 1850) return 'adept';
    return 'master';
  }

  public reset(initialRating = 1200): void {
    this.profile = {
      playerId: this.profile.playerId,
      skillRating: initialRating,
      spatialDexterityScore: 70,
      cognitiveSpeedScore: 70,
      puzzleResilienceScore: 75,
      totalPuzzlesSolved: 0,
      totalAttempts: 0,
      averageSolveTimeSeconds: 45,
      lastUpdated: Date.now(),
    };
  }
}
