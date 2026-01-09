import { GoogleGenerativeAI } from "@google/generative-ai";

const getAI = () => {
  // আপনার ভেরসেলে যদি API_KEY নামে কি থাকে তবে সেটি নিবে, নাহলে খালি স্ট্রিং
  const apiKey = (typeof process !== 'undefined' && process.env.VITE_API_KEY) || 
                 (typeof process !== 'undefined' && process.env.API_KEY) || "";
  
  // এখানে সঠিক ক্লাস নাম ব্যবহার করা হয়েছে
  return new GoogleGenerativeAI(apiKey);
};

export async function getPlanRecommendation(userProfile: string) {
  try {
    const genAI = getAI();
    // মডেল ভার্সন ঠিক করা হয়েছে
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent(`Based on the following user profile, recommend one of our packages: Starter (20Mbps, $25), Premium (50Mbps, $45), Ultra (100Mbps, $75), Business (500Mbps, $150). Profile: ${userProfile}`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to my knowledge base right now. Please try again later.";
  }
}

export async function getSupportAdvice(issue: string, history: { role: 'user' | 'model', text: string }[] = []) {
  try {
    const genAI = getAI();
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "You are the official NexusConnect ISP Support Assistant. Keep answers concise.",
    });

    const chat = model.startChat({
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
    });

    const result = await chat.sendMessage(issue);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Support Advice Error:", error);
    return "দুঃখিত, বর্তমানে সার্ভারে সমস্যা হচ্ছে। অনুগ্রহ করে আমাদের হটলাইন ০১৮২৭১৬৬২১৪ নাম্বারে কল করুন।";
  }
}
