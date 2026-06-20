import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function respond(res, status, body) {
  res.setHeader("Content-Type", "application/json");
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return respond(res, 405, { error: "Method not allowed" });
  }

  const { resume, jobDescription } = req.body ?? {};
  if (!resume || !jobDescription) {
    return respond(res, 400, { error: "resume and jobDescription are required" });
  }

  const userMessage = `Analyze this resume against the job description and return ONLY a valid JSON object with this exact structure:
{
  "ats_score_before": <number 0-100>,
  "ats_score_after": <number 0-100>,
  "missing_keywords": [<array of strings, max 8>],
  "rewritten_bullets": [<array of 3-5 strings>],
  "red_flags": [<array of strings, max 3>],
  "summary_recommendation": "<one sentence>"
}

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      system: "You are an expert ATS analyst. Respond with valid JSON only - no markdown, no explanation.",
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText = message.content[0].text;
    const clean = rawText.replace(/^```json\n?|```$/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      console.error("Claude returned non-JSON:", rawText);
      return respond(res, 502, {
        error: "AI processing failed",
        details: `Response was not valid JSON: ${parseErr.message}`,
      });
    }

    return respond(res, 200, {
      success: true,
      data: parsed,
      meta: { model: "claude-sonnet-4-5", resume_chars: resume.length, jd_chars: jobDescription.length },
    });
  } catch (err) {
    console.error("Claude API error:", err);
    return respond(res, err.status ? 502 : 500, {
      error: err.status ? "AI processing failed" : "Internal server error",
      details: err.message,
    });
  }
}