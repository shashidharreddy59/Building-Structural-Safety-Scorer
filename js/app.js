/**
 * Building Structural Safety Scorer — Application Controller
 * Handles UI interactions, photo ingestion, Computer Vision scanning,
 * assessment orchestration, and municipal queue prioritization.
 *
 * Hardened for security (XSS prevention, CSV injection mitigation, URL sanitization)
 * and enhanced for clean modern municipal aesthetics.
 */

/* ==========================================================================
   Security Utilities & Data Sanitizers
   ========================================================================== */

/**
 * Escapes characters to prevent Cross-Site Scripting (XSS) in HTML templates
 * @param {*} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitizes spreadsheet cells to prevent CSV formula injection (DDE attacks)
 * Prepends a single quote if the cell starts with =, +, -, @, \t, or \r
 * @param {*} value
 * @returns {string}
 */
function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Validates and sanitizes image URLs against rogue schemes (e.g. javascript:)
 * @param {string} url
 * @returns {string}
 */
function sanitizeImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (/^(data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,|blob:|https?:\/\/|images\/|\/images\/)/i.test(trimmed)) {
    return trimmed;
  }
  return "";
}

/**
 * Validates image file type and size before reading
 * @param {File} file
 * @returns {{valid: boolean, message?: string}}
 */
function validateImageFile(file) {
  if (!file) return { valid: false, message: "No file was selected." };
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    return { valid: false, message: "Invalid image format. Please upload JPEG, PNG, or WEBP." };
  }
  const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, message: "Image exceeds 10MB limit. Please upload a smaller file." };
  }
  return { valid: true };
}

/* ==========================================================================
   Architectural SVG Generator & Sample Presets
   ========================================================================== */

