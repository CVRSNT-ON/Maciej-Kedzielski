const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event) {
  const h = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  if(event.httpMethod==='OPTIONS') return {statusCode:200,headers:h,body:''};
  if(event.httpMethod!=='POST') return {statusCode:405,headers:h,body:''};

  try {
    const {items, customerEmail} = JSON.parse(event.body);
    if(!items||!items.length) return {statusCode:400,headers:h,body:JSON.stringify({error:'Empty cart'})};

    const amount = items.reduce((s,i)=>s+(i.price*i.quantity),0);

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      receipt_email: customerEmail,
      metadata: {items: JSON.stringify(items.map(i=>({pid:i.productId,vid:i.variantId,qty:i.quantity})))}
    });

    return {statusCode:200,headers:h,body:JSON.stringify({clientSecret:intent.client_secret})};
  } catch(e) {
    return {statusCode:500,headers:h,body:JSON.stringify({error:e.message})};
  }
};
