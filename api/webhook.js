import { Resend } from "resend";

export const config = { maxDuration: 60 };

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    let body = req.body;
    if (typeof body === "string") {
      const p = new URLSearchParams(body);
      body = Object.fromEntries(p.entries());
    }

    const buyerEmail = body.email || body.buyer_email;
    const buyerName = body.full_name || body.buyer_full_name || "";

    let fields = {};
    try { fields = JSON.parse(body.custom_fields || "{}"); } catch {}

    const resume = fields.resume || fields.Resume || "";
    const jobDescription = fields.job_description || fields["Job Description"] || "";

    if (!buyerEmail) return res.status(200).json({ received: true, error: "Missing buyer email" });
    if (!resume || !jobDescription) return res.status(200).json({ received: true, error: "Missing resume or job description" });

    const r = await fetch("https://y-delta-lake.vercel.app/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume, jobDescription }),
    });

    if (!r.ok) throw new Error("Analyze API returned " + r.status);

    const result = await r.json();
    const data = result.data || result;

    const scoreBefore = data.ats_score_before ?? "N/A";
    const scoreAfter = data.ats_score_after ?? "N/A";
    const summary = data.summary_recommendation ?? "";
    const missing = (data.missing_keywords || []).join(", ");
    const bullets = (data.rewritten_bullets || []).map(b => `<li>${b}</li>`).join("");

    await resend.emails.send({
      from: "FlagCheck <results@ats-tailor.org>",
      to: buyerEmail,
      subject: `Your ATS Score: ${scoreBefore} -> ${scoreAfter}`,
      html: `
        <h2>Hey ${buyerName || "there"}, your results are ready.</h2>
        <p><strong>ATS Score:</strong> ${scoreBefore} &rarr; ${scoreAfter}</p>
        <p><strong>Summary:</strong> ${summary}</p>
        <h3>Missing Keywords</h3><p>${missing}</p>
        <h3>Suggested Bullet Points</h3><ul>${bullets}</ul>
        <p style="color:#888;font-size:12px">Powered by FlagCheck</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("webhook error:", err.message);
    return res.status(200).json({ received: true, error: err.message });
  }
}