function createFacadeSvg(type, color, floors = 4, hasCracks = false) {
  const safeColor = ["#64748b", "#d97706", "#475569", "#334155", "#0f172a"].includes(color) ? color : "#64748b";
  const safeType = escapeHtml(type);
  const floorCount = Math.max(1, Math.min(6, parseInt(floors, 10) || 4));

  const crackLines = hasCracks ? `
    <path d="M 60 50 Q 75 90 90 140 T 105 210" stroke="#ef4444" stroke-width="2.5" fill="none" stroke-dasharray="2,2"/>
    <path d="M 120 80 Q 140 120 130 180" stroke="#ef4444" stroke-width="2" fill="none"/>
    <circle cx="90" cy="140" r="4" fill="#dc2626"/>
  ` : '';

  const windows = [];
  const startY = 40;
  const rowHeight = 35;
  for (let r = 0; r < floorCount; r++) {
    for (let c = 0; c < 4; c++) {
      windows.push(`<rect x="${25 + c * 45}" y="${startY + r * rowHeight}" width="28" height="22" rx="2" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>`);
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260" width="200" height="260">
    <rect width="200" height="260" fill="#f1f5f9"/>
    <rect x="15" y="20" width="170" height="230" rx="4" fill="${safeColor}" stroke="#334155" stroke-width="2"/>
    <rect x="75" y="200" width="50" height="50" fill="#1e293b"/>
    <text x="100" y="235" font-family="sans-serif" font-size="9" fill="#94a3b8" text-anchor="middle">${safeType}</text>
    ${windows.join('')}
    ${crackLines}
  </svg>`;

  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

// 1-Click Preset Samples for Instant Testing
const SAMPLE_PRESETS = {
  cracked_brick: {
    id: "B-201",
    name: "Old Textile Mill & Warehouse Facility",
    address: "14 North Industrial Zone, Sector 4",
    material: "Brick",
    floors: 3,
    age: 68,
    maintenance: 2,
    codeCompliant: false,
    inspectionAgo: 11,
    occupancy: "Industrial",
    photo: "images/cracked_brick_warehouse.jpg",
    vision: {
      name: "Old Textile Mill & Warehouse Facility",
      buildingTypology: "Industrial Warehouse / Textile Mill",
      primaryMaterial: "Brick",
      materialDetails: {
        composition: "Load-Bearing Fired Red Clay Masonry with Lime Mortar",
        confidence: 0.94,
        visualCues: ["Visible brick bond courses", "Terracotta surface reflection", "Lime-cement mortar joints", "Moisture efflorescence"]
      },
      floors: 3,
      estimatedAgeYears: 68,
      ageDetails: {
        era: "Mid-20th Century (circa 1952 - 1968)",
        indicators: ["Deep carbonation & weathering patina", "Pre-modern window header detailing without expansion joints", "Lime leaching staining"]
      },
      detectedItems: [
        "Primary Red Brick Elevation",
        "Load-Bearing Masonry Piers",
        "Storey Slabs (3 Floor Levels)",
        "⚠️ Diagonal Shear Crack Network",
        "Roofline Parapet Boundary"
      ],
      crackSeverity: "critical",
      engine: "Computer Vision Heuristics",
      confidenceScore: 0.94,
      detectedDefects: [
        { name: "Structural Shear Crack Network", details: "Major diagonal stress fractures along load-bearing masonry piers.", deduction: 15, severity: "danger" },
        { name: "Brick Mortar Delamination", details: "Weathered binder loss and moisture ingress visible.", deduction: 8, severity: "warning" }
      ],
      aiSummary: "Visual scan identifies pre-modern industrial brick masonry mill. Active diagonal shear fractures indicate urgent collapse hazard under lateral load."
    }
  },
  modern_tower: {
    id: "B-202",
    name: "Skyline Financial Corporate Tower",
    address: "88 Financial Plaza, Central District",
    material: "Steel",
    floors: 14,
    age: 6,
    maintenance: 9,
    codeCompliant: true,
    inspectionAgo: 1,
    occupancy: "Commercial",
    photo: "images/modern_steel_tower.jpg",
    vision: {
      name: "Skyline Financial Corporate Tower",
      buildingTypology: "Commercial High-Rise Office Tower",
      primaryMaterial: "Steel",
      materialDetails: {
        composition: "Engineered Structural Steel Frame & Unitized Glazing",
        confidence: 0.96,
        visualCues: ["High metallic/glass reflectivity", "Modular curtain wall mullions", "Prefabricated column profiles"]
      },
      floors: 14,
      estimatedAgeYears: 6,
      ageDetails: {
        era: "Contemporary Modern Era (circa 2018 - 2024)",
        indicators: ["High-performance double glazing", "Sealed elastomeric silicone expansion joints", "Zero surface carbonation"]
      },
      detectedItems: [
        "Structural Glazed Curtain Envelope",
        "Steel Column Framing Matrix",
        "High-Rise Storey Levels (14 floors)",
        "Ground Floor Glazed Portal",
        "Rooftop Mechanical Penthouse"
      ],
      crackSeverity: "none",
      engine: "Computer Vision Heuristics",
      confidenceScore: 0.96,
      detectedDefects: [
        { name: "Pristine Facade Envelope", details: "Curtain wall and structural connections show zero physical degradation.", deduction: 0, severity: "info" }
      ],
      aiSummary: "Modern engineered steel-framed high-rise facade. Structural envelope, joints, and fire-proofing in pristine condition."
    }
  },
  aging_school: {
    id: "B-203",
    name: "Municipal Boys High School Campus Block",
    address: "32 Academic Drive, Education Ward",
    material: "RCC",
    floors: 4,
    age: 46,
    maintenance: 4,
    codeCompliant: true,
    inspectionAgo: 8,
    occupancy: "School",
    photo: "images/aging_concrete_school.jpg",
    vision: {
      name: "Municipal Boys High School Campus Block",
      buildingTypology: "Educational / Institutional Block",
      primaryMaterial: "RCC",
      materialDetails: {
        composition: "Cast-in-Place Reinforced Concrete (RCC) Moment Frame",
        confidence: 0.91,
        visualCues: ["Aggregate cementitious texture", "Monolithic beam-column intersections", "Formwork surface patterns"]
      },
      floors: 4,
      estimatedAgeYears: 46,
      ageDetails: {
        era: "Late 20th Century (circa 1975 - 1985)",
        indicators: ["Weathered exterior lime wash", "Hairline crazing on sunshades/chajjas", "Rebar corrosion rust streaks"]
      },
      detectedItems: [
        "Reinforced Concrete Facade Frame",
        "Classroom Fenestration Band (4 Storeys)",
        "Cantilevered Balcony Sunshades",
        "Corridor Support Columns",
        "Exterior Plaster Spalling Region"
      ],
      crackSeverity: "moderate",
      engine: "Computer Vision Heuristics",
      confidenceScore: 0.91,
      detectedDefects: [
        { name: "Exterior Plaster Spalling", details: "Carbonation and rebar corrosion staining under 2nd floor sills.", deduction: 8, severity: "warning" }
      ],
      aiSummary: "Aging reinforced concrete educational facility. Noticeable rebar oxidation staining and spalling requiring remedial plastering."
    }
  },
  heritage_hall: {
    id: "B-102",
    name: "Municipal Heritage Community Hall",
    address: "8 Old Town Square, East Zone",
    material: "Wood",
    floors: 2,
    age: 65,
    maintenance: 2,
    codeCompliant: false,
    inspectionAgo: 9,
    occupancy: "Public",
    photo: "images/heritage_timber_hall.jpg",
    vision: {
      name: "Municipal Heritage Community Hall",
      buildingTypology: "Historic Timber Municipal Hall",
      primaryMaterial: "Wood",
      materialDetails: {
        composition: "Heavy Timber Post-and-Beam with Aged Wood Cladding",
        confidence: 0.95,
        visualCues: ["Deep vertical timber grain", "Aged pitch gable framing", "Weathered cladding", "Traditional mullion windows"]
      },
      floors: 2,
      estimatedAgeYears: 65,
      detectedItems: [
        "Heavy Timber Post-and-Beam Structure",
        "Aged Exterior Wood Siding",
        "Historic Pitch Roof Truss System",
        "⚠️ Joint Deflection & Termite Wear Region",
        "Ground Level Municipal Entrance Portal"
      ],
      crackSeverity: "critical",
      engine: "Gemini Nano / CV Telemetry",
      confidenceScore: 0.95,
      detectedDefects: [
        { name: "Timber Sag & Joint Fatigue", details: "Decay and joint deflection along roof truss support columns.", deduction: 12, severity: "danger" }
      ],
      aiSummary: "Visual scan identifies 65-year historic wooden structure with acute joint fatigue requiring immediate timber retrofitting."
    }
  },
  hospital_annex: {
    id: "B-103",
    name: "Central General Hospital - Annex C",
    address: "52 Medical Avenue, Ward 6",
    material: "RCC",
    floors: 5,
    age: 42,
    maintenance: 4,
    codeCompliant: false,
    inspectionAgo: 7,
    occupancy: "Hospital",
    photo: "images/hospital_annex_concrete.jpg",
    vision: {
      name: "Central General Hospital - Annex C",
      buildingTypology: "Institutional Healthcare Facility",
      primaryMaterial: "RCC",
      materialDetails: {
        composition: "Cast-in-Place Reinforced Concrete Frame",
        confidence: 0.93,
        visualCues: ["Aggressive surface efflorescence", "Emergency bay opening", "Thermal shear cracks along lintels"]
      },
      floors: 5,
      estimatedAgeYears: 42,
      detectedItems: [
        "Reinforced Concrete Exterior Shear Wall",
        "Hospital Emergency Bay Portal",
        "Fenestration Bands (5 Floors)",
        "⚠️ Diagonal Facade Shear Cracks",
        "Cantilevered Parapet Slab"
      ],
      crackSeverity: "moderate",
      engine: "Gemini Nano / CV Telemetry",
      confidenceScore: 0.93,
      detectedDefects: [
        { name: "Facade Shear Fractures", details: "Visible diagonal shear cracking along 3rd and 4th floor columns.", deduction: 9, severity: "warning" }
      ],
      aiSummary: "Medium-high risk hospital annex with visible shear cracking and overdue statutory structural audit."
    }
  }
};

const DEFAULT_BUILDINGS = [
  new Building({
    buildingId: "B-101",
    name: "North Star Textile Mill",
    address: "14 Industrial Belt, Zone 3",
    ageYears: 72,
    primaryMaterial: "Brick",
    maintenanceScore: 2,
    codeCompliant: false,
    lastInspectionYearsAgo: 12,
    floors: 3,
    occupancyType: "Industrial",
    photoDataUrl: SAMPLE_PRESETS.cracked_brick.photo,
    visionAnalysis: SAMPLE_PRESETS.cracked_brick.vision
  }),
  new Building({
    buildingId: "B-102",
    name: "Municipal Heritage Community Hall",
    address: "8 Old Town Square, East Zone",
    ageYears: 65,
    primaryMaterial: "Wood",
    maintenanceScore: 2,
    codeCompliant: false,
    lastInspectionYearsAgo: 9,
    floors: 2,
    occupancyType: "Public",
    photoDataUrl: "images/heritage_timber_hall.jpg",
    visionAnalysis: SAMPLE_PRESETS.heritage_hall.vision
  }),
  new Building({
    buildingId: "B-103",
    name: "Central General Hospital - Annex C",
    address: "52 Medical Avenue, Ward 6",
    ageYears: 42,
    primaryMaterial: "RCC",
    maintenanceScore: 4,
    codeCompliant: false,
    lastInspectionYearsAgo: 7,
    floors: 5,
    occupancyType: "Hospital",
    photoDataUrl: "images/hospital_annex_concrete.jpg",
    visionAnalysis: SAMPLE_PRESETS.hospital_annex.vision
  }),
  new Building({
    buildingId: "B-104",
    name: "Sunrise Plaza Commercial Center",
    address: "108 Ring Road, South Zone",
    ageYears: 24,
    primaryMaterial: "Steel",
    maintenanceScore: 7,
    codeCompliant: true,
    lastInspectionYearsAgo: 3,
    floors: 8,
    occupancyType: "Commercial",
    photoDataUrl: "images/sunrise_commercial_plaza.jpg",
    visionAnalysis: {
      name: "Sunrise Plaza Commercial Center",
      buildingTypology: "Commercial Office / Retail Complex",
      primaryMaterial: "Steel",
      floors: 8,
      estimatedAgeYears: 24,
      detectedItems: ["Glazed Curtain Wall", "Structural Steel Frame", "Street Level Storefronts"],
      crackSeverity: "none",
      engine: "Gemini Nano / CV Telemetry",
      confidenceScore: 0.96,
      aiSummary: "Modern engineered structural steel commercial building with curtain glass facade in sound condition."
    }
  }),
  new Building({
    buildingId: "B-105",
    name: "Azure Bay Luxury Apartments",
    address: "4 Seaside Promenade, West Zone",
    ageYears: 5,
    primaryMaterial: "RCC",
    maintenanceScore: 9,
    codeCompliant: true,
    lastInspectionYearsAgo: 1,
    floors: 14,
    occupancyType: "Residential",
    photoDataUrl: "images/azure_bay_apartments.jpg",
    visionAnalysis: {
      name: "Azure Bay Luxury Apartments",
      buildingTypology: "Coastal Residential High-Rise",
      primaryMaterial: "RCC",
      floors: 14,
      estimatedAgeYears: 5,
      detectedItems: ["Cantilevered Curved Balconies", "Marine-Grade Concrete Frame", "Seaside Entrance"],
      crackSeverity: "none",
      engine: "Gemini Nano / CV Telemetry",
      confidenceScore: 0.97,
      aiSummary: "Contemporary high-rise coastal residential tower with post-tensioned slabs in pristine condition."
    }
  })
];

/* ==========================================================================
   Application State & Persistence
   ========================================================================== */

const assessmentEngine = new SafetyAssessmentEngine();
const visionEngine = new BuildingVisionEngine();

let buildingStore = [];
let activeFilter = "All";
let currentPhotoBase64 = null;
let currentVisionResult = null;
let editingBuildingId = null;
let webcamStream = null;

const STORAGE_KEY = "municipal_structural_safety_store_v3";

const $ = id => document.getElementById(id);

function saveStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildingStore));
  } catch (err) {
    console.error("Storage error:", err);
    if (err && err.name === "QuotaExceededError") {
      showToast("Storage quota reached. Storing data without image payloads.");
      try {
        const lightweight = buildingStore.map(b => ({
          ...b,
          photoDataUrl: b.photoDataUrl && b.photoDataUrl.length > 500 ? null : b.photoDataUrl
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
      } catch (innerErr) {
        console.error("Critical storage failure:", innerErr);
      }
    }
  }
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Validate and instantiate objects safely
        buildingStore = parsed.map(p => new Building(p));
        // Upgrade any legacy SVG placeholders to photorealistic images
        buildingStore.forEach(b => {
          if (!b.photoDataUrl || b.photoDataUrl.includes("data:image/svg+xml") || b.photoDataUrl.includes("TIMBER") || b.photoDataUrl.includes("HOSPITAL") || b.photoDataUrl.includes("COMMERCIAL")) {
            if (b.buildingId === "B-102") b.photoDataUrl = "images/heritage_timber_hall.jpg";
            else if (b.buildingId === "B-103") b.photoDataUrl = "images/hospital_annex_concrete.jpg";
            else if (b.buildingId === "B-104") b.photoDataUrl = "images/sunrise_commercial_plaza.jpg";
            else if (b.buildingId === "B-105") b.photoDataUrl = "images/azure_bay_apartments.jpg";
            else if (b.primaryMaterial === "Brick") b.photoDataUrl = "images/cracked_brick_warehouse.jpg";
            else if (b.primaryMaterial === "Wood") b.photoDataUrl = "images/heritage_timber_hall.jpg";
            else if (b.primaryMaterial === "Steel") b.photoDataUrl = "images/sunrise_commercial_plaza.jpg";
            else b.photoDataUrl = "images/hospital_annex_concrete.jpg";
          }
        });
        saveStore();
        return;
      }
    }
  } catch (err) {
    console.warn("Could not load from localStorage, initializing defaults:", err);
  }
  buildingStore = DEFAULT_BUILDINGS.map(b => new Building(b));
  saveStore();
}

/* ==========================================================================
   UI Helpers & Formatting
   ========================================================================== */

const RISK_BADGES = {
  LOW: "bg-emerald-100 text-emerald-800 border-emerald-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  CRITICAL: "bg-red-100 text-red-800 border-red-300"
};

const RISK_ACCENTS = {
  LOW: "text-emerald-600",
  MEDIUM: "text-amber-600",
  HIGH: "text-orange-600",
  CRITICAL: "text-red-600"
};

const GRADE_PILLS = {
  LOW: "bg-emerald-600 text-white",
  MEDIUM: "bg-amber-500 text-white",
  HIGH: "bg-orange-500 text-white",
  CRITICAL: "bg-red-600 text-white"
};

/* ==========================================================================
   Queue Table Rendering (Event-Delegated & XSS-Hardened)
   ========================================================================== */

function renderQueueTable() {
  // Sort by lowest score (most dangerous structures first)
  const assessed = buildingStore.map(b => assessmentEngine.assess(b)).sort((a, b) => a.totalScore - b.totalScore);

  updateKPIs(assessed);

  const rawQuery = ($("searchQueue") ? $("searchQueue").value : "").trim().toLowerCase();
  
  // Update clear search button visibility
  if ($("btnClearSearch")) {
    $("btnClearSearch").classList.toggle("hidden", !rawQuery);
  }

  const filtered = assessed.filter(res => {
    const b = res.building;
    const matchesQuery = !rawQuery ||
      b.buildingId.toLowerCase().includes(rawQuery) ||
      b.name.toLowerCase().includes(rawQuery) ||
      b.address.toLowerCase().includes(rawQuery) ||
      b.primaryMaterial.toLowerCase().includes(rawQuery) ||
      b.occupancyType.toLowerCase().includes(rawQuery);

    if (!matchesQuery) return false;

    if (activeFilter === "Urgent Only") return res.requiresUrgentInspection;
    if (activeFilter === "Critical") return res.riskLevel === "CRITICAL";
    if (activeFilter === "High") return res.riskLevel === "HIGH";
    if (activeFilter === "Medium") return res.riskLevel === "MEDIUM";
    if (activeFilter === "Low") return res.riskLevel === "LOW";
    return true;
  });

  // Update table counter badge & mobile tab badge
  if ($("queueCounterBadge")) {
    $("queueCounterBadge").textContent = `${filtered.length} of ${assessed.length} Structures`;
  }
  if ($("mobileQueueCountBadge")) {
    $("mobileQueueCountBadge").textContent = assessed.length;
  }

  const tbody = $("queueTableBody");
  $("emptyQueueMsg").classList.toggle("hidden", filtered.length > 0);

  tbody.innerHTML = filtered.map((res, index) => {
    const b = res.building;
    const isUrgent = res.requiresUrgentInspection;
    const safeThumb = sanitizeImageUrl(b.photoDataUrl) || createFacadeSvg(b.primaryMaterial, "#64748b", b.floors);

    return `
      <tr class="hover:bg-slate-50/90 transition group border-b border-slate-100 ${editingBuildingId === b.buildingId ? 'bg-amber-50/60' : ''}">
        <td class="px-4 py-3.5 text-slate-500 font-bold text-xs whitespace-nowrap">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full font-mono text-[11px] font-bold ${index < 3 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-700'}">
            #${index + 1}
          </span>
        </td>
        <td class="px-4 py-3.5">
          <div class="flex items-center gap-3">
            <div class="relative w-12 h-14 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 flex-shrink-0 cursor-pointer shadow-xs group-hover:scale-105 transition" data-action="photo" data-id="${escapeHtml(b.buildingId)}" title="Click to enlarge facade image">
              <img src="${safeThumb}" alt="Facade" class="w-full h-full object-cover">
            </div>
            <div>
              <div class="font-bold text-slate-900 flex items-center gap-1.5 font-heading text-sm">
                <span>${escapeHtml(b.name)}</span>
                ${b.codeCompliant ? '<i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-500" title="Code Compliant"></i>' : '<i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-red-500" title="Code Non-Compliant"></i>'}
              </div>
              <div class="text-xs text-slate-500 font-mono mt-0.5">${escapeHtml(b.buildingId)} &bull; ${escapeHtml(b.address)}</div>
              <div class="text-[11px] text-slate-400 mt-0.5">
                <span class="font-semibold text-slate-600">${escapeHtml(b.primaryMaterial)}</span> &bull; 
                ${escapeHtml(b.occupancyType)} &bull; 
                ${b.floors} fl &bull; 
                ${b.ageYears} yrs &bull; 
                Maint: <span class="font-bold ${b.maintenanceScore <= 3 ? 'text-red-600' : 'text-slate-700'}">${b.maintenanceScore}/10</span>
              </div>
            </div>
          </div>
        </td>
        <td class="px-4 py-3.5 whitespace-nowrap">
          <div class="flex items-baseline gap-1.5">
            <span class="text-2xl font-black font-heading ${RISK_ACCENTS[res.riskLevel]}">${res.totalScore.toFixed(1)}</span>
            <span class="text-xs font-bold px-1.5 py-0.5 rounded-md ${GRADE_PILLS[res.riskLevel]} font-mono">Gr ${res.grade}</span>
          </div>
        </td>
        <td class="px-4 py-3.5 whitespace-nowrap">
          <span class="inline-flex items-center gap-1.5 border px-2.5 py-1 rounded-full text-xs font-bold ${RISK_BADGES[res.riskLevel]}">
            <span class="w-1.5 h-1.5 rounded-full ${res.riskLevel === 'CRITICAL' || res.riskLevel === 'HIGH' ? 'bg-red-600 animate-ping' : 'bg-current'}"></span>
            ${res.riskLevel}
          </span>
        </td>
        <td class="px-4 py-3.5 whitespace-nowrap">
          ${isUrgent
            ? '<span class="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xs badge-urgent-pulse"><i data-lucide="siren" class="w-3.5 h-3.5"></i> URGENT</span>'
            : '<span class="text-xs font-medium text-slate-400">Routine</span>'
          }
        </td>
        <td class="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
          <button type="button" data-action="audit" data-id="${escapeHtml(b.buildingId)}" class="btn-lift inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition shadow-xs" title="View Detailed Structural Audit">
            <i data-lucide="clipboard-check" class="w-3.5 h-3.5 text-sky-600"></i>
            <span>Audit</span>
          </button>
          <button type="button" data-action="edit" data-id="${escapeHtml(b.buildingId)}" class="btn-lift inline-flex items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold px-2 py-1.5 rounded-lg transition shadow-xs" title="Load into form for re-assessment">
            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
          </button>
          <button type="button" data-action="delete" data-id="${escapeHtml(b.buildingId)}" class="btn-lift inline-flex items-center text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition hover:bg-red-50" title="Delete record">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

function updateKPIs(assessed) {
  const total = assessed.length;
  const urgentCount = assessed.filter(r => r.requiresUrgentInspection).length;
  const avgScore = total ? (assessed.reduce((sum, r) => sum + r.totalScore, 0) / total).toFixed(1) : "0.0";
  const compliantCount = assessed.filter(r => r.building.codeCompliant).length;
  const compRate = total ? Math.round((compliantCount / total) * 100) : 0;

  if ($("kpiTotal")) $("kpiTotal").textContent = total;
  if ($("kpiUrgent")) $("kpiUrgent").textContent = urgentCount;
  if ($("kpiAvg")) $("kpiAvg").textContent = avgScore;
  if ($("kpiComp")) $("kpiComp").textContent = compRate + "%";
}

/* ==========================================================================
   Form Real-Time Simulator & Live Calculations
   ========================================================================== */

function readCurrentFormValues() {
  return new Building({
    buildingId: $("fId").value.trim() || "PREVIEW",
    name: $("fName").value.trim() || "Simulated Structure",
    address: $("fAddr").value.trim() || "Site Location",
    ageYears: parseInt($("fAge").value, 10) || 0,
    primaryMaterial: $("fMat").value,
    maintenanceScore: parseInt($("fMaint").value, 10) || 7,
    codeCompliant: $("fComp").checked,
    lastInspectionYearsAgo: parseInt($("fInsp").value, 10) || 0,
    floors: parseInt($("fFloors").value, 10) || 1,
    occupancyType: $("fOcc").value,
    photoDataUrl: currentPhotoBase64,
    visionAnalysis: currentVisionResult
  });
}

function updateLiveSimulator() {
  $("fMaintVal").textContent = $("fMaint").value;
  const b = readCurrentFormValues();
  const res = assessmentEngine.assess(b);

  const scoreEl = $("simScore");
  const gradeEl = $("simGrade");
  const riskEl = $("simRisk");
  const urgentEl = $("simUrgent");
  const breakdownEl = $("simFormulaBreakdown");

  scoreEl.textContent = res.totalScore.toFixed(1);
  scoreEl.className = `text-4xl font-black font-heading tracking-tight ${RISK_ACCENTS[res.riskLevel]}`;

  gradeEl.textContent = `Grade ${res.grade}`;
  gradeEl.className = `px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-xs font-mono ${GRADE_PILLS[res.riskLevel]}`;

  riskEl.textContent = `${res.riskLevel} RISK`;
  riskEl.className = `text-xs font-extrabold uppercase tracking-wider ${RISK_ACCENTS[res.riskLevel]}`;

  if (res.requiresUrgentInspection) {
    urgentEl.innerHTML = '<span class="inline-flex items-center gap-1 text-red-600 font-bold"><i data-lucide="alert-octagon" class="w-3.5 h-3.5"></i> Urgent Inspection Required</span>';
  } else {
    urgentEl.innerHTML = '<span class="text-slate-500 font-medium">Standard Municipal Schedule</span>';
  }

  if (res.findings.length === 0) {
    breakdownEl.innerHTML = `<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300 font-semibold">Base: 100.0 (Zero Deductions &bull; Max Safety)</span>`;
  } else {
    const chips = [];
    chips.push(`<span class="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">Base: 100</span>`);
    res.findings.forEach(f => {
      chips.push(`<span class="bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200 cursor-help" title="${escapeHtml(f.description)}">-${f.deduction.toFixed(0)} (${escapeHtml(f.category)})</span>`);
    });
    breakdownEl.innerHTML = chips.join(" ");
  }

  if (window.lucide) lucide.createIcons();
}

/* ==========================================================================
   Photo Processing & Vision Telemetry Integration
   ========================================================================== */

async function processBuildingPhoto(fileOrUrl) {
  try {
    let base64;
    if (typeof fileOrUrl === "string") {
      base64 = fileOrUrl;
    } else {
      const val = validateImageFile(fileOrUrl);
      if (!val.valid) {
        showToast(val.message);
        return;
      }
      base64 = await readFileAsBase64(fileOrUrl);
    }

    currentPhotoBase64 = base64;
    $("uploadPlaceholder").classList.add("hidden");
    $("previewContainer").classList.remove("hidden");

    // Animate scanning radar
    $("scannerLaser").classList.remove("hidden");
    $("aiStatusBadge").textContent = "Inspecting...";
    $("aiStatusBadge").className = "bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold animate-pulse";

    // Run inspection engine
    const canvas = $("photoCanvas");
    const vision = await visionEngine.inspectPhoto(base64, canvas);
    currentVisionResult = vision;

    // Conclude scanner animation
    $("scannerLaser").classList.add("hidden");
    $("aiStatusBadge").textContent = "Photo Loaded";
    $("aiStatusBadge").className = "bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold";

    // Auto-fill form fields accurately from AI telemetry
    if (vision.primaryMaterial && $("fMat")) $("fMat").value = vision.primaryMaterial;
    if (vision.floors && $("fFloors")) $("fFloors").value = vision.floors;
    if (vision.estimatedAgeYears && $("fAge")) $("fAge").value = vision.estimatedAgeYears;
    if (vision.maintenanceScore !== undefined && $("fMaint")) {
      $("fMaint").value = vision.maintenanceScore;
      $("fMaintVal").textContent = vision.maintenanceScore;
    }
    if (vision.codeCompliant !== undefined && $("fComp")) {
      $("fComp").checked = vision.codeCompliant;
    } else if ($("fComp")) {
      $("fComp").checked = (vision.maintenanceScore >= 7);
    }
    if (vision.occupancyType && $("fOcc")) $("fOcc").value = vision.occupancyType;
    if (vision.name && (!editingBuildingId || $("fName").value === "Simulated Structure" || !$("fName").value)) {
      $("fName").value = vision.name;
    }

    // Populate Rich Telemetry Panel
    const telemetryPanel = $("visionTelemetryPanel");
    if (telemetryPanel) {
      telemetryPanel.classList.remove("hidden");

      if ($("viBuildingName")) $("viBuildingName").textContent = vision.name || "Building Elevation";
      if ($("viTypology")) $("viTypology").textContent = vision.buildingTypology || "Typology Analysis";
      if ($("viMaterial")) $("viMaterial").textContent = vision.primaryMaterial || "RCC";
      if ($("viFloors")) $("viFloors").textContent = `${vision.floors || 1} Floors`;
      if ($("viAge")) $("viAge").textContent = `~${vision.estimatedAgeYears || 20} Yrs`;

      if ($("visionConfidenceBadge")) {
        $("visionConfidenceBadge").innerHTML = "Telemetry Calibrated";
      }

      // Distress Analysis alert
      const distressTitle = $("viDistressTitle");
      const distressDesc = $("viDistressDesc");
      const distressBox = $("viDistressAlert");
      const crackSev = vision.crackSeverity || "none";

      if (crackSev === "critical") {
        if (distressBox) distressBox.className = "p-2.5 rounded-lg bg-red-950/60 border border-red-500/80 text-[11px] flex items-start gap-2";
        if (distressTitle) {
          distressTitle.className = "font-bold text-red-300 font-heading";
          distressTitle.textContent = "🚨 Severe Structural Cracking Detected";
        }
        if (distressDesc) distressDesc.textContent = "Widespread diagonal fracture network observed along load-bearing components. Immediate municipal intervention required.";
      } else if (crackSev === "moderate") {
        if (distressBox) distressBox.className = "p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/80 text-[11px] flex items-start gap-2";
        if (distressTitle) {
          distressTitle.className = "font-bold text-amber-300 font-heading";
          distressTitle.textContent = "⚠️ Moderate Facade Spalling & Distress";
        }
        if (distressDesc) distressDesc.textContent = "Visible surface delamination and rebar oxidation staining. NDT verification recommended.";
      } else {
        if (distressBox) distressBox.className = "p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/80 text-[11px] flex items-start gap-2";
        if (distressTitle) {
          distressTitle.className = "font-bold text-emerald-300 font-heading";
          distressTitle.textContent = "✅ Sound External Envelope";
        }
        if (distressDesc) distressDesc.textContent = "No critical shear fractures or concrete spalling detected on facade surface.";
      }

      // Architectural items tagged in image
      const detectedItemsList = $("viDetectedItems");
      if (detectedItemsList) {
        const items = vision.detectedItems || [];
        if (items.length > 0) {
          detectedItemsList.innerHTML = items.map(item =>
            `<span class="bg-slate-800 border border-slate-700 text-sky-200 text-[10px] px-2 py-0.5 rounded font-medium">${escapeHtml(item)}</span>`
          ).join("");
        } else {
          detectedItemsList.innerHTML = `<span class="text-slate-400 text-[10px]">No anomalies tagged</span>`;
        }
      }
    }

    if (window.lucide) lucide.createIcons();
    updateLiveSimulator();
    showToast("Photo analyzed! Assessment parameters auto-calibrated.");
  } catch (err) {
    console.error("Photo inspection failed:", err);
    $("scannerLaser").classList.add("hidden");
    $("aiStatusBadge").textContent = "Ready";
    $("aiStatusBadge").className = "bg-slate-200 text-slate-700 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold";
    showToast("Could not process photo: " + (err.message || "Unknown error"));
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(e);
    reader.readAsDataURL(file);
  });
}

function clearUploadedPhoto() {
  currentPhotoBase64 = null;
  currentVisionResult = null;
  $("previewContainer").classList.add("hidden");
  $("uploadPlaceholder").classList.remove("hidden");
  if ($("visionTelemetryPanel")) $("visionTelemetryPanel").classList.add("hidden");
  $("photoInput").value = "";
  $("aiStatusBadge").textContent = "Ready";
  $("aiStatusBadge").className = "bg-sky-100 text-sky-800 border border-sky-200 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold";
  updateLiveSimulator();
}

/* ==========================================================================
   Webcam Integration
   ========================================================================== */

async function startWebcam() {
  const modal = $("webcamModal");
  const video = $("webcamVideo");
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    video.srcObject = webcamStream;
  } catch (err) {
    console.warn("Webcam stream access failed, using native mobile camera fallback:", err);
    closeWebcam();
    const nativeCam = $("cameraInput");
    if (nativeCam) {
      nativeCam.click();
    } else {
      showToast("Camera access was blocked or is unavailable: " + (err.message || "Permission denied"));
    }
  }
}

function captureWebcamPhoto() {
  const video = $("webcamVideo");
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  closeWebcam();
  processBuildingPhoto(dataUrl);
}

function closeWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach(t => t.stop());
    webcamStream = null;
  }
  $("webcamModal").classList.add("hidden");
  $("webcamModal").classList.remove("flex");
}

