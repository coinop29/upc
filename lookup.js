exports.handler = async (event, context) => {
  // Grab the query parameter from the serverless event object
  const upc = event.queryStringParameters.upc;
  
  if (!upc) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'UPC code parameter required' }),
    };
  }

  try {
    // 1. Fetch live product details from the Open Food Facts API
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${upc}.json`);
    const data = await response.json();

    // 2. Check if product exists in database
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
          image: product.image_front_url || product.image_url || '',
          price: 'N/A' // Free database does not store live store prices
        }),
      };
    } else {
      // 3. Fallback when product isn't registered in the database
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        },
        body: JSON.stringify({
          upc: upc,
          title: `Scanned Item (${upc})`,
          brand: 'Item not found in database',
          image: '',
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