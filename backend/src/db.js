import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { upsertProducts } from './catalog.js';
import { canonicalCategory, repairText } from './text.js';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL não definida');
}

export const pool = new Pool({ connectionString });

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');

const SEED = [
  ['Pastel de Carne', 'Carne moída temperada', 12, 'Pastéis Salgados'],
  ['Pastel de Queijo', 'Mussarela derretida', 12, 'Pastéis Salgados'],
  ['Pastel de Frango', 'Frango desfiado com catupiry', 14, 'Pastéis Salgados'],
  ['Pastel de Pizza', 'Mussarela, presunto e orégano', 14, 'Pastéis Salgados'],
  ['Pastel de Chocolate', 'Chocolate ao leite', 11, 'Pastéis Doces'],
  ['Pastel de Banana', 'Banana com canela', 11, 'Pastéis Doces'],
  ['Refrigerante lata', '350 ml', 6, 'Bebidas'],
  ['Suco natural', '300 ml', 8, 'Bebidas'],
  ['Catupiry extra', 'Porção adicional', 3, 'Adicionais'],
];

export async function initDb() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch (error) {
      if (attempt === 30) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM products');
  if (rows[0].count === 0) {
    for (const [name, description, price, category] of SEED) {
      await pool.query(
        `INSERT INTO products (name, description, price, category)
         VALUES ($1, $2, $3, $4)`,
        [name, description, price, category],
      );
    }
  }

  await repairProductText();
  await importRepositoryProducts();
}

async function importRepositoryProducts() {
  const productsFile = process.env.PRODUCTS_FILE || '/app/data/products.json';
  if (!fs.existsSync(productsFile)) return;

  const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
  const result = await upsertProducts(pool, products);
  console.log(`Produtos do repositório: ${result.updated} atualizados, ${result.created} criados.`);
}

export async function repairProductText() {
  const { rows } = await pool.query('SELECT id, name, description, category FROM products');
  for (const row of rows) {
    const name = repairText(row.name);
    const description = repairText(row.description);
    const category = canonicalCategory(row.category);
    if (name === row.name && description === row.description && category === row.category) continue;
    await pool.query(
      'UPDATE products SET name = $2, description = $3, category = $4 WHERE id = $1',
      [row.id, name, description, category],
    );
  }
}
