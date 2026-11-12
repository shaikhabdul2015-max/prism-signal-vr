/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Asset Cache Manager (Stage 5.1)
 * High-performance, memory-aware LRU cache for 3D geometries, materials,
 * textures, and audio buffers.
 * 
 * Features:
 * - Deterministic cache keys based on URL, version, and quality tier.
 * - Strict memory ceiling enforcement (default 256MB).
 * - Prioritized eviction: Evicts LOW and MEDIUM priority assets before HIGH,
 *   protecting WebXR CRITICAL assets.
 * - Safe GPU disposal: Traverses and disposes WebGL textures, geometries, and materials
 *   to eliminate memory leaks upon eviction.
 */

import * as THREE from 'three';
import {
  AssetCacheEntry,
  AssetPriority,
  AssetQualityTier,
  AssetType,
} from '../types/assetStreaming';

export interface AssetCacheConfig {
  maxMemoryBytes?: number; // Default 256 MB
  maxItemCount?: number;   // Default 500 items
  enableGpuCleanup?: boolean;
}

export class AssetCacheManager {
  private static instance: AssetCacheManager | null = null;
  private cache: Map<string, AssetCacheEntry> = new Map();
  private maxMemoryBytes: number;
  private maxItemCount: number;
  private currentMemoryBytes = 0;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  private constructor(config?: AssetCacheConfig) {
    this.maxMemoryBytes = config?.maxMemoryBytes || 256 * 1024 * 1024; // 256MB
    this.maxItemCount = config?.maxItemCount || 500;
  }

  public static getInstance(config?: AssetCacheConfig): AssetCacheManager {
    if (!AssetCacheManager.instance) {
      AssetCacheManager.instance = new AssetCacheManager(config);
    }
    return AssetCacheManager.instance;
  }

  public static resetInstance(): void {
    if (AssetCacheManager.instance) {
      AssetCacheManager.instance.clear();
      AssetCacheManager.instance = null;
    }
  }

  public generateKey(assetId: string, qualityTier: AssetQualityTier = 'HIGH', version: string = 'v1'): string {
    return `${assetId}::${qualityTier}::${version}`;
  }

