
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getPlanRecommendation(userProfile: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on the following user internet usage profile, recommend one of our packages: 
      Starter (20Mbps, $25), Premium (50Mbps, $45), Ultra (100Mbps, $75), Business (500Mbps, $150).
      Profile: ${userProfile}
      Provide a helpful, friendly recommendation and explanation.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to my knowledge base right now. Please try again later.";
  }
}

export async function getSupportAdvice(issue: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an ISP technical support bot. Help a customer with this issue: "${issue}". 
      Keep it brief, technical, and professional. Suggest basic troubleshooting like restarting the router.`,
    });
    return response.text;
  } catch (error) {
    return "Please contact our 24/7 hotline for immediate assistance.";
  }
}
