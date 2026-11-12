/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * KTX2 Texture Loader (Stage 5.1)
 * Advanced texture streaming loader supporting KTX2 / Basis Universal compressed textures.
 * 
 * Features:
 * - Detects GPU compressed texture formats (ASTC, ETC2, S3TC, BC7/BPTC, PVRTC).
 * - Transcoder initialization with configurable CDN / local path.
 * - Automatic fallback to standard PNG / Canvas textures when unsupported.
 * - Procedural fallback generation to prevent missing texture errors.
 * - Texture caching and safe GPU resource disposal.
 */

import * as THREE from 'three';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { GPUTextureCapabilities } from '../types/assetStreaming';
import { AssetStreamingMonitor } from '../streaming/AssetStreamingMonitor';

export interface KTX2LoaderConfig {
  transcoderPath?: string;
  renderer?: THREE.WebGLRenderer;
}

export class KTX2TextureLoader {
  private ktx2Loader: KTX2Loader | null = null;
  private transcoderPath: string;
  private gpuCapabilities: GPUTextureCapabilities;
  private textureCache: Map<string, THREE.Texture> = new Map();

  public constructor(config?: KTX2LoaderConfig) {
    this.transcoderPath =
      config?.transcoderPath ||
      'https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/libs/basis/';

    this.gpuCapabilities = this.detectGpuCapabilities(config?.renderer);
    this.initializeKTX2(config?.renderer);
  }

