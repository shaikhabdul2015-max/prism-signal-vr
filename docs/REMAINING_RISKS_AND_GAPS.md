# REMAINING RISKS, DEFECTS & GAPS

**Audit Date:** 2026-11-10T13:30:00Z  

---

## 1. Production Deployment Blockers & Critical Architectural Gaps

1. **Stage 6 & 7 Runtime Disconnection (`NOT_IMPLEMENTED` in App Loop):**
   - `AgentOrchestrator`, `SpatialIntelligenceAgent`, `DynamicDifficultyEngine`, `ContextualInteractionSystem`, `SpatialMappingEngine`, `RealTimeWorldAwareness`, and `WebXRCompatibilityManager` are fully tested in isolation, **but are not invoked by `src/App.tsx`, `src/scene/sceneManager.ts`, or `Phase36IntegrationCoordinator.ts`**.
2. **Untested External Infrastructure Dependencies (`NOT_TESTED`):**
   - Live Google Cloud KMS keys & IAM checks (`@google-cloud/kms` with real ADC credentials).
   - Live Distributed Redis Cluster (rate limiter currently runs on `IN_MEMORY_FALLBACK`).
   - Live Firebase Firestore remote database writes (`VITE_FIREBASE_BYPASS_REMOTE="true"` in `.env.example`, `/api/cloud/sync` persists only to in-memory `Map` objects).
   - Live Groq / Meta Llama upstream inference (`LLAMA_API_KEY` unset; `/api/llama/analyze` executes deterministic Rule #2 fallback).
3. **Physical WebXR Headset Validation (`NOT_TESTED`):**
   - Meta Quest 3, Apple Vision Pro, and HTC Vive 6DoF controllers, 25-joint optical hand-tracking, room mesh scanning, and passthrough AR have not been tested on physical hardware (`physicalHardwareCertified: false`).

---

## 2. Specific Code & Configuration Defects Identified

| ID | Severity | Location | Finding |
|---|---|---|---|
| **DEF-01** | **High** | `server.ts:21` vs `server/routes/llama.ts:620` | `requestTimeoutMiddleware(8000)` aborts requests at `8,000ms`, preempting `llama.ts`'s `10,000ms` timeout before deterministic rule fallback can run. |
| **DEF-02** | **High** | `src/streaming/AssetStreamingManager.ts:52` | Reads `process.env.VITE_CDN_BASE_URL` instead of `import.meta.env.VITE_CDN_BASE_URL`, which resolves empty in browser Vite client builds. |
| **DEF-03** | **Medium** | `server/middleware/securityMiddleware.ts:130` | `replayProtectionMiddleware` skips verification if `x-request-timestamp` / `x-request-nonce` headers are omitted, rather than enforcing fail-closed on protected API mutations. |
| **DEF-04** | **Medium** | `firestore.rules:169-179` | Legacy collections `/vr_telemetry/{sessionId}` and `/vr_incidents/{fingerprint}` permit `read, create, update` for any `isSignedIn()` user without tenant membership or owner checks. |
| **DEF-05** | **Medium** | `src/engines/ExecutiveAgentCouncil.ts` & `Phase36IntegrationCoordinator.ts` | Static historical test counts (`74 suites / 305 passed`) and hardcoded `spatialStatus` (`sensorPermissionsGranted: true`) are out of sync with live `502` tests and Stage 7 `SpatialSecurityGuard` defaults (`denied`). |
| **DEF-06** | **Low** | `src/engines/DistributedAgentNetwork.ts` <-> `AgentCommunicationProtocol.ts` | 1 bidirectional circular import across 327 files. |
| **DEF-07** | **Low** | `src/tests/HighThroughputQueue.test.ts` | Orphaned duplicate test file outside `tests/**/*.test.ts` test runner glob. |
| **DEF-08** | **Low** | `vite build` output & `package.json` | Single `3,285.28 kB` client JS bundle (`>500 kB` Vite chunk warning); `eslint` package not installed. |

---

## 3. Recommended Prioritized Remediations (For Future Approved Work)

1. Harmonize `server.ts` timeout (`>=12000ms` or route-scoped) so `llama.ts`'s `10000ms` fallback always resolves cleanly instead of HTTP `504`.
2. Update `AssetStreamingManager.ts` to read `import.meta.env.VITE_CDN_BASE_URL` safely with `process.env` fallback.
3. Wire Stage 6/7 (`AgentOrchestrator` + `SpatialMappingEngine` + `SpatialSecurityGuard`) into `App.tsx` / `sceneManager.ts` / `Phase36IntegrationCoordinator.ts` and mount Stage 5.3 `SecurityDashboard`.
4. Wire Express server rate limiting (`server.ts`, `cloud.ts`) to `DistributedRedisRateLimitStore` and persist `/api/cloud/sync` payloads beyond volatile memory when `NODE_ENV=production`.
5. Remove orphaned `src/tests/HighThroughputQueue.test.ts`, break the `DistributedAgentNetwork <-> AgentCommunicationProtocol` cycle via shared interface types, and apply `React.lazy()` splitting to `GlobalCommandCenter` sub-dashboards.
