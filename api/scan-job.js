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
    const { jobText, resumeText } = req.body;

    if (!jobText || jobText.trim().length < 50) {
      return res.status(400).json({ error: "No job description found or text too short." });
    }

    const trimmedJob = jobText.slice(0, 6000);
    const trimmedResume = resumeText ? resumeText.slice(0, 4000) : null;

    const hasResume = trimmedResume && trimmedResume.trim().length > 50;

    const resumeSection = hasResume
      ? `\n\nCANDIDATE RESUME:\n${trimmedResume}`
      : "";

    const personalSection = hasResume
      ? `,
  "matchScore": number from 0-100 representing how well this candidate fits the role,
  "matchLabel": "short 3-word verdict on the match e.g. Strong Fit, Partial Match, Unlikely Fit",
  "shouldApply": true or false,
  "shouldApplyReason": "one direct sentence explaining the go/no-go decision",
  "yourStrengths": ["up to 3 specific things from their resume that align with this role"],
  "yourGaps": ["up to 3 specific skills or experiences this role wants that their resume lacks"],
  "coverLetterHook": "one sentence they should lead their cover letter with based on their background"`
      : `,
  "matchScore": null,
  "matchLabel": null,
  "shouldApply": null,
  "shouldApplyReason": null,
  "yourStrengths": [],
  "yourGaps": [],
  "coverLetterHook": null`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `You are a brutally honest career advisor. Analyze this job description${hasResume ? " and the candidate's resume" : ""}. Respond ONLY with valid JSON — no preamble, no markdown fences.

JOB DESCRIPTION:
${trimmedJob}${resumeSection}

Return this exact JSON structure:
{
  "grade": "A" | "B" | "C" | "D" | "F",
  "gradeLabel": "short 3-5 word verdict",
  "role": "job title detected",
  "company": "company name or Unknown",
  "redFlags": ["up to 5 specific red flags as strings"],
  "greenFlags": ["up to 3 genuine positives, skip if none"],
  "salaryEstimate": "estimated range like $75,000-$100,000 or Unknown",
  "interviewQuestions": ["3 sharp questions to ask based on what this JD is hiding"],
  "summary": "2 sentence brutally honest plain-English verdict on this job"${personalSection}
}

${hasResume ? `Personal analysis rules:
- matchScore: be realistic, most people are 40-75%. Only give 80+ if it is genuinely exceptional alignment.
- yourStrengths: cite specific resume content, not generic praise
- yourGaps: be specific about what the JD requires that is missing from the resume
- coverLetterHook: make it specific to their actual background, not generic` : ""}

Job grading rubric:
A = Clear scope, fair pay, real culture signals, growth potential
B = Mostly solid with minor yellow flags
C = Several yellow/red flags, proceed with caution
D = Multiple serious red flags, likely toxic or bait-and-switch
F = Run. Clear exploitation, fake role, or dangerous employer`,
        },
      ],
    });

    const raw = message.content[0].text.trim();
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
