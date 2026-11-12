# PRISM SIGNAL: BEYOND THE VOID
## STAGE 5.1 — GLOBAL EDGE CDN & WEBXR ASSET STREAMING DEPLOYMENT GUIDE

This guide provides complete enterprise deployment instructions for streaming WebXR 3D models (glTF/GLB with Draco compression), Basis Universal textures (KTX2), and procedural assets via Global Edge CDNs.

---

### 1. Architecture Overview

```
 [ Client WebXR Headset / Browser ]
                │
                ▼
  [ Global Anycast Edge PoP ]  <─── Cloudflare CDN / Google Cloud CDN / AWS CloudFront
       ├── Edge Cache Hit (P99 < 15ms) ──────────┐
       └── Edge Cache Miss                       │
                │                                │
                ▼                                │
   [ Cloud Storage Bucket ]                      │
  (glTF, KTX2, Draco WASM, WebXR assets)         │
                │                                │
                ▼                                ▼
   [ AssetStreamingManager: Client Priority & Adaptive Quality Engine ]
```

---

### 2. Environment Variables Configuration

Set in `.env` (or cloud deployment secrets manager, never hardcoded in client source):

```bash
# Edge CDN Base URL (e.g., https://cdn.prism-signal.void or Google Cloud CDN endpoint)
VITE_CDN_BASE_URL=https://cdn.prism-signal.void

# Asset Version identifier (increments trigger cache invalidation via path versioning)
VITE_ASSET_VERSION=1.0.0
```

---

### 3. Provider Deployment Configurations

#### A. Google Cloud CDN (Recommended for GCP Native Environments)

1. **Cloud Storage Bucket Setup:**
   ```bash
   # Create global multi-region asset bucket
   gcloud storage buckets create gs://prism-signal-webxr-assets \
       --location=US \
       --default-storage-class=STANDARD \
       --uniform-bucket-level-access
   ```

2. **CORS Configuration (`cors.json`):**
   ```json
   [
     {
       "origin": ["https://ais-dev-c2r3xk7rujqiuxlvjf4vaa-527838610455.asia-east1.run.app", "https://prism-signal.void"],
       "method": ["GET", "HEAD", "OPTIONS"],
       "responseHeader": ["Content-Type", "Content-Length", "ETag", "Cache-Control", "Access-Control-Allow-Origin"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
   Apply CORS:
   ```bash
   gcloud storage buckets update gs://prism-signal-webxr-assets --cors-file=cors.json
   ```

3. **Enable Cloud CDN on Backend Bucket:**
   ```bash
   gcloud compute backend-buckets create prism-asset-backend \
       --gcs-bucket-name=prism-signal-webxr-assets \
       --enable-cdn \
       --cache-mode=CACHE_ALL_STATIC \
       --default-ttl=31536000 \
       --client-ttl=31536000
   ```

#### B. Cloudflare CDN Configuration

1. **DNS & Proxying:**
   - Create CNAME: `cdn.prism-signal.void` $\to$ Cloud Storage / S3 hostname with Orange Cloud (Proxied) enabled.
2. **Cache Rule (Dashboard $\to$ Rules $\to$ Cache Rules):**
   - **Matching Expression:**
     `http.host eq "cdn.prism-signal.void" and starts_with(http.request.uri.path, "/v")`
   - **Edge Cache TTL:** Respect origin or override to 1 year (`31536000 seconds`).
   - **Browser Cache TTL:** 1 year.
   - **Tiered Cache:** Enabled.
3. **MIME Types / Headers Transform Rule:**
   - `.glb` $\to$ `model/gltf-binary`
   - `.gltf` $\to$ `model/gltf+json`
   - `.ktx2` $\to$ `image/ktx2`
   - `.wasm` $\to$ `application/wasm`
   - `Cache-Control`: `public, max-age=31536000, immutable`

---

### 4. Cache-Busting and Invalidation Strategy

1. **Path-Based Versioning (Immutable Cache):**
   - Assets are requested using version-prefixed paths: `/v1.0.0/models/crystals.draco.glb`.
   - Edge and browser caches store these immutably for 365 days.
   - Deploying new asset revisions updates `VITE_ASSET_VERSION` in deployment CI/CD without requiring manual cache purges.
2. **Instant Emergency Edge Purge:**
   - In the event of compromised or corrupt assets:
     - Cloudflare: `curl -X POST https://api.cloudflare.com/client/v4/zones/{zone}/purge_cache -H "Authorization: Bearer $CF_TOKEN" -d '{"purge_everything":true}'`
     - Google Cloud CDN: `gcloud compute url-maps invalidate-cdn-cache prism-url-map --path "/*"`

---

### 5. Security & Tenant Asset Isolation

- **Public Assets:** Chamber models, crystal geometries, KTX2 skyboxes, and Draco WASM decoders are publicly cacheable.
- **Private Tenant Assets:** Custom user-generated spatial holograms or tenant-specific mission telemetry must **never** be cached with `public` directives; they must use `Cache-Control: private, no-cache, no-store` and require authenticated Bearer tokens.
