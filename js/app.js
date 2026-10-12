/**
 * Building Structural Safety Scorer — Application Controller
 * Internal Dataset Persistence, Red-Flag Critical Hazard Triage,
 * Side-Drawer Elevation Scanner, and Field Officer Emergency Dispatch System.
 */
(function () {
  "use strict";

  /* ======================================================================
   * Helpers & Sanitizers
   * ==================================================================== */
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const fmtDate = d => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const fmtLong = d => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const refreshIcons = () => { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); };

  const STORE_KEY = "bsss_registry_v5";
  const DISPATCH_KEY = "bsss_dispatches_v1";
  const THEME_KEY = "bsss_theme";

  let currentTheme = localStorage.getItem(THEME_KEY) || "dark";

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
    const icon = $("themeIcon");
    const label = $("themeLabel");
    if (icon) {
      icon.setAttribute("data-lucide", theme === "light" ? "moon" : "sun");
      icon.className = theme === "light" ? "w-3.5 h-3.5 text-indigo-400" : "w-3.5 h-3.5 text-amber-400";
    }
    if (label) {
      label.textContent = theme === "light" ? "Dark Mode" : "Light Mode";
    }
    refreshIcons();
  }

  function toggleTheme() {
    const next = currentTheme === "light" ? "dark" : "light";
    applyTheme(next);
    toast(`Switched to ${next === "light" ? "Light" : "Dark"} Mode.`, "info");
  }

  if (typeof BuildingVisionEngine !== "undefined") {
    if (!BuildingVisionEngine.prototype.loadImage) {
      BuildingVisionEngine.prototype.loadImage = function (src) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Unable to load image: " + src));
          img.src = src;
        });
      };
    }
    if (!BuildingVisionEngine.prototype.renderOverlay) {
      BuildingVisionEngine.prototype.renderOverlay = function (img, canvas, analysis) {
        if (!canvas || !img) return;
        const ctx = canvas.getContext("2d");
        const targetW = 600;
        const aspect = (img.naturalHeight || 400) / (img.naturalWidth || 600);
        canvas.width = targetW;
        canvas.height = Math.round(targetW * aspect);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
    }
  }

  const engine = new SafetyAssessmentEngine();
  const vision = new BuildingVisionEngine();

  /* Tailwind CSS class strings */
  const RISK_PILL = {
    CRITICAL: "bg-red-600 text-white shadow-sm",
    HIGH: "bg-orange-500/20 text-orange-300 border border-orange-500/40",
    MEDIUM: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
    LOW: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
  };
  const RISK_BAR = {
    CRITICAL: "bg-red-600",
    HIGH: "bg-orange-500",
    MEDIUM: "bg-amber-500",
    LOW: "bg-emerald-500"
  };
  const GRADE_BG = {
    A: "bg-emerald-500 text-white shadow-md shadow-emerald-500/30",
    B: "bg-lime-500 text-white shadow-md shadow-lime-500/30",
    C: "bg-amber-500 text-white shadow-md shadow-amber-500/30",
    D: "bg-orange-500 text-white shadow-md shadow-orange-500/30",
    F: "bg-red-600 text-white shadow-md shadow-red-600/30"
  };
  const SEV_TEXT = { danger: "text-red-400", warning: "text-amber-400", info: "text-sky-300" };
  const SEV_BADGE = {
    danger: "bg-red-950/60 text-red-300 border border-red-500/40",
    warning: "bg-amber-950/60 text-amber-300 border border-amber-500/40",
    info: "bg-sky-950/60 text-sky-300 border border-sky-500/40"
  };
  const DISTRESS_STYLE = {
    critical: "border-red-500/60 bg-red-950/40 text-red-300",
    moderate: "border-amber-500/60 bg-amber-950/40 text-amber-300",
    minor: "border-yellow-500/60 bg-yellow-950/40 text-yellow-300",
    none: "border-emerald-500/60 bg-emerald-950/40 text-emerald-300"
  };
  const DISTRESS_TEXT = {
    critical: ["Critical Structural Distress Flagged", "Long fracture lines or deep spalling detected. Mandatory immediate engineering dispatch."],
    moderate: ["Moderate Surface Distress", "Localised cracking or dampness detected. Schedule detailed structural inspection."],
    minor: ["Minor Surface Weathering", "Cosmetic surface lines or hairline crazing only. Monitor on routine cycle."],
    none: ["No Dominant Distress Detected", "Surface integrity appears sound in facade telemetry."]
  };
  const TOAST_STYLE = {
    success: "border-l-4 border-emerald-500 bg-slate-900 text-white",
    error: "border-l-4 border-red-500 bg-slate-900 text-white",
    warn: "border-l-4 border-amber-500 bg-slate-900 text-white",
    info: "border-l-4 border-sky-500 bg-slate-900 text-white"
  };

  /* ======================================================================
   * Internal Default Dataset (12 Realistic Municipal Structures)
   * ==================================================================== */
  const DEFAULT_INTERNAL_DATASET = [
    {
      buildingId: "B-101",
      name: "The Old Foundry & Ironworks Mill",
      address: "148 Mill Street, Industrial Ward 4",
      ageYears: 122,
      primaryMaterial: "Brick",
      maintenanceScore: 2,
      codeCompliant: false,
      lastInspectionYearsAgo: 14,
      floors: 4,
      occupancyType: "Industrial",
      photoDataUrl: "images/cracked_brick_warehouse.jpg",
      visionAnalysis: {
        engine: "Benchmark sample (curated)", name: "The Old Foundry & Ironworks Mill", buildingTypology: "Industrial brick foundry / warehouse",
        primaryMaterial: "Brick", floors: 4, estimatedAgeYears: 122, crackSeverity: "critical", maintenanceScore: 2, confidenceScore: 0.94,
        detectedItems: ["Load-bearing brick piers", "Arched window heads", "Full-height diagonal shear fracture", "Iron fire escape"],
        detectedDefects: [{ name: "Full-height diagonal shear crack", details: "Stepped crack through brick courses from roofline to ground sill.", deduction: 10, severity: "danger" }],
        aiSummary: "A four-storey load-bearing brick structure with severe diagonal shear cracking. Immediate field cordoning required."
      },
      dispatchStatus: "NONE"
    },
    {
      buildingId: "B-102",
      name: "Heritage Timber Civic Hall",
      address: "Old Town Square, Civic Ward 2",
      ageYears: 95,
      primaryMaterial: "Wood",
      maintenanceScore: 4,
      codeCompliant: true,
      lastInspectionYearsAgo: 9,
      floors: 2,
      occupancyType: "Assembly",
      photoDataUrl: "images/heritage_timber_hall.jpg",
      visionAnalysis: {
        engine: "Benchmark sample (curated)", name: "Heritage Timber Civic Hall", buildingTypology: "Timber-framed civic hall",
        primaryMaterial: "Wood", floors: 2, estimatedAgeYears: 95, crackSeverity: "moderate", maintenanceScore: 4, confidenceScore: 0.85,
        detectedItems: ["Timber post-and-board frame", "Pitched roof", "Base moisture staining", "Split board bay"],
        detectedDefects: [{ name: "Timber plinth decay", details: "Persistent damp rot along lower sill plates.", deduction: 6, severity: "warning" }],
        aiSummary: "Timber civic assembly hall showing moisture decay at the plinth level. Combustible load and rot require audit."
      },
      dispatchStatus: "NONE"
    },
    {
      buildingId: "B-103",
      name: "St. Jude's Municipal Public School",
      address: "School Lane, Education Ward 9",
      ageYears: 52,
      primaryMaterial: "RCC",
      maintenanceScore: 3,
      codeCompliant: false,
      lastInspectionYearsAgo: 8,
      floors: 5,
      occupancyType: "School",
      photoDataUrl: "images/aging_concrete_school.jpg",
      visionAnalysis: {
        engine: "Benchmark sample (curated)", name: "St. Jude's Municipal Public School", buildingTypology: "Educational block",
        primaryMaterial: "RCC", floors: 5, estimatedAgeYears: 52, crackSeverity: "moderate", maintenanceScore: 3, confidenceScore: 0.89,
        detectedItems: ["RCC column-slab frame", "Deep window ledges", "Corrosion rust staining", "Spalled panel joints"],
        detectedDefects: [{ name: "Rebar spalling and corrosion", details: "Rust streaks beneath slab ledges with cover delamination.", deduction: 8, severity: "danger" }],
        aiSummary: "Concrete school block with widespread rust staining indicating reinforcement corrosion. Cover-meter survey required."
      },
      dispatchStatus: "NONE"
    },
    {
      buildingId: "B-104",
      name: "Central General Hospital - Annex C",
      address: "Civil Lines, Healthcare Ward 7",
      ageYears: 34,
      primaryMaterial: "RCC",
      maintenanceScore: 6,
      codeCompliant: true,
      lastInspectionYearsAgo: 4,
      floors: 6,
      occupancyType: "Hospital",
      photoDataUrl: "images/hospital_annex_concrete.jpg",
      visionAnalysis: {
        engine: "Benchmark sample (curated)", name: "Central General Hospital - Annex C", buildingTypology: "Healthcare annex",
        primaryMaterial: "RCC", floors: 6, estimatedAgeYears: 34, crackSeverity: "minor", maintenanceScore: 6, confidenceScore: 0.82,
        detectedItems: ["RCC frame", "Entrance canopy", "Hairline window cracks"],
        detectedDefects: [{ name: "Hairline plaster cracks", details: "Thermal movement above window heads.", deduction: 2, severity: "info" }],
        aiSummary: "Mid-rise hospital annex in fair condition with minor thermal hairline cracking."
      },
      dispatchStatus: "NONE"
    },
    {
      buildingId: "B-105",
      name: "Sunrise Commercial Plaza",
      address: "Market Road, Commercial Ward 5",
      ageYears: 12,
      primaryMaterial: "RCC",
      maintenanceScore: 8,
      codeCompliant: true,
      lastInspectionYearsAgo: 3,
      floors: 4,
      occupancyType: "Commercial",
      photoDataUrl: "images/sunrise_commercial_plaza.jpg",
      dispatchStatus: "NONE"
    },
    {
      buildingId: "B-106",
      name: "Aurora CBD Tower",
      address: "Financial District, Central Ward 1",
      ageYears: 8,
      primaryMaterial: "Steel",
      maintenanceScore: 9,
      codeCompliant: true,
      lastInspectionYearsAgo: 1,
      floors: 24,
      occupancyType: "Commercial",
      photoDataUrl: "images/modern_steel_tower.jpg",
      visionAnalysis: {
        engine: "Benchmark sample (curated)", name: "Aurora CBD Tower", buildingTypology: "Modern commercial tower",
        primaryMaterial: "Steel", floors: 24, estimatedAgeYears: 8, crackSeverity: "none", maintenanceScore: 9, confidenceScore: 0.95,
        detectedItems: ["Steel moment frame", "Glazed curtain wall", "Podium entrance canopy"],
        detectedDefects: [],
        aiSummary: "Glazed curtain wall steel high-rise in pristine condition. Routine annual fire and joint audit."
      },
      dispatchStatus: "NONE"
    },
    {
      buildingId: "B-107",
      name: "Azure Bay Coastal Apartments",
      address: "18 Marine Promenade, Coastal Ward 8",
      ageYears: 48,
      primaryMaterial: "RCC",
      maintenanceScore: 2,
      codeCompliant: false,
      lastInspectionYearsAgo: 11,
      floors: 7,
      occupancyType: "Residential",
      photoDataUrl: "images/azure_bay_apartments.jpg",
      visionAnalysis: {
        engine: "Benchmark sample (curated)", name: "Azure Bay Coastal Apartments", buildingTypology: "Residential multi-storey",
        primaryMaterial: "RCC", floors: 7, estimatedAgeYears: 48, crackSeverity: "critical", maintenanceScore: 2, confidenceScore: 0.91,
        detectedItems: ["RCC cantilevers", "Chloride salt pitting", "Balcony slab delamination", "Exposed rusty rebar"],
        detectedDefects: [{ name: "Marine chloride reinforcement loss", details: "Severe spalling on seaward cantilever balconies with over 30% rebar section loss.", deduction: 10, severity: "danger" }],
        aiSummary: "Coastal residential high-density block suffering severe chloride attack and balcony delamination. Cordoning needed."
      },
      dispatchStatus: "NONE"
    },
    {
      buildingId: "B-108",
      name: "Old City Hall Heritage Wing",
      address: "Council Avenue, Heritage Ward 3",
      ageYears: 88,
      primaryMaterial: "Brick",
      maintenanceScore: 3,
      codeCompliant: false,
      lastInspectionYearsAgo: 12,
      floors: 3,
      occupancyType: "Public",
      photoDataUrl: "images/distressed_concrete_cityhall.jpg",
      dispatchStatus: "NONE"
    },
    {
      buildingId: "B-109",
      name: "Apex Logistics Freight Terminal",
      address: "Cargo Way, Logistics Ward 11",
      ageYears: 18,
      primaryMaterial: "Steel",
      maintenanceScore: 8,
      codeCompliant: true,
      lastInspectionYearsAgo: 2,
      floors: 2,
      occupancyType: "Industrial",
      photoDataUrl: "images/glass_curtain_office.jpg",
      dispatchStatus: "NONE"
    },
    {
      buildingId: "B-110",
      name: "Victoria Market Timber Pavilions",
      address: "Bazaar Cross Road, Ward 6",
      ageYears: 76,
      primaryMaterial: "Wood",
      maintenanceScore: 3,
      codeCompliant: false,
      lastInspectionYearsAgo: 9,
      floors: 2,
      occupancyType: "Assembly",
      photoDataUrl: "images/wooden_heritage_lodge.jpg",
      dispatchStatus: "NONE"
    },
    {
      buildingId: "B-111",
      name: "Riverside Medical Research Annex",
      address: "Riverbank Parkway, Ward 10",
      ageYears: 14,
      primaryMaterial: "RCC",
      maintenanceScore: 8,
      codeCompliant: true,
      lastInspectionYearsAgo: 1,
      floors: 5,
      occupancyType: "Hospital",
      photoDataUrl: "images/hospital_annex_concrete.jpg",
      dispatchStatus: "NONE"
    },
    {
      buildingId: "B-112",
      name: "Urban West Heights Block D",
      address: "94 Sector 12 Boulevard, Ward 12",
      ageYears: 28,
      primaryMaterial: "RCC",
      maintenanceScore: 7,
      codeCompliant: true,
      lastInspectionYearsAgo: 3,
      floors: 8,
      occupancyType: "Residential",
      photoDataUrl: "images/urban_brick_apartments.jpg",
      dispatchStatus: "NONE"
    }
  ];

  /* Benchmark Preset Mapping for Side Inspector */
  const PRESETS = {
    cracked_brick: {
      name: "The Old Foundry Workshops", address: "148 Mill Street, Industrial Ward 4", age: 122, floors: 4, material: "Brick", occupancy: "Industrial", maintenance: 2, audit: 14, compliant: false,
      photo: "images/cracked_brick_warehouse.jpg",
      vision: DEFAULT_INTERNAL_DATASET[0].visionAnalysis
    },
    timber_hall: {
      name: "Heritage Timber Civic Hall", address: "Old Town Square, Civic Ward 2", age: 95, floors: 2, material: "Wood", occupancy: "Assembly", maintenance: 4, audit: 9, compliant: true,
      photo: "images/heritage_timber_hall.jpg",
      vision: DEFAULT_INTERNAL_DATASET[1].visionAnalysis
    },
    hospital_annex: {
      name: "Central General Hospital - Annex C", address: "Civil Lines, Healthcare Ward 7", age: 34, floors: 6, material: "RCC", occupancy: "Hospital", maintenance: 6, audit: 4, compliant: true,
      photo: "images/hospital_annex_concrete.jpg",
      vision: DEFAULT_INTERNAL_DATASET[3].visionAnalysis
    },
    concrete_school: {
      name: "St. Jude's Municipal Public School", address: "School Lane, Education Ward 9", age: 52, floors: 5, material: "RCC", occupancy: "School", maintenance: 3, audit: 8, compliant: false,
      photo: "images/aging_concrete_school.jpg",
      vision: DEFAULT_INTERNAL_DATASET[2].visionAnalysis
    },
    steel_tower: {
      name: "Aurora CBD Tower", address: "Financial District, Central Ward 1", age: 8, floors: 24, material: "Steel", occupancy: "Commercial", maintenance: 9, audit: 1, compliant: true,
      photo: "images/modern_steel_tower.jpg",
      vision: DEFAULT_INTERNAL_DATASET[5].visionAnalysis
    }
  };

  /* ======================================================================
   * State Management & Persistence
   * ==================================================================== */
  let buildings = [];
  let dispatches = [];
  let filter = "all";
  let query = "";
  let sortKey = "risk";
  let currentPage = 1;
  let pageSize = 25;
  let editingId = null;
  let editingCreatedAt = null;
  let currentPhoto = null;
  let currentVision = null;
  let targetDispatchId = null;
  let scanToken = 0;
  let cameraStream = null;

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.buildings) && data.buildings.length >= 500) {
          return data.buildings.map(b => new Building(b));
        }
      }
    } catch (e) { /* fallback */ }
    if (typeof window !== "undefined" && window.MUNICIPAL_1000_DATASET && Array.isArray(window.MUNICIPAL_1000_DATASET) && window.MUNICIPAL_1000_DATASET.length > 0) {
      return window.MUNICIPAL_1000_DATASET.map(b => new Building(b));
    }
    return DEFAULT_INTERNAL_DATASET.map(b => new Building(b));
  }

  function saveStore() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ v: 3, buildings: buildings }));
      return true;
    } catch (e) {
      try {
        const light = buildings.map(b => Object.assign({}, b, { photoDataUrl: b.photoDataUrl && /^data:image\/(jpeg|png|webp)/.test(b.photoDataUrl) ? null : b.photoDataUrl }));
        localStorage.setItem(STORE_KEY, JSON.stringify({ v: 3, buildings: light }));
        return true;
      } catch (e2) {
        toast("Storage quota limit reached. Data will persist in memory.", "warn");
        return false;
      }
    }
  }

  const SQUAD_ALPHA_FULL = "Squad Alpha — Rapid Collapse Response Team (Lead: Eng. Sarah Jenkins, PE)";
  const SQUAD_BRAVO_FULL = "Squad Bravo — Forensic Auditing Unit (Lead: Dr. Marcus Vance)";
  const SQUAD_DELTA_FULL = "Squad Delta — Healthcare & Public Facilities (Lead: Insp. Tariq Al-Mansoor)";
  const SQUAD_GAMMA_FULL = "Squad Gamma — Historic & Timber Taskforce (Lead: Eng. Elena Rostova)";

  function determineSquadForBuilding(b, res) {
    if (!res) res = engine.assess(b);

    // 1. Check CSV metadata recommendation if present
    const csvSquad = b._csvMeta && b._csvMeta.csvSquad ? b._csvMeta.csvSquad.toLowerCase() : "";
    if (csvSquad) {
      if (csvSquad.includes("delta") || csvSquad.includes("institutional") || csvSquad.includes("health") || csvSquad.includes("hospital") || csvSquad.includes("public")) {
        return {
          squad: SQUAD_DELTA_FULL,
          priority: "CODE RED — Immediate Cordoning (4 Hours SLA)",
          instructions: "High-consequence containment, verification of structural egress corridors, and emergency patient/occupant safety validation."
        };
      }
      if (csvSquad.includes("gamma") || csvSquad.includes("historic") || csvSquad.includes("timber") || csvSquad.includes("wood") || csvSquad.includes("heritage") || csvSquad.includes("masonry")) {
        return {
          squad: SQUAD_GAMMA_FULL,
          priority: "CODE RED — Immediate Cordoning (4 Hours SLA)",
          instructions: "Historic lime mortar degradation analysis, load-bearing timber dry-rot testing, and facade tie-back stability audit."
        };
      }
      if (csvSquad.includes("bravo") || csvSquad.includes("forensic") || csvSquad.includes("foundation") || csvSquad.includes("settlement")) {
        return {
          squad: SQUAD_BRAVO_FULL,
          priority: "CODE ORANGE — Mandatory Priority Audit (24 Hours SLA)",
          instructions: "Schmidt hammer hardness testing, core sampling extraction, and differential foundation settlement audit."
        };
      }
      if (csvSquad.includes("alpha") || csvSquad.includes("rapid") || csvSquad.includes("collapse")) {
        return {
          squad: SQUAD_ALPHA_FULL,
          priority: "CODE RED — Immediate Cordoning (4 Hours SLA)",
          instructions: "Immediate priority perimeter cordoning, laser displacement monitoring, and ultrasonic pulse velocity verification."
        };
      }
    }

    // 2. Specialized Assignment based on occupancy typology, material, age and distress
    const occ = (b.occupancyType || "").toLowerCase();
    const mat = (b.primaryMaterial || "").toLowerCase();
    const score = res.totalScore;

    // High-consequence institutional & public assembly (Hospitals, Clinics, Schools, Universities, Public halls) -> Squad Delta
    if (occ.includes("hospital") || occ.includes("school") || occ.includes("clinic") || occ.includes("public") || occ.includes("civic") || occ.includes("daycare") || occ.includes("assembly")) {
      return {
        squad: SQUAD_DELTA_FULL,
        priority: score < 30 ? "CODE RED — Immediate Cordoning (4 Hours SLA)" : "CODE ORANGE — Mandatory Priority Audit (24 Hours SLA)",
        instructions: "Immediate high-consequence containment, egress corridor verification, and patient/occupant safety assessment."
      };
    }

    // Historic, Timber, Brick Masonry, Non-standard or aging structures (60+ yrs) -> Squad Gamma
    if (mat.includes("wood") || mat.includes("timber") || mat.includes("brick") || mat.includes("masonry") || mat.includes("non-standard") || b.ageYears >= 60) {
      return {
        squad: SQUAD_GAMMA_FULL,
        priority: score < 30 ? "CODE RED — Immediate Cordoning (4 Hours SLA)" : "CODE ORANGE — Mandatory Priority Audit (24 Hours SLA)",
        instructions: "Historic masonry mortar degradation analysis, timber dry-rot testing, and facade tie-back integrity audit."
      };
    }

    // Imminent collapse hazard, severe structural fatigue, critical spalling (score < 30 or maintenance <= 2) -> Squad Alpha
    if (score < 30 || b.maintenanceScore <= 2) {
      return {
        squad: SQUAD_ALPHA_FULL,
        priority: "CODE RED — Immediate Cordoning (4 Hours SLA)",
        instructions: "Immediate priority perimeter cordoning, laser displacement monitoring, and ultrasonic pulse velocity verification."
      };
    }

    // Forensic engineering audit, concrete carbonation, core testing, statutory code non-compliance -> Squad Bravo
    return {
      squad: SQUAD_BRAVO_FULL,
      priority: "CODE ORANGE — Mandatory Priority Audit (24 Hours SLA)",
      instructions: "Forensic Schmidt rebound hammer testing, foundation settlement audit, and statutory seismic compliance verification."
    };
  }

  function loadDispatches() {
    try {
      const raw = localStorage.getItem(DISPATCH_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (Array.isArray(d)) {
          // Normalize existing dispatches so all 4 squads are represented according to building attributes
          let modified = false;
          const normalized = d.map(item => {
            const b = buildings.find(x => x.buildingId === item.buildingId);
            if (b && (!item.squad || item.squad === "Squad Alpha — Rapid Collapse Response Team" || item.squad.startsWith("Squad Alpha"))) {
              const spec = determineSquadForBuilding(b);
              if (spec.squad !== item.squad) {
                item.squad = spec.squad;
                item.priority = spec.priority;
                if (!item.instructions || item.instructions.includes("Immediate priority cordoning and ultrasonic verification")) {
                  item.instructions = spec.instructions;
                }
                if (b.dispatchDetails) {
                  b.dispatchDetails.squad = spec.squad;
                  b.dispatchDetails.priority = item.priority;
                  b.dispatchDetails.instructions = item.instructions;
                }
                modified = true;
              }
            }
            return item;
          });
          if (modified) {
            saveStore();
            try { localStorage.setItem(DISPATCH_KEY, JSON.stringify(normalized)); } catch (e) {}
          }
          return normalized;
        }
      }
    } catch (e) { /* fallback */ }
    return [];
  }

  function saveDispatches() {
    try { localStorage.setItem(DISPATCH_KEY, JSON.stringify(dispatches)); } catch (e) { /* ignore */ }
  }

  /* ======================================================================
   * Toasts & Modals
   * ==================================================================== */
  function toast(message, type) {
    const host = $("toastHost");
    if (!host) return;
    const el = document.createElement("div");
    el.className = "toast-in pointer-events-auto rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl ring-1 ring-slate-700/80 " + (TOAST_STYLE[type] || TOAST_STYLE.info);
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => el.remove(), type === "error" ? 6000 : 3800);
  }

  function openModal(id) { const m = $(id); if (m) { m.classList.add("open"); refreshIcons(); } }
  function closeModal(id) {
    const m = $(id);
    if (m) m.classList.remove("open");
    if (id === "webcamModal") stopCamera();
  }

  let confirmResolver = null;
  function confirmDialog(title, message, okText) {
    $("confirmTitle").textContent = title;
    $("confirmMsg").textContent = message;
    $("confirmOk").textContent = okText || "Confirm";
    openModal("confirmModal");
    return new Promise(resolve => { confirmResolver = resolve; });
  }
  function settleConfirm(v) {
    closeModal("confirmModal");
    if (confirmResolver) { confirmResolver(v); confirmResolver = null; }
  }

  /* ======================================================================
   * Side Drawer Controller (Camera & Elevation Scanner)
   * ==================================================================== */
  function openSideScanner() {
    $("sideDrawerBackdrop").classList.add("active");
    $("sideScannerDrawer").classList.add("open");
    refreshIcons();
  }

  function closeSideScanner() {
    $("sideDrawerBackdrop").classList.remove("active");
    $("sideScannerDrawer").classList.remove("open");
  }

  /* ======================================================================
   * Scoring & Prioritization
   * ==================================================================== */
  function assessAll() {
    const results = buildings.map(b => engine.assess(b));
    const byRisk = results.slice().sort((a, b) =>
      Number(a.totalScore < 50) - Number(b.totalScore < 50) === 0
        ? a.totalScore - b.totalScore
        : (a.totalScore < 50 ? -1 : 1)
    );
    const rank = new Map();
    byRisk.forEach((r, i) => rank.set(r.building.buildingId, i + 1));
    return { results, byRisk, rank };
  }

  function dueText(res) {
    if (res.totalScore >= 75.0) return "Routine Annual Cycle";
    if (res.totalScore >= 50.0) return "60 Days Municipal SLA";
    return res.totalScore < 30 ? "Immediate (24 Hours SLA)" : "Urgent (14 Days SLA)";
  }

  /* ======================================================================
   * Workspace View Switching & Layout Management
   * ==================================================================== */
  let currentView = "queue";

  function switchView(viewName) {
    currentView = viewName;
    document.querySelectorAll("[data-nav-view]").forEach(tab => {
      const active = tab.dataset.navView === viewName;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll(".app-view-container").forEach(c => {
      c.classList.toggle("hidden", c.id !== ("view-" + viewName));
    });
    if (viewName === "analytics") renderAnalytics();
    if (viewName === "deployments") renderOperationsView();
    if (viewName === "rules") renderRulesView();
    if (viewName === "simulator") simulate();
    refreshIcons();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ======================================================================
   * UI Rendering (Ribbon, Alert Banner, Queue, Views)
   * ==================================================================== */
  function renderAll() {
    const { results, byRisk, rank } = assessAll();
    renderKpis(results);
    renderHazardBanner(results);
    renderQueue(results, rank);
    renderDispatchLogUI();
    if (currentView === "analytics") renderAnalytics();
    if (currentView === "deployments") renderOperationsView();
    if (currentView === "rules") renderRulesView();
    refreshIcons();
  }

  function renderKpis(results) {
    const n = results.length;
    const criticalCount = results.filter(r => r.totalScore < 50.0).length;
    const dispatchedCount = buildings.filter(b => b.dispatchStatus === "DISPATCHED").length;
    const pendingCriticalCount = results.filter(r => r.totalScore < 50.0 && r.building.dispatchStatus !== "DISPATCHED").length;
    const avgScore = n ? (results.reduce((s, r) => s + r.totalScore, 0) / n).toFixed(1) : "0.0";
    const compRate = n ? Math.round((buildings.filter(b => b.codeCompliant).length / n) * 100) + "%" : "0%";

    // Top ribbon KPIs
    if ($("kpiTotal")) $("kpiTotal").textContent = n.toLocaleString();
    if ($("kpiFlagged")) $("kpiFlagged").textContent = criticalCount.toLocaleString();
    if ($("kpiDispatched")) $("kpiDispatched").textContent = dispatchedCount.toLocaleString();
    if ($("kpiPendingDispatch")) {
      $("kpiPendingDispatch").textContent = pendingCriticalCount > 0 ? `(${pendingCriticalCount} pending)` : `(All mobilized)`;
      $("kpiPendingDispatch").className = pendingCriticalCount > 0 ? "text-[10px] font-mono font-bold text-amber-400" : "text-[10px] font-mono font-bold text-emerald-400";
    }
    if ($("kpiAvg")) $("kpiAvg").textContent = avgScore;
    if ($("kpiComp")) $("kpiComp").textContent = compRate;
    if ($("headerDispatchCount")) $("headerDispatchCount").textContent = dispatchedCount;

    // Sidebar KPIs (The 2nd Image in Left Sidebar!)
    if ($("sidebarKpiTotal")) $("sidebarKpiTotal").textContent = n.toLocaleString();
    if ($("sidebarKpiFlagged")) $("sidebarKpiFlagged").textContent = criticalCount.toLocaleString();
    if ($("sidebarKpiDispatched")) $("sidebarKpiDispatched").textContent = dispatchedCount.toLocaleString();
    if ($("sidebarKpiPendingDispatch")) {
      $("sidebarKpiPendingDispatch").textContent = pendingCriticalCount > 0 ? `(${pendingCriticalCount} pending)` : `(All mobilized)`;
      $("sidebarKpiPendingDispatch").className = pendingCriticalCount > 0 ? "text-[9px] font-mono font-bold text-amber-400" : "text-[9px] font-mono font-bold text-emerald-400";
    }
    if ($("sidebarKpiAvg")) $("sidebarKpiAvg").textContent = avgScore;
    if ($("sidebarKpiComp")) $("sidebarKpiComp").textContent = compRate;

    // Badges in Top Nav and Sidebar Nav
    if ($("navQueueBadge")) $("navQueueBadge").textContent = n.toLocaleString();
    if ($("sidebarNavQueueBadge")) $("sidebarNavQueueBadge").textContent = n.toLocaleString();
    if ($("navDispatchBadge")) $("navDispatchBadge").textContent = dispatchedCount.toLocaleString();
    if ($("sidebarNavDispatchBadge")) $("sidebarNavDispatchBadge").textContent = dispatchedCount.toLocaleString();
  }

  function renderHazardBanner(results) {
    const banner = $("hazardAlertBanner");
    const pendingCriticals = results.filter(r => r.totalScore < 50.0 && r.building.dispatchStatus !== "DISPATCHED");
    const count = pendingCriticals.length;

    // Update Officer Operations batch deploy button
    const opDeployBtn = $("btnDeploymentsBatchDispatch");
    if (opDeployBtn) {
      if (count > 0) {
        opDeployBtn.innerHTML = `<i data-lucide="siren" class="w-3.5 h-3.5"></i><span>Deploy to All Critical Sites (${count})</span>`;
        opDeployBtn.disabled = false;
        opDeployBtn.classList.remove("opacity-50", "cursor-not-allowed");
      } else {
        opDeployBtn.innerHTML = `<i data-lucide="shield-check" class="w-3.5 h-3.5"></i><span>All Critical Sites Mobilized</span>`;
        opDeployBtn.disabled = true;
        opDeployBtn.classList.add("opacity-50", "cursor-not-allowed");
      }
    }

    if (count > 0) {
      // Undispatched critical hazards exist or a new risk factor has appeared: show notification banner!
      if (banner) banner.classList.remove("hidden");
      if ($("criticalCountBadge")) $("criticalCountBadge").textContent = `🚩 ${count} RED FLAGGED`;
      if ($("batchCountBadge")) $("batchCountBadge").textContent = count;
      if ($("dispatchSummaryText")) {
        $("dispatchSummaryText").textContent = `${count} structures exhibit critical failure or severe distress conditions (score < 50) requiring on-site officer dispatch.`;
      }
      if ($("btnBatchDispatch")) {
        $("btnBatchDispatch").classList.remove("hidden");
        $("btnBatchDispatch").innerHTML = `<i data-lucide="siren" class="w-4 h-4 text-white"></i><span>Send Officers to All Critical Sites (<span id="batchCountBadge">${count}</span>)</span>`;
      }
    } else {
      // All critical sites have been dispatched! Remove notification until a new risk factor appears.
      if (banner) banner.classList.add("hidden");
      if ($("btnBatchDispatch")) $("btnBatchDispatch").classList.add("hidden");
    }
  }

  function renderQueue(results, rank) {
    let list = results.slice();
    if (filter === "critical") list = list.filter(r => r.totalScore < 50.0);
    else if (filter === "high") list = list.filter(r => r.totalScore < 50.0);
    else if (filter === "medium") list = list.filter(r => r.totalScore >= 50.0 && r.totalScore < 75.0);
    else if (filter === "low") list = list.filter(r => r.totalScore >= 75.0);
    else if (filter === "dispatched") list = list.filter(r => r.building.dispatchStatus === "DISPATCHED");

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(r => {
        const b = r.building;
        return [b.name, b.buildingId, b.address, b.primaryMaterial, b.occupancyType].join(" ").toLowerCase().includes(q);
      });
    }

    // Sort results
    if (sortKey === "age") list.sort((a, b) => b.building.ageYears - a.building.ageYears);
    else if (sortKey === "audit") list.sort((a, b) => b.building.lastInspectionYearsAgo - a.building.lastInspectionYearsAgo);
    else if (sortKey === "name") list.sort((a, b) => a.building.name.localeCompare(b.building.name));
    else list.sort((a, b) => rank.get(a.building.buildingId) - rank.get(b.building.buildingId));

    $("queueCounterBadge").textContent = list.length.toLocaleString() + " Structures";
    const empty = $("queueEmpty"), wrap = $("tablePagination");
    if (!list.length) {
      empty.classList.remove("hidden");
      if (wrap) wrap.classList.add("hidden");
      $("queueBody").innerHTML = "";
      return;
    }
    empty.classList.add("hidden");
    if (wrap) wrap.classList.remove("hidden");

    // Pagination
    const totalPages = Math.ceil(list.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, list.length);
    const paged = list.slice(startIdx, endIdx);

    $("pageInfoText").textContent = `Showing ${startIdx + 1}-${endIdx} of ${list.length.toLocaleString()} structures`;
    $("pageNumberBadge").textContent = `Page ${currentPage} of ${totalPages}`;
    $("btnPrevPage").disabled = currentPage <= 1;
    $("btnNextPage").disabled = currentPage >= totalPages;

    const ALL_PHOTO_CATALOG = [
      "images/aging_concrete_school.jpg", "images/azure_bay_apartments.jpg", "images/brick_elementary_school.jpg",
      "images/brick_library_facade.jpg", "images/commercial_steel_complex.jpg", "images/concrete_hospital_clinic.jpg",
      "images/cracked_brick_warehouse.jpg", "images/distressed_concrete_cityhall.jpg", "images/distressed_concrete_facade.jpg",
      "images/glass_commercial_shopping_mall.jpg", "images/glass_curtain_office.jpg", "images/heritage_timber_hall.jpg",
      "images/hospital_annex_concrete.jpg", "images/industrial_foundry_factory.jpg", "images/modern_glass_steel_tower.jpg",
      "images/modern_steel_tower.jpg", "images/modern_timber_community_hall.jpg", "images/residential_apartment_complex.jpg",
      "images/sunrise_commercial_plaza.jpg", "images/urban_brick_apartments.jpg", "images/weathered_brick_academy_hall.jpg",
      "images/weathered_school_block.jpg", "images/wooden_heritage_lodge.jpg"
    ];

    let lastRenderedPhoto = "";

    $("queueBody").innerHTML = paged.map((r, rowIdx) => {
      const b = r.building;
      const isCritical = r.totalScore < 50.0;
      const isDispatched = b.dispatchStatus === "DISPATCHED";

      // Anti-Collision Guarantee: Never show the same photo in adjacent rows
      let photoSrc = b.photoDataUrl;
      if (photoSrc && photoSrc === lastRenderedPhoto) {
        const altPool = ALL_PHOTO_CATALOG.filter(p => p !== lastRenderedPhoto);
        photoSrc = altPool[(rowIdx * 5 + 3) % altPool.length];
      }
      if (photoSrc) lastRenderedPhoto = photoSrc;

      const thumb = photoSrc
        ? '<button type="button" data-action="photo" data-id="' + esc(b.buildingId) + '" class="h-12 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900 shadow-sm hover:ring-2 hover:ring-sky-400 transition" aria-label="View photo"><img src="' + esc(photoSrc) + '" alt="" class="h-full w-full object-cover" onerror="this.style.display=\'none\'; if(this.nextElementSibling)this.nextElementSibling.style.display=\'flex\';"><div class="hidden h-full w-full items-center justify-center bg-slate-800 text-slate-400"><i data-lucide="building-2" class="h-5 w-5"></i></div></button>'
        : '<div class="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800 text-slate-500 shadow-sm"><i data-lucide="building-2" class="h-5 w-5"></i></div>';

      // Strict User Rule: >75 safe, 50-75 medium, <50 critical red flag
      let conditionBadge;
      if (r.totalScore >= 75.0) {
        conditionBadge = '<span class="status-badge-safe inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i> SAFE / SOUND</span>';
      } else if (r.totalScore >= 50.0) {
        conditionBadge = '<span class="status-badge-medium inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> MEDIUM RISK</span>';
      } else {
        conditionBadge = '<span class="status-badge-critical red-flag-badge font-bold"><i data-lucide="flag" class="w-3.5 h-3.5 inline"></i> 🚩 CRITICAL HAZARD</span>';
      }

      // Officer Dispatch CTA button or Dispatched badge
      const dispatchAction = isDispatched
        ? '<div class="flex flex-col gap-0.5"><span class="dispatched-status-tag" title="Field Officers Mobilized"><i data-lucide="shield-check" class="w-3.5 h-3.5 text-indigo-400"></i> Dispatched</span>' +
          (b.dispatchDetails && b.dispatchDetails.squad ? '<span class="text-[9px] text-indigo-300 font-mono truncate max-w-[130px] font-semibold">' + esc(b.dispatchDetails.squad.split("—")[0].trim()) + '</span>' : '') + '</div>'
        : (isCritical
          ? '<button type="button" data-action="dispatch" data-id="' + esc(b.buildingId) + '" class="btn-lift flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-600 text-white shadow-sm border border-rose-500/50 transition"><i data-lucide="siren" class="w-3.5 h-3.5 text-white"></i> <span>Send Officers</span></button>'
          : '<button type="button" data-action="dispatch" data-id="' + esc(b.buildingId) + '" class="btn-lift btn-glow-sky flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition"><i data-lucide="send" class="w-3.5 h-3.5 text-sky-400"></i> <span>Dispatch</span></button>');

      // Score display with clear Grade tag & colored progress meter
      let scoreHtml;
      if (r.totalScore < 50.0) {
        scoreHtml = '<div class="flex items-baseline gap-1.5"><span class="font-mono text-base font-black text-rose-500">' + r.totalScore.toFixed(1) + '</span><span class="text-[9px] font-mono px-1.5 py-0.2 rounded font-black bg-rose-500/20 text-rose-400 border border-rose-500/40">GRADE ' + r.grade + '</span></div>' +
          '<div class="mt-1 h-2 w-20 overflow-hidden rounded-full bg-slate-800 border border-slate-700/60"><div class="h-full rounded-full bg-rose-600 shadow-sm" style="width:' + Math.max(6, r.totalScore) + '%"></div></div>';
      } else if (r.totalScore < 75.0) {
        scoreHtml = '<div class="flex items-baseline gap-1.5"><span class="font-mono text-base font-black text-amber-400">' + r.totalScore.toFixed(1) + '</span><span class="text-[9px] font-mono px-1.5 py-0.2 rounded font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">GRADE ' + r.grade + '</span></div>' +
          '<div class="mt-1 h-2 w-20 overflow-hidden rounded-full bg-slate-800 border border-slate-700/60"><div class="h-full rounded-full bg-amber-500 shadow-sm" style="width:' + r.totalScore + '%"></div></div>';
      } else {
        scoreHtml = '<div class="flex items-baseline gap-1.5"><span class="font-mono text-base font-black text-emerald-400">' + r.totalScore.toFixed(1) + '</span><span class="text-[9px] font-mono px-1.5 py-0.2 rounded font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">GRADE ' + r.grade + '</span></div>' +
          '<div class="mt-1 h-2 w-20 overflow-hidden rounded-full bg-slate-800 border border-slate-700/60"><div class="h-full rounded-full bg-emerald-500 shadow-sm" style="width:' + r.totalScore + '%"></div></div>';
      }

      return '<tr class="transition-colors hover:bg-slate-800/60 ' + (isCritical ? 'critical-hazard-row' : '') + '" data-row="' + esc(b.buildingId) + '">' +
        '<td class="px-4 py-3.5 font-mono text-xs font-bold ' + (isCritical ? 'text-rose-400' : 'text-slate-500') + '">#' + rank.get(b.buildingId) + '</td>' +
        '<td class="px-4 py-3.5"><div class="flex items-center gap-3">' + thumb +
        '<div class="min-w-0"><div class="flex items-center gap-2 flex-wrap"><p class="truncate font-bold text-white font-heading text-sm">' + esc(b.name) + '</p>' +
        '<span class="font-mono text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/30 px-1.5 py-0.2 rounded font-bold">' + esc(b.buildingId) + '</span></div>' +
        '<p class="truncate text-xs text-slate-400 mt-0.5">' + esc(b.address) + '</p>' +
        '<div class="mt-1.5 flex items-center gap-1.5 flex-wrap text-[10px]">' +
        '<span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold border border-slate-700/60">' + esc(b.primaryMaterial) + '</span>' +
        '<span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium border border-slate-700/60">' + b.floors + ' fl</span>' +
        '<span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium border border-slate-700/60">' + b.ageYears + ' yrs</span>' +
        '<span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium border border-slate-700/60">' + esc(b.occupancyType) + '</span>' +
        '</div></div></div></td>' +
        '<td class="px-4 py-3.5">' + scoreHtml + '</td>' +
        '<td class="px-4 py-3.5"><div class="space-y-1">' + conditionBadge + '<p class="text-[10px] text-slate-400 font-mono flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3 text-slate-500"></i>' + dueText(r) + '</p></div></td>' +
        '<td class="px-4 py-3.5">' + dispatchAction + '</td>' +
        '<td class="px-4 py-3.5"><div class="flex justify-end gap-1">' +
        '<button type="button" data-action="audit" data-id="' + esc(b.buildingId) + '" class="row-btn text-slate-400 hover:text-sky-400 hover:bg-slate-800" title="View Audit Report & Print Notice"><i data-lucide="file-search" class="h-4 w-4"></i></button>' +
        '<button type="button" data-action="edit" data-id="' + esc(b.buildingId) + '" class="row-btn text-slate-400 hover:text-amber-400 hover:bg-slate-800" title="Edit in Live Assessment Studio"><i data-lucide="pencil" class="h-4 w-4"></i></button>' +
        '<button type="button" data-action="scan" data-id="' + esc(b.buildingId) + '" class="row-btn text-slate-400 hover:text-sky-400 hover:bg-slate-800" title="Inspect Elevation in Vision Lab"><i data-lucide="camera" class="h-4 w-4"></i></button>' +
        '<button type="button" data-action="delete" data-id="' + esc(b.buildingId) + '" class="row-btn text-slate-400 hover:text-red-400 hover:bg-slate-800" title="Delete Structure"><i data-lucide="trash-2" class="h-4 w-4"></i></button>' +
        '</div></td></tr>';
    }).join("");
  }

  /* ======================================================================
   * Dedicated View Renderers (Analytics, Operations, Rules)
   * ==================================================================== */
  function renderAnalytics() {
    const { results } = assessAll();
    const total = results.length;
    if (!total) return;

    const criticals = results.filter(r => r.totalScore < 50.0);
    const mediums = results.filter(r => r.totalScore >= 50.0 && r.totalScore < 75.0);
    const safes = results.filter(r => r.totalScore >= 75.0);
    const overdue = buildings.filter(b => b.lastInspectionYearsAgo >= 5);
    const compliant = buildings.filter(b => b.codeCompliant);

    const avgScore = results.reduce((s, r) => s + r.totalScore, 0) / total;
    const critPct = (criticals.length / total) * 100;
    const medPct = (mediums.length / total) * 100;
    const safePct = (safes.length / total) * 100;
    const overduePct = (overdue.length / total) * 100;
    const compPct = (compliant.length / total) * 100;

    if ($("analyticsCriticalPct")) $("analyticsCriticalPct").textContent = critPct.toFixed(1) + "%";
    if ($("analyticsAvgScore")) $("analyticsAvgScore").textContent = avgScore.toFixed(1);
    if ($("analyticsOverduePct")) $("analyticsOverduePct").textContent = overduePct.toFixed(1) + "%";
    if ($("analyticsCompliancePct")) $("analyticsCompliancePct").textContent = Math.round(compPct) + "%";

    const rb = $("analyticsRiskBands");
    if (rb) {
      rb.innerHTML = `
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs font-semibold">
            <span class="text-rose-400 flex items-center gap-1.5 font-heading"><i data-lucide="flag" class="w-3.5 h-3.5"></i> Critical Hazard (&lt;50.0)</span>
            <span class="font-mono text-white font-bold">${criticals.length.toLocaleString()} structures (${critPct.toFixed(1)}%)</span>
          </div>
          <div class="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div class="h-full bg-rose-600 rounded-full" style="width: ${critPct}%"></div>
          </div>
        </div>
        <div class="space-y-1.5 pt-1">
          <div class="flex justify-between text-xs font-semibold">
            <span class="text-amber-400 flex items-center gap-1.5 font-heading"><i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> Medium Risk (50.0–74.9)</span>
            <span class="font-mono text-white font-bold">${mediums.length.toLocaleString()} structures (${medPct.toFixed(1)}%)</span>
          </div>
          <div class="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div class="h-full bg-amber-500 rounded-full" style="width: ${medPct}%"></div>
          </div>
        </div>
        <div class="space-y-1.5 pt-1">
          <div class="flex justify-between text-xs font-semibold">
            <span class="text-emerald-400 flex items-center gap-1.5 font-heading"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Safe & Sound (≥75.0)</span>
            <span class="font-mono text-white font-bold">${safes.length.toLocaleString()} structures (${safePct.toFixed(1)}%)</span>
          </div>
          <div class="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div class="h-full bg-emerald-500 rounded-full" style="width: ${safePct}%"></div>
          </div>
        </div>
      `;
    }

    const mm = $("analyticsMaterialMatrix");
    if (mm) {
      const materials = ["RCC", "Brick", "Steel", "Wood", "Mixed", "Other"];
      const matData = materials.map(m => {
        const matching = results.filter(r => r.building.primaryMaterial === m);
        const count = matching.length;
        const avg = count ? (matching.reduce((s, r) => s + r.totalScore, 0) / count).toFixed(1) : "0.0";
        const crit = count ? Math.round((matching.filter(r => r.totalScore < 50).length / count) * 100) : 0;
        return { name: m, count, avg, crit };
      }).filter(x => x.count > 0);

      mm.innerHTML = matData.map(m => `
        <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div class="min-w-0">
            <span class="font-bold text-white font-heading text-sm">${m.name}</span>
            <span class="text-slate-400 text-[11px] block mt-0.5">${m.count.toLocaleString()} buildings &bull; ${m.crit}% critical hazard share</span>
          </div>
          <div class="text-right shrink-0">
            <span class="font-mono font-bold text-white text-base">${m.avg}</span>
            <span class="text-[10px] text-slate-400 block font-mono">avg score</span>
          </div>
        </div>
      `).join("");
    }
  }

  function renderOperationsView() {
    const list = $("dispatchLogList");
    const empty = $("dispatchLogEmpty");
    const countBadge = $("operationsCountBadge");
    if (countBadge) countBadge.textContent = `${dispatches.length} Active Missions`;

    if (!dispatches.length) {
      if (empty) empty.classList.remove("hidden");
      if (list) list.innerHTML = "";
      return;
    }
    if (empty) empty.classList.add("hidden");

    if (list) {
      list.innerHTML = dispatches.slice().reverse().map(d => {
        const b = buildings.find(x => x.buildingId === d.buildingId);
        const bName = b ? b.name : "Target Site";
        const bScore = b ? engine.assess(b).totalScore.toFixed(1) : "N/A";
        return `
          <div class="rounded-2xl border border-indigo-500/30 bg-slate-950 p-4 space-y-2.5 shadow-md">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <span class="font-bold text-sm text-white font-heading">${esc(bName)}</span>
                <span class="font-mono text-xs text-sky-400 font-bold ml-1.5">[${esc(d.buildingId)}]</span>
                <span class="text-xs text-slate-400 block mt-0.5">${esc(d.address || (b ? b.address : ""))}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="red-flag-badge">Score: ${bScore}</span>
                <span class="dispatched-status-tag"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i> ACTIVE MISSION</span>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800">
              <div>
                <span class="text-[10px] text-slate-400 font-mono block">Squad Assignment:</span>
                <span class="font-semibold text-indigo-300">${esc(d.squad)}</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-400 font-mono block">Priority &amp; Statutory SLA:</span>
                <span class="font-semibold text-rose-400">${esc(d.priority)}</span>
              </div>
            </div>
            ${d.instructions ? `<p class="text-xs text-slate-300 bg-slate-900/90 p-3 rounded-xl border border-slate-800 leading-relaxed font-medium"><strong>Directives:</strong> ${esc(d.instructions)}</p>` : ''}
            <div class="flex items-center justify-between text-xs text-slate-400 font-mono pt-1">
              <span>Dispatched: ${esc(d.dispatchedAt ? fmtLong(new Date(d.dispatchedAt)) : (d.timestamp || "Active"))}</span>
              <button type="button" data-action="audit" data-id="${esc(d.buildingId)}" class="text-sky-400 hover:text-sky-300 hover:underline font-bold transition flex items-center gap-1">View Audit Findings &rarr;</button>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  function renderRulesView() {
    const grid = $("strategyRulesCatalogGrid");
    if (!grid) return;
    const catalog = [
      { rule: "AgeRule", category: "Lifespan & Fatigue", desc: "Evaluates material carbonation, aggregate relaxation, and lime mortar leaching as buildings age.", items: [["60+ years", 25], ["40-59 years", 18], ["25-39 years", 10], ["15-24 years", 5], ["Under 15 years", 0]] },
      { rule: "MaterialRule", category: "Material Integrity", desc: "Assesses inherent ductility, fire resistance, and dry rot vulnerability based on structural composition.", items: [["Wood / Timber", 18], ["Non-standard", 15], ["Brick Masonry", 12], ["Mixed / Composite", 10], ["Steel", 3], ["RCC (baseline)", 0]] },
      { rule: "MaintenanceRule", category: "Physical Upkeep", desc: "Deducts score for deferred maintenance, spalling, and unaddressed distress (1–10 engineering rating).", items: [["Rating 1-2 (Severe)", 25], ["Rating 3-4 (Substandard)", 18], ["Rating 5-6 (Average)", 10], ["Rating 7-8 (Good)", 4], ["Rating 9-10 (Pristine)", 0]] },
      { rule: "CodeComplianceRule", category: "Statutory Standards", desc: "Penalizes failure to comply with NBC seismic zoning regulations and statutory fire codes.", items: [["Non-Compliant with NBC seismic codes", 20], ["Verified Compliant", 0]] },
      { rule: "InspectionRecencyRule", category: "Audit Monitoring", desc: "Flags overdue statutory structural audit intervals exceeding mandatory 3-to-5 year thresholds.", items: [["10+ years overdue", 15], ["7-9 years overdue", 10], ["5-6 years overdue", 5], ["Under 5 years", 0]] },
      { rule: "HeightOccupancyRule", category: "Consequence Exposure", desc: "Evaluates lateral load risk and consequence factors for hospitals, schools, and high-rise structures.", items: [["10+ floors (High-rise)", 8], ["5-9 floors (Mid-rise)", 4], ["High consequence (Hospital, School, Public)", 7], ["Commercial / Mixed", 3], ["Residential", 0]] },
      { rule: "VisualDistressRule", category: "Computer Vision Telemetry", desc: "Incorporates computer-vision-detected facade fractures, diagonal shear cracks, and cover spalling.", items: [["Critical crack fracture", 10], ["Moderate surface distress", 6], ["Minor cosmetic lines", 2], ["Sound surface", 0]] }
    ];

    grid.innerHTML = catalog.map(c => `
      <div class="rule-catalog-card rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
        <div>
          <div class="rule-catalog-header px-4 py-3.5 border-b border-slate-800">
            <div class="flex items-center justify-between">
              <span class="font-bold text-sm text-white font-heading">${esc(c.rule)}</span>
              <span class="text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-400/30">${esc(c.category)}</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1.5 leading-relaxed">${esc(c.desc)}</p>
          </div>
          <ul class="rule-catalog-list divide-y divide-slate-800 text-xs">
            ${c.items.map(i => `
              <li class="rule-catalog-item flex justify-between gap-3 px-4 py-2.5">
                <span class="rule-item-label text-slate-300 font-medium">${esc(i[0])}</span>
                <span class="rule-item-points font-mono font-bold ${i[1] ? 'point-deduction' : 'point-zero'}">${i[1] ? '-' + i[1] : '0'}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `).join("");
  }

  /* ======================================================================
   * Officer Emergency Dispatch Flow
   * ==================================================================== */
  function openDispatchModal(id) {
    const res = findResult(id);
    if (!res) return;
    targetDispatchId = id;
    const b = res.building;
    const spec = determineSquadForBuilding(b, res);

    $("dispBuildingName").textContent = b.name + " (" + b.buildingId + ")";
    $("dispScoreBadge").textContent = "Score: " + res.totalScore.toFixed(1) + " (" + res.riskLevel + ")";
    $("dispScoreBadge").className = res.isCritical ? "red-flag-badge" : "inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300";
    $("dispBuildingDetails").textContent = `${b.address} • ${b.primaryMaterial} • ${b.floors} Storeys • Age: ${b.ageYears} yrs`;
    $("dispHazardReasonBox").textContent = res.hazardFlagReason || "Mandatory municipal structural stability verification.";

    // Auto-select recommended squad matching building domain
    const squadSelect = $("dispSquadSelect");
    if (squadSelect) {
      let matched = false;
      Array.from(squadSelect.options).forEach((opt, i) => {
        if (!matched && (opt.value === spec.squad || opt.value.toLowerCase().includes(spec.squad.toLowerCase().slice(0, 15)))) {
          squadSelect.selectedIndex = i;
          matched = true;
        }
      });
    }

    // Auto-select priority
    const prioSelect = $("dispPrioritySelect");
    if (prioSelect) {
      Array.from(prioSelect.options).forEach((opt, i) => {
        if (opt.value.includes(spec.priority.split("—")[0].trim())) {
          prioSelect.selectedIndex = i;
        }
      });
    }

    // Pre-fill directives with CSV action items if available, else specialized squad instructions
    const csvActions = b._csvMeta && b._csvMeta.csvActions ? b._csvMeta.csvActions : "";
    const dispInstr = $("dispInstructions");
    if (dispInstr) {
      if (csvActions) {
        const lines = csvActions.split(" | ").filter(l => l.trim() && !l.includes("\uD83D\uDEA8") && !l.includes("\u26A1")).slice(0, 2);
        dispInstr.value = lines.length ? lines.join(" ") : spec.instructions;
      } else {
        dispInstr.value = spec.instructions;
      }
    }

    openModal("dispatchModal");
  }

  function confirmDispatch() {
    if (!targetDispatchId) return;
    const b = buildings.find(x => x.buildingId === targetDispatchId);
    if (!b) return;

    const squad = $("dispSquadSelect").value;
    const priority = $("dispPrioritySelect").value;
    const instructions = $("dispInstructions").value.trim() || "Immediate on-site structural parameter verification.";
    const now = new Date().toISOString();

    b.dispatchStatus = "DISPATCHED";
    b.dispatchDetails = {
      squad,
      priority,
      instructions,
      dispatchedAt: now
    };

    // Log to registry
    dispatches.unshift({
      buildingId: b.buildingId,
      name: b.name,
      address: b.address,
      squad,
      priority,
      instructions,
      dispatchedAt: now
    });

    saveStore();
    saveDispatches();
    closeModal("dispatchModal");
    renderAll();
    toast(`🚨 Officers Dispatched to ${b.buildingId} (${b.name}) under ${priority.split("—")[0]}!`, "success");
    targetDispatchId = null;
  }

  function batchDispatchCritical() {
    const { results } = assessAll();
    const criticals = results.filter(r => r.totalScore < 50.0 && r.building.dispatchStatus !== "DISPATCHED");
    if (!criticals.length) {
      toast("All critical structures (< 50) already have officers dispatched.", "info");
      return;
    }

    const now = new Date().toISOString();
    criticals.forEach(r => {
      const b = r.building;
      const spec = determineSquadForBuilding(b, r);
      b.dispatchStatus = "DISPATCHED";
      b.dispatchDetails = {
        squad: spec.squad,
        priority: spec.priority,
        instructions: spec.instructions,
        dispatchedAt: now
      };
      dispatches.unshift({
        buildingId: b.buildingId,
        name: b.name,
        address: b.address,
        squad: spec.squad,
        priority: spec.priority,
        instructions: spec.instructions,
        dispatchedAt: now
      });
    });

    saveStore();
    saveDispatches();
    renderAll();
    toast(`🚨 Mobilized specialized squads (Alpha, Bravo, Delta, Gamma) to all ${criticals.length} critical sites!`, "success");
  }

  function renderDispatchLogUI() {
    const list = $("modalDispatchLogList") || $("dispatchLogList");
    const empty = $("modalDispatchLogEmpty") || $("dispatchLogEmpty");
    if (!list) return;

    if (!dispatches.length) {
      list.innerHTML = "";
      if (empty) empty.classList.remove("hidden");
      return;
    }
    if (empty) empty.classList.add("hidden");

    list.innerHTML = dispatches.slice(0, 50).map((d, i) =>
      '<div class="rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 space-y-1.5 shadow-sm">' +
      '<div class="flex items-center justify-between"><div class="font-bold text-white font-heading text-xs">#' + (i + 1) + ' ' + esc(d.name || d.buildingId) + ' (' + esc(d.buildingId) + ')</div><span class="rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono text-[10px] font-bold px-2 py-0.5">' + esc((d.priority || "").split("—")[0]) + '</span></div>' +
      '<div class="text-[11px] text-indigo-300 font-semibold">' + esc(d.squad) + '</div>' +
      '<p class="text-[11px] text-slate-300 italic">"' + esc(d.instructions) + '"</p>' +
      '<div class="text-[10px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800 pt-1.5"><span>Target: ' + esc(d.address || "") + '</span><button type="button" data-action="audit" data-id="' + esc(d.buildingId) + '" class="text-sky-400 hover:underline font-bold">View Audit Findings &rarr;</button></div></div>').join("");
  }

  /* ======================================================================
   * Live Simulator & Form
   * ==================================================================== */
  function nextId() {
    let max = 100;
    buildings.forEach(b => { const m = /^B-(\d+)$/.exec(b.buildingId); if (m) max = Math.max(max, Number(m[1])); });
    return "B-" + (max + 1);
  }

  function draftBuilding() {
    return new Building({
      buildingId: $("fId").value,
      name: $("fName").value,
      address: $("fAddr").value,
      ageYears: $("fAge").value,
      floors: $("fFloors").value,
      primaryMaterial: $("fMat").value,
      occupancyType: $("fOcc").value,
      maintenanceScore: $("fMaint").value,
      lastInspectionYearsAgo: $("fInsp").value,
      codeCompliant: $("fComp").checked,
      photoDataUrl: currentPhoto,
      visionAnalysis: currentVision,
      createdAt: editingCreatedAt
    });
  }

  function simulate() {
    const res = engine.assess(draftBuilding());
    $("fMaintVal").textContent = $("fMaint").value;
    $("simScore").textContent = res.totalScore.toFixed(1);
    const g = $("simGrade");
    g.textContent = res.grade;
    g.className = "flex h-11 w-11 items-center justify-center rounded-xl text-2xl font-black " + GRADE_BG[res.grade];
    const risk = $("simRisk");
    if (res.totalScore >= 75.0) {
      risk.textContent = "🟢 SAFE (SOUND)";
      risk.className = "status-badge-safe inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold";
      $("simUrgent").textContent = "Routine: annual inspection cycle";
    } else if (res.totalScore >= 50.0) {
      risk.textContent = "🟡 MEDIUM RISK";
      risk.className = "status-badge-medium inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold";
      $("simUrgent").textContent = "Monitoring: 60-day cycle";
    } else {
      risk.textContent = "🚩 CRITICAL HAZARD";
      risk.className = "status-badge-critical red-flag-badge";
      $("simUrgent").textContent = "Urgent SLA: 14 days or immediate";
    }
    $("simBreakdown").innerHTML = res.findings.length
      ? res.findings.map(f => '<li class="flex items-start justify-between gap-2" title="' + esc(f.description) + '"><span class="text-slate-400 truncate">' + esc(f.ruleName.replace(/ Rule$/, "")) + '</span><span class="shrink-0 font-mono font-bold ' + SEV_TEXT[f.severity] + '">-' + f.deduction.toFixed(1) + '</span></li>').join("")
      : '<li class="text-slate-500">Baseline score 100.0 &bull; No active deductions.</li>';
  }

  function setField(id, value) { $(id).value = value; }

  function fillFormDefaults() {
    setField("fId", nextId());
    ["fName", "fAddr"].forEach(i => setField(i, ""));
    setField("fAge", 20); setField("fFloors", 3); setField("fMat", "RCC"); setField("fOcc", "Residential");
    setField("fMaint", 7); setField("fInsp", 2); $("fComp").checked = true;
  }

  function resetForm() {
    editingId = null;
    editingCreatedAt = null;
    currentPhoto = null;
    currentVision = null;
    fillFormDefaults();
    $("fId").readOnly = false;
    $("editBadge").classList.add("hidden");
    $("btnCancelEdit").classList.add("hidden");
    $("submitLabel").textContent = "Save & Prioritize";
    $("formError").classList.add("hidden");
    simulate();
  }

  function startEdit(id) {
    const b = buildings.find(x => x.buildingId === id);
    if (!b) return;
    editingId = b.buildingId;
    editingCreatedAt = b.createdAt;
    currentPhoto = b.photoDataUrl;
    currentVision = b.visionAnalysis;
    setField("fId", b.buildingId); setField("fName", b.name); setField("fAddr", b.address);
    setField("fAge", b.ageYears); setField("fFloors", b.floors); setField("fMat", b.primaryMaterial); setField("fOcc", b.occupancyType);
    setField("fMaint", b.maintenanceScore); setField("fInsp", b.lastInspectionYearsAgo); $("fComp").checked = b.codeCompliant;
    $("fId").readOnly = true;
    $("editBadge").classList.remove("hidden");
    $("btnCancelEdit").classList.remove("hidden");
    $("submitLabel").textContent = "Update & Re-Assess";
    $("formError").classList.add("hidden");
    simulate();
    switchView("simulator");
    toast(`Editing ${b.buildingId} in Assessment Studio.`, "info");
  }

  function onSubmit(e) {
    e.preventDefault();
    const id = $("fId").value.trim(), name = $("fName").value.trim(), addr = $("fAddr").value.trim();
    if (!id || !name || !addr) {
      $("formError").textContent = "Building ID, Name and Address are required.";
      $("formError").classList.remove("hidden");
      return;
    }

    const b = draftBuilding();
    if (editingId) {
      const idx = buildings.findIndex(x => x.buildingId === editingId);
      if (idx >= 0) buildings[idx] = b; else buildings.unshift(b);
    } else {
      buildings.unshift(b);
    }

    saveStore();
    resetForm();
    renderAll();
    switchView("queue");
    toast(`Structure ${b.buildingId} prioritized in registry.`, "success");
  }

  /* ======================================================================
   * Side Drawer Scanner & Photo Handling
   * ==================================================================== */
  function clearPhotoState() {
    scanToken++;
    currentPhoto = null;
    currentVision = null;
    $("photoPreview").classList.add("hidden");
    $("telemetry").classList.add("hidden");
    $("dropZone").classList.remove("hidden");
    $("scannerLaser").classList.add("hidden");
    $("photoInput").value = "";
    $("photoStatus").textContent = "No photo";
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error("File read failure."));
      r.readAsDataURL(file);
    });
  }

  async function downscale(src, maxW, quality) {
    try {
      const img = await vision.loadImage(src);
      const iw = img.naturalWidth || img.width;
      const scale = Math.min(1, maxW / iw);
      const c = document.createElement("canvas");
      c.width = Math.round(iw * scale);
      c.height = Math.round((img.naturalHeight || img.height) * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", quality);
    } catch (e) {
      return src;
    }
  }

  async function handleFile(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast("Please upload a JPEG, PNG or WEBP facade image.", "error"); return; }
    if (file.size > 10 * 1024 * 1024) { toast("Image exceeds 10MB limit.", "error"); return; }
    try {
      const raw = await readFile(file);
      const small = await downscale(raw, 900, 0.82);
      await processPhoto(small, null);
    } catch (err) {
      toast(err.message || "Failed to process photo.", "error");
    }
  }

  async function processPhoto(src, preset) {
    const token = ++scanToken;
    $("dropZone").classList.add("hidden");
    $("photoPreview").classList.remove("hidden");
    $("telemetry").classList.add("hidden");
    $("scannerLaser").classList.remove("hidden");
    $("photoStatus").textContent = "Scanning...";

    try {
      let analysis;
      if (preset) {
        try {
          const img = await vision.loadImage(src);
          if (img && $("photoCanvas")) {
            vision.renderOverlay(img, $("photoCanvas"), preset.vision);
          }
        } catch (imgErr) {
          console.warn("Preset image display warning:", imgErr);
        }
        analysis = preset.vision;
      } else {
        analysis = await vision.inspectPhoto(src, $("photoCanvas"));
      }
      await sleep(500);
      if (token !== scanToken) return;

      currentVision = analysis;
      currentPhoto = preset || /^data:image\/svg/.test(src) ? src : await downscale(src, 640, 0.72);
      if (token !== scanToken) return;

      applyVision(analysis, !!preset);
      renderTelemetry(analysis);
      $("photoStatus").textContent = preset ? "Sample Loaded" : "Scanned";
      simulate();
      toast("Elevation scanned & auto-synced into form.", "success");
    } catch (err) {
      if (token !== scanToken) return;
      console.error(err);
      clearPhotoState();
      toast(err.message || "Analysis failed.", "error");
    } finally {
      if (token === scanToken) $("scannerLaser").classList.add("hidden");
    }
  }

  function applyVision(v, overwriteText) {
    if (v.primaryMaterial) setField("fMat", v.primaryMaterial);
    if (v.floors) setField("fFloors", v.floors);
    if (v.estimatedAgeYears) setField("fAge", v.estimatedAgeYears);
    if (v.maintenanceScore) setField("fMaint", v.maintenanceScore);
    if (v.occupancyType) setField("fOcc", v.occupancyType);
    if (v.name && (overwriteText || !$("fName").value.trim())) setField("fName", v.name);
  }

  function renderTelemetry(v) {
    $("telemetry").classList.remove("hidden");
    $("tvName").textContent = v.name || "Target Elevation";
    $("tvTypology").textContent = v.buildingTypology || (v.materialDetails && v.materialDetails.composition) || "Elevation Analysis";
    $("tvMaterial").textContent = v.primaryMaterial || "-";
    $("tvFloors").textContent = v.floors ? v.floors + " Fl" : "n/a";
    $("tvAge").textContent = v.estimatedAgeYears ? "~" + v.estimatedAgeYears + " Yrs" : "n/a";
    $("tvConfidence").textContent = Math.round((v.confidenceScore || 0) * 100) + "% confidence";

    const sev = v.crackSeverity || "none";
    const box = $("tvDistress");
    box.className = "p-2 rounded-lg border text-[11px] " + (DISTRESS_STYLE[sev] || DISTRESS_STYLE.none);
    $("tvDistressTitle").textContent = DISTRESS_TEXT[sev][0];
    $("tvDistressDesc").textContent = DISTRESS_TEXT[sev][1];

    $("tvItems").innerHTML = (v.detectedItems || []).map(i => '<li class="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[9px] font-semibold text-slate-300">' + esc(i) + "</li>").join("");

    const note = $("tvNote");
    if (v.indicative) {
      note.textContent = "Conservative heuristic scan: color statistics, fracture lines, and periodic storey bands calibrated.";
      note.classList.remove("hidden");
    } else {
      note.classList.add("hidden");
    }
  }

  /* Webcam */
  async function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast("Camera access unsupported.", "error"); return; }
    $("webcamMsg").classList.add("hidden");
    openModal("webcamModal");
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      $("webcamVideo").srcObject = cameraStream;
    } catch (e) {
      $("webcamMsg").textContent = "Camera access denied or unavailable.";
      $("webcamMsg").classList.remove("hidden");
    }
  }

  function stopCamera() {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
    const v = $("webcamVideo");
    if (v) v.srcObject = null;
  }

  async function captureCamera() {
    const v = $("webcamVideo");
    if (!cameraStream || !v.videoWidth) { toast("Camera initializing.", "warn"); return; }
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    closeModal("webcamModal");
    await processPhoto(await downscale(dataUrl, 900, 0.82), null);
  }

  /* ======================================================================
   * Audit Report & Official Print Notice
   * ==================================================================== */
  function findResult(id) {
    const b = buildings.find(x => x.buildingId === id);
    return b ? engine.assess(b) : null;
  }

  let auditId = null;

  function openAudit(id) {
    const res = findResult(id);
    if (!res) return;
    auditId = id;
    const b = res.building;
    const v = b.visionAnalysis;

    const params = [
      ["Age", b.ageYears + " yrs"], ["Material", b.primaryMaterial], ["Storeys", b.floors], ["Occupancy", b.occupancyType],
      ["Maintenance", b.maintenanceScore + " / 10"], ["NBC Compliant", b.codeCompliant ? "Verified" : "Non-Compliant"],
      ["Last Audit", b.lastInspectionYearsAgo + " yrs ago"], ["Inspection SLA", dueText(res)]
    ].map(p => '<div class="audit-param-pill rounded-xl p-2.5"><p class="audit-param-label text-[9px] font-bold uppercase tracking-wider font-mono">' + p[0] + '</p><p class="audit-param-value text-xs font-bold mt-0.5">' + esc(p[1]) + '</p></div>').join("");

    const photoBlock = b.photoDataUrl
      ? '<div class="audit-photo-card mt-4 flex flex-col gap-3 sm:flex-row p-3 rounded-2xl">' +
        '<button type="button" data-action="photo" data-id="' + esc(b.buildingId) + '" class="shrink-0 overflow-hidden rounded-xl border border-slate-700 sm:w-52 h-36 bg-slate-950 shadow-sm"><img src="' + esc(b.photoDataUrl) + '" alt="" class="h-full w-full object-cover"></button>' +
        (v ? '<div class="audit-diag-box min-w-0 text-xs space-y-1"><p class="text-[10px] font-bold uppercase tracking-wider text-sky-400 font-mono">Elevation Diagnostics</p>' +
          '<p class="leading-relaxed font-medium">' + esc(v.aiSummary || "") + '</p></div>' : '<div class="text-xs text-slate-400 italic">Elevation photo recorded.</div>') + '</div>'
      : "";

    const findings = (res.findings || []).length
      ? '<div class="overflow-x-auto"><table class="audit-table w-full min-w-[480px] text-left text-xs"><thead class="text-[10px] font-bold uppercase tracking-wider font-mono border-b"><tr><th class="py-2 pr-3">Category</th><th class="py-2 pr-3">Finding</th><th class="py-2 text-right">Points</th></tr></thead><tbody class="divide-y">' +
        res.findings.map(f => '<tr><td class="py-2 pr-3 align-top"><span class="rounded-full px-2 py-0.5 text-[9px] font-bold ' + SEV_BADGE[f.severity] + '">' + esc(f.category) + '</span></td><td class="py-2 pr-3 align-top">' + esc(f.description) + '</td><td class="py-2 text-right font-mono font-bold point-deduction">-' + Number(f.deduction).toFixed(1) + '</td></tr>').join("") +
        '</tbody><tfoot><tr class="border-t-2"><td colspan="2" class="py-2 font-bold">Total Deduction</td><td class="py-2 text-right font-mono font-black point-deduction">-' + (100 - res.totalScore).toFixed(1) + '</td></tr></tfoot></table></div>'
      : '<p class="text-xs text-slate-500">No active deductions recorded.</p>';

        // CSV squad recommendation block
    const csvSquadBlock = (b._csvMeta && b._csvMeta.csvSquad)
      ? '<div class="mt-3 flex items-center gap-2 rounded-xl px-3.5 py-2.5 bg-indigo-950/60 border border-indigo-500/30 text-xs"><i data-lucide="shield" class="w-3.5 h-3.5 text-indigo-400 shrink-0"></i><span class="text-slate-400 font-mono uppercase text-[10px] font-bold mr-1.5">Recommended Squad:</span><span class="text-indigo-300 font-semibold">' + esc(b._csvMeta.csvSquad) + '</span></div>'
      : "";

$("auditContent").innerHTML =
      '<div class="flex flex-wrap items-start justify-between gap-4"><div class="min-w-0"><h3 class="text-base font-extrabold font-heading audit-heading">' + esc(b.name) + '</h3><p class="text-xs text-slate-400"><span class="font-mono font-semibold text-sky-500">' + esc(b.buildingId) + '</span> &bull; ' + esc(b.address) + '</p></div>' +
      '<div class="flex items-center gap-3"><div class="text-right"><p class="font-mono text-2xl font-black audit-score-val">' + res.totalScore.toFixed(1) + '</p><span class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ' + RISK_PILL[res.riskLevel] + '">' + res.riskLevel + ' RISK</span></div>' +
      '<div class="flex h-12 w-12 items-center justify-center rounded-xl text-2xl font-black text-white ' + GRADE_BG[res.grade] + '">' + res.grade + '</div></div></div>' +
      (res.isCritical ? '<div class="audit-critical-banner rounded-xl p-3 text-xs font-bold flex items-center gap-2"><i data-lucide="flag" class="w-4 h-4 text-rose-500"></i>🚩 CRITICAL HAZARD &bull; Immediate Section 127 Cordoning &amp; Officer Dispatch Mandated</div>' : '') +
      csvSquadBlock +
      '<div class="grid grid-cols-2 gap-2 sm:grid-cols-4 mt-3">' + params + '</div>' + photoBlock +
      '<h4 class="mb-1.5 mt-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Itemised Checklist Deductions</h4>' + findings +
      '<h4 class="mb-1.5 mt-4 text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Statutory Municipal Directives</h4><ol class="list-decimal space-y-1 pl-5 text-xs text-slate-300 audit-directives">' + (res.recommendedActions || []).map(a => '<li>' + esc(a) + '</li>').join("") + '</ol>';
    refreshIcons();
    openModal("auditModal");
  }

  function printNotice() {
    const res = findResult(auditId);
    if (!res) return;
    const b = res.building, now = new Date();
    const deadline = new Date(now.getTime() + (res.dueInDays || 14) * 86400000);
    const ref = "MSN-" + b.buildingId.replace(/[^A-Za-z0-9]/g, "") + "-" + now.toISOString().slice(0, 10).replace(/-/g, "");
    const row = (k, v) => '<tr><td style="padding:5px 12px 5px 0;color:#555;width:38%">' + k + '</td><td style="padding:5px 0;font-weight:600">' + esc(v) + "</td></tr>";
    $("printNoticeArea").innerHTML =
      '<div style="font-family:Inter,Arial,sans-serif;max-width:720px;margin:0 auto;color:#111;padding:20px">' +
      '<div style="border-bottom:3px solid #0f172a;padding-bottom:12px;display:flex;justify-content:space-between;align-items:flex-end"><div><div style="font-size:10px;letter-spacing:2px;font-weight:700;color:#555">MUNICIPAL BUILDING SAFETY DEPARTMENT</div><h1 style="font-size:22px;margin:4px 0 0;font-weight:800">Structural Safety Inspection Notice</h1></div><div style="text-align:right;font-size:11px"><div>Ref: <strong>' + esc(ref) + '</strong></div><div>Issued: ' + esc(fmtLong(now)) + '</div></div></div>' +
      '<h2 style="font-size:13px;margin:16px 0 6px;text-transform:uppercase;letter-spacing:1px;color:#333">1. Property Profile</h2><table style="width:100%;font-size:12px;border-collapse:collapse">' +
      row("Building Name", b.name + " (" + b.buildingId + ")") + row("Site Address", b.address) + row("Structural Material / Storeys", b.primaryMaterial + " / " + b.floors + " Storeys") + row("Age / Occupancy", b.ageYears + " Years / " + b.occupancyType) + row("Last Statutory Audit", b.lastInspectionYearsAgo + " Years Ago") + row("Code Compliance Status", b.codeCompliant ? "Verified NBC Compliant" : "Non-Compliant / Unverified") + "</table>" +
      '<h2 style="font-size:13px;margin:16px 0 6px;text-transform:uppercase;letter-spacing:1px;color:#333">2. Evaluation Results</h2><table style="width:100%;font-size:12px;border-collapse:collapse">' +
      row("Safety Score", res.totalScore.toFixed(1) + " / 100 (Grade " + res.grade + ")") + row("Risk Band", res.riskLevel) + row("Condition Priority", res.isCritical ? "🚩 CRITICAL HAZARD — IMMEDIATE ACTION" : "Routine Municipal Cycle") + row("Statutory Inspection SLA", fmtLong(deadline) + " (" + dueText(res).toLowerCase() + ")") + "</table>" +
      '<h2 style="font-size:13px;margin:16px 0 6px;text-transform:uppercase;letter-spacing:1px;color:#333">3. Checklist Deductions</h2><ul style="font-size:12px;line-height:1.5;padding-left:18px;margin:0">' +
      ((res.findings || []).length ? res.findings.map(f => '<li>' + esc(f.description) + ' (-' + Number(f.deduction).toFixed(1) + ' pts)</li>').join("") : '<li>No active deductions recorded.</li>') + '</ul>' +
      '<h2 style="font-size:13px;margin:16px 0 6px;text-transform:uppercase;letter-spacing:1px;color:#333">4. Statutory Directives</h2><ol style="font-size:12px;line-height:1.5;padding-left:18px;margin:0">' + (res.recommendedActions || []).map(a => '<li>' + esc(a) + '</li>').join("") + '</ol>' +
      '<div style="display:flex;justify-content:space-between;margin-top:44px;font-size:11px"><div style="border-top:1px solid #111;padding-top:4px;width:44%">Inspecting Municipal Engineer (Signature &amp; Date)</div><div style="border-top:1px solid #111;padding-top:4px;width:44%">Authorised Structural Officer</div></div></div>';
    window.print();
  }

  /* ======================================================================
   * Scoring Rules Catalog
   * ==================================================================== */
  function openRules() {
    const catalog = [
      { rule: "Structural Age", category: "Lifespan & Fatigue", items: [["60+ years", 25], ["40-59 years", 18], ["25-39 years", 10], ["15-24 years", 5], ["Under 15 years", 0]] },
      { rule: "Primary Material", category: "Material Integrity", items: [["Wood / Timber", 18], ["Non-standard", 15], ["Brick Masonry", 12], ["Mixed / Composite", 10], ["Steel", 3], ["RCC (baseline)", 0]] },
      { rule: "Maintenance Condition", category: "Physical Upkeep", items: [["Rating 1-2 (Severe)", 25], ["Rating 3-4 (Substandard)", 18], ["Rating 5-6 (Average)", 10], ["Rating 7-8 (Good)", 4], ["Rating 9-10 (Pristine)", 0]] },
      { rule: "Code Compliance", category: "Regulatory Standards", items: [["Non-Compliant with NBC seismic codes", 20], ["Verified Compliant", 0]] },
      { rule: "Inspection Recency", category: "Audit Monitoring", items: [["10+ years overdue", 15], ["7-9 years overdue", 10], ["5-6 years overdue", 5], ["Under 5 years", 0]] },
      { rule: "Height & Occupancy", category: "Consequence Exposure", items: [["10+ floors (High-rise)", 8], ["5-9 floors (Mid-rise)", 4], ["High consequence (Hospital, School, Public)", 7], ["Commercial / Mixed", 3], ["Residential", 0]] }
    ];

    $("rulesContent").innerHTML =
      '<div class="rules-banner rounded-xl p-3.5 mb-3 text-xs">' +
      '<p class="rules-banner-title font-bold font-heading mb-1.5 flex items-center gap-1.5"><i data-lucide="gauge" class="w-4 h-4 text-sky-500"></i> Municipal Risk Classification Thresholds</p>' +
      '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2.5">' +
      '<div class="rule-threshold-card rule-threshold-safe rounded-xl p-3">' +
      '<span class="threshold-pill-title font-bold font-heading flex items-center gap-1.5">🟢 SAFE (Score ≥ 75)</span>' +
      '<span class="threshold-pill-desc text-[11px] mt-1 block">Grade A / B. Structurally sound. Routine annual cycle.</span>' +
      '</div>' +
      '<div class="rule-threshold-card rule-threshold-medium rounded-xl p-3">' +
      '<span class="threshold-pill-title font-bold font-heading flex items-center gap-1.5">🟡 MEDIUM (Score 50-75)</span>' +
      '<span class="threshold-pill-desc text-[11px] mt-1 block">Grade C. Moderate wear. 60-day municipal audit cycle.</span>' +
      '</div>' +
      '<div class="rule-threshold-card rule-threshold-critical rounded-xl p-3">' +
      '<span class="threshold-pill-title font-bold font-heading flex items-center gap-1.5">🚩 HIGH RISK (Score &lt; 50)</span>' +
      '<span class="threshold-pill-desc text-[11px] mt-1 block">Grade D / F. Red-flagged critical hazard. Mandatory officer dispatch.</span>' +
      '</div>' +
      '</div></div>' +
      '<p class="rules-intro-text text-xs leading-relaxed mb-3">Baseline safety score begins at <strong class="rules-intro-bold">100.0</strong>. Deductions are calculated from verified physical parameters:</p>' +
      '<div class="grid gap-3 grid-cols-1 md:grid-cols-2">' + catalog.map(c =>
        '<div class="rule-catalog-card rounded-xl overflow-hidden">' +
        '<div class="rule-catalog-header flex items-center justify-between px-4 py-2.5">' +
        '<p class="rule-catalog-title text-xs font-bold font-heading">' + esc(c.rule) + '</p>' +
        '<p class="rule-catalog-cat text-[10px] font-semibold font-mono">' + esc(c.category) + '</p>' +
        '</div>' +
        '<ul class="rule-catalog-list divide-y text-xs">' + c.items.map(i =>
          '<li class="rule-catalog-item flex justify-between gap-3 px-4 py-2">' +
          '<span class="rule-item-label">' + esc(i[0]) + '</span>' +
          '<span class="rule-item-points font-mono font-bold ' + (i[1] ? "point-deduction" : "point-zero") + '">' + (i[1] ? "-" + i[1] : "0") + '</span>' +
          '</li>').join("") +
        '</ul></div>').join("") +
      '</div>';
    refreshIcons();
    openModal("rulesModal");
  }

  /* ======================================================================
   * CSV Export
   * ==================================================================== */
  function exportCsv() {
    const { byRisk } = assessAll();
    if (!byRisk.length) { toast("Registry is empty.", "warn"); return; }
    const head = ["Rank", "Building ID", "Name", "Address", "Age", "Material", "Floors", "Occupancy", "Maintenance", "Compliant", "Score", "Risk Level", "Condition", "Officers Dispatched"];
    const rows = byRisk.map((r, i) => {
      const b = r.building;
      return [i + 1, b.buildingId, b.name, b.address, b.ageYears, b.primaryMaterial, b.floors, b.occupancyType, b.maintenanceScore, b.codeCompliant ? "Yes" : "No", r.totalScore.toFixed(1), r.riskLevel, r.isCritical ? "CRITICAL HAZARD" : "STANDARD", b.dispatchStatus];
    });
    const csv = [head].concat(rows).map(row => row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(",")).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "municipal_structural_safety_queue_" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Exported " + rows.length.toLocaleString() + " structures to CSV.", "success");
  }

  /* ======================================================================
   * Dataset Reset & Switchers
   * ==================================================================== */
  function load1000Dataset() {
    if (window.MUNICIPAL_1000_DATASET && Array.isArray(window.MUNICIPAL_1000_DATASET)) {
      buildings = window.MUNICIPAL_1000_DATASET.map(b => new Building(b));
      filter = "all"; query = ""; sortKey = "risk"; currentPage = 1;
      $("searchQueue").value = ""; $("sortQueue").value = "risk";
      setActiveTab("all");
      saveStore();
      resetForm();
      renderAll();
      toast("Loaded 1,000-structure municipal dataset.", "success");
    } else {
      toast("1,000 dataset is not ready in memory.", "warn");
    }
  }

  function restoreInternalData() {
    buildings = DEFAULT_INTERNAL_DATASET.map(b => new Building(b));
    filter = "all"; query = ""; sortKey = "risk"; currentPage = 1;
    $("searchQueue").value = ""; $("sortQueue").value = "risk";
    setActiveTab("all");
    saveStore();
    resetForm();
    renderAll();
    toast("Restored internal municipal benchmark dataset (12 structures).", "success");
  }

  function setActiveTab(f) {
    filter = f;
    currentPage = 1;
    document.querySelectorAll("#filterTabs [data-filter]").forEach(t => {
      const on = t.dataset.filter === f;
      t.classList.toggle("tab-active", on);
    });
  }

  function openPhotoModal(src, title) {
    $("photoModalImg").src = src;
    $("photoModalTitle").textContent = title || "Elevation Photo";
    openModal("photoModal");
  }

  /* ======================================================================
   * Event Wiring
   * ==================================================================== */
  function wireEvents() {
    // Modals
    document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => closeModal(btn.dataset.close)));
    document.querySelectorAll(".modal").forEach(m => m.addEventListener("mousedown", e => { if (e.target === m) { if (m.id === "confirmModal") settleConfirm(false); else closeModal(m.id); } }));
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      const open = Array.from(document.querySelectorAll(".modal.open")).pop();
      if (open) { if (open.id === "confirmModal") settleConfirm(false); else closeModal(open.id); }
      if ($("sideScannerDrawer").classList.contains("open")) closeSideScanner();
    });
    $("confirmOk").addEventListener("click", () => settleConfirm(true));
    $("confirmCancel").addEventListener("click", () => settleConfirm(false));

    const on = (id, evt, fn) => { const el = $(id); if (el) el.addEventListener(evt, fn); };

    // Desktop & Mobile Sidebar Access via Three Bars (☰ Hamburger Menu)
    const setDesktopSidebarMode = (active) => {
      const shell = $("appShell");
      if (!shell) return;
      shell.classList.toggle("sidebar-active", active);
      localStorage.setItem("app_desktop_sidebar_mode", active ? "sidebar" : "top");
      refreshIcons();
    };

    const toggleSidebar = () => {
      const shell = $("appShell");
      if (!shell) return;
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        const isOpen = shell.classList.toggle("sidebar-mobile-open");
        const backdrop = $("sidebarBackdrop");
        if (backdrop) backdrop.classList.toggle("active", isOpen);
        toast(isOpen ? "Sidebar opened (☰)" : "Sidebar closed", "info");
      } else {
        const current = shell.classList.contains("sidebar-active");
        setDesktopSidebarMode(!current);
        toast(!current ? "Desktop Sidebar expanded (☰)." : "Desktop Sidebar collapsed.", "info");
      }
      refreshIcons();
    };

    const closeSidebarMobile = () => {
      const shell = $("appShell");
      if (shell) shell.classList.remove("sidebar-mobile-open");
      const backdrop = $("sidebarBackdrop");
      if (backdrop) backdrop.classList.remove("active");
    };

    // THREE BARS (HAMBURGER) CLICK HANDLERS - EXCLUSIVE ACCESS TRIGGER
    on("btnSidebarHamburger", "click", toggleSidebar);
    on("btnMinimizeSidebar", "click", () => {
      if (window.innerWidth < 1024) closeSidebarMobile();
      else setDesktopSidebarMode(false);
      toast("Sidebar collapsed (☰).", "info");
    });
    on("sidebarBackdrop", "click", closeSidebarMobile);
    on("btnSidebarLayoutToggle", "click", () => {
      if (window.innerWidth < 1024) closeSidebarMobile();
      else setDesktopSidebarMode(false);
      toast("Sidebar collapsed (☰).", "info");
    });
    on("btnSidebarNewBuilding", "click", () => {
      resetForm();
      switchView("simulator");
      if (window.innerWidth < 1024) closeSidebarMobile();
    });

    // Keyboard Shortcut: Ctrl+B or Cmd+B to toggle sidebar with 3 bars
    window.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        toggleSidebar();
      }
    });

    // Sidebar Navigation Tabs (All 6 new features)
    const sidebarNavTabs = $("sidebarNavTabs");
    if (sidebarNavTabs) {
      sidebarNavTabs.addEventListener("click", e => {
        const btn = e.target.closest("[data-nav-view]");
        if (btn && btn.dataset.navView) {
          switchView(btn.dataset.navView);
          if (window.innerWidth < 1024) closeSidebarMobile();
        }
      });
    }

    // Sidebar KPI Cards (The 2nd Image in Left Sidebar!)
    on("sidebarKpiCardTotal", "click", () => { switchView("queue"); setActiveTab("all"); renderAll(); });
    on("sidebarKpiCardFlagged", "click", () => { switchView("queue"); setActiveTab("critical"); renderAll(); });
    on("sidebarKpiCardDispatched", "click", () => switchView("deployments"));
    on("sidebarKpiCardAvg", "click", () => switchView("analytics"));
    on("sidebarKpiCardComp", "click", () => switchView("rules"));

    // Sidebar Tool Actions
    on("btnSidebarThemeToggle", "click", toggleTheme);
    on("btnSidebarExportCsv", "click", exportCsv);

    // Primary Workspace Navigation Tabs
    const navTabs = $("mainNavTabs");
    if (navTabs) {
      navTabs.addEventListener("click", e => {
        const btn = e.target.closest("[data-nav-view]");
        if (btn && btn.dataset.navView) switchView(btn.dataset.navView);
      });
    }

    // Quick Workspace Action Triggers
    on("btnQuickNewBuilding", "click", () => { resetForm(); switchView("simulator"); });
    on("btnQueueNewAssessment", "click", () => { resetForm(); switchView("simulator"); });
    on("btnStudioOpenScanner", "click", () => switchView("scanner"));
    on("btnDeploymentsBatchDispatch", "click", batchDispatchCritical);
    on("btnDrawerSwitchToFullScanner", "click", () => { closeSideScanner(); switchView("scanner"); });

    // Side Drawer Triggers
    on("btnOpenSideScanner", "click", () => switchView("scanner"));
    on("btnOpenSideScannerCard", "click", () => switchView("scanner"));
    on("floatingScanBtn", "click", () => switchView("scanner"));
    on("btnCloseSideScanner", "click", closeSideScanner);
    on("sideDrawerBackdrop", "click", closeSideScanner);
    on("btnApplyScanToForm", "click", () => {
      closeSideScanner();
      switchView("simulator");
      toast("Elevation telemetry applied to assessment.", "info");
    });

    // Officer Dispatch Triggers
    on("btnBatchDispatch", "click", batchDispatchCritical);
    on("btnConfirmDispatch", "click", confirmDispatch);
    on("btnOpenDispatchLog", "click", () => switchView("deployments"));
    const clearDispatchHandler = () => {
      dispatches = [];
      buildings.forEach(b => {
        b.dispatchStatus = "NONE";
        b.dispatchDetails = null;
      });
      saveStore();
      saveDispatches();
      renderAll();
      toast("Dispatch history cleared & critical sites reset for mobilization.", "info");
    };
    on("btnClearDispatchHistory", "click", clearDispatchHandler);
    on("btnClearModalDispatchHistory", "click", clearDispatchHandler);

    // Dataset Switchers & Quick Resets
    on("btnThemeToggle", "click", toggleTheme);
    on("btnExportCsv", "click", exportCsv);
    on("btnRules", "click", () => switchView("rules"));
    on("btnResetData", "click", () => openModal("resetModal"));
    on("btnReloadDatasetModal", "click", () => { load1000Dataset(); closeModal("resetModal"); });
    on("btnClearAllModal", "click", () => {
      buildings = [];
      saveStore();
      resetForm();
      renderAll();
      closeModal("resetModal");
      toast("Registry cleared.", "success");
    });

    // KPI Card Navigation
    on("kpiCardTotal", "click", () => { switchView("queue"); setActiveTab("all"); renderAll(); });
    on("kpiCardFlagged", "click", () => { switchView("queue"); setActiveTab("critical"); renderAll(); });
    on("kpiCardDispatched", "click", () => switchView("deployments"));

    // Form
    on("buildingForm", "submit", onSubmit);
    on("buildingForm", "input", simulate);
    on("buildingForm", "change", simulate);
    on("btnCancelEdit", "click", resetForm);

    // Side Drawer / Scanner Actions
    on("btnBrowse", "click", () => { const p = $("photoInput"); if (p) p.click(); });
    on("photoInput", "change", e => handleFile(e.target.files[0]));
    on("btnCamera", "click", openCamera);
    on("btnCapture", "click", captureCamera);
    on("btnRemovePhoto", "click", () => { clearPhotoState(); simulate(); });
    on("btnEnlarge", "click", () => { if (currentPhoto) openPhotoModal(currentPhoto, $("fName")?.value || "Facade Photo"); });
    
    const dz = $("dropZone");
    if (dz) {
      ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("border-sky-500", "bg-sky-100"); }));
      ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("border-sky-500", "bg-sky-100"); }));
      dz.addEventListener("drop", e => handleFile(e.dataTransfer.files[0]));
    }

    const sb = $("sampleBar");
    if (sb) {
      sb.addEventListener("click", e => {
        const btn = e.target.closest("[data-sample]");
        if (!btn) return;
        const p = PRESETS[btn.dataset.sample];
        if (!p) return;
        if (!editingId) setField("fId", nextId());
        setField("fName", p.name); setField("fAddr", p.address); setField("fInsp", p.audit); $("fComp").checked = p.compliant;
        processPhoto(p.photo, p);
      });
    }

    // Queue Controls & Pagination
    on("filterTabs", "click", e => {
      const t = e.target.closest("[data-filter]");
      if (t) { setActiveTab(t.dataset.filter); renderAll(); }
    });
    on("searchQueue", "input", e => { query = e.target.value; currentPage = 1; renderAll(); });
    on("sortQueue", "change", e => { sortKey = e.target.value; currentPage = 1; renderAll(); });
    on("btnClearFilters", "click", () => { query = ""; if ($("searchQueue")) $("searchQueue").value = ""; setActiveTab("all"); renderAll(); });

    on("pageSizeSelect", "change", e => {
      pageSize = Number(e.target.value) || 25;
      currentPage = 1;
      renderAll();
    });
    on("btnPrevPage", "click", () => {
      if (currentPage > 1) { currentPage--; renderAll(); }
    });
    on("btnNextPage", "click", () => {
      currentPage++;
      renderAll();
    });

    // Row Actions
    const delegate = async e => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const id = btn.dataset.id;
      const b = buildings.find(x => x.buildingId === id);
      if (!b) return;

      if (btn.dataset.action === "dispatch") openDispatchModal(id);
      else if (btn.dataset.action === "audit") openAudit(id);
      else if (btn.dataset.action === "edit") { startEdit(id); switchView("simulator"); }
      else if (btn.dataset.action === "scan") {
        if (b.photoDataUrl) processPhoto(b.photoDataUrl, null);
        switchView("scanner");
      }
      else if (btn.dataset.action === "photo") { if (b.photoDataUrl) openPhotoModal(b.photoDataUrl, b.name); }
      else if (btn.dataset.action === "delete") {
        if (await confirmDialog("Delete " + b.buildingId + "?", `"${b.name}" will be removed from the registry.`, "Delete")) {
          buildings = buildings.filter(x => x.buildingId !== id);
          if (editingId === id) resetForm();
          saveStore();
          renderAll();
          toast(b.buildingId + " deleted.", "success");
        }
      }
    };
    document.addEventListener("click", delegate);
    $("btnPrint").addEventListener("click", printNotice);
  }

  /* ======================================================================
   * Initialisation
   * ==================================================================== */
  function init() {
    applyTheme(currentTheme);
    buildings = loadStore();
    dispatches = loadDispatches();
    wireEvents();

    // Initialize desktop sidebar preference (default to sidebar on desktop screens)
    const savedSidebar = localStorage.getItem("app_desktop_sidebar_mode");
    const isDesktopSidebar = savedSidebar ? savedSidebar === "sidebar" : window.innerWidth >= 1024;
    const shell = $("appShell");
    if (shell) shell.classList.toggle("sidebar-active", isDesktopSidebar);

    resetForm();
    renderAll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
