exports.handler = async (event, context) => {
  // Extract UPC from query parameters
  const upc = event.queryStringParameters ? event.queryStringParameters.upc : null;

  if (!upc) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'UPC parameter missing' }),
    };
  }

  // Sanitize UPC string
  const cleanUpc = String(upc).replace(/[^0-9]/g, '');

  try {
    // Open Food Facts API requires a custom User-Agent header
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cleanUpc}.json`, {
      headers: {
        'User-Agent': 'UnethicalPracticeChecker/1.0 (https://www.coin-operated.com/upc/)'
      }
    });

    if (response.ok) {
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
          body: JSON.stringify({
            upc: cleanUpc,
            title: product.product_name || product.product_name_en || `Scanned Product (${cleanUpc})`,
            brand: product.brands || 'Unknown Brand',
            image: product.image_front_url || product.image_url || '',
            price: 'N/A',
            flag: 'Warning'
          }),
        };
      }
    }

    // Fallback if item is not found in Open Food Facts database
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        upc: cleanUpc,
        title: `Scanned Item (${cleanUpc})`,
        brand: 'Item not in database',
        image: '',
        price: 'N/A',
        flag: 'Clear'
      }),
    };

  } catch (error) {
    console.error('Backend lookup error:', error);

    // Graceful fallback response on API network errors
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        upc: cleanUpc,
        title: `Scanned Item (${cleanUpc})`,
        brand: 'Lookup Service Unavailable',
        image: '',
        price: 'N/A',
        flag: 'Warning'
      }),
    };
  }
};