/* ==========================================================================
   Form Submission & Editing
   ========================================================================== */

function handleFormSubmit() {
  hideFormError();

  let rawId = ($("fId").value || "").trim();
  let rawName = ($("fName").value || "").trim();
  let rawAddr = ($("fAddr").value || "").trim();
  let age = parseInt($("fAge").value, 10);
  let floors = parseInt($("fFloors").value, 10);
  let insp = parseInt($("fInsp").value, 10);

  // Auto-generate Building ID if user left it blank
  if (!rawId) {
    const existingIds = new Set(buildingStore.map(b => b.buildingId.toUpperCase()));
    let candidateNum = buildingStore.length + 101;
    while (existingIds.has(`B-${candidateNum}`)) {
      candidateNum++;
    }
    rawId = `B-${candidateNum}`;
    $("fId").value = rawId;
  }

  // Clean and validate ID
  const id = rawId.replace(/[^a-zA-Z0-9\-_]/g, "").substring(0, 30) || `B-${Date.now().toString().slice(-4)}`;

  // Default Name if blank
  if (!rawName) {
    rawName = currentVisionResult?.name || `${$("fMat").value} ${$("fOcc").value} Structure`;
    $("fName").value = rawName;
  }
  const name = rawName.substring(0, 100);

  // Default Address if blank
  if (!rawAddr) {
    const wardNum = Math.floor(1 + Math.random() * 12);
    rawAddr = `Ward ${wardNum} Municipal District, Sector ${Math.floor(1 + Math.random() * 9)}`;
    $("fAddr").value = rawAddr;
  }
  const addr = rawAddr.substring(0, 150);

  // Sanitize numerical fields
  if (isNaN(age) || age < 0) age = 20;
  if (age > 150) age = 150;
  if (isNaN(floors) || floors < 1) floors = 1;
  if (floors > 100) floors = 100;
  if (isNaN(insp) || insp < 0) insp = 1;
  if (insp > 50) insp = 50;

  // Visual button feedback
  const submitBtn = $("btnSubmitAssessment");
  let originalBtnHtml = "";
  if (submitBtn) {
    originalBtnHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4 text-emerald-400"></i><span>Adding &amp; Prioritizing...</span>';
    submitBtn.classList.add("bg-emerald-800");
    if (window.lucide) lucide.createIcons();
  }

  // Check if building already exists (for edit/update mode)
  const existingIndex = buildingStore.findIndex(b => b.buildingId.toLowerCase() === id.toLowerCase());

  const buildingObj = new Building({
    buildingId: id,
    name: name,
    address: addr,
    ageYears: age,
    primaryMaterial: $("fMat").value,
    maintenanceScore: parseInt($("fMaint").value, 10) || 7,
    codeCompliant: $("fComp").checked,
    lastInspectionYearsAgo: insp,
    floors: floors,
    occupancyType: $("fOcc").value,
    photoDataUrl: currentPhotoBase64,
    visionAnalysis: currentVisionResult
  });

  const assessResult = assessmentEngine.assess(buildingObj);

  if (existingIndex >= 0) {
    buildingStore[existingIndex] = buildingObj;
    showToast(`Structure "${id}" updated! Score: ${assessResult.totalScore.toFixed(1)} (${assessResult.riskLevel} Risk)`);
  } else {
    buildingStore.push(buildingObj);
    showToast(`Structure "${id}" added to queue! Score: ${assessResult.totalScore.toFixed(1)} (${assessResult.riskLevel} Risk)`);
  }

  saveStore();

  // Reset activeFilter to "All" so the new structure is ALWAYS visible in the table
  activeFilter = "All";
  const filterTabs = $("filterTabs");
  if (filterTabs) {
    Array.from(filterTabs.children).forEach(c => {
      c.className = `btn-lift px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${c.dataset.filter === 'All' ? 'tab-active' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`;
    });
  }

  // Clear search query so new item is not filtered out
  if ($("searchQueue")) $("searchQueue").value = "";
  if ($("btnClearSearch")) $("btnClearSearch").classList.add("hidden");

  // Re-render table and simulators
  renderQueueTable();
  cancelEditMode();
  updateLiveSimulator();

  // On mobile screens, automatically switch to Priority Queue tab to see new entry
  if (window.innerWidth < 1024) {
    switchToMobileTab("queue");
  }

  // Highlight and scroll to the new/updated row
  setTimeout(() => {
    const targetRow = document.querySelector(`[data-action="audit"][data-id="${id}"]`)?.closest("tr");
    if (targetRow) {
      targetRow.classList.add("bg-sky-100", "ring-2", "ring-sky-500", "transition-all");
      targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        targetRow.classList.remove("bg-sky-100", "ring-2", "ring-sky-500");
      }, 3000);
    }
    if (submitBtn && originalBtnHtml) {
      submitBtn.innerHTML = originalBtnHtml;
      submitBtn.classList.remove("bg-emerald-800");
      if (window.lucide) lucide.createIcons();
    }
  }, 250);
}

