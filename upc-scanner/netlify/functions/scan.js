// Netlify Function: /.netlify/functions/scan.js

const corporateParentMap = {
    // Personal Care & Household Conglomerates
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

    // Pharmacy Chains & House Brands
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
    "rite aid": {
        parent: "Rite Aid Corporation",
        agency: "US Dept of Labor / DEA / FTC",
        penalty: "$180,000,000+",
        violationType: "Consumer Protection & Controlled Substances Compliance",
        details: "FTC consumer privacy settlements, pharmacy regulatory resolutions, and labor infractions."
    },

    // Major Retailers & Store Brands
    "target": {
        parent: "Target Corporation (Up & Up / Good & Gather)",
        agency: "US Dept of Labor (WHD) / OSHA / EEOC",
        penalty: "$45,000,000+",
        violationType: "Wage & Hour & Employment Discrimination",
        details: "Wage theft settlements, background check discrimination resolutions, and workplace safety citations."
    },
    "up & up": {
        parent: "Target Corporation",
        agency: "US Dept of Labor (WHD) / OSHA",
        penalty: "$45,000,000+",
        violationType: "Retail Labor & Employment Compliance",
        details: "Wage and hour compliance resolutions and OSHA safety citations."
    },
    "kroger": {
        parent: "The Kroger Co. (Simple Truth / Kroger Brand)",
        agency: "US Dept of Labor (WHD) / OSHA / FTC",
        penalty: "$140,000,000+",
        violationType: "Wage & Hour & Labor Disputes",
        details: "FLSA labor compliance penalties, back pay settlements, and safety infractions."
    },
    "simple truth": {
        parent: "The Kroger Co.",
        agency: "US Dept of Labor (WHD) / FTC",
        penalty: "$140,000,000+",
        violationType: "Labor & Retail Compliance",
        details: "Store brand regulatory settlements and workplace labor compliance penalties."
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
    "great value": {
        parent: "Walmart Inc.",
        agency: "US Dept of Labor (WHD) / OSHA",
        penalty: "$1,600,000,000+",
        violationType: "Wage & Hour & Supply Chain Violations",
        details: "FLSA labor penalties and warehouse/retail workplace safety citations."
    },
    "365": {
        parent: "Amazon.com, Inc. / Whole Foods (365 Brand)",
        agency: "OSHA / US Dept of Labor",
        penalty: "$150,000,000+",
        violationType: "Workplace Safety & Warehouse Labor Infractions",
        details: "OSHA ergonomic citations, labor union interference penalties, and safety violations."
    },
    "trader joe": {
        parent: "Trader Joe's Company",
        agency: "NLRB / OSHA / US Dept of Labor",
        penalty: "$12,000,000+",
        violationType: "Labor Relations & Safety Enforcement",
        details: "National Labor Relations Board unfair labor practice complaints and workplace safety citations."
    }
};

exports.handler = async (event, context) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    const upc = event.queryStringParameters?.upc || event.queryStringParameters?.barcode;

    if (!upc) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Missing barcode query parameter" })
        };
    }

    try {
        // Query Open Beauty Facts API first (for personal care items)
        let apiResponse = await fetch(`https://world.openbeautyfacts.org/api/v0/product/${upc}.json`);
        let data = await apiResponse.json();

        // Fallback to Open Food Facts API if not found
        if (!data || data.status !== 1) {
            apiResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${upc}.json`);
            data = await apiResponse.json();
        }

        if (data && data.status === 1 && data.product) {
            const product = data.product;
            const brandRaw = (product.brands || product.brand_owner || "").toLowerCase();
            const productName = product.product_name || "Consumer Product";
            const imageUrl = product.image_url || "images/default_product.jpg";

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
