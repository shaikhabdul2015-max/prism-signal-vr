# PRISM SIGNAL: BEYOND THE VOID — PREDICTIVE SPATIAL ENGINE
## Trajectory Analysis, Markov Interaction Forecasting & Anomaly Detection

**Module**: `src/spatial/PredictiveSpatialEngine.ts`  

---

### 1. Behavioral & Spatial Inputs

`PredictiveSpatialEngine` ingests bounded sliding-window `PlayerSpatialSample` records (`maxHistory = 120`):
- `headPosition` (`[x, y, z]`)
- `gazeDirection` (`[gx, gy, gz]`)
- `activeHandPosition` (optional)
- `interactedObjectId` & `actionType`

### 2. Probabilistic Next-Interaction Forecasting

`predictNextInteractions(candidates, headPos, gazeDir)` fuses three signals into a normalized probability distribution over interactable targets:
1. **Gaze Alignment Score (45%)**: Cosine similarity between unit gaze vector and vector toward candidate object.
2. **Online Markov Transition Prior (40%)**: Learns real player transition frequencies ($O_{\text{prev}} \rightarrow O_{\text{next}}$) over prior domain weights (`console` → `ruby` → `azure` → `emerald`).
3. **Spatial Proximity (15%)**: Inverse normalized 3D distance within the chamber.

**Hard Safety Contract**:
Every prediction object carries compile-time literal invariants:
- `isProbabilistic: true`
- `canOverrideUserControl: false`

### 3. Navigation Anticipation & Anomaly Detection

- **`anticipateNavigation(target, playerPos, playerForward)`**: Calculates relative bearing angle and maps it to `'front'`, `'left'`, `'right'`, or `'behind'` advisory indicators (`isAdvisoryOnly: true`).
- **`detectMovementAnomalies()`**:
  - **Velocity Spikes**: Flags spatial jumps exceeding $4.5\text{ m/s}$ as `velocity_spike` (e.g., potential optical tracking jump).
  - **Boundary Approach**: Flags radial distance $> 6.5\text{ m}$ as `boundary_approach`.
