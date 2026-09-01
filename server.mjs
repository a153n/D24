import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, relative } from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const ROOT = process.cwd();
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function safePath(requestUrl) {
  const pathname = decodeURIComponent((requestUrl || '/').split('?')[0]);
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const root = resolve(ROOT);
  const candidate = resolve(root, requested);
  const rel = relative(root, candidate);
  const allowed = new Set(['index.html', 'styles.css', 'app.js', 'supabase-config.js']);
  if (!allowed.has(rel) || rel.startsWith('..') || rel.includes('\\')) return null;
  return candidate;
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    return response.end('Method Not Allowed');
  }

  try {
    const filePath = safePath(request.url);
    if (!filePath) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return response.end('Not found');
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': types[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    if (request.method === 'HEAD') return response.end();
    response.end(body);
  } catch (error) {
    console.error(error);
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Could not load the requested file.');
  }
});

server.listen(PORT, () => console.log(`D24 is running at http://localhost:${PORT}`));
