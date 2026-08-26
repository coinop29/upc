// Netlify Function: /.netlify/functions/get-scans
const blobs = require("@netlify/blobs");
const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
    };

    try {
        const store = getStore("scan-history");
        const history = await store.get("global-scans", { type: "json" }) || [];

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(history)
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Failed to fetch scan feed", message: error.message })
        };
    }
};
