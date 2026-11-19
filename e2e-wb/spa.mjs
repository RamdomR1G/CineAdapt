// Servidor estatico de una carpeta compilada con respaldo SPA. Uso: node e2e-wb/spa.mjs dist-wb-antes/browser 4300
import http from 'http'; import fs from 'fs'; import path from 'path';
const dir = path.resolve(process.argv[2]), port = Number(process.argv[3] || 4300);
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
http.createServer((req, res) => { let f = path.join(dir, decodeURIComponent(req.url.split('?')[0])); if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, 'index.html');
  res.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }).listen(port, () => console.log('PWA en http://localhost:' + port));
