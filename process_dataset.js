/**
 * Building Structural Safety Scorer — Dataset Processor
 * Converts buildings_dataset.csv -> data/dataset_1000.js
 *
 * Usage:
 *   node process_dataset.js
 *
 * Output:
 *   data/dataset_1000.js  — Exposes window.MUNICIPAL_1000_DATASET (array of 1000 building objects)
 *
 * The app (js/app.js) auto-loads window.MUNICIPAL_1000_DATASET on startup,
 * bypassing the 12-structure default dataset whenever this file is present.
 */

"use strict";

const fs = require("fs");
const path = require("path");

/* ──────────────────────────────────────────────────────────────
 * RFC-4180 CSV Parser
 * Handles: quoted fields, embedded commas, "" escaping, CRLF/LF
 * ────────────────────────────────────────────────────────────── */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const nch = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && nch === '"') { field += '"'; i += 2; }
      else if (ch === '"') { inQuotes = false; i++; }
      else { field += ch; i++; }
    } else {
      if (ch === '"') { inQuotes = true; i++; }
      else if (ch === ',') { row.push(field); field = ""; i++; }
      else if (ch === '\r' && nch === '\n') { row.push(field); field = ""; rows.push(row); row = []; i += 2; }
      else if (ch === '\n') { row.push(field); field = ""; rows.push(row); row = []; i++; }
      else { field += ch; i++; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/* ──────────────────────────────────────────────────────────────
 * Photo Catalog — maps occupancy+material to a facade image
 * ────────────────────────────────────────────────────────────── */
const PHOTO_CATALOG = {
  "Hospital|Brick": "images/concrete_hospital_clinic.jpg",
  "Hospital|Wood": "images/concrete_hospital_clinic.jpg",
  "Hospital|Mixed": "images/concrete_hospital_clinic.jpg",
  "Hospital|RCC": "images/hospital_annex_concrete.jpg",
  "Hospital|Steel": "images/glass_curtain_office.jpg",
  "School|Wood": "images/weathered_school_block.jpg",
  "School|Brick": "images/brick_elementary_school.jpg",
  "School|RCC": "images/aging_concrete_school.jpg",
  "School|Mixed": "images/weathered_brick_academy_hall.jpg",
  "Industrial|Wood": "images/industrial_foundry_factory.jpg",
  "Industrial|Brick": "images/cracked_brick_warehouse.jpg",
  "Industrial|Mixed": "images/cracked_brick_warehouse.jpg",
  "Industrial|Steel": "images/commercial_steel_complex.jpg",
  "Industrial|RCC": "images/industrial_foundry_factory.jpg",
  "Assembly|Wood": "images/heritage_timber_hall.jpg",
  "Assembly|Brick": "images/weathered_brick_academy_hall.jpg",
  "Assembly|Mixed": "images/glass_commercial_shopping_mall.jpg",
  "Assembly|RCC": "images/glass_commercial_shopping_mall.jpg",
  "Assembly|Steel": "images/glass_commercial_shopping_mall.jpg",
  "Commercial|Wood": "images/wooden_heritage_lodge.jpg",
  "Commercial|Brick": "images/brick_library_facade.jpg",
  "Commercial|Mixed": "images/glass_commercial_shopping_mall.jpg",
  "Commercial|RCC": "images/sunrise_commercial_plaza.jpg",
  "Commercial|Steel": "images/glass_curtain_office.jpg",
  "Residential|Wood": "images/wooden_heritage_lodge.jpg",
  "Residential|Brick": "images/urban_brick_apartments.jpg",
  "Residential|Mixed": "images/residential_apartment_complex.jpg",
  "Residential|RCC": "images/residential_apartment_complex.jpg",
  "Residential|Steel": "images/modern_steel_tower.jpg",
  "Public|Wood": "images/modern_timber_community_hall.jpg",
  "Public|Brick": "images/distressed_concrete_cityhall.jpg",
  "Public|Mixed": "images/distressed_concrete_cityhall.jpg",
  "Public|RCC": "images/distressed_concrete_facade.jpg",
  "Public|Steel": "images/modern_glass_steel_tower.jpg",
  // Material-only fallbacks
  "Wood": "images/wooden_heritage_lodge.jpg",
  "Brick": "images/cracked_brick_warehouse.jpg",
  "Mixed": "images/distressed_concrete_cityhall.jpg",
  "RCC": "images/residential_apartment_complex.jpg",
  "Steel": "images/modern_glass_steel_tower.jpg",
};

function pickPhoto(occupancy, material) {
  return PHOTO_CATALOG[`${occupancy}|${material}`]
    || PHOTO_CATALOG[material]
    || "images/distressed_concrete_facade.jpg";
}

/* ──────────────────────────────────────────────────────────────
 * Derive lastInspectionYearsAgo from Action Directives text
 * e.g. "Inspection interval (8 yrs) exceeded statutory threshold."
 * ────────────────────────────────────────────────────────────── */
function deriveLastInspection(actionDirectives, safetyScore) {
  if (actionDirectives) {
    const m = /Inspection interval \((\d+) yrs?\)/i.exec(actionDirectives);
    if (m) return parseInt(m[1], 10);
  }
  if (safetyScore >= 75) return 2;
  if (safetyScore >= 50) return 5;
  return 8;
}

/* ──────────────────────────────────────────────────────────────
 * Main
 * ────────────────────────────────────────────────────────────── */
function main() {
  const csvPath = path.join(__dirname, "data", "buildings_dataset.csv");
  const outPath = path.join(__dirname, "data", "dataset_1000.js");

  if (!fs.existsSync(csvPath)) {
    console.error("ERROR: CSV not found: " + csvPath);
    process.exit(1);
  }

  console.log("Reading: " + csvPath);
  const raw = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSV(raw);
  const header = rows[0];
  console.log("Columns: " + header.join(" | "));
  console.log("Data rows: " + (rows.length - 1));

  const H = {};
  header.forEach((col, idx) => { H[col.trim().toLowerCase()] = idx; });
  const colOf = (...candidates) => {
    for (const c of candidates) { const k = c.toLowerCase(); if (H[k] !== undefined) return H[k]; }
    return -1;
  };

  const IDX = {
    rank: colOf("rank"),
    buildingId: colOf("building id", "building_id"),
    name: colOf("name"),
    address: colOf("address"),
    age: colOf("age (years)", "age"),
    material: colOf("primary material", "material"),
    floors: colOf("floors"),
    occupancy: colOf("occupancy type", "occupancy"),
    maintenance: colOf("maintenance score", "maintenance"),
    codeCompliant: colOf("code compliant", "code_compliant", "compliant"),
    safetyScore: colOf("safety score (high precision)", "safety score", "score"),
    grade: colOf("grade"),
    riskLevel: colOf("risk level", "risk"),
    hazardFlag: colOf("hazard flag"),
    squad: colOf("recommended squad"),
    actions: colOf("action directives"),
  };

  const buildings = [];
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(c => !c.trim())) continue;
    const get = idx => (idx >= 0 && idx < r.length) ? r[idx].trim() : "";

    const buildingId = get(IDX.buildingId);
    const name = get(IDX.name);
    if (!buildingId || !name) { skipped++; continue; }

    const address = get(IDX.address);
    const ageYears = parseInt(get(IDX.age), 10) || 0;
    const primaryMat = get(IDX.material) || "RCC";
    const floors = parseInt(get(IDX.floors), 10) || 1;
    const occupancy = get(IDX.occupancy) || "Residential";
    const maintenance = parseInt(get(IDX.maintenance), 10) || 5;
    const cs = get(IDX.codeCompliant).toUpperCase();
    const codeCompliant = cs === "YES" || cs === "TRUE" || cs === "1";
    const safetyScore = parseFloat(get(IDX.safetyScore)) || 0;
    const grade = get(IDX.grade) || "F";
    const riskLevel = get(IDX.riskLevel) || "CRITICAL";
    const hazardFlag = get(IDX.hazardFlag) || "";
    const squad = get(IDX.squad) || "";
    const actions = get(IDX.actions) || "";

    buildings.push({
      buildingId,
      name,
      address,
      ageYears,
      primaryMaterial: primaryMat,
      floors,
      occupancyType: occupancy,
      maintenanceScore: maintenance,
      codeCompliant,
      lastInspectionYearsAgo: deriveLastInspection(actions, safetyScore),
      photoDataUrl: pickPhoto(occupancy, primaryMat),
      visionAnalysis: null,
      dispatchStatus: "NONE",
      dispatchDetails: null,
      _csvMeta: {
        rank: parseInt(get(IDX.rank), 10) || i,
        csvSafetyScore: safetyScore,
        csvGrade: grade,
        csvRiskLevel: riskLevel,
        csvHazardFlag: hazardFlag,
        csvSquad: squad,
        csvActions: actions,
      }
    });
  }

  if (skipped) console.warn("Skipped " + skipped + " malformed rows.");
  console.log("Parsed " + buildings.length + " buildings.");

  const timestamp = new Date().toISOString();
  const js = `/**
 * Municipal 1000-Structure Dataset
 * Auto-generated by process_dataset.js from data/buildings_dataset.csv
 * Generated: ${timestamp}
 * Structures: ${buildings.length}
 *
 * Exposes window.MUNICIPAL_1000_DATASET for js/app.js.
 * Regenerate: node process_dataset.js
 */
(function () {
  "use strict";
  window.MUNICIPAL_1000_DATASET = ${JSON.stringify(buildings, null, 2)};
  console.log("[Dataset] Loaded " + window.MUNICIPAL_1000_DATASET.length + " municipal structures.");
})();
`;

  fs.writeFileSync(outPath, js, "utf-8");
  const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log("Written: " + outPath + " (" + kb + " KB)");
  console.log("Done! The app will auto-load 1,000 structures on the next page open.");
}

main();