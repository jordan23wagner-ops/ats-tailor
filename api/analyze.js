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
    return respond(res, 400, {
      error: "resume and jobDescription are required",
    });
  }

  const userMessage = `Analyze this resume against the job description and return ONLY a valid JSON object with this exact structure:

{
  "ats_score_before": <number 0-100 representing current keyword match percentage>,
  "ats_score_after": <number 0-100 representing projected score after applying suggestions>,
  "missing_keywords": [<array of strings: keywords from JD missing in resume, max 8>],
  "rewritten_bullets": [<array of 3-5 strings: improved resume bullet points tailored to this JD>],
  "red_flags": [<array of strings: specific issues in this resume for this role, max 3>],
  "summary_recommendation": "<one sentence: most important single change to make>"
}

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system:
        "You are an expert ATS (Applicant Tracking System) analyst and professional resume writer with 15 years of experience. You analyze resumes against job descriptions and provide precise, actionable optimization advice. You always respond with valid JSON only — no markdown, no explanation outside the JSON structure.",
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText = message.content[0].text;

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("Claude returned non-JSON response:", rawText);
      return respond(res, 502, {
        error: "AI processing failed",
        details: `Response was not valid JSON: ${parseErr.message}`,
      });
    }

    return respond(res, 200, {
      success: true,
      data: parsed,
      meta: {
        model: "claude-sonnet-4-6",
        resume_chars: resume.length,
        jd_chars: jobDescription.length,
      },
    });
  } catch (err) {
    console.error("Claude API error:", err);

    if (err.status || err.error) {
      return respond(res, 502, {
        error: "AI processing failed",
        details: err.message,
      });
    }

    return respond(res, 500, { error: "Internal server error" });
  }
}
