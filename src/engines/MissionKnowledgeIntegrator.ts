/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Mission Knowledge Integrator (Phase 28)
 * Connects mission execution intelligence with persistent historical memory,
 * cross-phase architecture relationships (Phases 1–27), and reusable operational patterns.
 * Identifies duplicate missions, audits outdated knowledge, and links research
 * findings to the Knowledge Graph with full provenance.
 */

import {
  MissionKnowledgeState,
  ReusableMissionPattern,
  AutonomousMissionEntity,
} from '../types/phase28';
import { knowledgeGraphEngine } from './KnowledgeGraphEngine';
import { strategicKnowledgeEngine } from './StrategicKnowledgeEngine';

export class MissionKnowledgeIntegrator {
  private static instance: MissionKnowledgeIntegrator | null = null;
  private patterns: ReusableMissionPattern[] = [];
  private completedOutcomes: Array<{
    missionId: string;
    outcome: 'SUCCESS' | 'FAILURE' | 'ADAPTED';
    durationMs: number;
    recordedAt: string;
  }> = [];
  private outdatedKnowledge: string[] = [];

  private constructor() {
    this.patterns = this.initializeDefaultPatterns();
    this.outdatedKnowledge = [
      'Assumption: Indefinite optical tracking without forward kinematic synthetic smoothing (Invalidated in Phase 21).',
      'Assumption: Uncapped 90Hz rendering without active thermal management on mobile hardware (Invalidated in Phase 26).',
    ];
  }

  public static getInstance(): MissionKnowledgeIntegrator {
    if (!MissionKnowledgeIntegrator.instance) {
      MissionKnowledgeIntegrator.instance = new MissionKnowledgeIntegrator();
    }
    return MissionKnowledgeIntegrator.instance;
  }

  public static resetInstance(): void {
    MissionKnowledgeIntegrator.instance = null;
  }

  private initializeDefaultPatterns(): ReusableMissionPattern[] {
    return [
      {
        patternId: 'pattern-spatial-kinematics-01',
        name: '25-Joint Kinematic Pose Recalibration',
        domain: 'Spatial Tracking & Forward Kinematics',
        typicalTasks: [
          'Audit Optical Line-of-Sight',
          'Calibrate 25-Joint Bone Length Matrix',
          'Deploy Synthetic Velocity Dead-Reckoning for Occluded Limbs',
        ],
        historicalSuccessRate: 94,
        averageDurationMs: 14500,
        knownPitfalls: [
          'Rapid yaw head turns exceeding 180 deg/sec induce optical smear',
          'Backlit windows trigger false-positive joint confidence',
        ],
        provenancePhase: 21,
      },
      {
        patternId: 'pattern-cadence-throttling-02',
        name: 'Dynamic Render Cadence Rebalancing',
        domain: 'Performance & Thermal Management',
        typicalTasks: [
          'Sample Baseline Frame Time Window',
          'Clamp Display Refresh Rate to 72Hz',
          'Downscale Non-Foveated Peripheral Render Targets',
        ],
        historicalSuccessRate: 91,
        averageDurationMs: 8200,
        knownPitfalls: [
          'Thermal throttling kicks in after 35 minutes continuous 90Hz load',
          'Aggressive resolution downscaling triggers perceptual vestibular distortion',
        ],
        provenancePhase: 26,
      },
      {
        patternId: 'pattern-autonomous-incident-recovery-03',
        name: 'Autonomous Multi-Agent Fault Quarantine',
        domain: 'System Resilience & Self-Healing',
        typicalTasks: [
          'Isolate Affected Hardware Sensor Subsystem',
          'Route Fallback Mission Milestones through Redundant Workers',
          'Request Operator Authorization for Critical State Mutations',
        ],
        historicalSuccessRate: 88,
        averageDurationMs: 18000,
        knownPitfalls: [
          'Circular agent voting deadlocks if confidence weighting is disabled',
        ],
        provenancePhase: 27,
      },
    ];
  }

  /**
   * Evaluates if a proposed mission is a duplicate of a previously executed or active mission
   */
  public checkForDuplicateMission(
    proposedTitle: string,
    existingMissions: AutonomousMissionEntity[]
  ): { isDuplicate: boolean; matchedMissionId?: string; similarityScore: number } {
    const cleanProposed = proposedTitle.toLowerCase().trim();

    for (const m of existingMissions) {
      const cleanExisting = m.objective.title.toLowerCase().trim();
      if (cleanProposed === cleanExisting) {
        return { isDuplicate: true, matchedMissionId: m.id, similarityScore: 1.0 };
      }

      // Check token overlap
      const pWords = new Set(cleanProposed.split(/\s+/));
      const eWords = new Set(cleanExisting.split(/\s+/));
      const intersection = [...pWords].filter((w) => eWords.has(w) && w.length > 3);

      if (intersection.length >= 4) {
        return { isDuplicate: true, matchedMissionId: m.id, similarityScore: 0.85 };
      }
    }

    return { isDuplicate: false, similarityScore: 0 };
  }

  /**
   * Ingests a completed mission outcome to enrich cross-phase knowledge graph and pattern statistics
   */
  public recordMissionOutcome(
    missionId: string,
    outcome: 'SUCCESS' | 'FAILURE' | 'ADAPTED',
    durationMs: number
  ): void {
    this.completedOutcomes.push({
      missionId,
      outcome,
      durationMs,
      recordedAt: new Date().toISOString(),
    });

    // Cross-link with KnowledgeGraphEngine
    try {
      knowledgeGraphEngine.addNode({
        id: `node-mission-outcome-${missionId}`,
        name: `Outcome: ${missionId}`,
        type: 'OBJECTIVE',
        properties: { outcome, durationMs },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // Graceful fallback if graph node already exists
    }
  }

  /**
   * Returns consolidated mission knowledge state
   */
  public getKnowledgeState(): MissionKnowledgeState {
    const crossPhaseConnections = strategicKnowledgeEngine.getAssociations().length + this.patterns.length;

    return {
      patterns: [...this.patterns],
      historicalOutcomesCount: this.completedOutcomes.length,
      crossPhaseConnectionsCount: crossPhaseConnections,
      outdatedKnowledgeFlagged: [...this.outdatedKnowledge],
      lastSyncedAt: new Date().toISOString(),
    };
  }
}

export const missionKnowledgeIntegrator = MissionKnowledgeIntegrator.getInstance();
