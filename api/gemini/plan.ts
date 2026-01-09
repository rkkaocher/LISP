// api/gemini/plan.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userProfile } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key missing" });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Based on the following user profile, recommend exactly one of our packages and explain briefly in Bengali: 
Packages: 
- Starter (20Mbps, ৳25)
- Premium (50Mbps, ৳45)
- Ultra (100Mbps, ৳75)
- Business (500Mbps, ৳150)

Profile: ${userProfile}

Reply format: 
প্যাকেজ: [নাম]
মূল্য: ৳[টাকা]/মাস
কারণ: [সংক্ষিপ্ত ব্যাখ্যা]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.status(200).json({ recommendation: text });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({
      recommendation: "সাজেশন পেতে সমস্যা হচ্ছে। পরে আবার চেষ্টা করুন।",
    });
  }
}
