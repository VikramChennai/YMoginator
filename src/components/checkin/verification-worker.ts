// Web Worker for SmolVLM gym photo verification
// Runs model inference in a background thread

import {
  AutoProcessor,
  AutoModelForVision2Seq,
  load_image,
} from "@huggingface/transformers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let processor: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let model: any = null;

const MODEL_ID = "HuggingFaceTB/SmolVLM-256M-Instruct";

async function loadModel(
  onProgress: (progress: { status: string; progress?: number }) => void
) {
  onProgress({ status: "loading", progress: 0 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const progressCallback = (p: any) => {
    onProgress({ status: "loading", progress: p.progress ?? 0 });
  };

  processor = await AutoProcessor.from_pretrained(MODEL_ID, {
    progress_callback: progressCallback,
  });

  model = await AutoModelForVision2Seq.from_pretrained(MODEL_ID, {
    dtype: "q4",
    progress_callback: progressCallback,
  });

  onProgress({ status: "ready", progress: 100 });
}

async function verifyImage(imageData: string): Promise<{
  verified: boolean;
  result: string;
}> {
  if (!processor || !model) {
    throw new Error("Model not loaded");
  }

  const image = await load_image(imageData);

  const prompt =
    "Is this a photo taken inside a gym or fitness center? Look for gym equipment like weights, treadmills, machines, mirrors, or workout spaces. Reply with YES or NO followed by a brief explanation.";

  const messages = [
    {
      role: "user",
      content: [
        { type: "image", image },
        { type: "text", text: prompt },
      ],
    },
  ];

  // Apply chat template to get text, then process text + images separately
  const text = processor.apply_chat_template(messages, {
    add_generation_prompt: true,
  });
  const inputs = await processor(text, [image]);

  const output = await model.generate({
    ...inputs,
    max_new_tokens: 100,
    do_sample: false,
  });

  // Decode only the newly generated tokens
  const promptLength = inputs.input_ids.dims[1];
  const newTokens = output.slice(null, [promptLength, null]);
  const decoded = processor.batch_decode(newTokens, {
    skip_special_tokens: true,
  });

  const resultText = decoded[0]?.trim() || "";
  const isGym =
    resultText.toUpperCase().startsWith("YES") ||
    resultText.toUpperCase().includes("YES,") ||
    resultText.toUpperCase().includes("YES.");

  return {
    verified: isGym,
    result: resultText,
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