/* ==========================================================================
   Mobile Responsive Tab Switcher
   ========================================================================== */

function switchToMobileTab(tabName) {
  const tabBtnForm = $("tabBtnForm");
  const tabBtnQueue = $("tabBtnQueue");
  const panelForm = $("panelForm");
  const panelQueue = $("panelQueue");

  if (!panelForm || !panelQueue) return;

  if (tabName === "form") {
    if (tabBtnForm) {
      tabBtnForm.className = "flex-1 py-2.5 rounded-lg bg-slate-900 text-white shadow-xs transition flex items-center justify-center gap-1.5 font-heading";
    }
    if (tabBtnQueue) {
      tabBtnQueue.className = "flex-1 py-2.5 rounded-lg text-slate-700 hover:text-slate-900 transition flex items-center justify-center gap-1.5 font-heading";
    }
    panelForm.classList.remove("hidden");
    panelForm.classList.add("block");
    panelQueue.classList.add("hidden");
    panelQueue.classList.remove("block");
  } else {
    if (tabBtnQueue) {
      tabBtnQueue.className = "flex-1 py-2.5 rounded-lg bg-slate-900 text-white shadow-xs transition flex items-center justify-center gap-1.5 font-heading";
    }
    if (tabBtnForm) {
      tabBtnForm.className = "flex-1 py-2.5 rounded-lg text-slate-700 hover:text-slate-900 transition flex items-center justify-center gap-1.5 font-heading";
    }
    panelQueue.classList.remove("hidden");
    panelQueue.classList.add("block");
    panelForm.classList.add("hidden");
    panelForm.classList.remove("block");
  }
  if (window.lucide) lucide.createIcons();
}

