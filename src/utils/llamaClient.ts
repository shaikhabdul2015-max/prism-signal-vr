// src/utils/llamaClient.ts

import type {
  AIAnalysisResult,
  VRTelemetry,
  DiagnosticsAIRequest,
  DiagnosticsAIResponse,
} from "../types/diagnostics";
import { assessEnvironmentalCausation } from "./environmentalAssessment";

const DEFAULT_ENDPOINT = "/api/llama/analyze";
const DEFAULT_TIMEOUT_MS = 30_000;

export class LlamaClientError extends Error {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "LlamaClientError";
    this.statusCode = statusCode;
  }
}

export interface LlamaClientOptions {
  endpoint?: string;
  timeoutMs?: number;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string")
  );
}

function isValidAnalysis(
  value: unknown,
): value is AIAnalysisResult {
  if (!isRecord(value)) {
    return false;
  }

  const validStatuses = [
    "PASS",
    "FAIL",
    "INCONCLUSIVE",
  ];

  if (
    value.schemaVersion !== "1.0" ||
    typeof value.summary !== "string" ||
    !validStatuses.includes(
      String(value.overallStatus),
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(value.categories) ||
    value.categories.length !== 6 ||
    !isRecord(value.metrics) ||
    !isRecord(value.environmentalAssessment) ||
    !isRecord(value.dataQuality) ||
    !isStringArray(value.recommendations)
  ) {
    return false;
  }

  const expectedCategories = new Set([
    "skeleton_integrity",
    "tracking_continuity",
    "frame_performance",
    "latency",
    "environmental_conditions",
    "test_execution",
  ]);

  const seenCategories = new Set<string>();

  for (const category of value.categories) {
    if (!isRecord(category)) {
      return false;
    }

    if (
      typeof category.name !== "string" ||
      !expectedCategories.has(category.name) ||
      seenCategories.has(category.name)
    ) {
      return false;
    }

    seenCategories.add(category.name);

    if (
      !["PASS", "FAIL", "INCONCLUSIVE", "NOT_RUN"]
        .includes(String(category.status)) ||
      !isStringArray(category.observations) ||
      !isStringArray(category.issues) ||
      !isStringArray(category.recommendations)
    ) {
      return false;
    }
  }

  if (seenCategories.size !== 6) {
    return false;
  }

  if (
    ![
      "CONFIRMED",
      "INCONCLUSIVE",
    ].includes(
      String(
        value.environmentalAssessment.causationStatus,
      ),
    )
  ) {
    return false;
  }

  if (
    !["bright_studio", "low_light", "backlit_glare", null]
      .includes(
        value.environmentalAssessment.selectedPreset as
          | string
          | null,
      )
  ) {
    return false;
  }

  if (
    !isStringArray(value.dataQuality.missingFields) ||
    !isStringArray(value.dataQuality.warnings) ||
    typeof value.dataQuality.complete !== "boolean"
  ) {
    return false;
  }

  const metricKeys = [
    "expectedJointCount",
    "observedJointCount",
    "frameCount",
    "measuredLatencyMs",
    "trackingLossEvents",
    "recoveryTimeMs",
  ] as const;

  for (const key of metricKeys) {
    const metric = value.metrics[key];

    if (
      metric !== null &&
      (
        typeof metric !== "number" ||
        !Number.isFinite(metric) ||
        metric < 0
      )
    ) {
      return false;
    }
  }

  return true;
}

export async function analyzeVRTelemetry(
  telemetry: VRTelemetry,
  options: LlamaClientOptions = {},
  externalSignal?: AbortSignal,
): Promise<AIAnalysisResult> {
  const endpoint =
    options.endpoint ?? DEFAULT_ENDPOINT;

  const timeoutMs =
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new LlamaClientError(
      "The request timeout must be a positive number.",
    );
  }

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const abortFromExternalSignal = () => {
    controller.abort();
  };

  if (externalSignal?.aborted) {
    clearTimeout(timeoutId);

    throw new LlamaClientError(
      "The analysis request was cancelled.",
    );
  }

  externalSignal?.addEventListener(
    "abort",
    abortFromExternalSignal,
    { once: true },
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify({
        telemetry,
        schemaVersion: "1.0",
      }),

      signal: controller.signal,
    });

    if (!response.ok) {
      throw new LlamaClientError(
        `AI analysis failed with HTTP ${response.status}.`,
        response.status,
      );
    }

    const payload: unknown = await response.json();

    if (!isRecord(payload) || !isValidAnalysis(payload.analysis)) {
      throw new LlamaClientError(
        "The AI server returned an invalid diagnostic response.",
      );
    }

    const analysis: AIAnalysisResult = payload.analysis;

    // Enforce Rule #2 invariant: Deterministic environmental causation validation
    const verifiedAssessment = assessEnvironmentalCausation(telemetry.causationEvidence);
    analysis.environmentalAssessment = {
      selectedPreset: telemetry.lightingPreset ?? analysis.environmentalAssessment?.selectedPreset ?? null,
      causationStatus: verifiedAssessment.causationStatus,
      causationEvidence: verifiedAssessment.causationEvidence,
      explanation: verifiedAssessment.explanation,
    };

    const envCategory = analysis.categories.find((c) => c.name === "environmental_conditions");
    if (envCategory) {
      if (verifiedAssessment.causationStatus === "CONFIRMED") {
        envCategory.status = "FAIL";
        envCategory.issues = [
          `Validated hardware causation token confirms tracking degradation: ${verifiedAssessment.causationEvidence}`,
        ];
      } else {
        envCategory.status = "INCONCLUSIVE";
        envCategory.issues = [];
        if (!envCategory.observations.some((obs) => obs.includes("INCONCLUSIVE") || obs.includes("Rule #2"))) {
          envCategory.observations.push(
            "Environmental illumination causation classified as INCONCLUSIVE under Rule #2.",
          );
        }
      }
    }

    return analysis;
  } catch (error: unknown) {
    if (error instanceof LlamaClientError) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new LlamaClientError(
        externalSignal?.aborted
          ? "The analysis request was cancelled."
          : "AI analysis timed out.",
      );
    }

    throw new LlamaClientError(
      "Unable to connect to the AI analysis service.",
    );
  } finally {
    clearTimeout(timeoutId);

    externalSignal?.removeEventListener(
      "abort",
      abortFromExternalSignal,
    );
  }
}

/**
 * Backward-compatible helper for UI components requesting diagnostics.
 */
export async function requestHandDiagnosticsAI(
  payload: DiagnosticsAIRequest,
): Promise<DiagnosticsAIResponse> {
  try {
    const response = await fetch("/api/llama/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        errorData.error ||
        errorData.message ||
        `Diagnostic request failed with status ${response.status}`;
      throw new LlamaClientError(message, response.status);
    }

    const data = (await response.json()) as DiagnosticsAIResponse & { analysis?: AIAnalysisResult };
    if (data.analysis && !data.qaReport) {
      data.qaReport = data.analysis;
    }
    return data;
  } catch (err: any) {
    throw new LlamaClientError(
      err?.message || "Unable to connect to the AI analysis service.",
    );
  }
}
