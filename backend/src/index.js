import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { initDb, pool } from './db.js';

const CATEGORIES = ['Pastéis Salgados', 'Pastéis Doces', 'Bebidas', 'Adicionais'];
const PORT = Number(process.env.PORT || 3000);

const uploadsDir = process.env.UPLOADS_DIR
  || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');

const app = express();
app.use('/uploads', express.static(uploadsDir));
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    category: row.category,
    image_url: row.image_url,
    available: row.available,
    created_date: row.created_at,
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, service: 'pastelaria-backend' });
});

app.get('/api/products', async (req, res, next) => {
  try {
    const availableOnly = req.query.available === 'true';
    const result = await pool.query(
      `SELECT * FROM products
       WHERE ($1::boolean IS FALSE OR available = TRUE)
       ORDER BY created_at DESC`,
      [availableOnly],
    );
    res.json(result.rows.map(mapProduct));
  } catch (error) {
    next(error);
  }
});

app.post('/api/products', async (req, res, next) => {
  try {
    const payload = readProduct(req.body, true);
    if (payload.error) {
      res.status(400).json({ error: payload.error });
      return;
    }
    const result = await pool.query(
      `INSERT INTO products (name, description, price, category, image_url, available)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        payload.name,
        payload.description,
        payload.price,
        payload.category,
        payload.image_url,
        payload.available,
      ],
    );
    res.status(201).json(mapProduct(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.patch('/api/products/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      res.status(400).json({ error: 'Produto inválido' });
      return;
    }
    const current = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (current.rowCount === 0) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }
    const merged = { ...mapProduct(current.rows[0]), ...req.body, id: req.params.id };
    const payload = readProduct(merged, true);
    if (payload.error) {
      res.status(400).json({ error: payload.error });
      return;
    }
    const result = await pool.query(
      `UPDATE products
       SET name = $2, description = $3, price = $4, category = $5, image_url = $6, available = $7
       WHERE id = $1
       RETURNING *`,
      [
        req.params.id,
        payload.name,
        payload.description,
        payload.price,
        payload.category,
        payload.image_url,
        payload.available,
      ],
    );
    res.json(mapProduct(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/products/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      res.status(400).json({ error: 'Produto inválido' });
      return;
    }
    const result = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders', async (req, res, next) => {
  try {
    const { order_number, items, total, status, barcode } = req.body || {};
    if (!Number.isInteger(order_number) || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Pedido inválido' });
      return;
    }
    const amount = Number(total);
    if (!Number.isFinite(amount) || amount < 0 || typeof barcode !== 'string' || barcode.trim() === '') {
      res.status(400).json({ error: 'Pedido inválido' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO orders (order_number, items, total, status, barcode)
       VALUES ($1, $2::jsonb, $3, $4, $5)
       RETURNING id`,
      [order_number, JSON.stringify(items), amount, status || 'pendente', barcode.trim()],
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Erro interno' });
});

function readProduct(body, required) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const category = typeof body?.category === 'string' ? body.category : '';
  const image_url = typeof body?.image_url === 'string' ? body.image_url.trim() : '';
  const price = Number(body?.price);
  const available = body?.available !== false;

  if (required && (!name || !Number.isFinite(price) || price < 0 || !CATEGORIES.includes(category))) {
    return { error: 'Preencha nome, preço e categoria válidos' };
  }

  return { name, description, price, category, image_url, available };
}

await initDb();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`pastelaria-backend ouvindo na porta ${PORT}`);
});