  public get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }

    // Update access statistics
    entry.lastAccessed = Date.now();
    entry.accessCount += 1;
    this.hits += 1;

    // Move to end of insertion order for LRU tracking
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data as T;
  }

  public set<T = any>(params: {
    key: string;
    assetId: string;
    type: AssetType;
    data: T;
    sizeBytes?: number;
    priority?: AssetPriority;
    isCritical?: boolean;
    qualityTier?: AssetQualityTier;
  }): void {
    const {
      key,
      assetId,
      type,
      data,
      sizeBytes = this.estimateSize(data, type),
      priority = 'MEDIUM',
      isCritical = priority === 'CRITICAL',
      qualityTier = 'HIGH',
    } = params;

    // If key already exists, remove old one first
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Evict if necessary to stay under bounds
    this.ensureCapacity(sizeBytes);

    const entry: AssetCacheEntry<T> = {
      key,
      assetId,
      type,
      data,
      sizeBytes,
      lastAccessed: Date.now(),
      accessCount: 1,
      priority,
      isCritical,
      qualityTier,
    };

    this.cache.set(key, entry);
    this.currentMemoryBytes += sizeBytes;
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.disposeAsset(entry.data, entry.type);
    this.currentMemoryBytes = Math.max(0, this.currentMemoryBytes - entry.sizeBytes);
    return this.cache.delete(key);
  }

  public clear(): void {
    for (const entry of this.cache.values()) {
      this.disposeAsset(entry.data, entry.type);
    }
    this.cache.clear();
    this.currentMemoryBytes = 0;
  }

  private ensureCapacity(incomingBytes: number): void {
    // If incoming item is bigger than whole cache, don't loop endlessly
    if (incomingBytes > this.maxMemoryBytes) {
      incomingBytes = this.maxMemoryBytes;
    }

    while (
      (this.currentMemoryBytes + incomingBytes > this.maxMemoryBytes ||
       this.cache.size >= this.maxItemCount) &&
      this.cache.size > 0
    ) {
      const victimKey = this.findEvictionVictim();
      if (!victimKey) {
        // No non-critical item to evict
        break;
      }
      this.evictions += 1;
      this.delete(victimKey);
    }
  }

  private findEvictionVictim(): string | null {
    // Priority order for eviction: LOW > MEDIUM > HIGH (Never CRITICAL unless necessary)
    const priorityWeight: Record<AssetPriority, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 10,
    };

    let bestCandidateKey: string | null = null;
    let lowestScore = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.isCritical) continue; // Protect WebXR critical assets

      // Score based on priority and recency: lower score = better eviction victim
      const weight = priorityWeight[entry.priority] || 2;
      const ageHours = (Date.now() - entry.lastAccessed) / (1000 * 3600);
      const score = (weight * 100) - (ageHours * 10) + (entry.accessCount * 2);

      if (score < lowestScore) {
        lowestScore = score;
        bestCandidateKey = key;
      }
    }

    // If all items are critical, fall back to true LRU of non-critical
    if (!bestCandidateKey && this.cache.size > 0) {
      // Find oldest accessed item regardless of priority
      let oldestTime = Infinity;
      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          bestCandidateKey = key;
        }
      }
    }

    return bestCandidateKey;
  }

  private estimateSize(data: any, type: AssetType): number {
    if (!data) return 1024;

    if (data.byteLength && typeof data.byteLength === 'number') {
      return data.byteLength;
    }

    if (type === 'TEXTURE_IMAGE' || type === 'TEXTURE_KTX2') {
      const tex = data as THREE.Texture;
      const img = tex?.image as any;
      if (img && typeof img.width === 'number') {
        const w = img.width || 1024;
        const h = img.height || 1024;
        // 4 bytes per RGBA pixel + mipmaps factor (~1.33)
        return Math.floor(w * h * 4 * 1.33);
      }
      return 2 * 1024 * 1024; // Default 2MB estimate
    }

    if (type === 'GEOMETRY') {
      const geom = data as THREE.BufferGeometry;
      if (geom && geom.attributes) {
        let bytes = 0;
        for (const attr of Object.values(geom.attributes)) {
          if (attr && (attr as any).array) {
            bytes += (attr as any).array.byteLength || 0;
          }
        }
        return bytes || 128 * 1024;
      }
    }

    if (type === 'MODEL_GLTF' || type === 'MODEL_DRACO') {
      if (data.scene && data.scene instanceof THREE.Object3D) {
        let totalBytes = 0;
        data.scene.traverse((obj: any) => {
          if (obj.isMesh && obj.geometry) {
            const g = obj.geometry as THREE.BufferGeometry;
            if (g.attributes) {
              for (const attr of Object.values(g.attributes)) {
                if (attr && (attr as any).array) {
                  totalBytes += (attr as any).array.byteLength || 0;
                }
              }
            }
          }
        });
        return totalBytes || 4 * 1024 * 1024; // Default 4MB estimate
      }
    }

    return 256 * 1024; // 256 KB fallback
  }

  private disposeAsset(data: any, type: AssetType): void {
    if (!data) return;

    try {
      if (type === 'TEXTURE_IMAGE' || type === 'TEXTURE_KTX2' || data.isTexture) {
        (data as THREE.Texture).dispose();
      } else if (type === 'GEOMETRY' || data.isBufferGeometry) {
        (data as THREE.BufferGeometry).dispose();
      } else if (type === 'MODEL_GLTF' || type === 'MODEL_DRACO') {
        const root = data.scene || data;
        if (root && root.traverse) {
          root.traverse((child: any) => {
            if (child.geometry && typeof child.geometry.dispose === 'function') {
              child.geometry.dispose();
            }
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((m: any) => this.disposeMaterial(m));
              } else {
                this.disposeMaterial(child.material);
              }
            }
          });
        }
      }
    } catch (err) {
      console.warn('Error during asset GPU disposal', err);
    }
  }

  private disposeMaterial(mat: any): void {
    if (!mat) return;
    if (mat.map && typeof mat.map.dispose === 'function') mat.map.dispose();
    if (mat.normalMap && typeof mat.normalMap.dispose === 'function') mat.normalMap.dispose();
    if (mat.roughnessMap && typeof mat.roughnessMap.dispose === 'function') mat.roughnessMap.dispose();
    if (mat.metalnessMap && typeof mat.metalnessMap.dispose === 'function') mat.metalnessMap.dispose();
    if (typeof mat.dispose === 'function') mat.dispose();
  }

  public getStats() {
    const hitRate = this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses)) : 0;
    return {
      itemCount: this.cache.size,
      currentMemoryBytes: this.currentMemoryBytes,
      maxMemoryBytes: this.maxMemoryBytes,
      hits: this.hits,
      misses: this.misses,
      hitRate: Number(hitRate.toFixed(4)),
      evictions: this.evictions,
    };
  }
}

export const assetCacheManager = AssetCacheManager.getInstance();
