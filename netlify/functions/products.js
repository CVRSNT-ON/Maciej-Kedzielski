exports.handler = async function(event) {
  const h = {'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  if(event.httpMethod==='OPTIONS') return {statusCode:200,headers:h,body:''};

  const TOKEN = process.env.PRINTIFY_TOKEN;
  if(!TOKEN) return {statusCode:500,headers:h,body:JSON.stringify({error:'PRINTIFY_TOKEN not set'})};

  try {
    // Auto-detect shop ID
    const shopsRes = await fetch('https://api.printify.com/v1/shops.json',
      {headers:{'Authorization':'Bearer '+TOKEN}});
    const shops = await shopsRes.json();
    if(!shops.length) return {statusCode:404,headers:h,body:JSON.stringify({error:'No shops found'})};
    const shopId = shops[0].id;

    const res = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/products.json?limit=20`,
      {headers:{'Authorization':'Bearer '+TOKEN}});
    if(!res.ok) return {statusCode:res.status,headers:h,body:JSON.stringify({error:'Printify error '+res.status})};

    const data = await res.json();
    const products = (data.data||[]).map(p=>({
      id: p.id,
      title: p.title,
      description: p.description||'',
      images: (p.images||[]).slice(0,3).map(i=>i.src),
      variants: (p.variants||[]).filter(v=>v.is_enabled).map(v=>({
        id: v.id, title: v.title, price: v.price
      }))
    }));

    return {statusCode:200,headers:h,body:JSON.stringify(products)};
  } catch(e) {
    return {statusCode:500,headers:h,body:JSON.stringify({error:e.message})};
  }
};
