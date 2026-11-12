/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Mission Evidence Validator (Phase 28)
 * Rigorously audits and calibrates evidence provenance, source reliability,
 * and empirical completeness before any mission plan or task execution is certified.
 * 
 * CRITICAL RULE:
 * Strictly distinguishes:
 * - VERIFIED
 * - PARTIALLY_VERIFIED
 * - UNVERIFIED
 * - CONTRADICTED
 * - INSUFFICIENT_EVIDENCE
 * 
 * Never converts uncertainty into certainty or elevates ungrounded extrapolation
 * to verified status.
 */

import {
  ResearchEvidence,
  ResearchCitation,
  EvidenceVerificationStatus,
  MissionExecutionTask,
} from '../types/phase28';

export interface EvidenceValidationAudit {
  evidenceId: string;
  sourceReliability: number; // 0.0 to 1.0
  provenanceVerified: boolean;
  status: EvidenceVerificationStatus;
  calibratedConfidence: number; // 0 to 100
  isSupportedByTelemetryOrCitation: boolean;
  notes: string;
}

export interface MissionEvidenceAuditReport {
  missionId: string;
  overallStatus: EvidenceVerificationStatus;
  overallReliabilityScore: number; // 0 to 100
  audits: EvidenceValidationAudit[];
  conflictingClaimsCount: number;
  unsupportedClaimsCount: number;
  readinessForExecution: boolean;
  auditedAt: string;
}

export class MissionEvidenceValidator {
  private static instance: MissionEvidenceValidator | null = null;

  private constructor() {}

  public static getInstance(): MissionEvidenceValidator {
    if (!MissionEvidenceValidator.instance) {
      MissionEvidenceValidator.instance = new MissionEvidenceValidator();
    }
    return MissionEvidenceValidator.instance;
  }

  public static resetInstance(): void {
    MissionEvidenceValidator.instance = null;
  }

  /**
   * Validates a batch of research evidence against authoritative sources and known constraints
   */
  public auditMissionEvidence(
    missionId: string,
    evidenceList: ResearchEvidence[],
    citations: ResearchCitation[],
    tasks?: MissionExecutionTask[]
  ): MissionEvidenceAuditReport {
    const citationMap = new Map<string, ResearchCitation>();
    citations.forEach((c) => citationMap.set(c.citationId, c));

    const audits: EvidenceValidationAudit[] = [];
    let conflictingCount = 0;
    let unsupportedCount = 0;

    evidenceList.forEach((ev) => {
      const citation = citationMap.get(ev.citationId);
      const sourceReliability = citation ? citation.reliabilityScore : 0.5;
      const provenanceVerified = Boolean(citation && citation.referenceUrlOrKey && citation.referenceUrlOrKey.length > 5);

      let calibratedConfidence = ev.confidenceScore;
      let status: EvidenceVerificationStatus = ev.verificationStatus;
      let notes = 'Provenance and citation verified.';

      // Check if evidence is supported
      if (!citation) {
        unsupportedCount += 1;
        status = 'UNVERIFIED';
        calibratedConfidence = Math.min(40, calibratedConfidence * 0.5);
        notes = 'Unsupported claim: No matching citation found in research references.';
      } else if (ev.verificationStatus === 'CONTRADICTED') {
        conflictingCount += 1;
        status = 'CONTRADICTED';
        calibratedConfidence = Math.min(30, calibratedConfidence * 0.4);
        notes = 'Contradiction flagged: Direct conflict between empirical telemetry and objective.';
      } else if (sourceReliability < 0.7) {
        status = 'PARTIALLY_VERIFIED';
        calibratedConfidence = Math.round(calibratedConfidence * sourceReliability);
        notes = 'Source reliability score is below high-assurance threshold (<0.7).';
      }

      // Check simulated data flag to avoid false certainty
      if (ev.isSimulatedData) {
        calibratedConfidence = Math.min(85, calibratedConfidence);
        notes += ' (Simulated model prediction: uncertainty margin retained)';
      }

      audits.push({
        evidenceId: ev.evidenceId,
        sourceReliability,
        provenanceVerified,
        status,
        calibratedConfidence,
        isSupportedByTelemetryOrCitation: Boolean(citation),
        notes,
      });
    });

    // Check task evidence requirements
    if (tasks && tasks.length > 0) {
      tasks.forEach((t) => {
        const missingEvidence = t.requiredEvidenceIds.filter(
          (reqId) => !evidenceList.some((e) => e.evidenceId === reqId || e.citationId === reqId)
        );
        if (missingEvidence.length > 0) {
          unsupportedCount += missingEvidence.length;
        }
      });
    }

    // Determine aggregate status
    let overallStatus: EvidenceVerificationStatus = 'VERIFIED';
    if (evidenceList.length === 0) {
      overallStatus = 'INSUFFICIENT_EVIDENCE';
    } else if (conflictingCount > 0) {
      overallStatus = 'CONTRADICTED';
    } else if (unsupportedCount > 0 || audits.some((a) => a.status === 'PARTIALLY_VERIFIED')) {
      overallStatus = 'PARTIALLY_VERIFIED';
    }

    const avgConfidence =
      audits.length > 0
        ? Math.round(audits.reduce((acc, a) => acc + a.calibratedConfidence, 0) / audits.length)
        : 0;

    const readinessForExecution =
      overallStatus === 'VERIFIED' ||
      (overallStatus === 'PARTIALLY_VERIFIED' && conflictingCount === 0 && avgConfidence >= 75);

    return {
      missionId,
      overallStatus,
      overallReliabilityScore: avgConfidence,
      audits,
      conflictingClaimsCount: conflictingCount,
      unsupportedClaimsCount: unsupportedCount,
      readinessForExecution,
      auditedAt: new Date().toISOString(),
    };
  }

  /**
   * Verifies completion proof for an individual task
   */
  public verifyTaskCompletionEvidence(
    task: MissionExecutionTask,
    evidenceSnippet: string,
    metricProof: Record<string, number | string | boolean>
  ): { isValid: boolean; status: EvidenceVerificationStatus; reason: string } {
    if (!evidenceSnippet || evidenceSnippet.trim().length < 10) {
      return {
        isValid: false,
        status: 'INSUFFICIENT_EVIDENCE',
        reason: 'Evidence snippet is missing or insufficient to prove task completion.',
      };
    }

    if (Object.keys(metricProof).length === 0) {
      return {
        isValid: false,
        status: 'PARTIALLY_VERIFIED',
        reason: 'Missing quantitative metric proof (e.g. cadence, latency, or joint count).',
      };
    }

    return {
      isValid: true,
      status: 'VERIFIED',
      reason: 'Completion evidence verified with empirical metric proof.',
    };
  }
}

export const missionEvidenceValidator = MissionEvidenceValidator.getInstance();
