// src/webxr/intelligence/FallbackInputController.ts
export interface FallbackInputState {
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  accumulatedDeltaAngle: number;
  selectedEntityId: string | null;
  cinematicModeToggled: boolean;
  activePointerType: 'mouse' | 'touch' | 'pen' | 'unknown';
}

export class FallbackInputController {
  private state: FallbackInputState = {
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    accumulatedDeltaAngle: 0,
    selectedEntityId: null,
    cinematicModeToggled: false,
    activePointerType: 'unknown',
  };

  private rotationSensitivity = 0.015; // rad per pixel

  public onPointerDown(x: number, y: number, entityId?: string, pointerType: 'mouse' | 'touch' | 'pen' = 'mouse'): void {
    this.state.isDragging = true;
    this.state.dragStartX = x;
    this.state.dragStartY = y;
    this.state.activePointerType = pointerType;
    if (entityId) {
      this.state.selectedEntityId = entityId;
    }
  }

  public onPointerMove(x: number, _y: number): number {
    if (!this.state.isDragging) return 0;
    const deltaX = x - this.state.dragStartX;
    const deltaAngle = deltaX * this.rotationSensitivity;
    this.state.accumulatedDeltaAngle += deltaAngle;
    this.state.dragStartX = x;
    return deltaAngle;
  }

  public onPointerUp(): void {
    this.state.isDragging = false;
  }

  public onTouchStart(touchX: number, touchY: number, entityId?: string): void {
    this.onPointerDown(touchX, touchY, entityId, 'touch');
  }

  public onTouchMove(touchX: number, touchY: number): number {
    return this.onPointerMove(touchX, touchY);
  }

  public onTouchEnd(): void {
    this.onPointerUp();
  }

  public onKeyDown(key: string): { action: string; value?: number | boolean } | null {
    if (!key) return null;
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'h') {
      this.state.cinematicModeToggled = !this.state.cinematicModeToggled;
      return { action: 'TOGGLE_CINEMATIC_MODE', value: this.state.cinematicModeToggled };
    }
    if (key === 'ArrowLeft') {
      return { action: 'ROTATE_SELECTED', value: -0.05 };
    }
    if (key === 'ArrowRight') {
      return { action: 'ROTATE_SELECTED', value: 0.05 };
    }
    if (key === ' ') {
      return { action: 'ACTIVATE_PRIMARY_ACTION' };
    }
    if (key === 'Escape') {
      this.state.isDragging = false;
      this.state.selectedEntityId = null;
      return { action: 'DESELECT_AND_CANCEL' };
    }
    return null;
  }

  public getState(): FallbackInputState {
    return { ...this.state };
  }

  public setSelectedEntity(entityId: string | null): void {
    this.state.selectedEntityId = entityId;
  }

  public reset(): void {
    this.state = {
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      accumulatedDeltaAngle: 0,
      selectedEntityId: null,
      cinematicModeToggled: false,
      activePointerType: 'unknown',
    };
  }
}
