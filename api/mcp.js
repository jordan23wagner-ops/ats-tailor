// MCP (Model Context Protocol) server for FlagCheck.
//
// This is the endpoint AI agents talk to once the server is listed in the
// official MCP registry. It speaks JSON-RPC 2.0 over HTTP.
//
// SECURITY NOTE: this endpoint is gated by the same shared-secret x-api-key
// as /api/analyze. That is deliberate. Without a gate here, /api/mcp would be
// a free, unmetered side door around the paid endpoint -- every call burns
// Anthropic API credits on our account. The caller's key is forwarded to the
// underlying endpoints rather than substituting a server-held key, so there is
// exactly one access gate rather than two divergent ones.

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_NAME = "flagcheck";
const SERVER_VERSION = "1.0.0";

// Where to reach our own HTTP endpoints. Override in Vercel if the domain moves.
const SELF_BASE_URL =
  process.env.FLAGCHECK_BASE_URL || "https://flagcheck-paid-api.vercel.app";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Api-Key, Mcp-Session-Id, MCP-Protocol-Version",
};

const TOOLS = [
  {
    name: "scan_job_posting",
    description:
      "Scan a job posting for red flags, vague or inflated titles, unrealistic requirements, " +
      "and compensation signals. Returns a brutally honest verdict. If a resume is also supplied, " +
      "it additionally returns a candidate match score, strengths, gaps, and a go/no-go " +
      "recommendation. Use this when the user wants to evaluate whether a job posting is " +
      "legitimate or worth applying to.",
    inputSchema: {
      type: "object",
      properties: {
        jobText: {
          type: "string",
          description: "The full text of the job posting. Must be at least 50 characters.",
        },
        resumeText: {
          type: "string",
          description:
            "Optional. The candidate's resume text. When provided, the response also includes " +
            "a personalized fit score, strengths, gaps, and an apply/don't-apply recommendation.",
        },
      },
      required: ["jobText"],
    },
  },
  {
    name: "analyze_resume_fit",
    description:
      "Compare a resume against a specific job description and return ATS optimization guidance: " +
      "an ATS score before and after suggested changes, missing keywords, rewritten resume bullets, " +
      "and red flags. Use this when the user wants to tailor or optimize a resume for a particular " +
      "role. Requires BOTH a resume and a job description.",
    inputSchema: {
      type: "object",
      properties: {
        resume: { type: "string", description: "The candidate's full resume text." },
        jobDescription: { type: "string", description: "The full job description text." },
      },
      required: ["resume", "jobDescription"],
    },
  },
];

function sendJson(res, status, body) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader("Content-Type", "application/json");
  return res.status(status).json(body);
}

function rpcError(res, id, code, message, httpStatus = 200) {
  return sendJson(res, httpStatus, {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message },
  });
}

// A tool that failed is still a successful JSON-RPC response -- the failure is
// reported inside the result with isError so the model can see and react to it,
// rather than the whole request blowing up.
function toolError(res, id, message) {
  return sendJson(res, 200, {
    jsonrpc: "2.0",
    id,
    result: { content: [{ type: "text", text: message }], isError: true },
  });
}

async function callSelf(path, payload, apiKey) {
  const resp = await fetch(`${SELF_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(payload),
  });

  let parsed = null;
  const raw = await resp.text();
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    // Non-JSON body (HTML error page, gateway timeout, etc.)
    return { ok: false, message: `Upstream returned non-JSON (HTTP ${resp.status}): ${raw.slice(0, 300)}` };
  }

  if (!resp.ok) {
    const detail = parsed?.error || parsed?.details || `HTTP ${resp.status}`;
    return { ok: false, message: `Analysis failed: ${detail}` };
  }
  return { ok: true, data: parsed };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const body = req.body ?? {};
  const { method, params, id } = body;

  if (!method || typeof method !== "string") {
    return rpcError(res, id, -32600, "Invalid Request: missing 'method'", 400);
  }

  // --- Notifications carry no id and MUST NOT get a response body. ----------
  if (method.startsWith("notifications/")) {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(202).end();
  }

  // --- Handshake + discovery are open. -------------------------------------
  // Agents must be able to see what this server offers before paying for it;
  // only actual tool execution is gated.
  if (method === "initialize") {
    const requested = params?.protocolVersion;
    return sendJson(res, 200, {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: typeof requested === "string" ? requested : PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions:
          "FlagCheck analyzes job postings and resumes. Every tools/call requires a valid " +
          "x-api-key HTTP header. Use scan_job_posting to evaluate a job posting (resume " +
          "optional), or analyze_resume_fit to tailor a resume to a specific role.",
      },
    });
  }

  if (method === "ping") {
    return sendJson(res, 200, { jsonrpc: "2.0", id, result: {} });
  }

  if (method === "tools/list") {
    return sendJson(res, 200, { jsonrpc: "2.0", id, result: { tools: TOOLS } });
  }

  if (method === "tools/call") {
    // --- Access gate ------------------------------------------------------
    const expectedKey = process.env.FLAGCHECK_API_KEY;
    if (!expectedKey) {
      console.error("FLAGCHECK_API_KEY is not configured - refusing all tool calls");
      return rpcError(res, id, -32603, "Server misconfigured: access control not set up");
    }
    const providedKey = req.headers["x-api-key"];
    if (!providedKey || providedKey !== expectedKey) {
      // -32001 is in the implementation-defined server error range; agents
      // surface the message, which tells the caller exactly what to fix.
      return rpcError(
        res,
        id,
        -32001,
        "Unauthorized: send a valid x-api-key header with every tools/call request."
      );
    }

    const name = params?.name;
    const args = params?.arguments ?? {};

    if (name === "scan_job_posting") {
      const jobText = typeof args.jobText === "string" ? args.jobText.trim() : "";
      if (jobText.length < 50) {
        return toolError(res, id, "jobText is required and must be at least 50 characters.");
      }
      const payload = { jobText };
      if (typeof args.resumeText === "string" && args.resumeText.trim()) {
        payload.resumeText = args.resumeText;
      }
      const out = await callSelf("/api/scan-job", payload, providedKey);
      if (!out.ok) return toolError(res, id, out.message);
      return sendJson(res, 200, {
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(out.data, null, 2) }] },
      });
    }

    if (name === "analyze_resume_fit") {
      const resume = typeof args.resume === "string" ? args.resume.trim() : "";
      const jobDescription =
        typeof args.jobDescription === "string" ? args.jobDescription.trim() : "";
      if (!resume || !jobDescription) {
        return toolError(
          res,
          id,
          "Both 'resume' and 'jobDescription' are required for analyze_resume_fit. " +
            "If you only have a job posting, use scan_job_posting instead."
        );
      }
      const out = await callSelf("/api/analyze", { resume, jobDescription }, providedKey);
      if (!out.ok) return toolError(res, id, out.message);
      return sendJson(res, 200, {
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(out.data, null, 2) }] },
      });
    }

    return rpcError(res, id, -32602, `Unknown tool: ${name}`);
  }

  return rpcError(res, id, -32601, `Method not found: ${method}`);
}
