import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'flagcheck-analyzer',
  version: '1.0.0'
});

server.tool(
  'analyze_job',
  'Analyzes a job description for ATS compatibility, red flags, salary benchmarks, and keyword optimization.',
  { job_description: z.string().describe('The job description text to analyze') },
  async ({ job_description }) => {
    const response = await fetch('https://flagcheck-paid-api.vercel.app/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription: job_description })
    });
    const result = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
