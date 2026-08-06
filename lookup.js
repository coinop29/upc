exports.handler = async (event, context) => {
  const upc = event.queryStringParameters.upc;
  
  if (!upc) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'UPC parameter required' }),
    };
  }

  try {
    // 1. Fetch live product info
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${upc}.json`);
    const data = await response.json();

    let productName = `Scanned Item (${upc})`;
    let brandName = 'Unknown Brand';
    let image = null;

    if (data.status === 1 && data.product) {
      productName = data.product.product_name || data.product.product_name_en || productName;
      brandName = data.product.brands || data.product.brand_owner || brandName;
      image = data.product.image_front_url || null;
    }

    // 2. Mock Ethics / Corporate Violations Database Lookup based on Brand
    // (Replace this object with calls to your real Violation API when ready)
    let ethicsData = {
      status: 'Clean Record',
      grade: 'A',
      violations: []
    };

    // Example logic checking for ethical flags
    const brandLower = brandName.toLowerCase();
    if (brandLower.includes('nestle') || brandLower.includes('choco')) {
      ethicsData = {
        status: 'Flagged for Violations',
        grade: 'F',
        violations: [
          { type: 'Child Labor Infraction', agency: 'International Labor Org', penalty: '$450,000' },
          { type: 'Environmental Deforestation', agency: 'EPA', penalty: '$1,200,000' }
        ]
      };
    } else {
      // Default placeholder ethics data for scanned brands
      ethicsData = {
        status: 'Minor Infractions Noted',
        grade: 'C',
        violations: [
          { type: 'Labor / Overtime Dispute', agency: 'US Dept of Labor', penalty: '$85,000' }
        ]
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        upc: upc,
        title: productName,
        brand: brandName,
        image: image,
        ethics: ethicsData
      }),
    };

  } catch (error) {
    console.error('Lookup Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to complete ethics lookup' }),
    };
  }
};      // 3. Fallback when product isn't registered in the database
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
