const base = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // resposta sem JSON
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  products: {
    list: () => request('/api/products'),
    listAvailable: () => request('/api/products?available=true'),
    create: (body) => request('/api/products', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),
  },
  orders: {
    create: (body) => request('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
  },
};
