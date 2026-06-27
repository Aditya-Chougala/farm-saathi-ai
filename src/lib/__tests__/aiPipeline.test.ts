// Unit tests for the agricultural image-analysis pipeline.
// These tests mock the underlying server function so they run offline.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai.functions", () => ({
  geminiVisionFn: vi.fn(),
}));

import { geminiVisionFn } from "@/lib/ai.functions";
import { analyzeAgriImage, GeminiError } from "@/lib/geminiApi";
import { geminiDetect, NonAgriculturalImageError } from "@/services/disease/geminiDiseaseService";

const mockFn = geminiVisionFn as unknown as ReturnType<typeof vi.fn>;

function mockGeminiText(json: object) {
  mockFn.mockResolvedValueOnce({ text: JSON.stringify(json) });
}

const FAKE_IMG = "data:image/jpeg;base64,AAAA";

describe("analyzeAgriImage", () => {
  beforeEach(() => mockFn.mockReset());

  it("returns soil details for a soil photo", async () => {
    mockGeminiText({
      detected_object: "soil sample in a hand",
      is_agricultural: true,
      confidence: 0.87,
      diagnosis: "Loamy soil, slightly acidic",
      recommendations: ["Add compost"],
      extra: { soilType: "Loamy soil", ph: 6.5, nutrients: { N: "medium", P: "low", K: "medium" } },
    });
    const r = await analyzeAgriImage(FAKE_IMG, "soil");
    expect(r.is_agricultural).toBe(true);
    expect(r.confidence).toBeGreaterThan(0.8);
    expect((r.extra as any).soilType).toBe("Loamy soil");
  });

  it("rejects a non-agricultural image (car)", async () => {
    mockGeminiText({
      detected_object: "red sports car",
      is_agricultural: false,
      confidence: 0.99,
      diagnosis: "This image does not appear to be a plant, crop, soil sample, or agricultural disease.",
      recommendations: [],
      extra: {},
    });
    const r = await analyzeAgriImage(FAKE_IMG, "disease");
    expect(r.is_agricultural).toBe(false);
    expect(r.detected_object).toMatch(/car/i);
  });

  it("throws GeminiError on missing key", async () => {
    mockFn.mockResolvedValueOnce({ text: "", error: "missing_gemini_key", status: 0 });
    await expect(analyzeAgriImage(FAKE_IMG, "soil")).rejects.toBeInstanceOf(GeminiError);
  });
});

describe("geminiDetect (disease)", () => {
  beforeEach(() => mockFn.mockReset());

  it("returns a verdict for a diseased leaf", async () => {
    mockGeminiText({
      detected_object: "tomato leaf with dark lesions",
      is_agricultural: true,
      confidence: 0.78,
      diagnosis: "Late blight",
      recommendations: [],
      extra: { label: "Tomato___Late_blight", diseaseName: "Late blight", severity: "severe" },
    });
    const v = await geminiDetect(FAKE_IMG);
    expect(v.label).toBe("Tomato___Late_blight");
    expect(v.severity).toBe("severe");
  });

  it("returns a healthy result for a healthy leaf", async () => {
    mockGeminiText({
      detected_object: "healthy tomato leaf",
      is_agricultural: true,
      confidence: 0.92,
      diagnosis: "Healthy",
      recommendations: [],
      extra: { label: "Tomato___healthy", diseaseName: "Healthy", severity: "mild" },
    });
    const v = await geminiDetect(FAKE_IMG);
    expect(v.label).toBe("Tomato___healthy");
  });

  it("throws NonAgriculturalImageError for a human portrait", async () => {
    mockGeminiText({
      detected_object: "person face portrait",
      is_agricultural: false,
      confidence: 0.95,
      diagnosis: "Not an agricultural image.",
      recommendations: [],
      extra: {},
    });
    await expect(geminiDetect(FAKE_IMG)).rejects.toBeInstanceOf(NonAgriculturalImageError);
  });

  it("throws NonAgriculturalImageError for a building", async () => {
    mockGeminiText({
      detected_object: "office building exterior",
      is_agricultural: false,
      confidence: 0.97,
      diagnosis: "Not agricultural.",
      recommendations: [],
      extra: {},
    });
    await expect(geminiDetect(FAKE_IMG)).rejects.toBeInstanceOf(NonAgriculturalImageError);
  });
});
