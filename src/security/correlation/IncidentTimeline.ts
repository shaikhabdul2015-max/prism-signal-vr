/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Incident Timeline
 * Reconstructs chronological forensic attack timelines with W3C trace correlation.
 */

import { ThreatEvent } from '../threat-detection/ThreatEvent';

export interface TimelineEntry {
  step: number;
  timestamp: string;
  category: string;
  severity: string;
  title: string;
  sourceIp: string;
  userId?: string;
  traceId?: string;
  endpoint?: string;
  mitigation?: string;
}

export class IncidentTimeline {
  public static buildTimeline(events: ThreatEvent[]): TimelineEntry[] {
    // Sort chronologically
    const sorted = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return sorted.map((evt, index) => ({
      step: index + 1,
      timestamp: evt.timestamp,
      category: evt.category,
      severity: evt.severity,
      title: evt.title,
      sourceIp: evt.sourceIp,
      userId: evt.userId,
      traceId: evt.context?.traceId,
      endpoint: evt.endpoint,
      mitigation: evt.mitigationApplied,
    }));
  }
}
