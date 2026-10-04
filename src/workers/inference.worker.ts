import { loadModel, predict } from "../ai/model";
const model = loadModel();
void model.catch(() => {});
self.onmessage = async (e: MessageEvent<{ id: string; text: string }>) => {
  try {
    self.postMessage({
      id: e.data.id,
      result: predict(await model, e.data.text),
    });
  } catch (error) {
    self.postMessage({
      id: e.data.id,
      error: error instanceof Error ? error.message : "Inference failed.",
    });
  }
};
