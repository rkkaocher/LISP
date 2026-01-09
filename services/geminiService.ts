// src/services/geminiService.ts (নতুন ভার্সন)
export async function getPlanRecommendation(userProfile: string): Promise<string> {
  try {
    const response = await fetch("/api/gemini/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userProfile }),
    });
    if (!response.ok) throw new Error("Failed");
    const data = await response.json();
    return data.recommendation;
  } catch {
    return "দুঃখিত, এখন সাজেশন দিতে পারছি না।";
  }
}

export async function getSupportAdvice(issue: string, history: any[] = []): Promise<string> {
  try {
    const response = await fetch("/api/gemini/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue, history }),
    });
    if (!response.ok) throw new Error("Failed");
    const data = await response.json();
    return data.advice;
  } catch {
    return "দুঃখিত, হটলাইন: ০১৮২৭১৬৬২১৪";
  }
}
