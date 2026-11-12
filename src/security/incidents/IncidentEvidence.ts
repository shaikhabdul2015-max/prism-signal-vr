/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Incident Evidence Locker
 * Cryptographically seals forensic evidence with SHA-256 hashes for tamper-evident chain of custody.
 */

import crypto from 'node:crypto';

export interface ForensicEvidenceItem {
  id: string;
  timestamp: string;
  type: string;
  source: string;
  sha256Hash: string;
  data: Record<string, unknown>;
}

export class IncidentEvidenceLocker {
  private evidenceItems: ForensicEvidenceItem[] = [];

  public sealEvidence(
    type: string,
    source: string,
    data: Record<string, unknown>
  ): ForensicEvidenceItem {
    const timestamp = new Date().toISOString();
    const id = `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Strip secrets before hashing
    const sanitizedData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      const lower = k.toLowerCase();
      if (lower.includes('secret') || lower.includes('password') || lower.includes('token') || lower.includes('key')) {
        sanitizedData[k] = '[REDACTED]';
      } else {
        sanitizedData[k] = v;
      }
    }

    const serialized = JSON.stringify({ id, timestamp, type, source, data: sanitizedData });
    const sha256Hash = crypto.createHash('sha256').update(serialized).digest('hex');

    const item: ForensicEvidenceItem = {
      id,
      timestamp,
      type,
      source,
      sha256Hash,
      data: sanitizedData,
    };

    this.evidenceItems.push(item);
    return item;
  }

  public getEvidence(): ForensicEvidenceItem[] {
    return [...this.evidenceItems];
  }

  public verifyIntegrity(item: ForensicEvidenceItem): boolean {
    const serialized = JSON.stringify({
      id: item.id,
      timestamp: item.timestamp,
      type: item.type,
      source: item.source,
      data: item.data,
    });
    const computed = crypto.createHash('sha256').update(serialized).digest('hex');
    return computed === item.sha256Hash;
  }
}
