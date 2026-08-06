exports.handler = async (event, context) => {
  const upc = event.queryStringParameters.upc;
  
  if (!upc) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'UPC code parameter required' }),
    };
  }

  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${upc}.json`);
    const data = await response.json();

    if (data.status === 1 && data.product) {
      const product = data.product;
      
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        },
        body: JSON.stringify({
          upc: upc,
          title: product.product_name || product.product_name_en || 'Scanned Product',
          brand: product.brands || 'Unknown Brand',
          image: product.image_front_url || product.image_url || null,
          price: 'N/A'
        }),
      };
    } else {
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        },
        body: JSON.stringify({
          upc: upc,
          title: `Scanned Item (${upc})`,
          brand: 'Item not in database',
          image: null,
          price: 'N/A'
        }),
      };
    }

  } catch (error) {
    console.error('Lookup API Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch external product data' }),
    };
  }
};
