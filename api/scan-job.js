import Anthropic from "@anthropic-ai/sdk";

export const config = { maxDuration: 60 };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { jobText } = req.body;

    if (!jobText || jobText.trim().length < 50) {
      return res
        .status(400)
        .json({ error: "No job description found or text too short." });
    }

    const trimmed = jobText.slice(0, 6000); // cap tokens

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a brutally honest career advisor helping job seekers avoid bad opportunities. Analyze this job description and respond ONLY with valid JSON — no preamble, no markdown fences.

Job Description:
${trimmed}

Return this exact JSON structure:
{
  "grade": "A" | "B" | "C" | "D" | "F",
  "gradeLabel": "short 3-5 word verdict",
  "role": "job title detected",
  "company": "company name or Unknown",
  "redFlags": ["array of up to 5 specific red flags as strings, be specific and direct"],
  "greenFlags": ["array of up to 3 genuine positives, skip if none"],
  "salaryEstimate": "estimated range like $75,000–$100,000 or Unknown if no signal",
  "interviewQuestions": ["3 sharp questions to ask based on what this JD is hiding"],
  "summary": "2 sentence brutally honest plain-English verdict on this job"
}

Grading rubric:
A = Clear scope, fair pay, real culture signals, growth potential
B = Mostly solid with minor yellow flags
C = Several yellow/red flags, proceed with caution
D = Multiple serious red flags, likely toxic or bait-and-switch
F = Run. Clear exploitation, fake role, or dangerous employer

Red flag examples: vague salary ("competitive"), "rockstar/ninja/wizard", "fast-paced startup" with no equity, unpaid trial periods, 10 roles in one, "must wear many hats" with no scope, "unlimited PTO" without culture context, required unpaid overtime, "family culture" masking poor boundaries.`,
        },
      ],
    });

    const raw = message.content[0].text.trim();

    // Strip any accidental markdown fences
    const clean = raw.replace(/^```json\n?|```$/g, "").trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);
  } catch (err) {
    console.error("scan-job error:", err.message);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: "Failed to parse AI response." });
    }
    return res.status(500).json({ error: "Analysis failed. Try again." });
  }
}
