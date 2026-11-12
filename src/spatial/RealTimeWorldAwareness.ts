// src/spatial/RealTimeWorldAwareness.ts
import { GameDirectorAgent } from '../ai/orchestration/GameDirectorAgent';
import { EnvironmentAgent } from '../ai/orchestration/EnvironmentAgent';
import type { WorldSnapshotInput } from '../ai/orchestration/types';
import { EnvironmentEventEngine } from '../environment/intelligence/EnvironmentEventEngine';
import { SpatialMappingEngine } from './SpatialMappingEngine';
import { SpatialObjectIntelligence } from './SpatialObjectIntelligence';
import { PredictiveSpatialEngine } from './PredictiveSpatialEngine';
import type {
  SpatialWorldEvent,
  Vec3,
  WorldAwarenessSnapshot,
} from './types';

export interface WorldAwarenessInput {
  playerPosition: Vec3;
  playerGazeDirection: Vec3;
  gameSnapshot: WorldSnapshotInput;
  poweredNodeIds?: Set<string>;
}

export class RealTimeWorldAwareness {
  private readonly mappingEngine: SpatialMappingEngine;
  private readonly objectIntelligence: SpatialObjectIntelligence;
  private readonly predictiveEngine: PredictiveSpatialEngine;
  private readonly directorAgent: GameDirectorAgent;
  private readonly environmentAgent: EnvironmentAgent;
  private readonly environmentEventEngine: EnvironmentEventEngine;
  private recentEvents: SpatialWorldEvent[] = [];

  constructor(
    mappingEngine?: SpatialMappingEngine,
    objectIntelligence?: SpatialObjectIntelligence,
    predictiveEngine?: PredictiveSpatialEngine,
    directorAgent?: GameDirectorAgent,
    environmentAgent?: EnvironmentAgent,
    environmentEventEngine?: EnvironmentEventEngine
  ) {
    this.mappingEngine = mappingEngine || new SpatialMappingEngine();
    this.objectIntelligence = objectIntelligence || new SpatialObjectIntelligence(this.mappingEngine.getSecurityGuard());
    this.predictiveEngine = predictiveEngine || new PredictiveSpatialEngine();
    this.directorAgent = directorAgent || new GameDirectorAgent();
    this.environmentAgent = environmentAgent || new EnvironmentAgent();
    this.environmentEventEngine = environmentEventEngine || new EnvironmentEventEngine();
  }

