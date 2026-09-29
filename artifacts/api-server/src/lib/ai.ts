import { GoogleGenAI, Type } from "@google/genai";

const AGRONOMIST_SYSTEM_INSTRUCTION =
  "You are an expert Agronomist, Plant Pathologist, and Agricultural Economist. " +
  "Your goal is to assist farmers by accurately diagnosing crop diseases from images, " +
  "assessing weather risks, and providing actionable market strategies. Your advice must " +
  "be practical, safe, cost-effective, and highly structured. Always prioritize organic " +
  "and accessible remedies first before suggesting chemical interventions. Never claim " +
  "certainty when an image is ambiguous; state when an in-person agronomist is needed.";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
}

function parseJsonResponse(text: string | undefined): Record<string, unknown> {
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Gemini returned an invalid JSON object");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("Gemini returned a response that was not valid JSON");
  }
}

export async function analyzeCropImage(input: {
  cropType: string;
  mimeType: string;
  imageBase64: string;
}): Promise<{
  diseaseName: string;
  confidenceScore: number;
  symptoms: string[];
  organicRemedy: string;
  chemicalRemedy: string;
}> {
  const response = await getClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              `Analyze the uploaded image of a ${input.cropType}. Identify any diseases, ` +
              "pests, or deficiencies visible. Provide a structured diagnosis. " +
              "Confidence must be a number from 0 to 100.",
          },
          {
            inlineData: {
              mimeType: input.mimeType,
              data: input.imageBase64,
            },
          },
        ],
      },
    ],
    config: {
      systemInstruction: AGRONOMIST_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          diseaseName: {
            type: Type.STRING,
            description: "Name of the disease or Healthy",
          },
          confidenceScore: {
            type: Type.NUMBER,
            description: "Confidence out of 100",
          },
          symptoms: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          organicRemedy: { type: Type.STRING },
          chemicalRemedy: { type: Type.STRING },
        },
        required: [
          "diseaseName",
          "confidenceScore",
          "symptoms",
          "organicRemedy",
          "chemicalRemedy",
        ],
      },
    },
  });

  const parsed = parseJsonResponse(response.text);
  const confidence = Number(parsed.confidenceScore);
  const symptoms = Array.isArray(parsed.symptoms)
    ? parsed.symptoms.filter((value): value is string => typeof value === "string")
    : [];

  if (
    typeof parsed.diseaseName !== "string" ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 100 ||
    symptoms.length === 0 ||
    typeof parsed.organicRemedy !== "string" ||
    typeof parsed.chemicalRemedy !== "string"
  ) {
    throw new Error("Gemini returned an incomplete crop diagnosis");
  }

  return {
    diseaseName: parsed.diseaseName,
    confidenceScore: confidence,
    symptoms,
    organicRemedy: parsed.organicRemedy,
    chemicalRemedy: parsed.chemicalRemedy,
  };
}

export async function generateMarketAdvisory(input: {
  cropType: string;
  location: string;
  currentWeather?: string;
}): Promise<{
  weatherRisks: string[];
  harvestRecommendation: string;
  marketSellingStrategy: string;
}> {
  const response = await getClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents:
      `Create a practical agricultural market advisory for ${input.cropType} in ` +
      `${input.location}. Current weather context: ${input.currentWeather || "not provided"}. ` +
      "Use general seasonal and simulated market patterns, clearly label uncertainty, and " +
      "do not invent exact live prices. Return weather risks, a harvest recommendation, " +
      "and a market selling strategy.",
    config: {
      systemInstruction: AGRONOMIST_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          weatherRisks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          harvestRecommendation: { type: Type.STRING },
          marketSellingStrategy: { type: Type.STRING },
        },
        required: [
          "weatherRisks",
          "harvestRecommendation",
          "marketSellingStrategy",
        ],
      },
    },
  });

  const parsed = parseJsonResponse(response.text);
  const weatherRisks = Array.isArray(parsed.weatherRisks)
    ? parsed.weatherRisks.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  if (
    weatherRisks.length === 0 ||
    typeof parsed.harvestRecommendation !== "string" ||
    typeof parsed.marketSellingStrategy !== "string"
  ) {
    throw new Error("Gemini returned an incomplete market advisory");
  }

  return {
    weatherRisks,
    harvestRecommendation: parsed.harvestRecommendation,
    marketSellingStrategy: parsed.marketSellingStrategy,
  };
}