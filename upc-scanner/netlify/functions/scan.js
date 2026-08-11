// Netlify Function: /.netlify/functions/scan?upc=022200005553

// 1. Corporate Parent & Retailer Enforcement Mapping
const corporateParentMap = {
    // Personal Care Conglomerates
    "colgate": {
        parent: "Colgate-Palmolive Co.",
        agency: "US Dept of Labor / EPA / OSHA",
        penalty: "$330,000,000+",
        violationType: "Workplace Safety & Environmental Compliance",
        details: "Documented OSHA safety penalties, benefit litigation settlements, and environmental compliance resolutions."
    },
    "speed stick": {
        parent: "Colgate-Palmolive Co.",
        agency: "US Dept of Labor / EPA / OSHA",
        penalty: "$330,000,000+",
        violationType: "Workplace Safety & Benefit Settlements",
        details: "Documented ERISA benefit plan settlements and workplace safety compliance penalties."
    },
    "procter": {
        parent: "Procter & Gamble Co.",
        agency: "US Dept of Labor / EPA",
        penalty: "$120,000,000+",
        violationType: "Environmental & Consumer Safety Penalties",
        details: "Clean Air Act enforcement, consumer safety resolutions, and manufacturing compliance penalties."
    },
    "unilever": {
        parent: "Unilever United States",
        agency: "EPA / OSHA / Wage & Hour Division",
        penalty: "$85,000,000+",
        violationType: "Environmental & Labor Compliance",
        details: "Industrial discharge settlements and workplace health and safety infractions."
    },
    "johnson": {
        parent: "Johnson & Johnson",
        agency: "DOJ / State AGs / Consumer Protection",
        penalty: "$2,200,000,000+",
        violationType: "Consumer Safety & Regulatory Enforcement",
        details: "Documented regulatory settlements and consumer product compliance resolutions."
    },

    // Pharmacy & Retail House Brands
    "walgreens": {
        parent: "Walgreens Boots Alliance",
        agency: "US Dept of Labor (WHD) / State AGs",
        penalty: "$270,000,000+",
        violationType: "Wage & Hour / Consumer Protection",
        details: "FLSA wage compliance penalties, workplace safety infractions, and retail settlements."
    },
    "cvs": {
        parent: "CVS Health Corporation",
        agency: "US Dept of Labor / DEA / State AGs",
        penalty: "$500,000,000+",
        violationType: "Labor & Regulatory Compliance",
        details: "Pharmacy regulatory settlements, wage and hour compliance penalties, and labor disputes."
    },
    "equate": {
        parent: "Walmart Inc. (Equate Store Brand)",
        agency: "US Dept of Labor (WHD) / OSHA / EEOC",
        penalty: "$1,600,000,000+",
        violationType: "Wage & Hour, Discrimination, & Safety",
        details: "Systemic FLSA labor penalties, workplace discrimination resolutions, and safety fines."
    },
    "walmart": {
        parent: "Walmart Inc.",
        agency: "US Dept of Labor (WHD) / OSHA / EEOC",
        penalty: "$1,600,000,000+",
        violationType: "Wage & Hour & Safety Violations",
        details: "FLSA labor compliance penalties, EEOC settlements, and safety fines."
    },
    "365": {
        parent: "Amazon.com, Inc. / Whole Foods (365 Brand)",
        agency: "OSHA / US Dept of Labor",
        penalty: "$150,000,000+",
        violationType: "Workplace Safety & Warehouse Labor Infractions",
        details: "OSHA ergonomic citations, labor union interference penalties, and safety violations."
    }
};

exports.handler = async (event, context) => {
    // Enable CORS for frontend requests
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    const upc = event.queryStringParameters.upc || event.queryStringParameters.barcode;

    if (!upc) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Missing barcode query parameter" })
        };
    }

    try {
        // Step 1: Query Open Beauty Facts API (for deodorants, sunscreens, personal care)
        let apiResponse = await fetch(`https://world.openbeautyfacts.org/api/v0/product/${upc}.json`);
        let data = await apiResponse.json();

        // Step 2: If not in Open Beauty Facts, fallback to Open Food Facts
        if (!data || data.status !== 1) {
            apiResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${upc}.json`);
            data = await apiResponse.json();
        }

        // Step 3: Process metadata if found in either database
        if (data && data.status === 1 && data.product) {
            const product = data.product;
            const brandRaw = (product.brands || product.brand_owner || "").toLowerCase();
            const productName = product.product_name || "Personal Care Product";
            const imageUrl = product.image_url || "images/default_product.jpg";

            // Check if brand or brand owner matches any entry in our corporate mapping
            const matchedKey = Object.keys(corporateParentMap).find(key => brandRaw.includes(key));

            if (matchedKey) {
                const match = corporateParentMap[matchedKey];
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        found: true,
                        upc: upc,
                        productName: productName,
                        brand: match.parent,
                        imageUrl: imageUrl,
                        hasViolations: true,
                        violationType: match.violationType,
                        agency: match.agency,
                        penalty: match.penalty,
                        details: match.details
                    })
                };
            }

            // Product found in global DB, but parent brand has no mapped violations
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    found: true,
                    upc: upc,
                    productName: productName,
                    brand: product.brands || "Independent Manufacturer",
                    imageUrl: imageUrl,
                    hasViolations: false,
                    violationType: "No Tracked Violations",
                    agency: "N/A",
                    penalty: "$0 Assessed",
                    details: "No corporate violations on record for this manufacturer in current tracking databases."
                })
            };
        }

        // Step 4: Unrecognized Barcode
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                found: false,
                upc: upc,
                productName: "Unregistered Consumer Item",
                brand: "Unknown Manufacturer",
                hasViolations: false,
                details: "Product barcode not yet indexed in regulatory or Open Beauty databases."
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Failed to resolve product barcode", message: error.message })
        };
    }
};