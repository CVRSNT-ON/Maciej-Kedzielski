const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event) {
  const h = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  if(event.httpMethod==='OPTIONS') return {statusCode:200,headers:h,body:''};
  if(event.httpMethod!=='POST') return {statusCode:405,headers:h,body:''};

  const TOKEN = process.env.PRINTIFY_TOKEN;

  try {
    const {paymentIntentId, customer, items} = JSON.parse(event.body);

    // Verify payment
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if(intent.status!=='succeeded')
      return {statusCode:400,headers:h,body:JSON.stringify({error:'Payment not confirmed'})};

    // Auto-detect shop ID
    const shopsRes = await fetch('https://api.printify.com/v1/shops.json',
      {headers:{'Authorization':'Bearer '+TOKEN}});
    const shops = await shopsRes.json();
    const shopId = shops[0].id;

    const order = {
      label: 'Order-'+Date.now(),
      line_items: items.map(i=>({product_id:i.productId,variant_id:i.variantId,quantity:i.quantity})),
      shipping_method: 1,
      send_shipping_notification: true,
      address_to: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.email,
        phone: customer.phone||'',
        country: customer.country,
        region: customer.region||'',
        address1: customer.address1,
        address2: customer.address2||'',
        city: customer.city,
        zip: customer.zip
      }
    };

    const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders.json`,
      {method:'POST',headers:{'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json'},
       body:JSON.stringify(order)});

    const result = await res.json();
    if(!res.ok) return {statusCode:500,headers:h,body:JSON.stringify({error:'Printify order failed',detail:result})};

    return {statusCode:200,headers:h,body:JSON.stringify({success:true,orderId:result.id})};
  } catch(e) {
    return {statusCode:500,headers:h,body:JSON.stringify({error:e.message})};
  }
};
