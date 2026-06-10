import express from 'express';
const app = express();
app.use(express.json());

app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});

const mcpHandler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { method, params, id } = req.body || {};

  if (method === 'initialize') {
    return res.json({ jsonrpc: '2.0', id, result: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'flagcheck-analyzer', version: '1.0.0' }
    }});
  }
  if (method === 'notifications/initialized') {
    return res.json({ jsonrpc: '2.0', id, result: {} });
  }
  if (method === 'tools/list') {
    return res.json({ jsonrpc: '2.0', id, result: { tools: [{
      name: 'analyze_job',
      description: 'Analyzes a job description for ATS compatibility, red flags, salary benchmarks, and keyword optimization.',
      inputSchema: { type: 'object', properties: { job_description: { type: 'string', description: 'The job description text to analyze' } }, required: ['job_description'] }
    }]}});
  }
  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    if (name === 'analyze_job') {
      const response = await fetch('https://flagcheck-paid-api.vercel.app/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: args.job_description })
      });
      const result = await response.json();
      return res.json({ jsonrpc: '2.0', id, result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      }});
    }
  }
  res.json({ jsonrpc: '2.0', id, result: {} });
};

// Handle all paths MCPize probes
app.post('/', mcpHandler);
app.post('/mcp', mcpHandler);
app.post('/api/mcp', mcpHandler);

// SSE endpoint for older transport
app.get('/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write('data: {}\n\n');
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('MCP server running on port ' + PORT));
