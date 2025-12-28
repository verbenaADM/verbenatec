
import { GoogleGenAI, Type } from "@google/genai";

// Initializing GoogleGenAI with the API key from environment variables as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductReview = async (productName: string, category: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Escreva uma avaliação curta e profissional (máximo 200 palavras) em Português sobre o produto: ${productName} na categoria ${category}. Fale sobre design, performance e se vale a pena o custo-benefício.`,
      config: {
        temperature: 0.7,
        topP: 0.95,
      },
    });
    // Directly accessing .text property as per guidelines (it is a getter, not a method)
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Não foi possível gerar a avaliação no momento.";
  }
};
