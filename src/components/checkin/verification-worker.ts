// Web Worker for CLIP-based gym photo verification
// Uses zero-shot image classification in a background thread

import { pipeline } from "@huggingface/transformers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let classifier: any = null;

const MODEL_ID = "Xenova/clip-vit-base-patch32";

const GYM_LABELS = [
  "a photo of a gym or fitness center with exercise equipment",
  "a photo of someone working out or exercising",
  "a photo of weights, dumbbells, or barbells",
];

const NOT_GYM_LABELS = [
  "a photo of a home or living room",
  "a photo of an office or workplace",
  "a photo of food or a restaurant",
  "a photo of nature or outdoors",
];

const THRESHOLD = 0.55;

async function loadModel(
  onProgress: (progress: { status: string; progress?: number }) => void
) {
  onProgress({ status: "loading", progress: 0 });

  classifier = await (pipeline as Function)(
    "zero-shot-image-classification",
    MODEL_ID,
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      progress_callback: (p: any) => {
        onProgress({ status: "loading", progress: p.progress ?? 0 });
      },
    }
  );

  onProgress({ status: "ready", progress: 100 });
}

async function verifyImage(imageData: string): Promise<{
  verified: boolean;
  result: string;
}> {
  if (!classifier) {
    throw new Error("Model not loaded");
  }

  const allLabels = [...GYM_LABELS, ...NOT_GYM_LABELS];
  const rawOutput = await classifier(imageData, allLabels);
  // Normalize: pipeline may return array or array-of-arrays
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output: { label: string; score: number }[] = Array.isArray(rawOutput[0])
    ? rawOutput[0]
    : rawOutput;

  console.log("[gym-verifier] CLIP scores:", JSON.stringify(output, null, 2));

  // Sum scores for gym vs non-gym labels
  let gymScore = 0;

  for (const item of output) {
    if (GYM_LABELS.includes(item.label)) {
      gymScore += item.score;
    }
  }

  const isGym = gymScore >= THRESHOLD;

  return {
    verified: isGym,
    result: isGym
      ? `Gym detected (${Math.round(gymScore * 100)}% confidence)`
      : `Not detected as gym (${Math.round(gymScore * 100)}% confidence)`,
  };
}

// Message handler
self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  switch (type) {
    case "load":
      try {
        await loadModel((progress) => {
          self.postMessage({ type: "progress", data: progress });
        });
        self.postMessage({ type: "loaded" });
      } catch (err) {
        self.postMessage({
          type: "error",
          data: `Failed to load model: ${err}`,
        });
      }
      break;

    case "verify":
      try {
        self.postMessage({ type: "verifying" });
        const result = await verifyImage(data);
        self.postMessage({ type: "result", data: result });
      } catch (err) {
        self.postMessage({
          type: "error",
          data: `Verification failed: ${err}`,
        });
      }
      break;
  }
};