function loadBuildingIntoForm(buildingId) {
  const building = buildingStore.find(b => b.buildingId === buildingId);
  if (!building) return;

  // On mobile screens, automatically switch to Form tab for editing
  if (window.innerWidth < 1024) {
    switchToMobileTab("form");
  }

  editingBuildingId = building.buildingId;

  $("fId").value = building.buildingId;
  $("fName").value = building.name;
  $("fAddr").value = building.address;
  $("fAge").value = building.ageYears;
  $("fFloors").value = building.floors;
  $("fMat").value = building.primaryMaterial;
  $("fOcc").value = building.occupancyType;
  $("fMaint").value = building.maintenanceScore;
  $("fMaintVal").textContent = building.maintenanceScore;
  $("fComp").checked = building.codeCompliant;
  $("fInsp").value = building.lastInspectionYearsAgo;

  if (building.photoDataUrl) {
    processBuildingPhoto(building.photoDataUrl);
  } else {
    clearUploadedPhoto();
  }

  // Toggle edit mode UI
  if ($("editModeIndicator")) $("editModeIndicator").classList.remove("hidden");
  if ($("btnCancelEdit")) $("btnCancelEdit").classList.remove("hidden");
  if ($("btnSubmitText")) $("btnSubmitText").textContent = `Save Changes to ${building.buildingId}`;

  // Ensure form is visible and scrolled into view
  const formArea = $("formContentArea");
  if (formArea.classList.contains("hidden")) {
    formArea.classList.remove("hidden");
    $("formToggleChevron").style.transform = "";
  }
  formArea.scrollIntoView({ behavior: "smooth", block: "start" });

  updateLiveSimulator();
  showToast(`Loaded ${building.buildingId} into assessment form.`);
}

