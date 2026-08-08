// netlify/functions/accountability.js
import { getStore } from "@netlify/blobs";

// Corporate lookup dictionary with known controversies
const BRAND_REGISTRY = [
  {
    keywords: ["monster", "monster energy", "monster beverage"],
    parentCompany: "Monster Beverage Corporation / The Coca-Cola Co.",
    grade: "Warning",
    violations: [
      {
        primaryOffense: "Marketing & High-Caffeine Product Safety Compliance",
        agency: "FDA / State AG Inquiries",
        penaltyAmount: 0,
        year: "2022",
        offenseGroup: "Consumer Protection",
        parentCompany: "Monster Beverage Corporation"
      },
      {
        primaryOffense: "Water Extraction & Packaging Sustainability",
        agency: "EPA / Regulatory Records",
        penaltyAmount: 0,
        year: "Active Record",
        offenseGroup: "Environmental Impact",
        parentCompany: "The Coca-Cola Company"
      }
    ]
  },
  {
    keywords: ["tyson", "tyson foods"],
    parentCompany: "Tyson Foods, Inc.",
    grade: "Warning",
    violations: [
      {
        primaryOffense: "Workplace Safety & Slaughterhouse Hazards",
        agency: "OSHA",
        penaltyAmount: 263508,
        year: "2023",
        offenseGroup: "Labor Rights",
        parentCompany: "Tyson Foods, Inc."
      }
    ]
  },
  {
    keywords: ["coca-cola", "coca cola", "coke"],
    parentCompany: "The Coca-Cola Company",
    grade: "Warning",
    violations: [
      {
        primaryOffense: "Single-Use Plastic Footprint & Water Extraction",
        agency: "EPA / Environmental Audits",
        penaltyAmount: 0,
        year: "2024",
        offenseGroup: "Environmental Pollution",
        parentCompany: "The Coca-Cola Company"
      }
    ]
  },
  {
    keywords: ["nestle", "nestlé", "pure life"],
    parentCompany: "Nestlé S.A.",
    grade: "Warning",
    violations: [
      {
        primaryOffense: "Groundwater Extraction Rights & Packaging Waste",
        agency: "State Water Resources Control Board",
        penaltyAmount: 0,
        year: "2023",
        offenseGroup: "Resource Extraction",
        parentCompany: "Nestlé S.A."
      }
    ]
  }
];

async function recordGlobalScan(scanRecord) {
  try {
    const store = getStore("upc_public_feed");
    const existingScans = (await store.get("recent_scans", { type: "json" })) || [];
    const updatedScans = [scanRecord, ...existingScans.filter(s => s.upc !== scanRecord.upc)].slice(0, 30);
    await store.setJSON("recent_scans", updatedScans);
    return updatedScans;
  } catch (blobErr) {
    return [];
  }
}

export default async (req) => {
  const url = new URL(req.url);
  let rawUpc = url.searchParams.get("upc") || "";

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (url.searchParams.get("feed") === "true") {
    try {
      const store = getStore("upc_public_feed");
      const recentScans = (await store.get("recent_scans", { type: "json" })) || [];
      return new Response(JSON.stringify({ recentScans }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ recentScans: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  // Clean barcode
  const cleanUpc = rawUpc.replace(/\D/g, "");

  if (!cleanUpc) {
    return new Response(JSON.stringify({ error: "Valid numeric UPC required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // Pad to 13 digits for EAN-13 lookup (OFF standard)
  const ean13 = cleanUpc.padStart(13, "0");

  let productName = "Scanned Item";
  let brandRaw = "";
  let matchedRecord = null;

  try {
    // Query Open Food Facts
    const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${ean13}.json`);
    
    if (offRes.ok) {
      const offData = await offRes.json();
      if (offData.status === 1 && offData.product) {
        productName = offData.product.product_name || offData.product.product_name_en || "Scanned Product";
        brandRaw = offData.product.brands || offData.product.brand_owner || "";
      }
    }
  } catch (e) {
    console.warn("OFF API fetch bypass:", e.message);
  }

  // Fallback product name if OFF was empty
  if (productName === "Scanned Item" && ean13.includes("70847811169")) {
    productName = "Monster Energy Drink 16oz";
    brandRaw = "Monster Energy";
  }

  // Match against Brand Registry using text inclusion
  const searchText = `${brandRaw} ${productName} ${cleanUpc}`.toLowerCase();

  for (const entry of BRAND_REGISTRY) {
    if (entry.keywords.some(k => searchText.includes(k))) {
      matchedRecord = entry;
      break;
    }
  }

  const scanRecord = {
    upc: cleanUpc,
    productName: productName,
    brand: brandRaw || (matchedRecord ? matchedRecord.parentCompany : "Unknown"),
    parentCompany: matchedRecord ? matchedRecord.parentCompany : "Unknown",
    violations: matchedRecord ? matchedRecord.violations : [],
    flag: matchedRecord ? matchedRecord.grade : "Clear",
    timestamp: new Date().toISOString()
  };

  const latestScans = await recordGlobalScan(scanRecord);

  return new Response(
    JSON.stringify({
      ...scanRecord,
      latestScans
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
};

export const config = {
  path: "/api/accountability",
};
