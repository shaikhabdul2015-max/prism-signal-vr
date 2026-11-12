/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Progressive Asset Loader (Stage 5.1)
 * Coordinates progressive, multi-stage asset streaming with:
 * - Immediate placeholder / proxy generation to eliminate WebXR render blocking.
 * - Exponential backoff retry with jitter.
 * - Strict timeout enforcement with AbortController.
 * - Granular download progress tracking.
 */

import * as THREE from 'three';
import { AssetDescriptor, AssetLoadProgress, ProgressiveLoadResult } from '../types/assetStreaming';
import { AssetStreamingMonitor } from '../streaming/AssetStreamingMonitor';

export interface ProgressiveLoaderOptions {
  timeoutMs?: number;    // Default 10,000ms
  maxRetries?: number;   // Default 3 retries
  retryBaseDelayMs?: number; // Default 300ms
}

export class ProgressiveAssetLoader {
  private timeoutMs: number;
  private maxRetries: number;
  private retryBaseDelayMs: number;

  public constructor(options?: ProgressiveLoaderOptions) {
    this.timeoutMs = options?.timeoutMs || 10000;
    this.maxRetries = options?.maxRetries ?? 3;
    this.retryBaseDelayMs = options?.retryBaseDelayMs || 300;
  }

  public createPlaceholder(descriptor: AssetDescriptor): THREE.Object3D {
    if (descriptor.type === 'MODEL_GLTF' || descriptor.type === 'MODEL_DRACO' || descriptor.type === 'GEOMETRY') {
      const group = new THREE.Group();
      group.name = `Placeholder_${descriptor.id}`;

      // Bounding proxy wireframe box
      const wireframeMat = new THREE.MeshBasicMaterial({
        color: descriptor.priority === 'CRITICAL' ? 0x38bdf8 : 0x64748b,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      });
      const proxyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), wireframeMat);
      proxyMesh.name = 'PlaceholderProxy';
      group.add(proxyMesh);

      return group;
    }

    // Default object container
    const defaultObj = new THREE.Object3D();
    defaultObj.name = `Placeholder_${descriptor.id}`;
    return defaultObj;
  }

  public async loadWithRetryAndTimeout<T>(
    assetId: string,
    operation: (signal: AbortSignal, onProgress?: (p: AssetLoadProgress) => void) => Promise<T>,
    onProgress?: (progress: AssetLoadProgress) => void
  ): Promise<T> {
    const monitor = AssetStreamingMonitor.getInstance();
    let attempt = 0;
    let lastError: any = null;

    while (attempt <= this.maxRetries) {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort(new Error(`Asset load timed out after ${this.timeoutMs}ms: ${assetId}`));
      }, this.timeoutMs);

      const abortPromise = new Promise<never>((_, reject) => {
        if (abortController.signal.aborted) {
          reject(new Error(`Asset load timed out after ${this.timeoutMs}ms: ${assetId}`));
        } else {
          abortController.signal.addEventListener('abort', () => {
            reject(new Error(`Asset load timed out after ${this.timeoutMs}ms: ${assetId}`));
          }, { once: true });
        }
      });

      try {
        const result = await Promise.race([
          operation(abortController.signal, onProgress),
          abortPromise,
        ]);
        clearTimeout(timeoutId);
        return result;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        attempt += 1;

        if (attempt <= this.maxRetries) {
          monitor.recordRetry(assetId, attempt);
          const jitter = Math.random() * 100;
          const delay = Math.min(3000, this.retryBaseDelayMs * Math.pow(2, attempt - 1) + jitter);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    monitor.recordFailure(assetId, lastError?.message || 'Exceeded max retries', attempt);
    throw lastError;
  }
}
