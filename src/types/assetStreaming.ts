/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.1: Global Edge CDN & Intelligent WebXR Asset Streaming Types.
 * Defines comprehensive contracts for progressive 3D model streaming,
 * Draco compression, KTX2/Basis Universal texture streaming,
 * adaptive quality tiers, network-aware scheduling, LRU caching,
 * and CDN URL routing with strict origin validation.
 */

import * as THREE from 'three';

export type AssetPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type AssetType =
  | 'MODEL_GLTF'
  | 'MODEL_DRACO'
  | 'TEXTURE_KTX2'
  | 'TEXTURE_IMAGE'
  | 'AUDIO'
  | 'ENVIRONMENT'
  | 'GEOMETRY';

export type AssetLoadingState =
  | 'IDLE'
  | 'QUEUED'
  | 'LOADING'
  | 'LOADED'
  | 'FAILED'
  | 'FALLBACK_LOADED'
  | 'DISPOSED';

export type AssetQualityTier = 'ULTRA_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

export type NetworkTier =
  | 'OFFLINE'
  | 'SLOW_2G'
  | '2G'
  | '3G'
  | '4G'
  | '5G'
  | 'HIGH_SPEED';

export interface AssetQualityVariants {
  ULTRA_LOW?: string;
  LOW?: string;
  MEDIUM?: string;
  HIGH?: string;
  ULTRA?: string;
}

export interface AssetDescriptor {
  id: string;
  url: string;
  fallbackUrl?: string;
  type: AssetType;
  priority: AssetPriority;
  sizeBytes?: number;
  version?: string;
  isCriticalForWebXR?: boolean;
  qualityVariants?: AssetQualityVariants;
  metadata?: Record<string, any>;
  generateProceduralFallback?: () => THREE.Object3D | THREE.Texture | THREE.BufferGeometry;
}

export interface CDNConfig {
  cdnBaseUrl: string;
  version: string;
  fallbackToLocal: boolean;
  allowedOrigins: string[];
  enableImmutableCaching: boolean;
  cacheTtlSeconds: number;
  timeoutMs: number;
  maxRetries: number;
}

export interface AssetLoadProgress {
  assetId: string;
  loadedBytes: number;
  totalBytes: number;
  progressRatio: number;
  durationMs: number;
}

export interface AssetCacheEntry<T = any> {
  key: string;
  assetId: string;
  type: AssetType;
  data: T;
  sizeBytes: number;
  lastAccessed: number;
  accessCount: number;
  priority: AssetPriority;
  isCritical: boolean;
  qualityTier: AssetQualityTier;
}

export interface AssetStreamingTelemetry {
  totalAssetsRequested: number;
  totalAssetsLoaded: number;
  totalBytesDownloaded: number;
  cacheHits: number;
  cacheMisses: number;
  failedAssetsCount: number;
  retriedRequestsCount: number;
  fallbackAssetsLoaded: number;
  avgModelDecodeDurationMs: number;
  avgTextureDecodeDurationMs: number;
  avgAssetLoadDurationMs: number;
  activeDownloadsCount: number;
  memoryUsageBytes: number;
  currentQualityTier: AssetQualityTier;
  currentNetworkTier: NetworkTier;
}

export interface NetworkCapabilities {
  tier: NetworkTier;
  downlinkMbps: number;
  rttMs: number;
  saveData: boolean;
  isOnline: boolean;
}

export interface GPUTextureCapabilities {
  s3tc: boolean;
  etc1: boolean;
  etc2: boolean;
  pvrtc: boolean;
  astc: boolean;
  bptc: boolean;
  maxTextureSize: number;
  maxAnisotropy: number;
  isSoftwareGl: boolean;
}

export interface ProgressiveLoadResult<T = any> {
  assetId: string;
  data: T;
  isFallback: boolean;
  isCached: boolean;
  loadDurationMs: number;
  qualityTier: AssetQualityTier;
  resolvedUrl: string;
}
