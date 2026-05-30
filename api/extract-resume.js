import Anthropic from "@anthropic-ai/sdk";

export const config = { maxDuration: 30 };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { base64, mimeType } = req.body;
    if (!base64) return res.status(400).json({ error: "No file data received." });

    if (mimeType === "text/plain") {
      const text = Buffer.from(base64, "base64").toString("utf-8").replace(/\s+/g, " ").trim();
      if (!text || text.length < 50) return res.status(400).json({ error: "Could not read text from file." });
      return res.status(200).json({ text: text.slice(0, 8000) });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: "Extract all the text from this resume. Return ONLY the raw text content with no commentary, no markdown, no formatting." }
        ]
      }]
    });

    const text = message.content[0].text.trim();
    if (!text || text.length < 50) return res.status(400).json({ error: "Could not extract text. Try a .txt version instead." });
    return res.status(200).json({ text: text.slice(0, 8000) });

  } catch (err) {
    console.error("extract-resume error:", err.message);
    return res.status(500).json({ error: "Failed to read resume. Try a .txt version." });
  }
}
