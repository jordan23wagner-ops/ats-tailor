export default function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlagCheck Privacy Policy</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #08080f; color: #e8e8f0; line-height: 1.7; padding: 48px 24px; }
    .container { max-width: 680px; margin: 0 auto; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    h2 { font-size: 15px; font-weight: 700; color: #ffd60a; margin: 28px 0 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    p, li { font-size: 14px; color: #c0c0d0; margin-bottom: 10px; }
    ul { padding-left: 20px; margin-bottom: 12px; }
    a { color: #64ffda; }
    .logo { font-size: 22px; font-weight: 700; margin-bottom: 36px; }
    .flag { color: #ffd60a; }
    .updated { font-size: 13px; color: #5a5a78; margin-bottom: 32px; }
    .box { background: rgba(255,214,10,0.06); border: 1px solid rgba(255,214,10,0.15); border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    hr { border: none; border-top: 1px solid #22222e; margin: 36px 0; }
    footer { font-size: 12px; color: #5a5a78; }
  </style>
</head>
<body>
<div class="container">
  <div class="logo"><span class="flag">⚑</span> FlagCheck</div>
  <h1>Privacy Policy</h1>
  <p class="updated">Last updated: May 30, 2026</p>
  <div class="box"><p><strong>Short version:</strong> FlagCheck reads job postings and optionally your resume to provide analysis. Your resume is stored only on your own device. We do not collect, sell, or retain your personal data on our servers.</p></div>
  <h2>What We Collect</h2>
  <ul>
    <li><strong>Job description text</strong> — sent to our API and Anthropic Claude AI for analysis, then discarded.</li>
    <li><strong>Resume text (optional)</strong> — stored locally on your device in Chrome storage. Sent to our API only during an active scan.</li>
    <li><strong>Scan count and license key</strong> — stored locally on your device only. Never transmitted to our servers.</li>
  </ul>
  <h2>What We Do NOT Collect</h2>
  <ul>
    <li>No name, email, or personally identifiable information</li>
    <li>No retention of job or resume text after analysis is complete</li>
    <li>No browsing history or cross-site tracking</li>
    <li>No cookies</li>
    <li>No sale of data to third parties</li>
  </ul>
  <h2>How Your Data Is Used</h2>
  <p>When you scan a job posting, the page text (and optionally your resume) is sent to our Vercel-hosted API, which forwards it to Anthropic Claude AI for analysis. The result is returned to your browser. No data is logged or retained on our servers after the response is delivered.</p>
  <h2>Third-Party Services</h2>
  <ul>
    <li><strong>Anthropic Claude API</strong> — processes text for analysis. See <a href="https://www.anthropic.com/legal/privacy">Anthropic Privacy Policy</a>.</li>
    <li><strong>Vercel</strong> — hosts our API. See <a href="https://vercel.com/legal/privacy-policy">Vercel Privacy Policy</a>.</li>
  </ul>
  <h2>Data Storage</h2>
  <p>All user data is stored exclusively in Chrome local storage on your device. It is never shared with third parties.</p>
  <h2>Contact</h2>
  <p>Questions? Email <a href="mailto:Jordan23Wagner@gmail.com">Jordan23Wagner@gmail.com</a></p>
  <hr>
  <footer>© 2026 FlagCheck. All rights reserved.</footer>
</div>
</body>
</html>`);
}
