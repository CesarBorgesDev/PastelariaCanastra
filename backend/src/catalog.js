import fs from 'node:fs';
import { canonicalCategory, repairText } from './text.js';

export async function upsertProducts(db, products) {
  if (!Array.isArray(products)) {
    throw new Error('O arquivo precisa ser uma lista JSON de produtos.');
  }

  const uploadsDir = process.env.UPLOADS_DIR || '/app/uploads';
  const client = await db.connect();
  let updated = 0;
  let created = 0;

  try {
    await client.query('BEGIN');
    for (const product of products) {
      const name = repairText(product.name).trim();
      const category = canonicalCategory(product.category);
      const price = Number(product.price);
      if (!name || !category || !Number.isFinite(price) || price < 0) {
        throw new Error(`Produto inválido: ${name || '(sem nome)'}`);
      }

      const imageUrl = String(product.image_url || '');
      if (imageUrl.startsWith('/uploads/')) {
        const fileName = imageUrl.slice('/uploads/'.length);
        if (!fileName || fileName.includes('..') || !fs.existsSync(`${uploadsDir}/${fileName}`)) {
          console.warn(`Imagem ausente em data/uploads: ${imageUrl}`);
        }
      }

      const values = [
        name,
        repairText(product.description),
        price,
        category,
        imageUrl,
        product.available !== false,
      ];

      const byName = await client.query(
        `UPDATE products
         SET description = $2, price = $3, category = $4, image_url = $5, available = $6
         WHERE lower(name) = lower($1)`,
        values,
      );

      if (byName.rowCount > 0) {
        updated += byName.rowCount;
        continue;
      }

      await client.query(
        `INSERT INTO products (name, description, price, category, image_url, available)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        values,
      );
      created += 1;
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return { updated, created };
}
