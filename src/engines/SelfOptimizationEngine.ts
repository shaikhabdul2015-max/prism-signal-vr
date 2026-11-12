/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Self Optimization Engine (Phase 34)
 * Controlled runtime configuration parameter manager across the 8 optimization domains.
 * Enforces controlled configuration parameterization: NEVER rewrites source code at runtime.
 * Maintains immutable versioning and audit capabilities for parameter adjustments.
 */

export interface SystemRuntimeConfig {
  version: string;
  lastModified: string;
  parameters: {
    // 1. AI_REQUEST_ROUTING
    'aiRouting.primaryProvider': 'GEMINI_SERVER_PROXY' | 'LOCAL_HEURISTICS' | 'WEB_WORKER';
    'aiRouting.timeoutMs': number;
    'aiRouting.fallbackCascade': string[];
    // 2. TASK_SCHEDULING
    'taskScheduling.maxConcurrency': number;
    'taskScheduling.taskBatchSize': number;
    'taskScheduling.priorityWeightHigh': number;
    // 3. AGENT_WORKLOAD_DISTRIBUTION
    'agentWorkload.loadBalancingStrategy': 'ROUND_ROBIN' | 'LEAST_LOADED' | 'SPECIALIST_AFFINITY';
    'agentWorkload.agentQueueLimit': number;
    // 4. CACHING_POLICIES
    'caching.cacheTtlSeconds': number;
    'caching.maxEntries': number;
    'caching.evictionPolicy': 'LRU' | 'LFU' | 'FIFO';
    // 5. DATA_PROCESSING_PIPELINES
    'dataPipeline.batchIntervalMs': number;
    'dataPipeline.bufferCapacity': number;
    // 6. RENDERING_PERFORMANCE
    'rendering.dynamicResolutionThresholdFps': number;
    'rendering.frameBudgetMs': number;
    // 7. BACKGROUND_TASK_EXECUTION
    'backgroundTasks.idleDelayMs': number;
    'backgroundTasks.throttleFactor': number;
    // 8. RETRY_TIMEOUT_POLICIES
    'retryTimeout.maxRetries': number;
    'retryTimeout.backoffBaseMs': number;
    [key: string]: any;
  };
}

export class SelfOptimizationEngine {
  private static instance: SelfOptimizationEngine | null = null;
  private currentConfig: SystemRuntimeConfig;
  private configHistory: { version: string; key: string; oldValue: any; newValue: any; timestamp: string }[] = [];
  private listeners: Set<(config: SystemRuntimeConfig) => void> = new Set();
  private versionMajor = 34;
  private versionMinor = 1;
  private versionPatch = 0;

  public constructor() {
    this.currentConfig = {
      version: `v${this.versionMajor}.${this.versionMinor}.${this.versionPatch}`,
      lastModified: new Date().toISOString(),
      parameters: {
        'aiRouting.primaryProvider': 'GEMINI_SERVER_PROXY',
        'aiRouting.timeoutMs': 3500,
        'aiRouting.fallbackCascade': ['LOCAL_HEURISTICS', 'WEB_WORKER'],
        'taskScheduling.maxConcurrency': 8,
        'taskScheduling.taskBatchSize': 10,
        'taskScheduling.priorityWeightHigh': 1.5,
        'agentWorkload.loadBalancingStrategy': 'SPECIALIST_AFFINITY',
        'agentWorkload.agentQueueLimit': 25,
        'caching.cacheTtlSeconds': 180,
        'caching.maxEntries': 500,
        'caching.evictionPolicy': 'LRU',
        'dataPipeline.batchIntervalMs': 250,
        'dataPipeline.bufferCapacity': 1000,
        'rendering.dynamicResolutionThresholdFps': 45,
        'rendering.frameBudgetMs': 16.6,
        'backgroundTasks.idleDelayMs': 500,
        'backgroundTasks.throttleFactor': 0.8,
        'retryTimeout.maxRetries': 3,
        'retryTimeout.backoffBaseMs': 200,
      },
    };
  }

  public static getInstance(): SelfOptimizationEngine {
    if (!SelfOptimizationEngine.instance) {
      SelfOptimizationEngine.instance = new SelfOptimizationEngine();
    }
    return SelfOptimizationEngine.instance;
  }

  public static resetInstance(): void {
    SelfOptimizationEngine.instance = null;
  }

  public getCurrentConfig(): SystemRuntimeConfig {
    return JSON.parse(JSON.stringify(this.currentConfig));
  }

  public getParameterValue<T = any>(key: string): T {
    return this.currentConfig.parameters[key];
  }

  /**
   * Preview a configuration change without mutating live state.
   */
  public previewChange(key: string, proposedValue: any): { key: string; currentValue: any; proposedValue: any } {
    return {
      key,
      currentValue: this.currentConfig.parameters[key],
      proposedValue,
    };
  }

  /**
   * Applies an approved and validated configuration change.
   */
  public applyValidatedChange(key: string, newValue: any, auditNote?: string): { success: boolean; newVersion: string } {
    const oldValue = this.currentConfig.parameters[key];
    this.versionPatch += 1;
    const newVersion = `v${this.versionMajor}.${this.versionMinor}.${this.versionPatch}`;
    const timestamp = new Date().toISOString();

    this.currentConfig.parameters[key] = newValue;
    this.currentConfig.version = newVersion;
    this.currentConfig.lastModified = timestamp;

    this.configHistory.push({
      version: newVersion,
      key,
      oldValue,
      newValue,
      timestamp,
    });

    this.notifyListeners();
    return { success: true, newVersion };
  }

  /**
   * Restores a parameter to a specified previous value.
   */
  public rollbackChange(key: string, restoredValue: any, rollbackReason: string): { success: boolean; restoredVersion: string } {
    const oldValue = this.currentConfig.parameters[key];
    this.versionPatch += 1;
    const restoredVersion = `v${this.versionMajor}.${this.versionMinor}.${this.versionPatch}`;
    const timestamp = new Date().toISOString();

    this.currentConfig.parameters[key] = restoredValue;
    this.currentConfig.version = restoredVersion;
    this.currentConfig.lastModified = timestamp;

    this.configHistory.push({
      version: restoredVersion,
      key,
      oldValue,
      newValue: restoredValue,
      timestamp,
    });

    this.notifyListeners();
    return { success: true, restoredVersion };
  }

  public getConfigHistory(): typeof this.configHistory {
    return [...this.configHistory];
  }

  public subscribe(listener: (config: SystemRuntimeConfig) => void): () => void {
    this.listeners.add(listener);
    listener(this.getCurrentConfig());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const cfg = this.getCurrentConfig();
    this.listeners.forEach((fn) => fn(cfg));
  }
}
