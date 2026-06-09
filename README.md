# FlagCheck Job Analyzer

A Model Context Protocol (MCP) server that enables AI agents to analyze job descriptions for ATS compatibility, red flags, salary benchmarks, and keyword optimization.

## MCP Endpoint
`https://flagcheck-paid-api.vercel.app/api/analyze`

## What it does
- Analyzes job descriptions for ATS keyword alignment
- Flags red flags (vague titles, unrealistic requirements, etc.)
- Benchmarks salary ranges
- Scores overall job fit

## Usage
Send a job description to the MCP endpoint and receive structured analysis. Accepts $0.01 USDC per request via x402 payment protocol.

## Payment
This MCP server uses the [x402 protocol](https://x402.org) for micropayments. Each analysis costs $0.01 USDC on Base mainnet.
