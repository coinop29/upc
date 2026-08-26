// Netlify Function: /.netlify/functions/get-scans

exports.handler = async (event, context) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
    };

    try {
        // Dynamically import ESM module to prevent CommonJS getStore errors
        const { getStore } = await import("@netlify/blobs");

        const store = getStore({
            name: "scan-history",
            consistency: "strong"
        });

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
