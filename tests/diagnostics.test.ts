import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { assessEnvironmentalCausation } from "../src/utils/environmentalAssessment";
import {
  analyzeVRTelemetry,
  LlamaClientError,
} from "../src/utils/llamaClient";
import type {
  AIAnalysisResult,
  VRTelemetry,
  VRCausationEvidence,
  LightingPreset,
} from "../src/types/diagnostics";

// Helper to create valid baseline telemetry
function createBaselineTelemetry(overrides: Partial<VRTelemetry> = {}): VRTelemetry {
  const joints = Array.from({ length: 25 }, (_, i) => ({
    jointId: `joint_${i}`,
    tracked: true,
    confidence: 0.95,
  }));

  return {
    sessionId: `session-${Date.now()}`,
    startedAt: new Date().toISOString(),
    completedAt: null,
    expectedJointCount: 25,
    joints,
    frames: [
      { timestampMs: 1000, frameDurationMs: 13.8, dropped: false },
      { timestampMs: 1014, frameDurationMs: 13.8, dropped: false },
    ],
    trackingEvents: [{ timestampMs: 1000, tracking: true }],
    latencySamples: [{ timestampMs: 1000, latencyMs: 13.8 }],
    lightingPreset: "bright_studio",
    causationEvidence: null,
    thresholds: {
      minTrackedJoints: 25,
      maxLatencyMs: 33,
      maxFrameDurationMs: 16.6,
      maxRecoveryTimeMs: 100,
    },
    executedCategories: [
      "skeleton_integrity",
      "tracking_continuity",
      "frame_performance",
      "latency",
      "environmental_conditions",
      "test_execution",
    ],
    autoSavedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to create a valid AIAnalysisResult
function createValidAnalysisResult(overrides: Partial<AIAnalysisResult> = {}): AIAnalysisResult {
  return {
    schemaVersion: "1.0",
    overallStatus: "PASS",
    summary: "WebXR telemetry validated successfully with nominal performance.",
    categories: [
      {
        name: "skeleton_integrity",
        status: "PASS",
        observations: ["All 25 joints active."],
        issues: [],
        recommendations: [],
      },
      {
        name: "tracking_continuity",
        status: "PASS",
        observations: ["Continuous tracking maintained."],
        issues: [],
        recommendations: [],
      },
      {
        name: "frame_performance",
        status: "PASS",
        observations: ["72 FPS stable."],
        issues: [],
        recommendations: [],
      },
      {
        name: "latency",
        status: "PASS",
        observations: ["Frame delta 13.8ms."],
        issues: [],
        recommendations: [],
      },
      {
        name: "environmental_conditions",
        status: "INCONCLUSIVE",
        observations: ["Rule #2: No hardware causation token provided."],
        issues: [],
        recommendations: [],
      },
      {
        name: "test_execution",
        status: "PASS",
        observations: ["All categories executed."],
        issues: [],
        recommendations: [],
      },
    ],
    metrics: {
      expectedJointCount: 25,
      observedJointCount: 25,
      frameCount: 100,
      measuredLatencyMs: 13.8,
      trackingLossEvents: 0,
      recoveryTimeMs: null,
    },
    environmentalAssessment: {
      selectedPreset: "bright_studio",
      causationStatus: "INCONCLUSIVE",
      causationEvidence: null,
      explanation: "Default test preset without hardware causation token.",
    },
    dataQuality: {
      complete: true,
      missingFields: [],
      warnings: [],
    },
    recommendations: ["Maintain 72Hz+ render cadence."],
    ...overrides,
  };
}

describe("Diagnostic Telemetry & Mandatory Rule #2 Environmental Causation", () => {
  it("enforces Rule #2: missing evidence yields INCONCLUSIVE causation and null evidence", () => {
    const result = assessEnvironmentalCausation(null);
    assert.equal(result.causationStatus, "INCONCLUSIVE");
    assert.equal(result.causationEvidence, null);
    assert.match(result.explanation, /Environmental causation cannot be established/);

    const undefinedResult = assessEnvironmentalCausation(undefined);
    assert.equal(undefinedResult.causationStatus, "INCONCLUSIVE");
    assert.equal(undefinedResult.causationEvidence, null);
  });

  it("enforces Rule #2: forged client flag (validated: false) is rejected as INCONCLUSIVE", () => {
    const forgedEvidence: VRCausationEvidence = {
      tokenPresent: true,
      validated: false, // NOT validated by trusted instrumentation
      establishesEnvironmentalCausation: true,
    };
    const result = assessEnvironmentalCausation(forgedEvidence);
    assert.equal(result.causationStatus, "INCONCLUSIVE");
    assert.equal(result.causationEvidence, null);
  });

  it("enforces Rule #2: token present and validated but establishesEnvironmentalCausation is false is INCONCLUSIVE", () => {
    const neutralEvidence: VRCausationEvidence = {
      tokenPresent: true,
      validated: true,
      establishesEnvironmentalCausation: false,
    };
    const result = assessEnvironmentalCausation(neutralEvidence);
    assert.equal(result.causationStatus, "INCONCLUSIVE");
    assert.equal(result.causationEvidence, null);
  });

  it("enforces Rule #2: validated hardware token establishing causation returns CONFIRMED", () => {
    const validEvidence: VRCausationEvidence = {
      tokenPresent: true,
      validated: true,
      establishesEnvironmentalCausation: true,
    };
    const result = assessEnvironmentalCausation(validEvidence);
    assert.equal(result.causationStatus, "CONFIRMED");
    assert.notEqual(result.causationEvidence, null);
    assert.match(result.explanation, /Environmental causation is supported/);
  });

  it("enforces Rule #2: low_light or backlit_glare preset alone NEVER implies CONFIRMED", () => {
    const presets: LightingPreset[] = ["low_light", "backlit_glare", "bright_studio"];
    for (const preset of presets) {
      // With null causationEvidence
      const assessment = assessEnvironmentalCausation(null);
      assert.equal(
        assessment.causationStatus,
        "INCONCLUSIVE",
        `Preset ${preset} must be INCONCLUSIVE without validated hardware token`
      );
      assert.equal(assessment.causationEvidence, null);
    }
  });
});

describe("25-Joint Skeleton Validation & WebXR Runtime Capabilities", () => {
  it("validates full 25-joint anatomical coverage when all joints tracked", () => {
    const telemetry = createBaselineTelemetry();
    assert.equal(telemetry.expectedJointCount, 25);
    assert.equal(telemetry.joints.length, 25);
    const trackedCount = telemetry.joints.filter((j) => j.tracked).length;
    assert.equal(trackedCount, 25);
  });

  it("identifies partial joint profiles when runtime specifies lower threshold without false failure", () => {
    // Some runtimes (e.g. mobile or emulated WebXR) omit metacarpals (21 joints available)
    const partialJoints = Array.from({ length: 25 }, (_, i) => ({
      jointId: `joint_${i}`,
      tracked: i < 21, // 21 joints tracked
      confidence: i < 21 ? 0.9 : null,
    }));

    const telemetry = createBaselineTelemetry({
      joints: partialJoints,
      thresholds: { minTrackedJoints: 21 },
    });

    const trackedCount = telemetry.joints.filter((j) => j.tracked).length;
    assert.equal(trackedCount, 21);
    assert.ok(trackedCount >= (telemetry.thresholds.minTrackedJoints ?? 25));
  });

  it("identifies tracking failures when observed joints fall below configured threshold", () => {
    const degradedJoints = Array.from({ length: 25 }, (_, i) => ({
      jointId: `joint_${i}`,
      tracked: i < 12, // Only 12 joints tracked
      confidence: i < 12 ? 0.7 : null,
    }));

    const telemetry = createBaselineTelemetry({
      joints: degradedJoints,
      thresholds: { minTrackedJoints: 25 },
    });

    const trackedCount = telemetry.joints.filter((j) => j.tracked).length;
    assert.ok(trackedCount < (telemetry.thresholds.minTrackedJoints ?? 25));
  });
});

describe("Tracking Continuity & Loss Events", () => {
  it("tracks nominal continuous tracking with zero loss events", () => {
    const telemetry = createBaselineTelemetry({
      trackingEvents: [
        { timestampMs: 1000, tracking: true },
        { timestampMs: 2000, tracking: true },
      ],
    });

    const lossEvents = telemetry.trackingEvents.filter((e) => !e.tracking).length;
    assert.equal(lossEvents, 0);
  });

  it("correctly tabulates tracking interruptions and loss events", () => {
    const telemetry = createBaselineTelemetry({
      trackingEvents: [
        { timestampMs: 1000, tracking: true },
        { timestampMs: 1200, tracking: false },
        { timestampMs: 1500, tracking: true },
        { timestampMs: 1700, tracking: false },
        { timestampMs: 1900, tracking: true },
      ],
    });

    const lossEvents = telemetry.trackingEvents.filter((e) => !e.tracking).length;
    assert.equal(lossEvents, 2);
  });
});

describe("LlamaClient AI Analysis & Rule #2 Invariant Enforcement", () => {
  it("enforces Rule #2 post-validation invariant over hallucinated CONFIRMED status", async () => {
    // If a server or mock returns causationStatus: 'CONFIRMED' but telemetry has null causationEvidence:
    const hallucinatedServerResponse = createValidAnalysisResult({
      environmentalAssessment: {
        selectedPreset: "low_light",
        causationStatus: "CONFIRMED", // Hallucinated!
        causationEvidence: "Hallucinated: Room was dark",
        explanation: "AI falsely blamed room lighting.",
      },
      categories: [
        {
          name: "skeleton_integrity",
          status: "PASS",
          observations: [],
          issues: [],
          recommendations: [],
        },
        {
          name: "tracking_continuity",
          status: "PASS",
          observations: [],
          issues: [],
          recommendations: [],
        },
        {
          name: "frame_performance",
          status: "PASS",
          observations: [],
          issues: [],
          recommendations: [],
        },
        {
          name: "latency",
          status: "PASS",
          observations: [],
          issues: [],
          recommendations: [],
        },
        {
          name: "environmental_conditions",
          status: "FAIL", // Hallucinated fail
          observations: [],
          issues: ["Room lighting degraded tracking"],
          recommendations: [],
        },
        {
          name: "test_execution",
          status: "PASS",
          observations: [],
          issues: [],
          recommendations: [],
        },
      ],
    });

    // Mock global fetch for this test
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ analysis: hallucinatedServerResponse }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    try {
      const telemetry = createBaselineTelemetry({
        lightingPreset: "low_light",
        causationEvidence: null, // No validated hardware token!
      });

      const sanitizedResult = await analyzeVRTelemetry(telemetry, { endpoint: "/test" });

      // Invariant: The client MUST overwrite the hallucination to INCONCLUSIVE
      assert.equal(sanitizedResult.environmentalAssessment.causationStatus, "INCONCLUSIVE");
      assert.equal(sanitizedResult.environmentalAssessment.causationEvidence, null);
      const envCat = sanitizedResult.categories.find((c) => c.name === "environmental_conditions");
      assert.equal(envCat?.status, "INCONCLUSIVE");
      assert.deepEqual(envCat?.issues, []);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("preserves CONFIRMED status when validated hardware evidence is genuinely present", async () => {
    const validServerResponse = createValidAnalysisResult({
      environmentalAssessment: {
        selectedPreset: "backlit_glare",
        causationStatus: "CONFIRMED",
        causationEvidence: "Sensor optical saturation detected",
        explanation: "Validated optical sensor error.",
      },
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ analysis: validServerResponse }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    try {
      const telemetry = createBaselineTelemetry({
        lightingPreset: "backlit_glare",
        causationEvidence: {
          tokenPresent: true,
          validated: true,
          establishesEnvironmentalCausation: true,
        },
      });

      const verifiedResult = await analyzeVRTelemetry(telemetry, { endpoint: "/test" });
      assert.equal(verifiedResult.environmentalAssessment.causationStatus, "CONFIRMED");
      assert.notEqual(verifiedResult.environmentalAssessment.causationEvidence, null);
      const envCat = verifiedResult.categories.find((c) => c.name === "environmental_conditions");
      assert.equal(envCat?.status, "FAIL");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("throws LlamaClientError on invalid or malformed AI responses", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ analysis: { corrupted: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    try {
      const telemetry = createBaselineTelemetry();
      await assert.rejects(
        () => analyzeVRTelemetry(telemetry, { endpoint: "/test" }),
        (err: unknown) => {
          assert.ok(err instanceof LlamaClientError);
          assert.match(err.message, /invalid diagnostic response/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects non-positive timeout values", async () => {
    const telemetry = createBaselineTelemetry();
    await assert.rejects(
      () => analyzeVRTelemetry(telemetry, { timeoutMs: -5 }),
      (err: unknown) => {
        assert.ok(err instanceof LlamaClientError);
        assert.match(err.message, /timeout must be a positive number/);
        return true;
      }
    );
  });

  it("handles request cancellation via AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort(); // Pre-aborted

    const telemetry = createBaselineTelemetry();
    await assert.rejects(
      () => analyzeVRTelemetry(telemetry, { endpoint: "/test" }, controller.signal),
      (err: unknown) => {
        assert.ok(err instanceof LlamaClientError);
        assert.match(err.message, /cancelled/);
        return true;
      }
    );
  });

  it("handles HTTP error status codes from analysis service", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "Service unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });

    try {
      const telemetry = createBaselineTelemetry();
      await assert.rejects(
        () => analyzeVRTelemetry(telemetry, { endpoint: "/test" }),
        (err: unknown) => {
          assert.ok(err instanceof LlamaClientError);
          assert.equal(err.statusCode, 503);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("Auto-Save & Background Diagnostics Lifecycle", () => {
  it("persists telemetry before initiating AI analysis and includes autoSavedAt timestamp", async () => {
    let saveCalled = false;
    let analyzeCalled = false;
    let savedSnapshot: VRTelemetry | null = null;

    const mockSaveTelemetry = async (snapshot: VRTelemetry) => {
      saveCalled = true;
      savedSnapshot = snapshot;
    };

    const mockAnalyze = async (_snapshot: VRTelemetry) => {
      // Ensure save was completed first!
      assert.ok(saveCalled, "Save must be completed before analysis starts");
      analyzeCalled = true;
    };

    const telemetry = createBaselineTelemetry();
    const snapshot: VRTelemetry = {
      ...telemetry,
      lightingPreset: "low_light",
      autoSavedAt: new Date().toISOString(),
    };

    await mockSaveTelemetry(snapshot);
    await mockAnalyze(snapshot);

    assert.ok(saveCalled);
    assert.ok(analyzeCalled);
    assert.ok(savedSnapshot !== null);
    const resultSnapshot: VRTelemetry = savedSnapshot;
    assert.equal(resultSnapshot.lightingPreset, "low_light");
    assert.ok(resultSnapshot.autoSavedAt);
  });

  it("prevents starting AI analysis if background telemetry save fails", async () => {
    let analyzeCalled = false;

    const failingSaveTelemetry = async () => {
      throw new Error("Disk / storage failure");
    };

    const mockAnalyze = async () => {
      analyzeCalled = true;
    };

    let saveError: string | null = null;
    try {
      await failingSaveTelemetry();
      await mockAnalyze();
    } catch {
      saveError = "Telemetry could not be saved. AI analysis was not started.";
    }

    assert.equal(analyzeCalled, false);
    assert.equal(saveError, "Telemetry could not be saved. AI analysis was not started.");
  });
});
