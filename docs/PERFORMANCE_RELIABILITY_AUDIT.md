# PERFORMANCE & RELIABILITY AUDIT

**Audit Date:** 2026-11-10T13:30:00Z  
**Note:** All numeric figures below are directly measured on the live host (`Node v22.23.2`) unless explicitly marked `NOT_TESTED` or `ESTIMATE`.

---

## 1. Measured API & Concurrency Benchmarks (`http://localhost:3000`)

| Benchmark | Sample / Concurrency | Measured Result | Verdict |
|---|---|---|---|
| `GET /api/health` (20 concurrent) | 20 parallel HTTP fetches | `20/20` HTTP `200`, `49.16 ms` total (`2.46 ms` avg) | **VERIFIED** |
| `POST /api/llama/analyze` (rule-engine fallback path) | 1 HTTP POST | HTTP `200`, `71.80 ms`, Rule #2 `INCONCLUSIVE` | **VERIFIED** |
| `GET /api/cloud/status` | 1 HTTP GET | HTTP `200`, `3.04 ms`, `STRICT_ENFORCEMENT` | **VERIFIED** |

---

## 2. Measured Subsystem Runtime Benchmarks (`npx tsx`)

| Subsystem | Workload | Measured Latency / Throughput / Memory | Verdict |
|---|---|---|---|
| `AgentOrchestrator` (6 agents + Stage 7 spatial) | 500 full cycles | `85.58 ms` total (**`0.1712 ms` avg/cycle**), `50 ms` CPU user, `-0.32 MB` heap delta | **VERIFIED** |
| `SpatialIntelligenceAgent.evaluateWithTimeout` | Throwing sensor mock (`25 ms` budget) | Clean recovery via `deterministicFallback()` (`fallbackUsed: true`) | **VERIFIED** |
| `EnvelopeEncryption` + `LocalKMSProvider` | 256-bit DEK wrap + AES-256-GCM encrypt/decrypt | `2.325 ms` round-trip, `integrityVerified: true` | **VERIFIED** |
| `DistributedRedisRateLimitStore` (memory fallback) | 15 concurrent token requests (cap `10`) | `10` allowed, `5` denied (deterministic bucket enforcement) | **VERIFIED** |
| `HighThroughputEventQueueEngine` | 10,000 events enqueue + full drain | `277.53 ms` elapsed (**`36,032 EPS`** full-drain throughput in single-thread Node) | **VERIFIED** |
| `SpatialPerformanceOptimizer` (`Vector3Pool`) | Acquire / release tuple | Zero-allocation tuple instance reuse confirmed (`pooledAllocationsReused >= 1`) | **VERIFIED** |

---

## 3. Production Build & Bundle Footprint

- **Vite Production Build (`npm run build`):** `1,861` modules transformed in `2.48s`.
- **Bundle Artifacts:**
  - `dist/index.html`: `1.67 kB` (`gzip: 0.69 kB`)
  - `dist/assets/index-D5k94tWd.css`: `110.75 kB` (`gzip: 15.57 kB`)
  - `dist/assets/index-DL_vmhCW.js`: `3,285.28 kB` (`gzip: 795.93 kB`)
- **Bottleneck Observed:** Vite flags a chunk-size warning (`>500 kB`) because Three.js, React dashboards (26 tabs), and Lucide icons are bundled into a single `3.28 MB` uncompressed JS chunk without route/tab `React.lazy()` code splitting.

---

## 4. Untested Performance Domains (`NOT_TESTED`)

- **WebXR Asset Streaming / Live Edge CDN:** `AssetStreamingManager` defaults `cdnBaseUrl` via `process.env.VITE_CDN_BASE_URL` (broken under standard Vite browser env lookup unless polyfilled); no live `.glb` (Draco) or `.ktx2` asset downloads from a remote CDN were measured.
- **Database / Firestore Query Latency & Throughput:** Remote Firestore database latency and multi-region replication remain `NOT_TESTED` without live GCP credentials; `server/routes/cloud.ts` currently writes to volatile in-memory `Map` objects.
- **Physical WebXR Frame Cadence (72Hz / 90Hz):** Browser WebGL/XR loop execution on Meta Quest 3, Apple Vision Pro, or HTC Vive remains `NOT_TESTED`.
