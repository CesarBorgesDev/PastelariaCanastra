import fs from 'node:fs';
import { upsertProducts } from './catalog.js';
import { pool, repairProductText } from './db.js';

const raw = fs.readFileSync(0, 'utf8').trim();
if (!raw) {
  console.error('Arquivo de produtos vazio.');
  process.exit(1);
}

const products = JSON.parse(raw);
await repairProductText();
const result = await upsertProducts(pool, products);
await pool.end();
console.log(`Importação concluída. Atualizados: ${result.updated}. Criados: ${result.created}. Pedidos não foram alterados.`);
