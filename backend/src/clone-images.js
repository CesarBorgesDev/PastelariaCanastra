import fs from 'node:fs';
import path from 'node:path';
import { pool } from './db.js';

const appId = process.env.BASE44_APP_ID || '69ca7c6943d2142fad405526';
const token = process.env.BASE44_ACCESS_TOKEN || '';
const serverUrl = (process.env.BASE44_SERVER_URL || 'https://base44.app').replace(/\/$/, '');
const uploadsDir = process.env.UPLOADS_DIR || '/app/uploads';
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

if (!token) {
  console.error('Defina BASE44_ACCESS_TOKEN com o token da sessão do Base44.');
  process.exit(1);
}

fs.mkdirSync(uploadsDir, { recursive: true });

const response = await fetch(`${serverUrl}/api/apps/${appId}/entities/Product`, {
  headers: {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-App-Id': appId,
  },
});

if (!response.ok) {
  const body = await response.text();
  console.error(`Base44 respondeu ${response.status}: ${body}`);
  process.exit(1);
}

const payload = await response.json();
const products = Array.isArray(payload)
  ? payload
  : payload.items || payload.data || payload.results || [];

if (!Array.isArray(products)) {
  console.error('Resposta inesperada do Base44.');
  process.exit(1);
}

let saved = 0;
let skipped = 0;

for (const product of products) {
  const imageUrl = imageUrlOf(product);
  if (!imageUrl) {
    skipped += 1;
    continue;
  }

  const fileName = await downloadImage(imageUrl, product.id || product.name);
  if (!fileName) {
    skipped += 1;
    continue;
  }

  const publicPath = `/uploads/${fileName}`;
  const name = String(product.name || '').trim();
  if (!name) {
    skipped += 1;
    continue;
  }

  const updated = await pool.query(
    'UPDATE products SET image_url = $2 WHERE lower(name) = lower($1)',
    [name, publicPath],
  );

  if (updated.rowCount === 0) {
    await pool.query(
      `INSERT INTO products (name, description, price, category, image_url, available)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        name,
        String(product.description || ''),
        Number(product.price) || 0,
        String(product.category || 'Pastéis Salgados'),
        publicPath,
        product.available !== false,
      ],
    );
    console.log(`produto criado com imagem: ${name}`);
  } else {
    console.log(`imagem atualizada: ${name}`);
  }
  saved += 1;
}

await pool.end();
console.log(`Imagens salvas: ${saved}. Sem imagem ou ignoradas: ${skipped}.`);

function imageUrlOf(product) {
  const value = product.image_url ?? product.imageUrl ?? product.image;
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    const nested = value.url || value.file_url || value.src;
    return typeof nested === 'string' ? nested.trim() : '';
  }
  return '';
}

async function downloadImage(imageUrl, id) {
  let parsed;
  try {
    parsed = new URL(imageUrl);
  } catch {
    console.warn(`URL inválida: ${imageUrl}`);
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  const imageResponse = await fetch(parsed, { redirect: 'follow' });
  if (!imageResponse.ok) {
    console.warn(`Falha ao baixar ${imageUrl}: ${imageResponse.status}`);
    return null;
  }

  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  if (bytes.length === 0 || bytes.length > 20 * 1024 * 1024) {
    console.warn(`Arquivo ignorado pelo tamanho: ${imageUrl}`);
    return null;
  }

  const ext = extensionFor(parsed, imageResponse.headers.get('content-type'));
  const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'imagem';
  const fileName = `${safeId}${ext}`;
  fs.writeFileSync(path.join(uploadsDir, fileName), bytes);
  return fileName;
}

function extensionFor(url, contentType) {
  const fromUrl = path.extname(url.pathname).toLowerCase();
  if (imageExtensions.has(fromUrl)) return fromUrl === '.jpeg' ? '.jpg' : fromUrl;
  const type = (contentType || '').toLowerCase();
  if (type.includes('png')) return '.png';
  if (type.includes('webp')) return '.webp';
  if (type.includes('gif')) return '.gif';
  if (type.includes('svg')) return '.svg';
  return '.jpg';
}
