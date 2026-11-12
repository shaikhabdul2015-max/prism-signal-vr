# PRISM SIGNAL: BEYOND THE VOID — SPATIAL VISUALIZATION ENGINE
## Guidance Overlays, Predictive Markers, Relationship Arcs & Adaptive HUD

**Module**: `src/spatial/SpatialVisualizationEngine.ts`  

---

### 1. Visual Descriptor Primitives

`buildVisualizationFrame()` constructs lightweight, render-ready descriptors preserving PRISM SIGNAL's deep cosmic void palette (`#ef4444` Ruby, `#06b6d4` Azure, `#10b981` Emerald, `#38bdf8` Holographic Cyan, `#a855f7` Quantum Violet, `#f59e0b` Boundary Amber):

1. **Guidance Overlays**:
   - `alignment_arc` & `proximity_ring` halos centered on interactable chamber nodes.
   - `boundary_halo` perimeter warning ring when `BOUNDARY_PROXIMITY` triggers.
2. **3D Navigation Indicators**:
   - Computes normalized 3D direction vectors from player head position toward anticipated focus targets using `SpatialPerformanceOptimizer.vectorPool` (acquired and immediately released within the frame builder to avoid heap churn).
3. **Predictive Interaction Markers**:
   - Up to 2 highest-probability next targets rendered with ring scales proportional to predicted probability (`1.0 + 0.4 * p`).
4. **Spatial Relationship Arcs**:
   - Visualizes `illuminates`, `reflects_to`, and `obstructs` edges across the chamber optical chain.
5. **Non-Occluding Adaptive HUD Positioning**:
   - Places the adaptive HUD dock at a comfortable seated distance (`1.85m`) along the player's horizontal forward direction and tucked below eye level (`elevationMeters = max(0.55, eyeY - 0.55)`).
   - Enforces `occludesCenterViewport: false` so the central 3D crystal chamber remains 100% unobstructed.
