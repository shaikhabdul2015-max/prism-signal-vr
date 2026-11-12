// src/ai/orchestration/AgentOrchestrator.ts
import type {
  AgentEvaluation,
  AgentMessage,
  AgentRole,
  OrchestrationCycleResult,
  WorldSnapshotInput,
} from './types';
import { GameDirectorAgent } from './GameDirectorAgent';
import { EnvironmentAgent } from './EnvironmentAgent';
import { PuzzleAgent } from './PuzzleAgent';
import { NarrativeAgent } from './NarrativeAgent';
import { PlayerAssistanceAgent } from './PlayerAssistanceAgent';
import { SpatialIntelligenceAgent } from './SpatialIntelligenceAgent';
import { RealTimeWorldAwareness } from '../../spatial/RealTimeWorldAwareness';
import { SpatialSecurityGuard } from '../../spatial/SpatialSecurityGuard';
import type { SpatialPermissionScope } from '../../spatial/types';

const PRIORITY_SCORES: Record<AgentMessage['priority'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export interface AgentResourceConsumption {
  totalCyclesExecuted: number;
  averageCycleDurationMs: number;
  lastCycleDurationMs: number;
  queuedMessageCount: number;
  historyLength: number;
  humanControlYieldCount: number;
  abortedCycleCount: number;
  securityBlockedCount: number;
}

export interface AgentOrchestratorOptions {
  worldAwareness?: RealTimeWorldAwareness;
  securityGuard?: SpatialSecurityGuard;
}

export interface AsyncCycleOptions {
  timeoutMs?: number;
  modelName?: string;
  signal?: AbortSignal;
  evaluateAsync?: (signal: AbortSignal) => Promise<OrchestrationCycleResult>;
}

export class AgentOrchestrator {
  private readonly director: GameDirectorAgent;
  private readonly environment: EnvironmentAgent;
  private readonly puzzle: PuzzleAgent;
  private readonly narrative: NarrativeAgent;
  private readonly assistance: PlayerAssistanceAgent;
  private readonly spatial: SpatialIntelligenceAgent;
  private readonly securityGuard: SpatialSecurityGuard;

  private messageQueue: AgentMessage[] = [];
  private history: OrchestrationCycleResult[] = [];
  private readonly maxHistoryLength = 50;
  private totalCycleDurationMs = 0;
  private lastCycleDurationMs = 0;

  // Human control priority & race-condition safety state
  private humanInputActive = false;
  private humanInputEpoch = 0;
  private activeAbortController: AbortController | null = null;
  private humanControlYieldCount = 0;
  private abortedCycleCount = 0;
  private securityBlockedCount = 0;

  constructor(options: AgentOrchestratorOptions = {}) {
    const worldAwareness = options.worldAwareness;
    this.securityGuard =
      options.securityGuard ||
      worldAwareness?.getSubsystems().mappingEngine.getSecurityGuard() ||
      new SpatialSecurityGuard();

    this.director = new GameDirectorAgent();
    this.environment = new EnvironmentAgent();
    this.puzzle = new PuzzleAgent();
    this.narrative = new NarrativeAgent();
    this.assistance = new PlayerAssistanceAgent();
    this.spatial = new SpatialIntelligenceAgent(worldAwareness, {}, this.securityGuard);
  }

  /**
   * Signals active human player control (mouse drag, touch, WebXR controller, or hand grab).
   * Increments the monotonic epoch and aborts any in-flight asynchronous orchestration cycle
   * so stale autonomous operations are discarded cleanly without race conditions.
   */
  public notifyHumanInputStart(source = 'player_input'): number {
    this.humanInputEpoch += 1;
    this.humanInputActive = true;

    if (this.activeAbortController && !this.activeAbortController.signal.aborted) {
      this.activeAbortController.abort(`HUMAN_INPUT_PRIORITY:${source}`);
    }

    this.postMessage({
      id: `human-priority-${Date.now()}-${this.humanInputEpoch}`,
      senderRole: 'SPATIAL_INTELLIGENCE',
      targetRole: 'BROADCAST',
      priority: 'critical',
      topic: 'HUMAN_CONTROL_PRIORITY_ACTIVE',
      payload: {
        epoch: this.humanInputEpoch,
        source,
        yieldRequired: true,
      },
      timestamp: Date.now(),
    });

    return this.humanInputEpoch;
  }

  /**
   * Signals that manual player input has ended, safely restoring normal orchestration
   * for future cycles without replaying cancelled stale cycles.
   */
  public notifyHumanInputEnd(): number {
    this.humanInputActive = false;
    return this.humanInputEpoch;
  }

  public isHumanControlActive(): boolean {
    return this.humanInputActive;
  }

  public getHumanInputEpoch(): number {
    return this.humanInputEpoch;
  }

  public getSecurityGuard(): SpatialSecurityGuard {
    return this.securityGuard;
  }

  /**
   * Enforces fail-closed SpatialSecurityGuard check before any autonomous spatial operation.
   */
  public authorizeSpatialOperation(
    scope: SpatialPermissionScope,
    actionName: string
  ): { allowed: boolean; status: string; reason: string } {
    try {
      const check = this.securityGuard.checkAccess(scope, actionName);
      if (!check.allowed) {
        this.securityBlockedCount++;
      }
      return check;
    } catch (err) {
      this.securityBlockedCount++;
      return {
        allowed: false,
        status: 'unavailable',
        reason: err instanceof Error ? err.message : 'Security verification failed closed',
      };
    }
  }

  public postMessage(message: AgentMessage): void {
    this.messageQueue.push(message);
    // Sort queue by priority descending (critical first)
    this.messageQueue.sort((a, b) => PRIORITY_SCORES[b.priority] - PRIORITY_SCORES[a.priority]);
    if (this.messageQueue.length > 100) {
      this.messageQueue.pop(); // remove lowest priority
    }
  }

  public getMessagesForRole(role: AgentRole): AgentMessage[] {
    return this.messageQueue.filter(
      (m) => m.targetRole === role || m.targetRole === 'BROADCAST'
    );
  }

  public popNextMessageForRole(role: AgentRole): AgentMessage | undefined {
    const idx = this.messageQueue.findIndex(
      (m) => m.targetRole === role || m.targetRole === 'BROADCAST'
    );
    if (idx !== -1) {
      const [msg] = this.messageQueue.splice(idx, 1);
      return msg;
    }
    return undefined;
  }

  public executeCycle(
    world: WorldSnapshotInput,
    modelName = 'Meta Llama 3.3 / Local Heuristic Hybrid'
  ): OrchestrationCycleResult {
    const startCycle = Date.now();
    const cycleEpoch = this.humanInputEpoch;
    const cycleId = `cycle-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const isHumanActive = this.humanInputActive || Boolean(world.spatialContext?.isHumanInputActive);

    const normalizedWorld: WorldSnapshotInput = {
      ...world,
      spatialContext: {
        playerPosition: world.spatialContext?.playerPosition || [0, 1.3, 4.5],
        playerGazeDirection: world.spatialContext?.playerGazeDirection || [0, 0, -1],
        isHumanInputActive: isHumanActive,
      },
    };

    // Fail-closed security gating for requested hardware spatial capabilities
    const securityBlockedActions: Array<{ scope: string; action: string; reason: string }> = [];
    if (normalizedWorld.requestedSpatialScopes?.length) {
      for (const scope of normalizedWorld.requestedSpatialScopes) {
        const res = this.authorizeSpatialOperation(scope, `Orchestrator:${scope}`);
        if (!res.allowed) {
          securityBlockedActions.push({
            scope,
            action: `REQUEST_${scope.toUpperCase()}`,
            reason: res.reason,
          });
        }
      }
    }

    // 1. Evaluate all 6 agents with error isolation
    let directorEval = this.safeEvaluate(() => this.director.evaluate(normalizedWorld), 'GAME_DIRECTOR');
    let environmentEval = this.safeEvaluate(() => this.environment.evaluate(normalizedWorld), 'ENVIRONMENT_INTELLIGENCE');
    const puzzleEval = this.safeEvaluate(() => this.puzzle.evaluate(normalizedWorld), 'PUZZLE_INTELLIGENCE');
    const narrativeEval = this.safeEvaluate(() => this.narrative.evaluate(normalizedWorld), 'NARRATIVE_INTELLIGENCE');
    const assistanceEval = this.safeEvaluate(() => this.assistance.evaluate(normalizedWorld), 'PLAYER_ASSISTANCE');
    const spatialEval = this.safeEvaluate(() => this.spatial.evaluate(normalizedWorld), 'SPATIAL_INTELLIGENCE');

    // Dispatch structured coordination messages from Spatial Agent to other agents
    try {
      for (const msg of this.spatial.createCoordinationMessages(normalizedWorld)) {
        this.postMessage(msg);
      }
    } catch {
      // Isolated coordination failure must never interrupt orchestration
    }

    // 2. Conflict Resolution: Resolve conflicting agent responses
    // Conflict 1: Director/Environment vs Player Assistance: When player frustration is elevated (>0.5), prioritize player comfort over dramatic tension spike
    if (normalizedWorld.playerFrustration > 0.5) {
      directorEval = {
        ...directorEval,
        recommendation: 'Tension mitigated: player comfort prioritised over dramatic climax.',
        suggestedAction: {
          type: 'SET_GLOBAL_TENSION',
          params: { tensionLevel: 0.35 },
        },
        metrics: {
          ...directorEval.metrics,
          currentTension: 0.35,
          conflictResolved: true,
        },
      };

      environmentEval = {
        ...environmentEval,
        recommendation: 'Ambient illumination boosted to alleviate frustration.',
        suggestedAction: {
          type: 'UPDATE_ENVIRONMENT_PARAMETERS',
          params: {
            ambientIntensity: 0.85,
            particleSpeed: 0.7,
            fogDensity: 0.012,
            chromaticAberration: 0.0,
          },
        },
      };
    }

    const evaluations: Record<AgentRole, AgentEvaluation> = {
      GAME_DIRECTOR: directorEval,
      ENVIRONMENT_INTELLIGENCE: environmentEval,
      PUZZLE_INTELLIGENCE: puzzleEval,
      NARRATIVE_INTELLIGENCE: narrativeEval,
      PLAYER_ASSISTANCE: assistanceEval,
      SPATIAL_INTELLIGENCE: spatialEval,
    };

    // 3. Synthesize applied actions honoring Human Control Priority
    const appliedActions: Array<{ targetSystem: string; action: string; details: Record<string, unknown> }> = [];
    let suspendedAutonomousActions = 0;

    if (isHumanActive) {
      // Suspend conflicting autonomous pacing, assistance hints, puzzle overrides, and camera guidance
      if (directorEval.suggestedAction) suspendedAutonomousActions++;
      if (environmentEval.suggestedAction) suspendedAutonomousActions++;
      if (puzzleEval.suggestedAction && puzzleEval.suggestedAction.type !== 'MONITOR') suspendedAutonomousActions++;
      if (assistanceEval.suggestedAction && assistanceEval.suggestedAction.type !== 'SUPPRESS_ASSISTANCE') {
        suspendedAutonomousActions++;
      }

      this.humanControlYieldCount++;
      appliedActions.push({
        targetSystem: 'HUMAN_CONTROL_ARBITER',
        action: 'YIELD_TO_HUMAN_CONTROL',
        details: {
          epoch: cycleEpoch,
          suspendedAutonomousActions,
          humanControlPriorityEnforced: true,
          advisoryOnly: true,
        },
      });
    } else {
      if (directorEval.suggestedAction) {
        appliedActions.push({
          targetSystem: 'GAME_PACING',
          action: directorEval.suggestedAction.type,
          details: directorEval.suggestedAction.params,
        });
      }
      if (environmentEval.suggestedAction) {
        appliedActions.push({
          targetSystem: 'RENDER_ENVIRONMENT',
          action: environmentEval.suggestedAction.type,
          details: environmentEval.suggestedAction.params,
        });
      }
      if (puzzleEval.suggestedAction && puzzleEval.suggestedAction.type !== 'MONITOR') {
        appliedActions.push({
          targetSystem: 'PUZZLE_SYSTEM',
          action: puzzleEval.suggestedAction.type,
          details: puzzleEval.suggestedAction.params,
        });
      }
      if (narrativeEval.suggestedAction) {
        appliedActions.push({
          targetSystem: 'NARRATIVE_HUD',
          action: narrativeEval.suggestedAction.type,
          details: narrativeEval.suggestedAction.params,
        });
      }
      if (assistanceEval.suggestedAction && assistanceEval.suggestedAction.type !== 'SUPPRESS_ASSISTANCE') {
        appliedActions.push({
          targetSystem: 'SPATIAL_ASSISTANCE',
          action: assistanceEval.suggestedAction.type,
          details: assistanceEval.suggestedAction.params,
        });
      }
      if (spatialEval.suggestedAction) {
        appliedActions.push({
          targetSystem: 'SPATIAL_REALITY',
          action: spatialEval.suggestedAction.type,
          details: spatialEval.suggestedAction.params,
        });
      }
    }

    const synthesizedDirective = isHumanActive
      ? `Orchestration Cycle ${cycleId}: YIELD_TO_HUMAN_CONTROL active (epoch ${cycleEpoch}); ${suspendedAutonomousActions} autonomous directive(s) suspended.`
      : `Orchestration Cycle ${cycleId}: Global tension at ${(this.director.getTension() * 100).toFixed(0)}%. ${directorEval.recommendation} | ${environmentEval.recommendation}`;

    const result: OrchestrationCycleResult = {
      cycleId,
      timestamp: Date.now(),
      globalTensionLevel: (directorEval.metrics.currentTension as number) ?? this.director.getTension(),
      agentEvaluations: evaluations,
      synthesizedDirective,
      appliedActions,
      modelUsed: modelName,
      humanControlActive: isHumanActive,
      humanInputEpoch: cycleEpoch,
      suspendedAutonomousActions,
      securityBlockedActions: securityBlockedActions.length > 0 ? securityBlockedActions : undefined,
    };

    this.recordCycle(result, startCycle);
    return result;
  }

  /**
   * Race-safe, timeout-guarded, AbortController-aware asynchronous orchestration execution.
   * Discards stale results if human input interrupts mid-flight or signal aborts.
   */
  public async executeCycleWithTimeout(
    world: WorldSnapshotInput,
    timeoutMs = 1500,
    modelName = 'Meta Llama 3.3 / Local Heuristic Hybrid',
    options: Omit<AsyncCycleOptions, 'timeoutMs' | 'modelName'> = {}
  ): Promise<OrchestrationCycleResult> {
    const startEpoch = this.humanInputEpoch;
    const isHumanAtStart = this.humanInputActive || Boolean(world.spatialContext?.isHumanInputActive);

    if (isHumanAtStart || options.signal?.aborted) {
      if (options.signal?.aborted) {
        return this.buildAbortedYieldResult(world, 'EXTERNAL_ABORT_SIGNAL', startEpoch);
      }
      return this.executeCycle(
        {
          ...world,
          spatialContext: {
            playerPosition: world.spatialContext?.playerPosition || [0, 1.3, 4.5],
            playerGazeDirection: world.spatialContext?.playerGazeDirection || [0, 0, -1],
            isHumanInputActive: true,
          },
        },
        modelName
      );
    }

    const controller = new AbortController();
    this.activeAbortController = controller;

    let externalAbortHandler: (() => void) | null = null;
    if (options.signal) {
      externalAbortHandler = () => controller.abort('EXTERNAL_ABORT_SIGNAL');
      options.signal.addEventListener('abort', externalAbortHandler, { once: true });
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const workPromise = new Promise<OrchestrationCycleResult>((resolve, reject) => {
      if (options.evaluateAsync) {
        options.evaluateAsync(controller.signal).then(resolve).catch(reject);
      } else {
        resolve(this.executeCycle(world, modelName));
      }
    });

    const guardPromise = new Promise<OrchestrationCycleResult>((resolve, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`Orchestration cycle timed out after ${timeoutMs}ms`)),
        timeoutMs
      );
      controller.signal.addEventListener(
        'abort',
        () => {
          resolve(
            this.buildAbortedYieldResult(
              world,
              typeof controller.signal.reason === 'string'
                ? controller.signal.reason
                : 'HUMAN_INPUT_PRIORITY_INTERRUPT',
              this.humanInputEpoch
            )
          );
        },
        { once: true }
      );
    });

    try {
      const outcome = await Promise.race([workPromise, guardPromise]);

      // Discard stale autonomous result if human input occurred while async cycle was running
      if (
        controller.signal.aborted ||
        this.humanInputEpoch !== startEpoch ||
        this.humanInputActive
      ) {
        if (!outcome.aborted) {
          return this.buildAbortedYieldResult(world, 'STALE_CYCLE_DISCARDED_FOR_HUMAN_CONTROL', this.humanInputEpoch);
        }
      }

      return outcome;
    } catch {
      if (controller.signal.aborted || this.humanInputActive || this.humanInputEpoch !== startEpoch) {
        return this.buildAbortedYieldResult(world, 'ABORTED_BEFORE_FALLBACK', this.humanInputEpoch);
      }
      // Failure recovery: Return fallback cycle with safe parameters
      return this.executeCycle(
        {
          ...world,
          playerFrustration: 0.2,
        },
        'Local Safe Fallback Engine'
      );
    } finally {
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }
      if (options.signal && externalAbortHandler) {
        options.signal.removeEventListener('abort', externalAbortHandler);
      }
      if (this.activeAbortController === controller) {
        this.activeAbortController = null;
      }
    }
  }

  private buildAbortedYieldResult(
    world: WorldSnapshotInput,
    abortReason: string,
    epoch: number
  ): OrchestrationCycleResult {
    const start = Date.now();
    this.abortedCycleCount++;
    this.humanControlYieldCount++;
    const spatialYield = this.spatial.yieldFallback(start, abortReason);

    const safeWorld: WorldSnapshotInput = {
      ...world,
      spatialContext: {
        playerPosition: world.spatialContext?.playerPosition || [0, 1.3, 4.5],
        playerGazeDirection: world.spatialContext?.playerGazeDirection || [0, 0, -1],
        isHumanInputActive: true,
      },
    };

    const result: OrchestrationCycleResult = {
      cycleId: `cycle-aborted-${start}-${epoch}`,
      timestamp: start,
      globalTensionLevel: this.director.getTension(),
      agentEvaluations: {
        GAME_DIRECTOR: this.safeEvaluate(() => this.director.evaluate(safeWorld), 'GAME_DIRECTOR'),
        ENVIRONMENT_INTELLIGENCE: this.safeEvaluate(() => this.environment.evaluate(safeWorld), 'ENVIRONMENT_INTELLIGENCE'),
        PUZZLE_INTELLIGENCE: this.safeEvaluate(() => this.puzzle.evaluate(safeWorld), 'PUZZLE_INTELLIGENCE'),
        NARRATIVE_INTELLIGENCE: this.safeEvaluate(() => this.narrative.evaluate(safeWorld), 'NARRATIVE_INTELLIGENCE'),
        PLAYER_ASSISTANCE: this.safeEvaluate(() => this.assistance.evaluate(safeWorld), 'PLAYER_ASSISTANCE'),
        SPATIAL_INTELLIGENCE: spatialYield,
      },
      synthesizedDirective: `Pending autonomous cycle discarded (${abortReason}): YIELD_TO_HUMAN_CONTROL enforced.`,
      appliedActions: [
        {
          targetSystem: 'HUMAN_CONTROL_ARBITER',
          action: 'YIELD_TO_HUMAN_CONTROL',
          details: {
            aborted: true,
            abortReason,
            epoch,
            humanControlPriorityEnforced: true,
          },
        },
      ],
      modelUsed: 'Human Control Arbiter (Yield Fallback)',
      aborted: true,
      abortReason,
      humanControlActive: true,
      humanInputEpoch: epoch,
      suspendedAutonomousActions: 5,
    };

    this.recordCycle(result, start);
    return result;
  }

  private safeEvaluate(fn: () => AgentEvaluation, role: AgentRole): AgentEvaluation {
    try {
      return fn();
    } catch {
      return {
        agentRole: role,
        timestamp: Date.now(),
        confidence: 0.5,
        recommendation: `${role} recovered via isolated fallback.`,
        suggestedAction: {
          type: 'SAFE_ISOLATED_FALLBACK',
          params: { advisoryOnly: true },
        },
        metrics: {
          isolatedFallback: true,
        },
      };
    }
  }

  private recordCycle(result: OrchestrationCycleResult, startCycle: number): void {
    this.history.push(result);
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }
    const duration = Math.max(0.5, Date.now() - startCycle);
    this.lastCycleDurationMs = duration;
    this.totalCycleDurationMs += duration;
  }

  public getResourceStats(): AgentResourceConsumption {
    const total = this.history.length;
    return {
      totalCyclesExecuted: total,
      averageCycleDurationMs: total > 0 ? Number((this.totalCycleDurationMs / total).toFixed(2)) : 0.0,
      lastCycleDurationMs: this.lastCycleDurationMs,
      queuedMessageCount: this.messageQueue.length,
      historyLength: this.history.length,
      humanControlYieldCount: this.humanControlYieldCount,
      abortedCycleCount: this.abortedCycleCount,
      securityBlockedCount: this.securityBlockedCount,
    };
  }

  public getHistory(): OrchestrationCycleResult[] {
    return [...this.history];
  }

  public getAgents() {
    return {
      director: this.director,
      environment: this.environment,
      puzzle: this.puzzle,
      narrative: this.narrative,
      assistance: this.assistance,
      spatial: this.spatial,
    };
  }
}
