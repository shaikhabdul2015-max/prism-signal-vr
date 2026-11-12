# MASTER ARCHITECTURE & DEPENDENCY MAP

**Audit Date:** 2026-11-10T13:30:00Z  
**Codebase Inventory:** `327` files across `src/` and `server/`, `35` test files in `tests/`, `1` orphaned duplicate in `src/tests/`

---

## 1. High-Level System Topology

```
+-------------------------------------------------------------------------+
| CLIENT ENTRY (index.html -> src/main.tsx -> src/App.tsx)                |
|  +-- Track A (Active Gameplay):                                         |
|  |   src/scene/sceneManager.ts (Three.js + WebXR + GPUResourceRecovery) |
|  |   src/scene/handInteraction.ts, crystals.ts, laserBeams.ts, ...      |
|  |   src/puzzle/puzzleEngine.ts, src/audio/soundEngine.ts               |
|  +-- Track B (Diagnostics & Phase 15-36 Command Center):                |
|      GlobalCommandCenter.tsx -> 26 sub-dashboards                       |
|      UnifiedSuperintelligenceCommandCenter -> Phase36IntegrationCoord   |
|      src/services/* (firebaseAuthService, firebaseDbService,            |
|                      CommandAuditService, TenantContextManager)         |
|      src/engines/* (Phases 25-36 + Stage 1-3 engines)                   |
+------------------------------------+------------------------------------+
                                     | HTTP /api/* (Vite middleware in dev)
+------------------------------------v------------------------------------+
| EXPRESS SERVER (server.ts)                                              |
|  +-- Middleware: securityHeadersMiddleware, requestTimeout(8000),       |
|  |               serverRateLimiter(240), replayProtectionMiddleware     |
|  +-- /api/llama & /api/diagnostics -> server/routes/llama.ts            |
|  |     -> Groq/Llama API (10s timeout) OR deterministic Rule #2 engine  |
|  +-- /api/cloud -> server/routes/cloud.ts (in-memory Maps + 120/min RL) |
|  +-- /api/health -> health JSON                                         |
+-------------------------------------------------------------------------+

+-------------------------------------------------------------------------+
| DISCONNECTED / TEST-ONLY TRACKS (NOT MOUNTED IN App.tsx OR server.ts)   |
|  1. Stage 6-7 Adaptive AI & Spatial Layer:                              |
|     src/ai/orchestration/AgentOrchestrator.ts (6 agents)                |
|     src/spatial/* (Mapping, Object, Predictive, WorldAwareness, Viz)    |
|     src/webxr/intelligence/* (ContextualInteraction, SpatialAssistant)  |
|  2. Stage 5.1 Asset Streaming: src/streaming/*, src/loaders/*           |
|  3. Stage 5.2 KMS & Envelope Encryption: src/security/kms/*, encryption |
|  4. Stage 5.3 Threat Mitigation & Dashboard:                            |
|     src/security/threat-detection/*, response/*, dashboard/SecurityDash |
|     (GlobalCommandCenter mounts Phase 32 AdvancedSecurityDashboard)     |
+-------------------------------------------------------------------------+
```

---

## 2. Import Graph & Circular Dependency Analysis

- **Files Scanned:** `327` `.ts` / `.tsx` files (`src/` + `server/`)
- **Broken Relative Imports:** `0`
- **Circular Import Cycles:** `1`
  - `src/engines/DistributedAgentNetwork.ts` -> `src/engines/AgentCommunicationProtocol.ts` -> `src/engines/DistributedAgentNetwork.ts`
  - **Impact:** Both files resolve via lazy singleton `.getInstance()` methods rather than top-level evaluation, so Node/Vite execute cleanly without `ReferenceError`, but splitting shared envelope types or removing the back-edge is recommended for strict DAG cleanliness.

---

## 3. Overlapping / Parallel Module Inventory

| Concept | Older / Parallel Implementation | Newer / Stage 5–7 Implementation | Conflict / Impact |
|---|---|---|---|
| **Multi-Agent Coordination** | `src/utils/agentCoordinator.ts` (Phase 18 QA) & `src/engines/ExecutiveAgentCouncil.ts` (Phase 36 static council) | `src/ai/orchestration/AgentOrchestrator.ts` (Stage 6–7 runtime 6-agent loop) | **Disconnected:** Different agent taxonomies; Phase 36 council does not read live metrics from Stage 7. |
| **Runtime Security Monitor** | `src/engines/RuntimeSecurityMonitor.ts` (Phase 32) | `src/security/runtime/RuntimeSecurityMonitor.ts` (Stage 5.3) | Duplicate class name across directories; imports remain distinct, no build collision. |
| **Incident Manager** | `src/utils/incidentManager.ts` (Phase 17 sensor incidents) | `src/security/incidents/IncidentManager.ts` (Stage 5.3 security incidents) | Duplicate class name; separate domains (VR QA vs security). |
| **Security Dashboard** | `src/components/AdvancedSecurityDashboard.tsx` (Phase 32, mounted in `GlobalCommandCenter`) | `src/security/dashboard/SecurityDashboard.tsx` (Stage 5.3, unmounted) | Stage 5.3 `SecurityDashboard` is not rendered in `App.tsx` or `GlobalCommandCenter`. |
| **Rate Limiting** | `server/middleware/securityMiddleware.ts` (`serverRateLimiter`) & `server/routes/cloud.ts` | `src/security/rate-limiting/RateLimitStore.ts` (`DistributedRedisRateLimitStore`) | Server routes use local in-memory `Map` instead of Stage 5.3 Redis-backed store. |
| **HighThroughputQueue Test** | `src/tests/HighThroughputQueue.test.ts` (older 6-test copy) | `tests/HighThroughputQueue.test.ts` (12-test copy executed by `npm test`) | `src/tests/HighThroughputQueue.test.ts` is orphaned outside `tests/**/*.test.ts`. |
