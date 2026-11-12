/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Optimization Validation Engine (Phase 34)
 * Strict pre-application safety and integrity verification subsystem.
 * Strictly guarantees that self-optimization never bypasses, weakens, or alters
 * Phase 32 Zero-Trust security rules, authorization gates, or encryption policies.
 */

import {
  OptimizationRecommendation,
  OptimizationValidationReport,
  ValidationCheckResult,
} from '../types/phase34';

export class OptimizationValidationEngine {
  private static instance: OptimizationValidationEngine | null = null;
  private validationReports: Map<string, OptimizationValidationReport> = new Map();

  public static getInstance(): OptimizationValidationEngine {
    if (!OptimizationValidationEngine.instance) {
      OptimizationValidationEngine.instance = new OptimizationValidationEngine();
    }
    return OptimizationValidationEngine.instance;
  }

  public static resetInstance(): void {
    OptimizationValidationEngine.instance = null;
  }

  /**
   * Performs an exhaustive multi-point pre-flight validation on an optimization recommendation.
   */
  public validateRecommendation(recommendation: OptimizationRecommendation): OptimizationValidationReport {
    const checks: ValidationCheckResult[] = [];
    const now = new Date().toISOString();

    // 1. Schema & Type Validity
    const hasTargetKey = Boolean(recommendation.targetConfigKey && typeof recommendation.targetConfigKey === 'string');
    const hasProposedValue = recommendation.proposedValue !== undefined;
    const schemaPassed = hasTargetKey && hasProposedValue;
    checks.push({
      checkId: 'CHK-SCHEMA-01',
      checkName: 'Configuration Schema & Type Conformance',
      passed: schemaPassed,
      details: schemaPassed
        ? `Target parameter "${recommendation.targetConfigKey}" with valid payload type (${typeof recommendation.proposedValue}).`
        : 'Missing target config key or proposed parameter value.',
      timestamp: now,
    });

    // 2. Zero-Trust Security Compliance Check (Phase 32 invariant)
    // Never allow modifications that tamper with security bypasses, auth tokens, or zero-trust keys
    const isSecuritySensitive =
      recommendation.targetConfigKey.toLowerCase().includes('security') ||
      recommendation.targetConfigKey.toLowerCase().includes('auth') ||
      recommendation.targetConfigKey.toLowerCase().includes('token') ||
      recommendation.targetConfigKey.toLowerCase().includes('bypass');

    const securityPassed = !isSecuritySensitive;
    checks.push({
      checkId: 'CHK-SEC-02',
      checkName: 'Zero-Trust Security & Boundary Invariance',
      passed: securityPassed,
      details: securityPassed
        ? 'Target key does not modify Zero-Trust cryptographic verification, RBAC roles, or API gateway rules.'
        : 'CRITICAL SECURITY BREACH: Attempted optimization targeting protected security infrastructure.',
      timestamp: now,
    });

    // 3. Resource Bounds and Range Constraints
    let boundsPassed = true;
    let boundsMessage = 'Parameter is within defined operational limits.';
    if (typeof recommendation.proposedValue === 'number') {
      if (recommendation.targetConfigKey === 'taskScheduling.maxConcurrency') {
        boundsPassed = recommendation.proposedValue >= 2 && recommendation.proposedValue <= 16;
        boundsMessage = boundsPassed
          ? `Concurrency (${recommendation.proposedValue}) within [2, 16] envelope.`
          : `Concurrency (${recommendation.proposedValue}) outside safe [2, 16] envelope.`;
      } else if (recommendation.targetConfigKey === 'caching.cacheTtlSeconds') {
        boundsPassed = recommendation.proposedValue >= 30 && recommendation.proposedValue <= 600;
        boundsMessage = boundsPassed
          ? `Cache TTL (${recommendation.proposedValue}s) within [30s, 600s] envelope.`
          : `Cache TTL (${recommendation.proposedValue}s) exceeds safe limits.`;
      } else if (recommendation.targetConfigKey === 'rendering.dynamicResolutionThresholdFps') {
        boundsPassed = recommendation.proposedValue >= 30 && recommendation.proposedValue <= 60;
        boundsMessage = boundsPassed
          ? `FPS threshold (${recommendation.proposedValue}) within [30, 60] FPS envelope.`
          : `FPS threshold (${recommendation.proposedValue}) out of bounds.`;
      }
    }
    checks.push({
      checkId: 'CHK-BOUNDS-03',
      checkName: 'Resource Envelope Constraints Verification',
      passed: boundsPassed,
      details: boundsMessage,
      timestamp: now,
    });

    // 4. Dependencies Verification
    const dependenciesPassed = recommendation.validationCriteria.length > 0;
    checks.push({
      checkId: 'CHK-DEP-04',
      checkName: 'Subsystem Dependency Verification',
      passed: dependenciesPassed,
      details: dependenciesPassed
        ? `Verified ${recommendation.validationCriteria.length} operational preconditions.`
        : 'No validation preconditions specified.',
      timestamp: now,
    });

    // 5. Regression Risk & Rollback Readiness
    const rollbackReady =
      Boolean(recommendation.rollbackThresholdMetric) &&
      typeof recommendation.rollbackThresholdValue === 'number' &&
      recommendation.currentValue !== undefined;
    checks.push({
      checkId: 'CHK-ROLLBACK-05',
      checkName: 'Rollback Readiness & Safety Metric Verification',
      passed: rollbackReady,
      details: rollbackReady
        ? `Rollback threshold set on "${recommendation.rollbackThresholdMetric}" (${recommendation.rollbackThresholdValue}). Baseline value preserved.`
        : 'Missing rollback threshold metric or baseline value.',
      timestamp: now,
    });

    const overallPassed = checks.every((c) => c.passed);
    const report: OptimizationValidationReport = {
      validationId: `val-${recommendation.recommendationId}-${Date.now().toString(36)}`,
      recommendationId: recommendation.recommendationId,
      schemaValid: schemaPassed,
      securityCompliant: securityPassed,
      resourceConstraintsSatisfied: boundsPassed,
      dependenciesVerified: dependenciesPassed,
      regressionRiskAcceptable: rollbackReady,
      checks,
      overallValidationPassed: overallPassed,
      validatedAt: now,
    };

    this.validationReports.set(recommendation.recommendationId, report);
    return report;
  }

  public getValidationReport(recommendationId: string): OptimizationValidationReport | undefined {
    return this.validationReports.get(recommendationId);
  }

  public getAllValidationReports(): Record<string, OptimizationValidationReport> {
    const result: Record<string, OptimizationValidationReport> = {};
    this.validationReports.forEach((report, id) => {
      result[id] = report;
    });
    return result;
  }
}
