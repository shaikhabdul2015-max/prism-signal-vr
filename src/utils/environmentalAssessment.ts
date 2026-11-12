import type {
  EnvironmentalCausationStatus,
  VRCausationEvidence,
} from "../types/diagnostics";

export interface EnvironmentalAssessmentResult {
  causationStatus: EnvironmentalCausationStatus;
  causationEvidence: string | null;
  explanation: string;
}

export function assessEnvironmentalCausation(
  evidence: VRCausationEvidence | null | undefined,
): EnvironmentalAssessmentResult {
  const confirmed =
    evidence?.tokenPresent === true &&
    evidence.validated === true &&
    evidence.establishesEnvironmentalCausation === true;

  if (confirmed) {
    return {
      causationStatus: "CONFIRMED",

      causationEvidence:
        "Trusted instrumentation explicitly established environmental causation.",

      explanation:
        "Environmental causation is supported by validated instrumentation evidence.",
    };
  }

  return {
    causationStatus: "INCONCLUSIVE",

    causationEvidence: null,

    explanation:
      "Environmental causation cannot be established without a valid, trusted hardware or instrumentation token. The selected lighting preset is contextual information only.",
  };
}
