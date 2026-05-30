// /api/extract-resume.js — extracts text from uploaded PDF resume

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { base64, mimeType } = req.body;
    if (!base64) return res.status(400).json({ error: "No file data received." });

    const buffer = Buffer.from(base64, "base64");

    if (mimeType === "application/pdf") {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const data = await pdfParse(buffer);
      const text = data.text.replace(/\s+/g, " ").trim();
      if (!text || text.length < 50) {
        return res.status(400).json({ error: "Could not extract text from PDF. Try a text-based PDF." });
      }
      return res.status(200).json({ text: text.slice(0, 8000) });
    }

    // Fallback for plain text
    const text = buffer.toString("utf-8").replace(/\s+/g, " ").trim();
    return res.status(200).json({ text: text.slice(0, 8000) });

  } catch (err) {
    console.error("extract-resume error:", err.message);
    return res.status(500).json({ error: "Failed to extract resume text. Try a different file." });
  }
}
