# PRISM SIGNAL: BEYOND THE VOID — SPATIAL OBJECT INTELLIGENCE
## Semantic Metadata Graph, Interaction Eligibility & Permission-Gated Recognition

**Module**: `src/spatial/SpatialObjectIntelligence.ts`  
**Baseline Metadata Source**: `CONSOLE_EMITTER_POS`, `DEFAULT_CRYSTALS`, `TARGET_RECEIVER_POS` (`src/puzzle/puzzleEngine.ts`)  

---

### 1. Metadata-First Relational Graph

Rather than relying on unverified computer vision or hardcoded guesses, `SpatialObjectIntelligence` builds a deterministic semantic graph directly from authoritative game-object metadata:
- `console-emitter` —(`illuminates`)→ `ruby`
- `ruby` —(`reflects_to`)→ `azure`
- `azure` —(`reflects_to`)→ `emerald`
- `emerald` —(`reflects_to`)→ `target-receiver`
- Dynamic `hazard` nodes within `1.5m` of any crystal automatically emit an `obstructs` relationship edge, alerting downstream eligibility and awareness checks.

### 2. Interaction Eligibility Scoring

`evaluateEligibility(objectId, playerPosition, poweredNodeIds)` computes a composite `eligibilityScore` ($0.0 - 1.0$) and boolean `isEligible` decision using:
- `isInteractable` and `!isCurrentlyLocked` flags
- `isWithinReach` ($d \le 6.5\text{m} + \text{boundingRadius}$)
- `!isObstructed` (no active `obstructs` edge on the entity)
- Upstream power chain readiness (`requiresPriorNodeId` present in `poweredNodeIds`)

### 3. Semantic Scene Descriptions

`generateSemanticSceneDescription(playerPosition)` synthesizes human-readable spatial summaries (`summaryText` and `keyObservations`) detailing active entity counts, optical chain relationship counts, and nearest interactable object distances for AI agents and accessibility HUDs.

### 4. Optional Camera-Based Object Recognition Boundary

`attemptCameraObjectRecognition()` strictly enforces fail-closed security:
- Calls `securityGuard.checkAccess('camera_recognition', 'analyzeCameraFeed')`.
- When denied or hardware is unsupported (default state), returns `executed: false` with zero frame captures and falls back transparently to deterministic game metadata.
