// netlify/functions/accountability.js

async function getParentCompany(brandName) {
  const query = `
    SELECT ?parentLabel WHERE {
      ?item rdfs:label "${brandName}"@en .
      ?item wdt:P127|wdt:P749 ?parent .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 1
  `;
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'UPC-UnethicalPracticeChecker/1.0' } });
    if (!res.ok) return brandName;
    const data = await res.json();
    return data.results?.bindings?.[0]?.parentLabel?.value || brandName;
  } catch (err) {
    return brandName;
  }
}

export default async (req) => {
  const url = new URL(req.url);
  const upc = url.searchParams.get("upc");

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (!upc) {
    return new Response(JSON.stringify({ error: "UPC parameter required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    // 1. Fetch Product Info from Open Food Facts
    const offRes = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${upc}.json?fields=product_name,brands,owner`
    );
    const offData = await offRes.json();

    if (offData.status !== 1 || !offData.product) {
      return new Response(JSON.stringify({ error: "Product not found in barcode database" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const product = offData.product;
    const productName = product.product_name || "Unknown Product";
    const rawBrand = (product.owner || product.brands || "").split(",")[0].trim();

    if (!rawBrand) {
      return new Response(JSON.stringify({ productName, brand: "Unknown", parentCompany: "Unknown", violations: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 2. Resolve Parent Entity via Wikidata
    const parentCompany = await getParentCompany(rawBrand);
    const queryTarget = parentCompany || rawBrand;

    // 3. Dynamic Query to Violation Tracker Search Endpoint
    const vtUrl = `https://violationtracker.goodjobsfirst.org/advanced-search-action?company_name=${encodeURIComponent(queryTarget)}&format=json`;
    const vtRes = await fetch(vtUrl, { headers: { "User-Agent": "Mozilla/5.0" } });

    let violations = [];

    if (vtRes.ok) {
      const vtData = await vtRes.json();
      if (vtData && Array.isArray(vtData.results)) {
        // Dynamically map real results returned for this specific company query
        violations = vtData.results.slice(0, 10).map((item) => ({
          primaryOffense: item.primary_offense || "Regulatory Violation",
          agency: item.agency || "N/A",
          penaltyAmount: item.penalty_amount ? Number(item.penalty_amount) : 0,
          year: item.penalty_year || "N/A",
          offenseGroup: item.offense_group || "General",
          parentCompany: item.parent_company || queryTarget
        }));
      }
    }

    // Return the dynamic payload
    return new Response(
      JSON.stringify({
        upc,
        productName,
        brand: rawBrand,
        parentCompany,
        violations
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );

  } catch (error) {
    return new Response(JSON.stringify({ error: "Error fetching company dynamic record" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
};

export const config = {
  path: "/api/accountability",
};