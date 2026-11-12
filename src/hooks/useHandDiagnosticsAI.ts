// src/hooks/useHandDiagnosticsAI.ts

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  analyzeVRTelemetry,
  LlamaClientError,
} from "../utils/llamaClient";

import type {
  AIAnalysisResult,
  VRTelemetry,
} from "../types/diagnostics";

type AnalysisStatus =
  | "idle"
  | "analyzing"
  | "success"
  | "error";

interface UseHandDiagnosticsAIResult {
  analysis: AIAnalysisResult | null;
  status: AnalysisStatus;
  error: string | null;

  analyze: (
    telemetry: VRTelemetry,
  ) => Promise<AIAnalysisResult | null>;

  cancel: () => void;
}

export function useHandDiagnosticsAI():
  UseHandDiagnosticsAIResult {
  const [analysis, setAnalysis] =
    useState<AIAnalysisResult | null>(null);

  const [status, setStatus] =
    useState<AnalysisStatus>("idle");

  const [error, setError] =
    useState<string | null>(null);

  const controllerRef =
    useRef<AbortController | null>(null);

  const requestIdRef = useRef(0);

  const cancel = useCallback(() => {
    requestIdRef.current += 1;

    controllerRef.current?.abort();
    controllerRef.current = null;

    setStatus("idle");
  }, []);

  const analyze = useCallback(
    async (
      telemetry: VRTelemetry,
    ): Promise<AIAnalysisResult | null> => {
      controllerRef.current?.abort();

      const controller = new AbortController();
      const requestId = ++requestIdRef.current;

      controllerRef.current = controller;

      setStatus("analyzing");
      setError(null);

      try {
        const result = await analyzeVRTelemetry(
          telemetry,
          {},
          controller.signal,
        );

        if (requestId !== requestIdRef.current) {
          return null;
        }

        setAnalysis(result);
        setStatus("success");

        return result;
      } catch (cause: unknown) {
        if (requestId !== requestIdRef.current) {
          return null;
        }

        const message =
          cause instanceof LlamaClientError
            ? cause.message
            : "Unexpected diagnostic analysis error.";

        setError(message);
        setStatus("error");

        return null;
      } finally {
        if (requestId === requestIdRef.current) {
          controllerRef.current = null;
        }
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  return {
    analysis,
    status,
    error,
    analyze,
    cancel,
  };
}
