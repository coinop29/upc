exports.handler = async (event, context) => {
  const upc = event.queryStringParameters ? event.queryStringParameters.upc : null;
  
  if (!upc) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'UPC code parameter required' }),
    };
  }

  // Clean UPC input (remove whitespace/hyphens)
  const cleanUpc = upc.replace(/[^0-9]/g, '');

  try {
    // 1. Primary Lookup: UPC Item DB (General Household, Personal Care, Goods)
    const API_KEY = process.env.2nf0zt5m2enohtjygibfnx07wrpxnu; // Set in Netlify Environment Variables
const response = await fetch(`https://api.barcodelookup.com/v3/products?barcode=${cleanUpc}&formatted=y&key=${API_KEY}`);
const data = await response.json();

if (data.products && data.products.length > 0) {
  const item = data.products[0];
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      upc: cleanUpc,
      title: item.title,
      brand: item.brand,
      category: item.category,
      image: item.images ? item.images[0] : '',
      flag: 'Warning'
    })
  };
}
    // 2. Fallback Lookup: Open Food Facts (In case it is a food/beverage product)
    const offResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cleanUpc}.json`);
    const offData = await offResponse.json();

    if (offData.status === 1 && offData.product) {
      const product = offData.product;
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        },
        body: JSON.stringify({
          upc: cleanUpc,
          title: product.product_name || product.product_name_en || 'Scanned Product',
          brand: product.brands || 'Unknown Brand',
          category: product.categories || 'Food & Grocery',
          image: product.image_front_url || product.image_url || '',
          price: 'N/A',
          flag: 'Warning'
        }),
      };
    }

    // 3. Fallback when product is not found in either database
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      },
      body: JSON.stringify({
        upc: cleanUpc,
        title: `Scanned Household Item (${cleanUpc})`,
        brand: 'Item not found in global database',
        category: 'Uncategorized',
        image: '',
        price: 'N/A',
        flag: 'Clear'
      }),
    };

  } catch (error) {
    console.error('Lookup API Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch product data' }),
    };
  }
};