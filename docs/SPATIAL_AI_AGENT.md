# PRISM SIGNAL: BEYOND THE VOID — SPATIAL AI AGENT
## 6th Specialized Orchestration Agent (`SPATIAL_INTELLIGENCE`)

**Modules**: `src/ai/orchestration/SpatialIntelligenceAgent.ts`, `src/ai/orchestration/AgentOrchestrator.ts`  

---

### 1. Agent Mandate & Six-Agent Cluster

Stage 7 introduces `SpatialIntelligenceAgent` (`role: 'SPATIAL_INTELLIGENCE'`) alongside the five Stage 6 agents:
1. `GAME_DIRECTOR`
2. `ENVIRONMENT_INTELLIGENCE`
3. `PUZZLE_INTELLIGENCE`
4. `NARRATIVE_INTELLIGENCE`
5. `PLAYER_ASSISTANCE`
6. **`SPATIAL_INTELLIGENCE` (New in Stage 7)**

### 2. Responsibilities & Structured Communication

`SpatialIntelligenceAgent` analyzes live 3D context via `RealTimeWorldAwareness` and dispatches priority-sorted `AgentMessage` packets through `AgentOrchestrator`:
- Emits `SPATIAL_BOUNDARY_HALO` (`priority: 'high'`) to `ENVIRONMENT_INTELLIGENCE` when the player approaches perimeter walls.
- Emits `PREDICTED_INTERACTION_TARGET` (`priority: 'medium'`, `advisoryOnly: true`) to `PLAYER_ASSISTANCE` when probabilistic focus confidence exceeds `35%`.

### 3. Safety, Reliability & Human Control Priority

- **Human/Player Control Priority**: When `world.spatialContext?.isHumanInputActive` is `true`, the agent immediately emits `YIELD_TO_HUMAN_CONTROL` and suppresses active suggestions (`humanControlPriorityEnforced: true`).
- **Timeout Protection**: `evaluateWithTimeout` guards execution against a configurable deadline (default `500ms`) using `Promise.race`.
- **Deterministic Fallback & Error Recovery**: Any exception or timeout automatically recovers via `deterministicFallback()`, guaranteeing uninterrupted 72–90Hz loop continuity.
- **Resource Limits**: Evaluation history is strictly capped (`maxEvaluationsRetained = 40`).
