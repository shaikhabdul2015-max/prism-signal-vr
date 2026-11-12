/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Distributed Tracing Engine (Stage 4).
 * W3C Trace Context (traceparent) compliant distributed tracing fabric.
 * Provides microsecond-precision span timing, cross-module context propagation,
 * error tracking, and OpenTelemetry-compatible span recording without external runtime bloat.
 */

import { TraceContext, SpanRecord } from '../types/enterpriseSecurity';

export class DistributedTracingEngine {
  private static instance: DistributedTracingEngine | null = null;
  private spans: Map<string, SpanRecord> = new Map();
  private activeSpanStack: string[] = []; // spanId stack
  private completedSpans: SpanRecord[] = [];
  private maxCompletedRetention = 500;

  private constructor() {}

  public static getInstance(): DistributedTracingEngine {
    if (!DistributedTracingEngine.instance) {
      DistributedTracingEngine.instance = new DistributedTracingEngine();
    }
    return DistributedTracingEngine.instance;
  }

  public static resetInstance(): void {
    DistributedTracingEngine.instance = null;
  }

  /**
   * Generates a 16-byte random hex string for 128-bit W3C TraceId.
   */
  public generateTraceId(): string {
    const chars = '0123456789abcdef';
    let id = '';
    for (let i = 0; i < 32; i++) {
      id += chars[Math.floor(Math.random() * 16)];
    }
    return id;
  }

  /**
   * Generates an 8-byte random hex string for 64-bit W3C SpanId.
   */
  public generateSpanId(): string {
    const chars = '0123456789abcdef';
    let id = '';
    for (let i = 0; i < 16; i++) {
      id += chars[Math.floor(Math.random() * 16)];
    }
    return id;
  }

  /**
   * Parses or creates a W3C traceparent header string.
   * Format: "00-${traceId}-${spanId}-${traceFlags}"
   */
  public formatTraceparent(ctx: TraceContext): string {
    return `00-${ctx.traceId}-${ctx.spanId}-${ctx.traceFlags || '01'}`;
  }

  public parseTraceparent(header?: string): TraceContext {
    if (header && typeof header === 'string') {
      const parts = header.trim().split('-');
      if (parts.length === 4 && parts[0] === '00' && parts[1].length === 32 && parts[2].length === 16) {
        return {
          traceId: parts[1],
          spanId: parts[2],
          traceFlags: parts[3],
        };
      }
    }

    return {
      traceId: this.generateTraceId(),
      spanId: this.generateSpanId(),
      traceFlags: '01',
    };
  }

  /**
   * Starts a new distributed span.
   */
  public startSpan(params: {
    name: string;
    service: string;
    traceId?: string;
    parentSpanId?: string;
    attributes?: Record<string, string | number | boolean>;
  }): SpanRecord {
    const spanId = this.generateSpanId();
    const traceId =
      params.traceId ||
      (this.activeSpanStack.length > 0
        ? this.spans.get(this.activeSpanStack[this.activeSpanStack.length - 1])?.traceId
        : undefined) ||
      this.generateTraceId();

    const parentSpanId =
      params.parentSpanId ||
      (this.activeSpanStack.length > 0 ? this.activeSpanStack[this.activeSpanStack.length - 1] : undefined);

    const span: SpanRecord = {
      spanId,
      traceId,
      parentSpanId,
      name: params.name,
      service: params.service,
      startTimeUs: Math.round(performance.now() * 1000),
      statusCode: 'UNSET',
      attributes: { ...(params.attributes || {}) },
      events: [],
    };

    this.spans.set(spanId, span);
    this.activeSpanStack.push(spanId);
    return span;
  }

  /**
   * Records an in-span event or annotation.
   */
  public addSpanEvent(spanId: string, name: string, attributes?: Record<string, unknown>): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.events.push({
      name,
      timestampUs: Math.round(performance.now() * 1000),
      attributes,
    });
  }

  /**
   * Ends an active span and records duration.
   */
  public endSpan(
    spanId: string,
    options: { statusCode?: 'OK' | 'ERROR'; statusMessage?: string } = {}
  ): SpanRecord | null {
    const span = this.spans.get(spanId);
    if (!span) return null;

    const endTimeUs = Math.round(performance.now() * 1000);
    span.endTimeUs = endTimeUs;
    span.durationUs = Math.max(0, endTimeUs - span.startTimeUs);
    span.statusCode = options.statusCode || (options.statusMessage ? 'ERROR' : 'OK');
    span.statusMessage = options.statusMessage;

    // Pop from active stack if it matches
    const stackIdx = this.activeSpanStack.indexOf(spanId);
    if (stackIdx >= 0) {
      this.activeSpanStack.splice(stackIdx, 1);
    }

    this.completedSpans.unshift(span);
    if (this.completedSpans.length > this.maxCompletedRetention) {
      this.completedSpans.pop();
    }

    return span;
  }

  /**
   * Synchronously or asynchronously wraps an operation in a span.
   */
  public async traceOperation<T>(
    name: string,
    service: string,
    fn: (span: SpanRecord) => Promise<T> | T,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    const span = this.startSpan({ name, service, attributes });
    try {
      const result = await fn(span);
      this.endSpan(span.spanId, { statusCode: 'OK' });
      return result;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.endSpan(span.spanId, { statusCode: 'ERROR', statusMessage: errMsg });
      throw err;
    }
  }

  public getSpan(spanId: string): SpanRecord | undefined {
    return this.spans.get(spanId);
  }

  public getTraceSpans(traceId: string): SpanRecord[] {
    return this.completedSpans.filter((s) => s.traceId === traceId);
  }

  public getRecentSpans(limit: number = 50): SpanRecord[] {
    return this.completedSpans.slice(0, limit);
  }
}

export const distributedTracingEngine = DistributedTracingEngine.getInstance();
