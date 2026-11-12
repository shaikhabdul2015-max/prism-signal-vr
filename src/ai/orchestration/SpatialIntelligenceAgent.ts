// src/ai/orchestration/SpatialIntelligenceAgent.ts
import type { AgentEvaluation, AgentMessage, AgentRole, WorldSnapshotInput } from './types';
import { RealTimeWorldAwareness } from '../../spatial/RealTimeWorldAwareness';
import { SpatialSecurityGuard } from '../../spatial/SpatialSecurityGuard';
import type { SpatialPermissionScope, Vec3 } from '../../spatial/types';

export interface SpatialAgentConfig {
  timeoutMs: number;
  maxEvaluationsRetained: number;
}

export class SpatialIntelligenceAgent {
  public readonly role: AgentRole = 'SPATIAL_INTELLIGENCE';
  private readonly worldAwareness: RealTimeWorldAwareness;
  private readonly securityGuard: SpatialSecurityGuard;
  private readonly config: SpatialAgentConfig;
  private evaluationHistory: AgentEvaluation[] = [];

  constructor(
    worldAwareness?: RealTimeWorldAwareness,
    config: Partial<SpatialAgentConfig> = {},
    securityGuard?: SpatialSecurityGuard
  ) {
    this.worldAwareness = worldAwareness || new RealTimeWorldAwareness();
    this.securityGuard =
      securityGuard || this.worldAwareness.getSubsystems().mappingEngine.getSecurityGuard();
    this.config = {
      timeoutMs: config.timeoutMs ?? 500,
      maxEvaluationsRetained: config.maxEvaluationsRetained ?? 40,
    };
  }

  /**
   * Fail-closed permission boundary check via SpatialSecurityGuard.
   */
  public authorizeSpatialAction(
    scope: SpatialPermissionScope,
    operationName: string
  ): { allowed: boolean; status: string; reason: string } {
    try {
      return this.securityGuard.checkAccess(scope, operationName);
    } catch (err) {
      return {
        allowed: false,
        status: 'unavailable',
        reason: err instanceof Error ? err.message : 'Security boundary check failed closed',
      };
    }
  }

  /**
   * Synchronous deterministic evaluation honoring Human/Player Control Priority.
   */
  public evaluate(world: WorldSnapshotInput): AgentEvaluation {
    const now = Date.now();
    const playerPos: Vec3 = world.spatialContext?.playerPosition || [0, 1.3, 4.5];
    const playerGaze: Vec3 = world.spatialContext?.playerGazeDirection || [0, 0, -1];
    const isHumanActive = Boolean(world.spatialContext?.isHumanInputActive);

    try {
      // Check any requested spatial hardware scopes against SpatialSecurityGuard
      let blockedScopeCount = 0;
      const blockedScopes: string[] = [];
      if (world.requestedSpatialScopes?.length) {
        for (const scope of world.requestedSpatialScopes) {
          const check = this.authorizeSpatialAction(scope, `SpatialAgent:${scope}`);
          if (!check.allowed) {
            blockedScopeCount++;
            blockedScopes.push(scope);
          }
        }
      }

      const awareness = this.worldAwareness.evaluateWorldState({
        playerPosition: playerPos,
        playerGazeDirection: playerGaze,
        gameSnapshot: world,
      });

      const boundaryEvent = awareness.activeSpatialEvents.find((e) => e.type === 'BOUNDARY_PROXIMITY');
      const occlusionEvent = awareness.activeSpatialEvents.find((e) => e.type === 'BEAM_OCCLUSION_RISK');

      let recommendation = `Spatial scene consistent (${awareness.semanticSummary.activeObjectCount} nodes).`;
      let actionType = 'MAINTAIN_SPATIAL_CONSISTENCY';
      const params: Record<string, unknown> = {
        sceneConsistent: awareness.sceneConsistent,
        recommendedTargetId: awareness.topPredictedInteraction?.objectId ?? null,
        humanControlYielded: isHumanActive,
        advisoryOnly: true,
        blockedScopes,
      };

      // Human/Player Control Priority: yield active steering or markers if human is manually manipulating
      if (isHumanActive) {
        recommendation = 'Human input active: Spatial AI yielding camera/manipulation authority to player.';
        actionType = 'YIELD_TO_HUMAN_CONTROL';
      } else if (!awareness.sceneConsistent) {
        recommendation = 'Spatial inconsistency detected in scene graph; recommending transform reconciliation.';
        actionType = 'RECONCILE_SCENE_GRAPH';
      } else if (boundaryEvent) {
        recommendation = boundaryEvent.description;
        actionType = 'SHOW_BOUNDARY_WARNING';
        params.boundaryAlert = true;
      } else if (occlusionEvent) {
        recommendation = occlusionEvent.description;
        actionType = 'HIGHLIGHT_SPATIAL_OCCLUSION';
      } else if (awareness.topPredictedInteraction && awareness.topPredictedInteraction.probability > 0.35) {
        recommendation = `Probabilistic spatial focus predicted: ${awareness.topPredictedInteraction.objectId} (${Math.round(awareness.topPredictedInteraction.probability * 100)}%).`;
        actionType = 'SUGGEST_SPATIAL_MARKER';
      }

      const evaluation: AgentEvaluation = {
        agentRole: this.role,
        timestamp: now,
        confidence: awareness.sceneConsistent ? 0.94 : 0.72,
        recommendation,
        suggestedAction: {
          type: actionType,
          params,
        },
        metrics: {
          sceneConsistent: awareness.sceneConsistent,
          activeSpatialEvents: awareness.activeSpatialEvents.length,
          nearestDistanceMeters: awareness.semanticSummary.nearestDistanceMeters ?? -1,
          predictedTargetId: awareness.topPredictedInteraction?.objectId ?? 'none',
          humanControlPriorityEnforced: true,
          securityBlockedScopeCount: blockedScopeCount,
        },
      };

      this.recordHistory(evaluation);
      return evaluation;
    } catch {
      return this.deterministicFallback(now, isHumanActive);
    }
  }

