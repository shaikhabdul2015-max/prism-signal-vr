# PRISM SIGNAL: BEYOND THE VOID — SPATIAL MAPPING ENGINE
## 3D Coordinate Mapping, Scene Graph Consistency & Boundary Intelligence

**Module**: `src/spatial/SpatialMappingEngine.ts`  
**Composed Dependencies**: `AdvancedSpatialIntelligenceEngine` (Phase 29), `SpatialSecurityGuard`, `SpatialPerformanceOptimizer`  

---

### 1. Coordinate Space Transformations

`SpatialMappingEngine` supports seamless, invertible transformations across:
- `'world'`: Global PRISM chamber origin `[0, 0, 0]`.
- `'local-floor'` / `'bounded-floor'`: WebXR seated/standing floor-referenced coordinate frame adjusted by `floorOriginOffset`.
- `'viewer'`: Head-centered coordinate frame offset by `viewerOrigin` (default seated eye height `1.25m`).
- `'local'` (Node-Local): `worldToNodeLocal(worldPoint, targetNodeId)` inverts a node's `THREE.Matrix4` world transform using pre-allocated scratch matrices (`_matWorld`, `_matInv`) with zero render-loop allocations.

### 2. Distance, Bearing & Boundary Detection

- **`computeDistanceAndBearing(fromPoint, toPoint)`**: Computes 3D Euclidean distance, vertical elevation delta, and XZ-plane azimuth bearing angle in radians ($\theta = \text{atan2}(\Delta x, -\Delta z)$, where $0$ points down the $-Z$ forward axis).
- **`checkBoundaryProximity(point)`**: Measures minimum clearance to the `[-8, 0, -8]` $\times$ `[8, 5, 8]` chamber walls, flagging `approachingBoundary: true` when clearance falls below `1.0m`.

### 3. Scene Graph Intelligence & Consistency Validation

`validateSceneGraphConsistency()` inspects every registered node in the spatial hierarchy to catch:
1. **Orphan Nodes**: `parentId` references a non-existent node.
2. **Hierarchy Cycles**: Traverses ancestor chains to detect circular parent-child loops (`A -> B -> A`).
3. **Invalid Floating-Point Transforms**: Flags any `NaN` or `Infinity` values in position, rotation, or scale.
4. **Out-of-Bounds Nodes**: Flags any entity positioned outside chamber operational bounds.

### 4. Permission-Gated WebXR Spatial APIs

- **`createSpatialAnchor(...)`**: Supports virtual session anchors immediately; native persistent WebXR anchor requests strictly query `SpatialSecurityGuard.checkAccess('spatial_anchors', ...)`.
- **`requestRoomScanStatus()`**: Never assumes physical room-scanning exists. Always consults `SpatialSecurityGuard.checkAccess('room_scanning', ...)` and returns unavailable/denied unless both XR hardware and explicit user permission exist.
