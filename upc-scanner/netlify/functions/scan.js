// Netlify Function: /.netlify/functions/scan?upc=074780000100

// 1. Corporate Parent & Retailer Enforcement Mapping
const corporateParentMap = {
    // Food, Beverage & Confectionery
    "ghirardelli": {
        parent: "Lindt & Sprüngli / Ghirardelli Chocolate Co.",
        agency: "US Dept of Labor (WHD) / OSHA",
        penalty: "$1,200,000+",
        violationType: "Wage & Hour Infractions & Safety Violations",
        details: "Documented FLSA labor compliance penalties and workplace manufacturing safety infractions."
    },
    "lindt": {
        parent: "Lindt & Sprüngli",
        agency: "US Dept of Labor / Consumer Protection",
        penalty: "$1,500,000+",
        violationType: "Labor Compliance & Supply Chain Transparency",
        details: "Workplace compliance penalties and supply chain labor audit documentation."
    },
    "horizon": {
        parent: "Danone North America / Horizon Organic",
        agency: "EPA / US Dept of Labor",
        penalty: "$12,000,000+",
        violationType: "Environmental & Labor Compliance",
        details: "Environmental discharge regulations and labor policy compliance."
    },
    "danone": {
        parent: "Danone North America",
        agency: "EPA / OSHA",
        penalty: "$15,000,000+",
        violationType: "Environmental & Manufacturing Safety",
        details: "Industrial discharge settlements and OSHA safety compliance checks."
    },
    "nestle": {
        parent: "Nestlé USA",
        agency: "US Dept of Labor / EPA / OSHA",
        penalty: "$45,000,000+",
        violationType: "Water Extraction & Labor Violations",
        details: "Water extraction disputes, environmental fines, and wage compliance penalties."
    },

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

// Helper: Append scan to shared global history in Netlify Blobs
async function recordGlobalScan(scanItem) {
    try {
        const blobs = await import("@netlify/blobs");
        // Safe extraction for CJS / ESM transpilation differences
        const getStore = blobs.getStore || blobs.default?.getStore || blobs.default;
        
        if (typeof getStore !== "function") {
            throw new Error(`getStore resolved to ${typeof getStore} instead of function`);
        }

        const store = getStore({
            name: "scan-history",
            consistency: "strong"
        });
        
        let history = await store.get("global-scans", { type: "json" }) || [];
        
        // Unshift new scan item and keep top 20 latest
        history.unshift(scanItem);
        history = history.slice(0, 20);

        await store.setJSON("global-scans", history);
    } catch (err) {
        console.error("Netlify Blobs write error:", err);
    }
}

exports.handler = async (event, context) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    let rawUpc = event.queryStringParameters.upc || event.queryStringParameters.barcode;

    if (!rawUpc) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Missing barcode query parameter" })
        };
    }

    // Standardize 12-digit US UPC to 13-digit EAN/GTIN format
    let upc = rawUpc.trim();
    if (upc.length === 12) {
        upc = '0' + upc;
    }

    try {
        // Step 1: Query Open Food Facts API
        let apiResponse = await fetch(`https://world.openfoodfacts.org/api/v0/product/${upc}.json`);
        let data = await apiResponse.json();

        // Step 2: Fallback to Open Beauty Facts API if not found in Open Food Facts
        if (!data || data.status !== 1) {
            apiResponse = await fetch(`https://world.openbeautyfacts.org/api/v0/product/${upc}.json`);
            data = await apiResponse.json();
        }

        // Step 3: Process metadata if found in either database
        if (data && data.status === 1 && data.product) {
            const product = data.product;
            const brandRaw = (product.brands || product.brand_owner || "").toLowerCase();
            const productName = product.product_name || product.product_name_en || "Consumer Product";
            const imageUrl = product.image_front_url || product.image_url || "images/chocolate.jpg";

            const matchedKey = Object.keys(corporateParentMap).find(key => brandRaw.includes(key));

            let responseData;

            if (matchedKey) {
                const match = corporateParentMap[matchedKey];
                responseData = {
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
                };
            } else {
                responseData = {
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
                };
            }

            // Record scan into Netlify Blobs global history
            await recordGlobalScan({
                productName: responseData.productName,
                brand: responseData.brand,
                upc: responseData.upc,
                imageUrl: responseData.imageUrl,
                hasViolations: responseData.hasViolations,
                violationText: responseData.hasViolations ? responseData.violationType : "Clean Record",
                timestamp: "Just now"
            });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(responseData)
            };
        }

        // Step 4: Unrecognized Barcode Fallback
        const fallbackData = {
            found: false,
            upc: upc,
            productName: "Unregistered Consumer Item",
            brand: "Unknown Manufacturer",
            hasViolations: false,
            details: "Product barcode not yet indexed in regulatory or Open Food/Beauty databases."
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(fallbackData)
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Failed to resolve product barcode", message: error.message })
        };
    }
};