  /**
   * Timeout- and AbortSignal-guarded asynchronous evaluation with error recovery.
   */
  public async evaluateWithTimeout(
    world: WorldSnapshotInput,
    abortSignal?: AbortSignal
  ): Promise<AgentEvaluation> {
    const isHumanActive = Boolean(world.spatialContext?.isHumanInputActive);
    if (abortSignal?.aborted || isHumanActive) {
      return this.yieldFallback(Date.now(), 'HUMAN_CONTROL_PRIORITY');
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let abortListener: (() => void) | null = null;

    const evalPromise = new Promise<AgentEvaluation>((resolve) => {
      resolve(this.evaluate(world));
    });

    const guardPromise = new Promise<AgentEvaluation>((resolve, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`SpatialIntelligenceAgent timed out after ${this.config.timeoutMs}ms`)),
        this.config.timeoutMs
      );
      if (abortSignal) {
        abortListener = () => {
          resolve(this.yieldFallback(Date.now(), 'ABORT_SIGNAL_YIELD'));
        };
        abortSignal.addEventListener('abort', abortListener, { once: true });
      }
    });

    try {
      const result = await Promise.race([evalPromise, guardPromise]);
      if (abortSignal?.aborted) {
        return this.yieldFallback(Date.now(), 'ABORT_SIGNAL_YIELD');
      }
      return result;
    } catch {
      return this.deterministicFallback(Date.now(), isHumanActive);
    } finally {
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }
      if (abortSignal && abortListener) {
        abortSignal.removeEventListener('abort', abortListener);
      }
    }
  }

  /**
   * Generates structured coordination messages for the other 5 agents.
   */
  public createCoordinationMessages(world: WorldSnapshotInput): AgentMessage[] {
    const isHumanActive = Boolean(world.spatialContext?.isHumanInputActive);
    const evalRes = this.evaluate(world);
    const messages: AgentMessage[] = [];
    const now = Date.now();

    if (evalRes.suggestedAction?.type === 'SHOW_BOUNDARY_WARNING') {
      messages.push({
        id: `spatial-msg-${now}-env`,
        senderRole: this.role,
        targetRole: 'ENVIRONMENT_INTELLIGENCE',
        priority: 'high',
        topic: 'SPATIAL_BOUNDARY_HALO',
        payload: { reason: evalRes.recommendation },
        timestamp: now,
      });
    }

    // Do not push predictive targeting hints while human player is actively manipulating objects
    if (!isHumanActive && evalRes.metrics.predictedTargetId && evalRes.metrics.predictedTargetId !== 'none') {
      messages.push({
        id: `spatial-msg-${now}-assist`,
        senderRole: this.role,
        targetRole: 'PLAYER_ASSISTANCE',
        priority: 'medium',
        topic: 'PREDICTED_INTERACTION_TARGET',
        payload: {
          targetId: evalRes.metrics.predictedTargetId,
          advisoryOnly: true,
        },
        timestamp: now,
      });
    }

    return messages;
  }

  public yieldFallback(timestamp = Date.now(), reason = 'YIELD_TO_HUMAN_CONTROL'): AgentEvaluation {
    const yielded: AgentEvaluation = {
      agentRole: this.role,
      timestamp,
      confidence: 1.0,
      recommendation: `Human input priority active (${reason}): autonomous spatial steering yielded.`,
      suggestedAction: {
        type: 'YIELD_TO_HUMAN_CONTROL',
        params: { humanControlYielded: true, advisoryOnly: true, reason },
      },
      metrics: {
        sceneConsistent: true,
        humanControlPriorityEnforced: true,
        abortedStaleCycle: true,
      },
    };
    this.recordHistory(yielded);
    return yielded;
  }

  public deterministicFallback(timestamp = Date.now(), isHumanActive = false): AgentEvaluation {
    if (isHumanActive) {
      return this.yieldFallback(timestamp, 'HUMAN_ACTIVE_FALLBACK');
    }
    const fallback: AgentEvaluation = {
      agentRole: this.role,
      timestamp,
      confidence: 0.85,
      recommendation: 'Deterministic spatial baseline active; chamber bounds nominal.',
      suggestedAction: {
        type: 'MAINTAIN_SPATIAL_CONSISTENCY',
        params: { fallbackMode: true, advisoryOnly: true },
      },
      metrics: {
        sceneConsistent: true,
        fallbackUsed: true,
        humanControlPriorityEnforced: true,
      },
    };
    this.recordHistory(fallback);
    return fallback;
  }

  public getWorldAwareness(): RealTimeWorldAwareness {
    return this.worldAwareness;
  }

  public getSecurityGuard(): SpatialSecurityGuard {
    return this.securityGuard;
  }

  public getEvaluationHistory(): AgentEvaluation[] {
    return [...this.evaluationHistory];
  }

  private recordHistory(ev: AgentEvaluation): void {
    this.evaluationHistory.push(ev);
    if (this.evaluationHistory.length > this.config.maxEvaluationsRetained) {
      this.evaluationHistory.shift();
    }
  }
}
