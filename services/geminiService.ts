import { GoogleGenerativeAI } from "@google/generative-ai";

const getAI = () => {
  const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || "";
  // ভুল ছিল: return new GoogleGenAI({ apiKey });
// সঠিক হবে নিচেরটি:
return new GoogleGenerativeAI(apiKey);
};

export async function getPlanRecommendation(userProfile: string) {
  try {
    const ai = getAI();
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

export async function getSupportAdvice(issue: string, history: {role: 'user' | 'model', text: string}[] = []) {
  try {
    const ai = getAI();
    
    const contents = history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }));
    
    contents.push({
      role: 'user',
      parts: [{ text: issue }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: `You are the official NexusConnect ISP Support Assistant. 
        1. Be technical but explain things simply.
        2. Always recommend restarting the router (ONU/Router) as the first troubleshooting step for speed or connection issues.
        3. Respond in the same language the user is using (Bengali or English).
        4. If the user asks for the hotline number, provide: 01827166214.
        5. If they ask about the office location, say: "কলেজ পাড়া ,আকবরিয়া মসজিদ সংলগ্ন ,রংপুর সদর ,রংপুর".
        6. Keep answers concise.`,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Support Advice Error:", error);
    return "দুঃখিত, বর্তমানে সার্ভারে সমস্যা হচ্ছে। অনুগ্রহ করে আমাদের হটলাইন ০১৮২৭-১৬৬২১৪ নাম্বারে কল করুন।";
  }
}
