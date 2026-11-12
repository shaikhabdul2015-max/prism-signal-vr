// src/components/HandDiagnosticsModal.tsx

import { useCallback, useState } from "react";

import { useHandDiagnosticsAI } from "../hooks/useHandDiagnosticsAI";

import type {
  LightingPreset,
  VRTelemetry,
} from "../types/diagnostics";

interface HandDiagnosticsModalProps {
  telemetry: VRTelemetry;

  saveTelemetry: (
    telemetry: VRTelemetry,
  ) => Promise<void>;

  onClose: () => void;
}

export default function HandDiagnosticsModal({
  telemetry,
  saveTelemetry,
  onClose,
}: HandDiagnosticsModalProps) {
  const {
    analysis,
    status,
    error,
    analyze,
    cancel,
  } = useHandDiagnosticsAI();

  const [lightingPreset, setLightingPreset] =
    useState<LightingPreset>(
      telemetry.lightingPreset ?? "bright_studio",
    );

  const [saving, setSaving] = useState(false);

  const [saveError, setSaveError] =
    useState<string | null>(null);

  const handleAutoSave = useCallback(async () => {
    if (saving || status === "analyzing") {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const snapshot: VRTelemetry = {
        ...telemetry,
        lightingPreset,
        autoSavedAt: new Date().toISOString(),
      };

      // Persist the telemetry first.
      await saveTelemetry(snapshot);

      // Begin AI analysis only after a successful save.
      void analyze(snapshot);
    } catch {
      setSaveError(
        "Telemetry could not be saved. AI analysis was not started.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    analyze,
    lightingPreset,
    saveTelemetry,
    saving,
    status,
    telemetry,
  ]);

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="hand-diagnostics-title"
    >
      <h2 id="hand-diagnostics-title">
        Hand Tracking Diagnostics
      </h2>

      <label htmlFor="lighting-preset">
        Lighting test condition
      </label>

      <select
        id="lighting-preset"
        value={lightingPreset}
        onChange={(event) => {
          setLightingPreset(
            event.target.value as LightingPreset,
          );
        }}
        disabled={saving || status === "analyzing"}
      >
        <option value="bright_studio">
          Bright Studio
        </option>

        <option value="low_light">
          Low Light
        </option>

        <option value="backlit_glare">
          Backlit Glare
        </option>
      </select>

      <button
        type="button"
        onClick={handleAutoSave}
        disabled={saving || status === "analyzing"}
      >
        {saving
          ? "Saving telemetry..."
          : status === "analyzing"
          ? "Analyzing telemetry..."
          : "Save & Analyze"}
      </button>

      {status === "analyzing" && (
        <p role="status">
          Analyzing VR telemetry...
        </p>
      )}

      {saveError && (
        <p role="alert">{saveError}</p>
      )}

      {error && (
        <p role="alert">
          AI analysis unavailable: {error}
        </p>
      )}

      {analysis && (
        <section aria-live="polite">
          <h3>AI Diagnostic Summary</h3>

          <p>{analysis.summary}</p>

          <p>
            Overall status: {analysis.overallStatus}
          </p>

          <h4>Telemetry Metrics</h4>
          <ul>
            <li>Expected joints: {analysis.metrics.expectedJointCount ?? "N/A"}</li>
            <li>Observed joints: {analysis.metrics.observedJointCount ?? "N/A"}</li>
            <li>Measured latency: {analysis.metrics.measuredLatencyMs != null ? `${analysis.metrics.measuredLatencyMs} ms` : "N/A"}</li>
            <li>Tracking loss events: {analysis.metrics.trackingLossEvents ?? "0"}</li>
          </ul>

          <h4>Diagnostic Categories</h4>
          <ul>
            {analysis.categories.map((category) => (
              <li key={category.name} data-category={category.name}>
                <strong>{category.name.replace(/_/g, " ")}:</strong>{" "}
                <span>{category.status}</span>
                {category.observations.length > 0 && (
                  <p>Observations: {category.observations.join("; ")}</p>
                )}
                {category.issues.length > 0 && (
                  <p>Issues: {category.issues.join("; ")}</p>
                )}
              </li>
            ))}
          </ul>

          <h4>Environmental Assessment</h4>

          <p>
            Causation status:{" "}
            {
              analysis.environmentalAssessment
                .causationStatus
            }
          </p>

          <p>
            {
              analysis.environmentalAssessment
                .explanation
            }
          </p>

          {analysis.environmentalAssessment.causationEvidence && (
            <p>
              Evidence: {analysis.environmentalAssessment.causationEvidence}
            </p>
          )}

          <h4>Recommendations</h4>

          <ul>
            {analysis.recommendations.map(
              (recommendation, index) => (
                <li key={`${index}-${recommendation}`}>
                  {recommendation}
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          cancel();
          onClose();
        }}
      >
        Close
      </button>
    </section>
  );
}

export { HandDiagnosticsModal };
export type { HandDiagnosticsModalProps };
