"use client";

import { useCallback, useRef, useState } from "react";

export type VerifierStatus =
  | "idle"
  | "loading"
  | "ready"
  | "verifying"
  | "done"
  | "error";

interface VerificationResult {
  verified: boolean;
  result: string;
}

export function useGymVerifier() {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<VerifierStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initWorker = useCallback(() => {
    if (workerRef.current) return;

    const worker = new Worker(
      new URL(
        "../components/checkin/verification-worker.ts",
        import.meta.url
      ),
      { type: "module" }
    );

    worker.onmessage = (e: MessageEvent) => {
      const { type, data } = e.data;

      switch (type) {
        case "progress":
          setProgress(data.progress ?? 0);
          setStatus("loading");
          break;
        case "loaded":
          setStatus("ready");
          setProgress(100);
          break;
        case "verifying":
          setStatus("verifying");
          break;
        case "result":
          setResult(data);
          setStatus("done");
          break;
        case "error":
          setError(data);
          setStatus("error");
          break;
      }
    };

    workerRef.current = worker;
  }, []);

  const loadModel = useCallback(() => {
    initWorker();
    setStatus("loading");
    setProgress(0);
    setError(null);
    workerRef.current?.postMessage({ type: "load" });
  }, [initWorker]);

  const verify = useCallback(
    (imageData: string) => {
      if (!workerRef.current) {
        setError("Model not loaded");
        return;
      }
      setResult(null);
      setError(null);
      setStatus("verifying");
      workerRef.current.postMessage({ type: "verify", data: imageData });
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setStatus(workerRef.current ? "ready" : "idle");
  }, []);

  return {
    status,
    progress,
    result,
    error,
    loadModel,
    verify,
    reset,
  };
}
