// netlify/functions/place-order.js
// Called after Stripe payment succeeds — places the order on Printify

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const TOKEN = process.env.PRINTIFY_TOKEN;

  try {
    // Auto-detect shop ID
    const shopsRes = await fetch('https://api.printify.com/v1/shops.json',
      { headers: { 'Authorization': `Bearer ${TOKEN}` } });
    const shops = await shopsRes.json();
    const SHOP_ID = shops[0].id;

    const { paymentIntentId, customer, items } = JSON.parse(event.body);

    // Verify payment succeeded with Stripe
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== 'succeeded') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Payment not confirmed' }) };
    }

    // Build Printify order
    const lineItems = items.map(item => ({
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.quantity
    }));

    const printifyOrder = {
      label: `Order-${Date.now()}`,
      line_items: lineItems,
      shipping_method: 1, // standard
      address_to: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.email,
        phone: customer.phone || '',
        country: customer.country,
        region: customer.region || '',
        address1: customer.address1,
        address2: customer.address2 || '',
        city: customer.city,
        zip: customer.zip
      },
      send_shipping_notification: true
    };

    const res = await fetch(
      `https://api.printify.com/v1/shops/${SHOP_ID}/orders.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(printifyOrder)
      }
    );

    const result = await res.json();

    if (!res.ok) {
      console.error('Printify order error:', result);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Printify order failed', detail: result }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ orderId: result.id, success: true })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
