import http from 'http';
import fs from 'fs';
const mock = fs.readFileSync(new URL('./mock.json', import.meta.url), 'utf8');
http.createServer((req, res) => {
  if (req.url === '/api/tags') return res.end(JSON.stringify({ models: [{ name: 'gemma3:12b' }] }));
  if (req.url === '/api/chat') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      const b = JSON.parse(body);
      console.log('chat request: model', b.model, 'num_ctx', b.options.num_ctx, 'schema', !!b.format?.properties);
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
      for (let i = 0; i < mock.length; i += 40) {
        res.write(JSON.stringify({ message: { role: 'assistant', content: mock.slice(i, i + 40) }, done: false }) + '\n');
        await new Promise((r) => setTimeout(r, 30));
      }
      res.end(JSON.stringify({ message: { content: '' }, done: true }) + '\n');
    });
    return;
  }
  res.statusCode = 404; res.end();
}).listen(11434, '127.0.0.1', () => console.log('fake ollama up'));
