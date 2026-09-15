const Module = require("node:module");

const originalLoad = Module._load;
let patchedGenAiModule = null;

function configuredGeminiModel() {
  return String(process.env.GEMINI_MODEL || "").trim();
}

Module._load = function kairaGeminiModelLoad(request, parent, isMain) {
  const loaded = originalLoad.apply(this, arguments);
  if (request !== "@google/genai" || !configuredGeminiModel()) return loaded;
  if (patchedGenAiModule) return patchedGenAiModule;
  if (!loaded || typeof loaded.GoogleGenAI !== "function") return loaded;

  const BaseGoogleGenAI = loaded.GoogleGenAI;

  class KairaConfiguredGoogleGenAI extends BaseGoogleGenAI {
    constructor(...args) {
      super(...args);
      const instance = this;
      const models = instance.models;
      if (!models || typeof models.generateContent !== "function") return instance;

      const modelsProxy = new Proxy(models, {
        get(target, prop, receiver) {
          if (prop !== "generateContent") return Reflect.get(target, prop, receiver);
          const generateContent = Reflect.get(target, prop, receiver);
          return function kairaGenerateContent(params, ...rest) {
            const model = configuredGeminiModel();
            const nextParams =
              model && params && typeof params === "object"
                ? { ...params, model }
                : params;
            return Reflect.apply(generateContent, target, [nextParams, ...rest]);
          };
        },
      });

      return new Proxy(instance, {
        get(target, prop, receiver) {
          if (prop === "models") return modelsProxy;
          return Reflect.get(target, prop, receiver);
        },
      });
    }
  }

  patchedGenAiModule = { ...loaded, GoogleGenAI: KairaConfiguredGoogleGenAI };
  return patchedGenAiModule;
};

const selectedModel = configuredGeminiModel();
if (selectedModel) {
  console.log(`[Provider] GEMINI_MODEL override active: ${selectedModel}`);
}