  public detectGpuCapabilities(renderer?: THREE.WebGLRenderer): GPUTextureCapabilities {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        s3tc: false,
        etc1: false,
        etc2: false,
        pvrtc: false,
        astc: false,
        bptc: false,
        maxTextureSize: 2048,
        maxAnisotropy: 1,
        isSoftwareGl: true,
      };
    }

    try {
      let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
      if (renderer) {
        gl = renderer.getContext() as any;
      } else {
        const canvas = document.createElement('canvas');
        gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      }

      if (!gl) {
        return {
          s3tc: false,
          etc1: false,
          etc2: false,
          pvrtc: false,
          astc: false,
          bptc: false,
          maxTextureSize: 2048,
          maxAnisotropy: 1,
          isSoftwareGl: true,
        };
      }

      const s3tc = Boolean(
        gl.getExtension('WEBGL_compressed_texture_s3tc') ||
        gl.getExtension('WEBGL_compressed_texture_s3tc_srgb')
      );
      const etc1 = Boolean(gl.getExtension('WEBGL_compressed_texture_etc1'));
      const etc2 = Boolean(gl.getExtension('WEBGL_compressed_texture_etc'));
      const pvrtc = Boolean(gl.getExtension('WEBGL_compressed_texture_pvrtc'));
      const astc = Boolean(gl.getExtension('WEBGL_compressed_texture_astc'));
      const bptc = Boolean(gl.getExtension('EXT_texture_compression_bptc'));

      const extAniso = gl.getExtension('EXT_texture_filter_anisotropic');
      const maxAnisotropy = extAniso
        ? gl.getParameter(extAniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1
        : 1;

      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;

      const extDebug = gl.getExtension('WEBGL_debug_renderer_info');
      const param = extDebug ? extDebug.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpuString = String(gl.getParameter(param) || '');
      const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuString);

      return {
        s3tc,
        etc1,
        etc2,
        pvrtc,
        astc,
        bptc,
        maxTextureSize,
        maxAnisotropy,
        isSoftwareGl,
      };
    } catch {
      return {
        s3tc: false,
        etc1: false,
        etc2: false,
        pvrtc: false,
        astc: false,
        bptc: false,
        maxTextureSize: 2048,
        maxAnisotropy: 1,
        isSoftwareGl: false,
      };
    }
  }

  private initializeKTX2(renderer?: THREE.WebGLRenderer): void {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return;
    }

    try {
      this.ktx2Loader = new KTX2Loader();
      this.ktx2Loader.setTranscoderPath(this.transcoderPath);
      if (renderer) {
        this.ktx2Loader.detectSupport(renderer);
      }
    } catch (err) {
      console.warn('KTX2 Loader initialization deferred', err);
      this.ktx2Loader = null;
    }
  }

  public getGpuCapabilities(): GPUTextureCapabilities {
    return { ...this.gpuCapabilities };
  }

  public async loadTexture(params: {
    url: string;
    fallbackUrl?: string;
    proceduralFallback?: () => THREE.Texture;
    signal?: AbortSignal;
  }): Promise<{ texture: THREE.Texture; isFallback: boolean; decodeDurationMs: number }> {
    const startTime = performance.now();
    const monitor = AssetStreamingMonitor.getInstance();

    // Check internal cache
    if (this.textureCache.has(params.url)) {
      const tex = this.textureCache.get(params.url)!;
      return { texture: tex, isFallback: false, decodeDurationMs: 0 };
    }

    // 1. If in headless environment, immediately use procedural fallback
    const isHeadless = typeof window === 'undefined' || !window.document;
    if (isHeadless && params.proceduralFallback) {
      const tex = params.proceduralFallback();
      this.textureCache.set(params.url, tex);
      const decodeDurationMs = performance.now() - startTime;
      monitor.recordTextureDecode(decodeDurationMs);
      return { texture: tex, isFallback: true, decodeDurationMs };
    }

    // 2. If KTX2 is supported and URL is .ktx2, attempt load
    if (this.ktx2Loader && params.url.toLowerCase().endsWith('.ktx2') && !params.url.startsWith('mock://')) {
      try {
        if (params.signal?.aborted) throw new Error('Aborted');

        const texture = await new Promise<THREE.CompressedTexture>((resolve, reject) => {
          this.ktx2Loader!.load(
            params.url,
            (tex) => resolve(tex),
            undefined,
            (err) => reject(err)
          );
        });

        this.textureCache.set(params.url, texture);
        const decodeDurationMs = performance.now() - startTime;
        monitor.recordTextureDecode(decodeDurationMs);
        return { texture, isFallback: false, decodeDurationMs };
      } catch (ktxError) {
        console.warn(`KTX2 load failed for ${params.url}. Triggering fallback`, ktxError);
      }
    }

    // 3. Fallback to standard ImageLoader / TextureLoader if fallbackUrl is present
    if (params.fallbackUrl && !params.fallbackUrl.startsWith('mock://')) {
      try {
        const standardLoader = new THREE.TextureLoader();
        const texture = await new Promise<THREE.Texture>((resolve, reject) => {
          standardLoader.load(
            params.fallbackUrl!,
            (tex) => resolve(tex),
            undefined,
            (err) => reject(err)
          );
        });

        this.textureCache.set(params.url, texture);
        const decodeDurationMs = performance.now() - startTime;
        monitor.recordTextureDecode(decodeDurationMs);
        return { texture, isFallback: true, decodeDurationMs };
      } catch (fallbackError) {
        console.warn(`Texture fallbackUrl failed for ${params.fallbackUrl}`, fallbackError);
      }
    }

    // 4. Procedural Canvas Texture Fallback (Guarantees zero 404s and WebXR continuity)
    const fallbackTexture = params.proceduralFallback
      ? params.proceduralFallback()
      : this.generateDefaultProceduralTexture();

    this.textureCache.set(params.url, fallbackTexture);
    const decodeDurationMs = performance.now() - startTime;
    monitor.recordTextureDecode(decodeDurationMs);
    return { texture: fallbackTexture, isFallback: true, decodeDurationMs };
  }

  public generateDefaultProceduralTexture(): THREE.Texture {
    if (typeof document === 'undefined') {
      // In Node.js environment, return a DataTexture
      const width = 64;
      const height = 64;
      const size = width * height * 4;
      const data = new Uint8Array(size);
      for (let i = 0; i < size; i += 4) {
        data[i] = 56;      // R: cyan
        data[i + 1] = 189; // G
        data[i + 2] = 248; // B
        data[i + 3] = 255; // Alpha
      }
      const dataTex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
      dataTex.needsUpdate = true;
      return dataTex;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Grid pattern with cyan hue
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 120, 120);
    ctx.beginPath();
    ctx.moveTo(0, 64);
    ctx.lineTo(128, 64);
    ctx.moveTo(64, 0);
    ctx.lineTo(64, 128);
    ctx.stroke();

    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    canvasTexture.needsUpdate = true;
    return canvasTexture;
  }

  public dispose(): void {
    if (this.ktx2Loader) {
      try {
        this.ktx2Loader.dispose();
      } catch {
        // Safe ignore
      }
      this.ktx2Loader = null;
    }

    for (const tex of this.textureCache.values()) {
      try {
        tex.dispose();
      } catch {
        // Safe ignore
      }
    }
    this.textureCache.clear();
  }
}