function cancelEditMode() {
  editingBuildingId = null;
  $("fId").value = "";
  $("fName").value = "";
  $("fAddr").value = "";
  $("fAge").value = 20;
  $("fFloors").value = 3;
  $("fMaint").value = 7;
  $("fMaintVal").textContent = 7;
  $("fComp").checked = true;
  $("fInsp").value = 2;
  clearUploadedPhoto();

  if ($("editModeIndicator")) $("editModeIndicator").classList.add("hidden");
  if ($("btnCancelEdit")) $("btnCancelEdit").classList.add("hidden");
  if ($("btnSubmitText")) $("btnSubmitText").textContent = "Assess & Add to Priority Queue";

  hideFormError();
}

function showFormError(msg) {
  const errBox = $("formError");
  const errText = $("formErrorText") || errBox;
  errText.textContent = msg;
  errBox.classList.remove("hidden");
  errBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideFormError() {
  const errBox = $("formError");
  if (errBox) errBox.classList.add("hidden");
}

/* ==========================================================================
   Toast Notification & Delete Record
   ========================================================================== */

let toastTimeout = null;
function showToast(msg) {
  const toast = $("appToast");
  const textEl = $("toastMsgText") || toast;
  textEl.textContent = msg;
  toast.classList.remove("hidden");

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3500);
}

function deleteBuilding(id) {
  if (confirm(`Remove structure "${id}" from the municipal priority queue?`)) {
    buildingStore = buildingStore.filter(b => b.buildingId !== id);
    if (editingBuildingId === id) cancelEditMode();
    saveStore();
    renderQueueTable();
    showToast(`Structure "${id}" removed from queue.`);
  }
}

/* ==========================================================================
   Audit Modal & Findings Display (XSS-Hardened)
   ========================================================================== */

function openAuditModal(id) {
  const building = buildingStore.find(b => b.buildingId === id);
  if (!building) return;

  const result = assessmentEngine.assess(building);
  const modal = $("auditModal");
  const modalContent = $("auditModalContent");

  const safeThumb = sanitizeImageUrl(building.photoDataUrl) || createFacadeSvg(building.primaryMaterial, "#475569", building.floors);

  // Findings list
  const findingsHtml = result.findings.length > 0
    ? result.findings.map(f => {
        const borderCol = f.severity === 'danger' ? 'border-red-300 bg-red-50/60' : f.severity === 'warning' ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 bg-slate-50';
        const badgeCol = f.severity === 'danger' ? 'bg-red-600 text-white' : f.severity === 'warning' ? 'bg-amber-600 text-white' : 'bg-slate-600 text-white';
        return `
          <div class="border ${borderCol} rounded-xl p-3 flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${badgeCol}">${escapeHtml(f.category)}</span>
                <span class="text-xs font-bold text-slate-800 font-heading">${escapeHtml(f.ruleName)}</span>
              </div>
              <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(f.description)}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="text-xs font-black text-red-600 font-mono">-${f.deduction.toFixed(1)} pts</span>
            </div>
          </div>
        `;
      }).join("")
    : `<div class="p-4 text-center text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-semibold">Zero deductions logged. Structure complies with all inspection benchmarks.</div>`;

  const recommendationsHtml = result.recommendedActions.map(act => `
    <li class="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
      <i data-lucide="arrow-right-circle" class="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5"></i>
      <span>${escapeHtml(act)}</span>
    </li>
  `).join("");

  modalContent.innerHTML = `
    <!-- Modal Header Info -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div class="flex items-center gap-4">
        <div class="w-20 h-24 rounded-xl overflow-hidden border border-slate-300 shadow-xs flex-shrink-0 bg-slate-100">
          <img src="${safeThumb}" alt="Building" class="w-full h-full object-cover">
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-lg font-bold text-slate-900 font-heading">${escapeHtml(building.name)}</h3>
            <span class="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-bold">${escapeHtml(building.buildingId)}</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5"><i data-lucide="map-pin" class="w-3.5 h-3.5 inline"></i> ${escapeHtml(building.address)}</p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            ${result.requiresUrgentInspection
              ? '<span class="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-xs"><i data-lucide="siren" class="w-3.5 h-3.5"></i> URGENT INSPECTION REQUIRED</span>'
              : '<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"><i data-lucide="check" class="w-3.5 h-3.5"></i> Scheduled Monitoring</span>'}
            ${building.codeCompliant
              ? '<span class="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded border">Code Compliant</span>'
              : '<span class="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded border border-red-200 font-semibold">Non-Compliant</span>'}
          </div>
        </div>
      </div>

      <!-- Score Display -->
      <div class="text-center p-3.5 rounded-xl border border-slate-200 bg-slate-50 min-w-[140px] shadow-xs">
        <div class="text-3xl font-black font-heading ${RISK_ACCENTS[result.riskLevel]}">${result.totalScore.toFixed(1)}</div>
        <div class="text-xs font-bold uppercase tracking-wider text-slate-600 mt-0.5">${result.riskLevel} RISK</div>
        <span class="inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md ${GRADE_PILLS[result.riskLevel]} font-mono">Grade ${result.grade}</span>
      </div>
    </div>

    <!-- Parameter Breakdown Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
        <span class="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">Primary Material</span>
        <span class="text-xs font-bold text-slate-800">${escapeHtml(building.primaryMaterial)}</span>
      </div>
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
        <span class="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">Structure Age</span>
        <span class="text-xs font-bold text-slate-800">${building.ageYears} Years</span>
      </div>
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
        <span class="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">Floors &amp; Occupancy</span>
        <span class="text-xs font-bold text-slate-800">${building.floors} fl &bull; ${escapeHtml(building.occupancyType)}</span>
      </div>
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
        <span class="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">Maintenance Score</span>
        <span class="text-xs font-bold ${building.maintenanceScore <= 3 ? 'text-red-600' : 'text-slate-800'}">${building.maintenanceScore} / 10</span>
      </div>
    </div>

    ${building.visionAnalysis ? `
    <!-- AI Vision Telemetry Section -->
    <div class="bg-slate-900 text-white rounded-xl p-3.5 space-y-2 border border-slate-700/80 shadow-xs">
      <div class="flex items-center justify-between text-xs font-bold border-b border-slate-800 pb-1.5 text-sky-400 font-heading">
        <span class="flex items-center gap-1.5"><i data-lucide="scan" class="w-4 h-4"></i> AI Visual Image Diagnostics</span>
        <span class="text-[10px] font-mono text-slate-400">${escapeHtml(building.visionAnalysis.engine || 'Vision AI')} &bull; ${Math.round((building.visionAnalysis.confidenceScore || 0.9) * 100)}% Conf</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div class="bg-slate-800/80 p-2 rounded-lg">
          <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Identified Typology:</span>
          <span class="font-bold text-white font-heading">${escapeHtml(building.visionAnalysis.name || building.name)}</span>
          <div class="text-[11px] text-sky-300 mt-0.5">${escapeHtml(building.visionAnalysis.buildingTypology || building.occupancyType)}</div>
        </div>
        <div class="bg-slate-800/80 p-2 rounded-lg">
          <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Estimated Age &amp; Era:</span>
          <span class="font-bold text-amber-300 font-mono">~${building.visionAnalysis.estimatedAgeYears || building.ageYears} Years</span>
          <div class="text-[11px] text-slate-300 mt-0.5">${escapeHtml(building.visionAnalysis.ageDetails?.era || 'Era derived from surface patina')}</div>
        </div>
      </div>
      <div class="bg-slate-800/80 p-2 rounded-lg text-xs">
        <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Material Composition:</span>
        <span class="text-slate-200">${escapeHtml(building.visionAnalysis.materialDetails?.composition || (building.primaryMaterial + ' structure'))}</span>
      </div>
      ${building.visionAnalysis.detectedItems ? `
      <div>
        <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1 tracking-wider">Identified Structural Items in Image:</span>
        <div class="flex flex-wrap gap-1">
          ${building.visionAnalysis.detectedItems.map(it => `<span class="bg-slate-800 border border-slate-700 text-sky-200 text-[10px] px-2 py-0.5 rounded font-medium">${escapeHtml(it)}</span>`).join('')}
        </div>
      </div>` : ''}
    </div>
    ` : ''}

    <!-- Rule Deduction Findings -->
    <div>
      <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between font-heading">
        <span>Rule-Based Deduction Checklist (${result.findings.length} findings)</span>
        <span class="text-red-600 text-xs font-mono font-bold">Total Penalties: -${(result.maxScore - result.totalScore).toFixed(1)} pts</span>
      </h4>
      <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
        ${findingsHtml}
      </div>
    </div>

    <!-- Official Municipal Recommendations -->
    <div class="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5">
      <h4 class="text-xs font-bold uppercase tracking-wider text-sky-900 mb-2 flex items-center gap-1.5 font-heading">
        <i data-lucide="shield-alert" class="w-4 h-4 text-sky-600"></i> Municipal Structural Action Protocol
      </h4>
      <ul class="space-y-1.5">
        ${recommendationsHtml}
      </ul>
    </div>
  `;

  // Attach Print Notice data safely
  $("btnPrintNotice").onclick = () => printOfficialNotice(building, result);

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  if (window.lucide) lucide.createIcons();
}

