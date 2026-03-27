// netlify/functions/products.js
// Fetches products from Printify and returns them to the frontend

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const TOKEN = process.env.PRINTIFY_TOKEN;

  if (!TOKEN) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing PRINTIFY_TOKEN env var' })
    };
  }

  try {
    // Auto-detect shop ID
    const shopsRes = await fetch('https://api.printify.com/v1/shops.json',
      { headers: { 'Authorization': `Bearer ${TOKEN}` } });
    const shops = await shopsRes.json();
    if (!shops.length) return { statusCode: 404, headers, body: JSON.stringify({ error: 'No shops found' }) };
    const SHOP_ID = shops[0].id;

    const res = await fetch(
      `https://api.printify.com/v1/shops/${SHOP_ID}/products.json?limit=20`,
      { headers: { 'Authorization': `Bearer ${TOKEN}` } }
    );

    if (!res.ok) {
      const txt = await res.text();
      return { statusCode: res.status, headers, body: JSON.stringify({ error: txt }) };
    }

    const data = await res.json();

    // Simplify product data for frontend
    const products = (data.data || []).map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      images: p.images ? p.images.slice(0, 3).map(i => i.src) : [],
      variants: (p.variants || []).filter(v => v.is_enabled).map(v => ({
        id: v.id,
        title: v.title,
        price: v.price, // in cents, USD from Printify
        sku: v.sku,
        options: v.options
      })),
      options: p.options || []
    }));

    return { statusCode: 200, headers, body: JSON.stringify(products) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
