// netlify/functions/create-payment-intent.js
// Creates a Stripe PaymentIntent for the cart total in EUR

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

  try {
    const { items, customerEmail } = JSON.parse(event.body);

    if (!items || !items.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No items in cart' }) };
    }

    // Calculate total in cents (EUR)
    const totalCents = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'eur',
      receipt_email: customerEmail,
      metadata: {
        items: JSON.stringify(items.map(i => ({ variantId: i.variantId, productId: i.productId, qty: i.quantity })))
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ clientSecret: paymentIntent.client_secret })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
