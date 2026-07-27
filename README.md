# FlagCheck Job Analyzer

A Model Context Protocol (MCP) server that enables AI agents to analyze job descriptions for ATS compatibility, red flags, salary benchmarks, and keyword optimization.

## MCP Endpoint

`https://flagcheck-paid-api.vercel.app/api/mcp`

## What it does

Analyzes job descriptions for ATS keyword alignment, flags red flags such as vague titles or unrealistic requirements, benchmarks salary ranges, and scores overall job fit.

## Usage

Send a POST request with `resume` and `jobDescription` fields to the endpoint above, including an `x-api-key` header, and receive structured analysis in return.

## Access / Payment

This endpoint is currently gated by a shared-secret `x-api-key` header (set via the `FLAGCHECK_API_KEY` environment variable on the server) rather than the x402 USDC micropayment flow this README previously (and incorrectly) advertised. No x402 payment verification is implemented in this codebase yet, so requests are not metered or charged on-chain today.

Real x402-based per-request billing is a planned follow-up, not a shipped feature. Until then, treat the `x-api-key` header as required for every request.

## ⏸ Paused (2026-07-27)

No further active development — job-description analysis is being consolidated into Job-Assistant ("Alicia AI"), which now covers this ground (Match Score + Analyze Job) inside a more mature, actively-maintained product. The fixes below are live and staying live; this repo just isn't getting new investment for now.

## Fixes shipped 2026-07-27

- **Invalid AI model IDs corrected** (`claude-sonnet-4-5`/`claude-sonnet-4-6` → `claude-sonnet-5`) — these were causing live 500s on `/api/scan-job`.
- **MCP server rewritten** — `/api/mcp` previously called `/api/analyze` without the required auth header or `resume` field, so every `tools/call` failed. Now exposes two working tools: `scan_job_posting` and `analyze_resume_fit`.
- **`scan-job` and `extract-resume` gated** — both were making paid Anthropic API calls with zero authentication; now require the same `x-api-key` header as `analyze`.
- Added `server.json` for the official MCP registry (schema-validated, not yet published).