function closeAuditModal() {
  const modal = $("auditModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

/* ==========================================================================
   Photo Modal & Fullscreen View
   ========================================================================== */

function openPhotoModal(id) {
  const building = buildingStore.find(b => b.buildingId === id);
  if (!building) return;

  const safePhoto = sanitizeImageUrl(building.photoDataUrl) || createFacadeSvg(building.primaryMaterial, "#64748b", building.floors);
  const modal = $("photoModal");
  $("photoModalImg").src = safePhoto;
  $("photoModalTitle").textContent = `${building.name} (${building.buildingId})`;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closePhotoModal() {
  const modal = $("photoModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

/* ==========================================================================
   Print Official Municipal Citation Notice (Secured)
   ========================================================================== */

function printOfficialNotice(building, result) {
  const printArea = $("printNoticeArea");
  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  printArea.innerHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #111; padding: 20px;">
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="font-size: 18px; font-weight: bold; margin: 0;">MUNICIPAL CORPORATION &mdash; BUILDING SAFETY DEPARTMENT</h1>
          <p style="font-size: 12px; color: #555; margin: 4px 0 0 0;">Structural Risk Assessment &amp; Inspection Citation Notice</p>
        </div>
        <div style="text-align: right; font-size: 11px; color: #555;">
          <div>Notice ID: <strong>CIT-${escapeHtml(building.buildingId)}-${Date.now().toString().slice(-4)}</strong></div>
          <div>Date: ${now}</div>
        </div>
      </div>

      <div style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0;">
        <table style="width: 100%; font-size: 12px; line-height: 1.6;">
          <tr>
            <td><strong>Building ID:</strong> ${escapeHtml(building.buildingId)}</td>
            <td><strong>Structure Name:</strong> ${escapeHtml(building.name)}</td>
          </tr>
          <tr>
            <td><strong>Location / Ward:</strong> ${escapeHtml(building.address)}</td>
            <td><strong>Occupancy Type:</strong> ${escapeHtml(building.occupancyType)}</td>
          </tr>
          <tr>
            <td><strong>Primary Material:</strong> ${escapeHtml(building.primaryMaterial)}</td>
            <td><strong>Estimated Age:</strong> ${building.ageYears} Years</td>
          </tr>
          <tr>
            <td><strong>Storeys / Floors:</strong> ${building.floors}</td>
            <td><strong>Code Compliance:</strong> ${building.codeCompliant ? 'Compliant' : 'NON-COMPLIANT'}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 20px; padding: 16px; border: 2px solid ${result.requiresUrgentInspection ? '#dc2626' : '#0284c7'}; background: ${result.requiresUrgentInspection ? '#fef2f2' : '#f0f9ff'};">
        <h2 style="font-size: 15px; margin: 0 0 8px 0; color: ${result.requiresUrgentInspection ? '#dc2626' : '#0284c7'};">
          MUNICIPAL STRUCTURAL SCORE: ${result.totalScore.toFixed(1)} / 100.0 &mdash; ${result.riskLevel} RISK (Grade ${result.grade})
        </h2>
        <p style="font-size: 12px; margin: 0; font-weight: bold;">
          ${result.requiresUrgentInspection
            ? 'ATTENTION: THIS STRUCTURE IS FLAGGED FOR MANDATORY URGENT STRUCTURAL RE-INSPECTION UNDER SECTION 127.'
            : 'STATUS: Routine statutory monitoring schedule applies.'}
        </p>
      </div>

      <div style="margin-bottom: 16px;">
        <h3 style="font-size: 13px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px;">Deductions &amp; Audit Checklist Findings:</h3>
        <ul style="font-size: 12px; padding-left: 20px; line-height: 1.6;">
          ${result.findings.map(f => `<li><strong>${escapeHtml(f.ruleName)} (-${f.deduction.toFixed(1)} pts):</strong> ${escapeHtml(f.description)}</li>`).join("")}
        </ul>
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 13px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px;">Required Engineering Actions:</h3>
        <ol style="font-size: 12px; padding-left: 20px; line-height: 1.6;">
          ${result.recommendedActions.map(a => `<li>${escapeHtml(a)}</li>`).join("")}
        </ol>
      </div>

      <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px;">
        <div style="border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 4px;">
          Municipal Structural Inspector<br><span style="font-size: 10px; color: #666;">(Signature &amp; Seal)</span>
        </div>
        <div style="border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 4px;">
          Chief Municipal Safety Engineer<br><span style="font-size: 10px; color: #666;">(Authorized Officer)</span>
        </div>
      </div>
    </div>
  `;

  window.print();
}

/* ==========================================================================
   CSV Export (Formula Injection Hardened)
   ========================================================================== */

function exportQueueToCsv() {
  const assessed = buildingStore.map(b => assessmentEngine.assess(b)).sort((a, b) => a.totalScore - b.totalScore);
  const headers = ["Rank", "Building ID", "Name", "Address", "Age", "Material", "Floors", "Occupancy", "Maintenance", "Code Compliant", "Safety Score", "Grade", "Risk Level", "Urgent Inspection"];
  
  const rows = assessed.map((r, i) => [
    i + 1,
    sanitizeCsvCell(r.building.buildingId),
    sanitizeCsvCell(r.building.name),
    sanitizeCsvCell(r.building.address),
    r.building.ageYears,
    sanitizeCsvCell(r.building.primaryMaterial),
    r.building.floors,
    sanitizeCsvCell(r.building.occupancyType),
    r.building.maintenanceScore,
    r.building.codeCompliant ? "YES" : "NO",
    r.totalScore.toFixed(1),
    sanitizeCsvCell(r.grade),
    sanitizeCsvCell(r.riskLevel),
    r.requiresUrgentInspection ? "YES" : "NO"
  ]);

  const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Municipal_Structural_Safety_Queue_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast("Queue exported successfully to CSV!");
}

/* ==========================================================================
   Application Initialization & Event Listeners
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  loadStore();
  renderQueueTable();
  updateLiveSimulator();

  // Initialize Filter Tabs with Count Badges
  const filterContainer = $("filterTabs");
  const filters = ["All", "Urgent Only", "Critical", "High", "Medium", "Low"];
  
  filterContainer.innerHTML = filters.map(f =>
    `<button type="button" data-filter="${f}" class="btn-lift px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${f === activeFilter ? 'tab-active' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}">${f}</button>`
  ).join("");

  filterContainer.addEventListener("click", e => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    Array.from(filterContainer.children).forEach(c => {
      c.className = `btn-lift px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${c.dataset.filter === activeFilter ? 'tab-active' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`;
    });
    renderQueueTable();
  });

  // KPI card click shortcut filters
  if ($("kpiCardUrgent")) {
    $("kpiCardUrgent").addEventListener("click", () => {
      activeFilter = "Urgent Only";
      Array.from(filterContainer.children).forEach(c => {
        c.className = `btn-lift px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${c.dataset.filter === activeFilter ? 'tab-active' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`;
      });
      renderQueueTable();
    });
  }
  if ($("kpiCardTotal")) {
    $("kpiCardTotal").addEventListener("click", () => {
      activeFilter = "All";
      Array.from(filterContainer.children).forEach(c => {
        c.className = `btn-lift px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${c.dataset.filter === activeFilter ? 'tab-active' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`;
      });
      renderQueueTable();
    });
  }

  // Search queue input & clear button
  $("searchQueue").addEventListener("input", renderQueueTable);
  if ($("btnClearSearch")) {
    $("btnClearSearch").addEventListener("click", () => {
      $("searchQueue").value = "";
      renderQueueTable();
      $("searchQueue").focus();
    });
  }

  // Reset filters from empty state
  if ($("btnResetFilter")) {
    $("btnResetFilter").addEventListener("click", () => {
      activeFilter = "All";
      $("searchQueue").value = "";
      Array.from(filterContainer.children).forEach(c => {
        c.className = `btn-lift px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${c.dataset.filter === activeFilter ? 'tab-active' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`;
      });
      renderQueueTable();
    });
  }

  // Live simulator updates from form inputs
  ["fId", "fName", "fAddr", "fAge", "fFloors", "fMat", "fOcc", "fMaint", "fComp", "fInsp"].forEach(id => {
    const el = $(id);
    if (el) {
      el.addEventListener("input", updateLiveSimulator);
      el.addEventListener("change", updateLiveSimulator);
    }
  });

  // Submit and Cancel Edit Buttons
  $("btnSubmitAssessment").addEventListener("click", handleFormSubmit);
  if ($("btnCancelEdit")) {
    $("btnCancelEdit").addEventListener("click", cancelEditMode);
  }

  // File Upload Drag & Drop & Browse
  const dropZone = $("uploadPlaceholder");
  const photoInput = $("photoInput");
  const btnBrowse = $("btnBrowsePhoto");
  const btnWebcam = $("btnOpenWebcam");

  dropZone.addEventListener("click", e => {
    // If click was on button, prevent double execution
    if (e.target.closest("#btnOpenWebcam") || e.target.closest("#btnBrowsePhoto")) return;
    photoInput.click();
  });

  btnBrowse.addEventListener("click", e => {
    e.stopPropagation();
    photoInput.click();
  });

  photoInput.addEventListener("change", e => {
    if (e.target.files && e.target.files[0]) {
      processBuildingPhoto(e.target.files[0]);
    }
  });

  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("border-sky-500", "bg-sky-100/60");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("border-sky-500", "bg-sky-100/60");
  });

  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("border-sky-500", "bg-sky-100/60");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processBuildingPhoto(e.dataTransfer.files[0]);
    }
  });

  $("btnRemovePhoto").addEventListener("click", clearUploadedPhoto);



  // 1-Click Sample Preset Buttons
  document.querySelectorAll("[data-sample]").forEach(btn => {
    btn.addEventListener("click", () => {
      const sampleKey = btn.dataset.sample;
      const sample = SAMPLE_PRESETS[sampleKey];
      if (sample) {
        $("fId").value = sample.id || `B-${Math.floor(100 + Math.random() * 900)}`;
        $("fName").value = sample.name;
        $("fAddr").value = sample.address || "14 North Industrial Zone, Sector 4";
        $("fMat").value = sample.material;
        $("fFloors").value = sample.floors;
        $("fAge").value = sample.age;
        $("fMaint").value = sample.maintenance;
        $("fMaintVal").textContent = sample.maintenance;
        $("fComp").checked = sample.codeCompliant;
        $("fInsp").value = sample.inspectionAgo;
        $("fOcc").value = sample.occupancy;
        processBuildingPhoto(sample.photo);
      }
    });
  });

  // Webcam Modal buttons (with stopPropagation)
  btnWebcam.addEventListener("click", e => {
    e.stopPropagation();
    startWebcam();
  });
  $("btnCaptureWebcam").addEventListener("click", captureWebcamPhoto);
  $("btnCloseWebcam").addEventListener("click", closeWebcam);



  // Audit Modal Close
  document.querySelectorAll(".closeAuditModal").forEach(b => b.addEventListener("click", closeAuditModal));
  $("auditModal").addEventListener("click", e => { if (e.target === $("auditModal")) closeAuditModal(); });

  // Photo Modal Close
  document.querySelectorAll(".closePhotoModal").forEach(b => b.addEventListener("click", closePhotoModal));
  $("photoModal").addEventListener("click", e => { if (e.target === $("photoModal")) closePhotoModal(); });

  // Export CSV
  $("btnExportCsv").addEventListener("click", exportQueueToCsv);

  // Reset to Defaults
  $("btnResetData").addEventListener("click", () => {
    if (confirm("Reset municipal registry to the default 5 benchmark structures?")) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      loadStore();
      cancelEditMode();
      renderQueueTable();
      updateLiveSimulator();
      showToast("Municipal registry restored to default benchmark dataset.");
    }
  });

  // Table Row Click Event Delegation (Secure, eliminates inline onclick)
  $("queueTableBody").addEventListener("click", e => {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    const id = actionEl.dataset.id;
    if (!id) return;

    if (action === "audit") {
      openAuditModal(id);
    } else if (action === "edit") {
      loadBuildingIntoForm(id);
    } else if (action === "delete") {
      deleteBuilding(id);
    } else if (action === "photo") {
      openPhotoModal(id);
    }
  });

  // Collapse / Expand Assessment Panel
  $("formToggleHeader").addEventListener("click", () => {
    const body = $("formContentArea");
    body.classList.toggle("hidden");
    $("formToggleChevron").style.transform = body.classList.contains("hidden") ? "rotate(-90deg)" : "";
  });

  // Global Keyboard Navigation (Escape to close modals)
  window.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeAuditModal();
      closePhotoModal();
      closeWebcam();
    }
  });

  // Mobile Tab Switchers
  if ($("tabBtnForm")) {
    $("tabBtnForm").addEventListener("click", () => switchToMobileTab("form"));
  }
  if ($("tabBtnQueue")) {
    $("tabBtnQueue").addEventListener("click", () => switchToMobileTab("queue"));
  }

  // Native Mobile Camera Ingestion
  const cameraInput = $("cameraInput");
  if (cameraInput) {
    cameraInput.addEventListener("change", e => {
      if (e.target.files && e.target.files[0]) {
        processBuildingPhoto(e.target.files[0]);
      }
    });
  }

  // Window Resize Handler (Resets dual column layout on desktop screens)
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) {
      if ($("panelForm")) {
        $("panelForm").classList.remove("hidden");
        $("panelForm").classList.add("block");
      }
      if ($("panelQueue")) {
        $("panelQueue").classList.remove("hidden");
        $("panelQueue").classList.add("block");
      }
    }
  });

  if (window.lucide) lucide.createIcons();
});

// Global exports for testing / external access
window.openAuditModal = openAuditModal;
window.openPhotoModal = openPhotoModal;
window.deleteBuilding = deleteBuilding;
window.loadBuildingIntoForm = loadBuildingIntoForm;
window.switchToMobileTab = switchToMobileTab;
