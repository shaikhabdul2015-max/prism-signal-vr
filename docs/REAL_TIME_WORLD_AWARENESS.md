# PRISM SIGNAL: BEYOND THE VOID — REAL-TIME WORLD AWARENESS
## Dynamic Scene Understanding & Multi-Agent Environment Synchronization

**Module**: `src/spatial/RealTimeWorldAwareness.ts`  
**Integrated Systems**: `SpatialMappingEngine`, `SpatialObjectIntelligence`, `PredictiveSpatialEngine`, `GameDirectorAgent`, `EnvironmentAgent`, `EnvironmentEventEngine`  

---

### 1. Continuous World-State Evaluation Pipeline

On each awareness evaluation tick, `evaluateWorldState(input)` executes a unified pipeline:
1. **Consistency & Perimeter Verification**: Checks scene graph health (`validateSceneGraphConsistency`) and chamber wall clearance (`checkBoundaryProximity`), emitting `BOUNDARY_PROXIMITY` events when clearance drops below `1.0m`.
2. **Semantic & Occlusion Inspection**: Rebuilds relational edges and detects `BEAM_OCCLUSION_RISK` whenever hazards intersect crystal proximity radii.
3. **Kinematics Anomaly Monitoring**: Surfaces `ANOMALOUS_MOVEMENT` alerts from `PredictiveSpatialEngine` to stabilize HUD presentation during tracking jitter.
4. **Convergence & Celestial Adaptation**: When `activeSegmentCount >= 3` or `coherencePercent >= 85%`, emits `CONVERGENCE_IMMINENT` and triggers a procedural `AURORA_BOREALIS` celestial event in `EnvironmentEventEngine`.
5. **Agent Pacing & Atmosphere Synthesis**: Invokes `GameDirectorAgent` and `EnvironmentAgent` to produce synchronized `directorTension` and `environmentMood` (`ambientIntensity`, `fogDensity`, `particleSpeed`).

### 2. Bounded Event History

Recent spatial world events are retained in a FIFO-capped buffer (max 30 events) to support diagnostics introspection without unbounded heap growth.
