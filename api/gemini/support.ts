// api/gemini/support.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { issue, history } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key missing" });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction:
        "You are the official NexusConnect ISP Support Assistant. Answer in Bengali, keep replies short, polite and helpful.",
    });

    const chat = model.startChat({
      history: history.map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }],
      })),
    });

    const result = await chat.sendMessage(issue);
    const text = result.response.text();

    res.status(200).json({ advice: text });
  } catch (error: any) {
    console.error("Support Error:", error);
    res.status(500).json({
      advice: "দুঃখিত, আমাদের হটলাইন ০১৮২৭১৬৬২১৪ নাম্বারে কল করুন।",
    });
  }
}