  public evaluateWorldState(input: WorldAwarenessInput): WorldAwarenessSnapshot {
    const now = Date.now();
    const events: SpatialWorldEvent[] = [];

    // 1. Validate Scene Graph & Boundaries
    const consistency = this.mappingEngine.validateSceneGraphConsistency();
    const boundaryCheck = this.mappingEngine.checkBoundaryProximity(input.playerPosition);

    if (boundaryCheck.approachingBoundary) {
      events.push({
        id: `evt-boundary-${now}`,
        type: 'BOUNDARY_PROXIMITY',
        severity: boundaryCheck.isWithinBounds ? 'warning' : 'critical',
        affectedEntityIds: ['playerCameraRig'],
        description: boundaryCheck.isWithinBounds
          ? `Player approaching perimeter boundary (${boundaryCheck.nearestWallDistanceMeters}m clearance).`
          : 'Player exceeded chamber perimeter boundary.',
        recommendedAdjustment: { showBoundaryHalo: true, fadeOpacity: 0.75 },
        timestamp: now,
      });
    }

    // 2. Semantic Scene & Relationships
    this.objectIntelligence.rebuildSemanticRelationships();
    const semanticSummary = this.objectIntelligence.generateSemanticSceneDescription(input.playerPosition);
    const obstructions = this.objectIntelligence
      .getRelationships()
      .filter((r) => r.relationType === 'obstructs');

    if (obstructions.length > 0) {
      events.push({
        id: `evt-occlusion-${now}`,
        type: 'BEAM_OCCLUSION_RISK',
        severity: 'warning',
        affectedEntityIds: obstructions.map((o) => o.targetId),
        description: `${obstructions.length} spatial obstruction(s) threatening photonic beam path.`,
        recommendedAdjustment: { highlightObstruction: true },
        timestamp: now,
      });
    }

    // 3. Movement Anomalies & Predictive Engine
    const anomaly = this.predictiveEngine.detectMovementAnomalies();
    if (anomaly.detected) {
      events.push({
        id: `evt-anomaly-${now}`,
        type: 'ANOMALOUS_MOVEMENT',
        severity: anomaly.severity === 'medium' ? 'warning' : 'info',
        affectedEntityIds: ['playerCameraRig'],
        description: anomaly.message,
        recommendedAdjustment: { stabilizeAdaptiveHud: true },
        timestamp: now,
      });
    }

    // 4. Convergence detection + Celestial Environment Coupling
    if (input.gameSnapshot.activeSegmentCount >= 3 || input.gameSnapshot.coherencePercent >= 85) {
      events.push({
        id: `evt-convergence-${now}`,
        type: 'CONVERGENCE_IMMINENT',
        severity: 'info',
        affectedEntityIds: ['emerald', 'target-receiver'],
        description: 'Photonic relay chain nearing full 100% coherence convergence.',
        recommendedAdjustment: { triggerAuroraEvent: true },
        timestamp: now,
      });

      if (this.environmentEventEngine.getActiveEvents(now).length === 0) {
        this.environmentEventEngine.triggerEvent('AURORA_BOREALIS', 12000, 0.8);
      }
    }

    // 5. Predictions & Navigation Anticipation
    const allObjs = this.objectIntelligence.getAllObjects();
    const predictions = this.predictiveEngine.predictNextInteractions(
      allObjs,
      input.playerPosition,
      input.playerGazeDirection
    );
    const topPrediction = predictions[0] || null;
    const focusObj = topPrediction ? this.objectIntelligence.getObject(topPrediction.objectId) || null : null;
    const navAnticipation = this.predictiveEngine.anticipateNavigation(
      focusObj ? { id: focusObj.id, position: focusObj.position } : null,
      input.playerPosition,
      input.playerGazeDirection
    );

    // 6. Integrate with Game Director & Environment Intelligence Agents
    const directorEval = this.directorAgent.evaluate(input.gameSnapshot);
    const envEval = this.environmentAgent.evaluate(input.gameSnapshot);

    const envParams = envEval.suggestedAction?.params || {};
    const ambientIntensity = typeof envParams.ambientIntensity === 'number' ? envParams.ambientIntensity : 0.6;
    const fogDensity = typeof envParams.fogDensity === 'number' ? envParams.fogDensity : 0.015;
    const particleSpeed = typeof envParams.particleSpeed === 'number' ? envParams.particleSpeed : 0.8;

    this.recentEvents = [...events, ...this.recentEvents].slice(0, 30);

    return {
      timestamp: now,
      sceneConsistent: consistency.isConsistent,
      coherencePercent: input.gameSnapshot.coherencePercent,
      activeSpatialEvents: events,
      semanticSummary,
      topPredictedInteraction: topPrediction,
      navigationAnticipation: navAnticipation,
      directorTension: (directorEval.metrics.currentTension as number) ?? 0.2,
      environmentMood: {
        ambientIntensity,
        fogDensity,
        particleSpeed,
      },
    };
  }

  public getRecentEvents(): SpatialWorldEvent[] {
    return [...this.recentEvents];
  }

  public getSubsystems() {
    return {
      mappingEngine: this.mappingEngine,
      objectIntelligence: this.objectIntelligence,
      predictiveEngine: this.predictiveEngine,
      directorAgent: this.directorAgent,
      environmentAgent: this.environmentAgent,
      environmentEventEngine: this.environmentEventEngine,
    };
  }
}
