/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Network Performance Detector (Stage 5.1)
 * Detects real-time connection bandwidth, latency, and online/offline transitions.
 * Computes network tiers for adaptive asset streaming and WebXR quality selection.
 */

import { NetworkCapabilities, NetworkTier } from '../types/assetStreaming';
import { DistributedEventBus } from '../engines/DistributedEventBus';

export class NetworkPerformanceDetector {
  private static instance: NetworkPerformanceDetector | null = null;
  private currentCapabilities: NetworkCapabilities;
  private listeners: Set<(capabilities: NetworkCapabilities) => void> = new Set();
  private simulatedTier: NetworkTier | null = null;

  private constructor() {
    this.currentCapabilities = this.detectInitialCapabilities();
    this.setupListeners();
  }

  public static getInstance(): NetworkPerformanceDetector {
    if (!NetworkPerformanceDetector.instance) {
      NetworkPerformanceDetector.instance = new NetworkPerformanceDetector();
    }
    return NetworkPerformanceDetector.instance;
  }

  public static resetInstance(): void {
    if (NetworkPerformanceDetector.instance) {
      NetworkPerformanceDetector.instance.cleanup();
      NetworkPerformanceDetector.instance = null;
    }
  }

  private detectInitialCapabilities(): NetworkCapabilities {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const navConn = typeof navigator !== 'undefined' && 'connection' in navigator
      ? (navigator as any).connection
      : null;

    if (!isOnline) {
      return {
        tier: 'OFFLINE',
        downlinkMbps: 0,
        rttMs: 9999,
        saveData: false,
        isOnline: false,
      };
    }

    if (!navConn) {
      // Default to 4G assumption on desktop/unsupported browsers
      return {
        tier: '4G',
        downlinkMbps: 10.0,
        rttMs: 50,
        saveData: false,
        isOnline: true,
      };
    }

    const downlink = typeof navConn.downlink === 'number' ? navConn.downlink : 10.0;
    const rtt = typeof navConn.rtt === 'number' ? navConn.rtt : 50;
    const saveData = Boolean(navConn.saveData);
    const effectiveType = navConn.effectiveType || '4g';

    const tier = this.resolveNetworkTier(effectiveType, downlink, rtt);

    return {
      tier,
      downlinkMbps: downlink,
      rttMs: rtt,
      saveData,
      isOnline: true,
    };
  }

  public resolveNetworkTier(effectiveType: string, downlink: number, rtt: number): NetworkTier {
    if (this.simulatedTier) {
      return this.simulatedTier;
    }

    if (downlink >= 25.0 && rtt <= 25) {
      return 'HIGH_SPEED';
    }
    if (effectiveType === '5g' || (downlink >= 15.0 && rtt <= 40)) {
      return '5G';
    }
    if (effectiveType === '4g' || (downlink >= 4.0 && rtt <= 100)) {
      return '4G';
    }
    if (effectiveType === '3g' || (downlink >= 1.0 && rtt <= 300)) {
      return '3G';
    }
    if (effectiveType === '2g' || (downlink >= 0.25 && rtt <= 600)) {
      return '2G';
    }
    return 'SLOW_2G';
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', this.handleOnlineChange);
    window.addEventListener('offline', this.handleOnlineChange);

    const navConn = 'connection' in navigator ? (navigator as any).connection : null;
    if (navConn && typeof navConn.addEventListener === 'function') {
      navConn.addEventListener('change', this.handleConnectionChange);
    }
  }

  private cleanup(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('online', this.handleOnlineChange);
    window.removeEventListener('offline', this.handleOnlineChange);

    const navConn = 'connection' in navigator ? (navigator as any).connection : null;
    if (navConn && typeof navConn.removeEventListener === 'function') {
      navConn.removeEventListener('change', this.handleConnectionChange);
    }
    this.listeners.clear();
  }

  private handleOnlineChange = (): void => {
    const isOnline = navigator.onLine;
    this.updateCapabilities({
      ...this.currentCapabilities,
      isOnline,
      tier: isOnline ? (this.simulatedTier || '4G') : 'OFFLINE',
    });
  };

  private handleConnectionChange = (): void => {
    const navConn = (navigator as any).connection;
    if (!navConn) return;

    const downlink = navConn.downlink || 10;
    const rtt = navConn.rtt || 50;
    const saveData = Boolean(navConn.saveData);
    const tier = this.resolveNetworkTier(navConn.effectiveType || '4g', downlink, rtt);

    this.updateCapabilities({
      tier: this.simulatedTier || tier,
      downlinkMbps: downlink,
      rttMs: rtt,
      saveData,
      isOnline: navigator.onLine,
    });
  };

  public setSimulatedNetworkTier(tier: NetworkTier | null): void {
    this.simulatedTier = tier;
    if (tier) {
      const mockDownlinks: Record<NetworkTier, number> = {
        OFFLINE: 0,
        SLOW_2G: 0.1,
        '2G': 0.3,
        '3G': 1.5,
        '4G': 10.0,
        '5G': 30.0,
        HIGH_SPEED: 100.0,
      };
      const mockRtts: Record<NetworkTier, number> = {
        OFFLINE: 9999,
        SLOW_2G: 1200,
        '2G': 600,
        '3G': 250,
        '4G': 50,
        '5G': 20,
        HIGH_SPEED: 5,
      };

      this.updateCapabilities({
        tier,
        downlinkMbps: mockDownlinks[tier],
        rttMs: mockRtts[tier],
        saveData: tier === 'SLOW_2G' || tier === '2G',
        isOnline: tier !== 'OFFLINE',
      });
    } else {
      this.updateCapabilities(this.detectInitialCapabilities());
    }
  }

  public getCapabilities(): NetworkCapabilities {
    return { ...this.currentCapabilities };
  }

  public subscribe(listener: (capabilities: NetworkCapabilities) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private updateCapabilities(newCaps: NetworkCapabilities): void {
    this.currentCapabilities = newCaps;
    this.listeners.forEach((fn) => {
      try {
        fn(this.currentCapabilities);
      } catch (err) {
        console.error('Error in network capabilities listener', err);
      }
    });

    try {
      const bus = DistributedEventBus.getInstance();
      bus.publish({
        eventType: 'NETWORK_TIER_CHANGED',
        source: 'NetworkPerformanceDetector',
        priority: 'MEDIUM',
        payload: {
          networkTier: newCaps.tier,
          downlinkMbps: newCaps.downlinkMbps,
          rttMs: newCaps.rttMs,
        },
        suppressionFingerprint: `net-tier-${newCaps.tier}-${Math.floor(Date.now() / 4000)}`,
      });
    } catch {
      // Ignore bus errors in isolated tests
    }
  }
}

export const networkPerformanceDetector = NetworkPerformanceDetector.getInstance();
