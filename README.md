# FlagCheck Job Analyzer

A Model Context Protocol (MCP) server that enables AI agents to analyze job descriptions for ATS compatibility, red flags, salary benchmarks, and keyword optimization.

## MCP Endpoint

`https://flagcheck-paid-api.vercel.app/api/analyze`

## What it does

Analyzes job descriptions for ATS keyword alignment, flags red flags such as vague titles or unrealistic requirements, benchmarks salary ranges, and scores overall job fit.

## Usage

Send a POST request with `resume` and `jobDescription` fields to the endpoint above, including an `x-api-key` header, and receive structured analysis in return.

## Access / Payment

This endpoint is currently gated by a shared-secret `x-api-key` header (set via the `FLAGCHECK_API_KEY` environment variable on the server) rather than the x402 USDC micropayment flow this README previously (and incorrectly) advertised. No x402 payment verification is implemented in this codebase yet, so requests are not metered or charged on-chain today.

Real x402-based per-request billing is a planned follow-up, not a shipped feature. Until then, treat the `x-api-key` header as required for every request.
