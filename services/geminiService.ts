import { GoogleGenerativeAI } from "@google/generative-ai";

// API Key ম্যানেজ করার জন্য একটি সহজ ফাংশন
const getApiKey = () => {
  return import.meta.env.VITE_API_KEY || ""; 
};

export async function getPlanRecommendation(userProfile: string) {
  try {
    const genAI = new GoogleGenerativeAI(getApiKey());
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Based on the following user profile, recommend one of our packages: Starter (20Mbps, $25), Premium (50Mbps, $45), Ultra (100Mbps, $75), Business (500Mbps, $150). Profile: ${userProfile}`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to AI right now.";
  }
}

export async function getSupportAdvice(issue: string, history: any[] = []) {
  try {
    const genAI = new GoogleGenerativeAI(getApiKey());
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "You are the official NexusConnect ISP Support Assistant. Keep answers concise.",
    });

    const chat = model.startChat({
      history: history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }],
      })),
    });

    const result = await chat.sendMessage(issue);
    return result.response.text();
  } catch (error) {
    console.error("Support Advice Error:", error);
    return "দুঃখিত, আমাদের হটলাইন ০১৮২৭১৬৬২১৪ নাম্বারে কল করুন।";
  }
    }
