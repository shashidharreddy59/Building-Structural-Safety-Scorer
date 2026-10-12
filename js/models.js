/**
 * Building Structural Safety Scorer
 * OOP Domain Model & Rule-Based Inspection Checklist Engine
 * Architecture: Strategy Pattern for inspection rules
 */

class Building {
  /**
   * @param {Object} params
   */
  constructor({
    buildingId,
    name,
    address,
    ageYears = 0,
    primaryMaterial = "RCC",
    maintenanceScore = 7,
    codeCompliant = true,
    lastInspectionYearsAgo = 1,
    floors = 1,
    occupancyType = "Residential",
    photoDataUrl = null,
    visionAnalysis = null,
    dispatchStatus = "NONE",
    dispatchDetails = null,
    createdAt = null
  }) {
    this.buildingId = String(buildingId || "").trim();
    this.name = String(name || "").trim();
    this.address = String(address || "").trim();
    this.ageYears = Number(ageYears) || 0;
    this.primaryMaterial = String(primaryMaterial || "RCC").trim();
    this.maintenanceScore = Number(maintenanceScore) || 7;
    this.codeCompliant = Boolean(codeCompliant);
    this.lastInspectionYearsAgo = Number(lastInspectionYearsAgo) || 0;
    this.floors = Number(floors) || 1;
    this.occupancyType = String(occupancyType || "Residential").trim();
    this.photoDataUrl = photoDataUrl || null;
    this.visionAnalysis = visionAnalysis || null;
    this.dispatchStatus = String(dispatchStatus || "NONE"); // 'NONE' | 'DISPATCHED'
    this.dispatchDetails = dispatchDetails || null;
    this.createdAt = createdAt || new Date().toISOString();
  }
}

class InspectionFinding {
  constructor(ruleName, category, description, deduction, severity = "warning") {
    this.ruleName = ruleName;
    this.category = category;
    this.description = description;
    this.deduction = Number(deduction);
    this.severity = severity; // 'info' | 'warning' | 'danger'
  }
}

class SafetyScoreResult {
  constructor(building) {
    this.building = building;
    this.maxScore = 100.0;
    this.totalScore = 100.0;
    this.riskLevel = "LOW"; // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    this.grade = "A"; // 'A' | 'B' | 'C' | 'D' | 'F'
    this.requiresUrgentInspection = false;
    this.isCritical = false;
    this.hazardFlag = "SOUND"; // '🚩 CRITICAL HAZARD' | '⚠️ HIGH RISK' | 'MODERATE' | 'SOUND'
    this.hazardFlagReason = "";
    this.dueInDays = 365;
    this.findings = [];
    this.recommendedActions = [];
  }

  addFinding(ruleName, category, description, points, severity = "warning") {
    if (points > 0) {
      this.findings.push(new InspectionFinding(ruleName, category, description, points, severity));
      this.totalScore -= points;
    }
  }

  finalize() {
    // Floor score at 0.0, cap at 100.0
    this.totalScore = Math.max(0.0, Math.min(100.0, Math.round(this.totalScore * 10) / 10));

    // STRICT USER CRITERIA:
    // Above 75 is SAFE (Sound / Low risk, NEVER red flagged)
    // Between 75-50 is MEDIUM (Moderate risk)
    // Below 50 is HIGHRISK (Critical Hazard - Red Flagged)
    if (this.totalScore >= 75.0) {
      this.riskLevel = "LOW";
      this.grade = this.totalScore >= 90 ? "A" : "B";
      this.isCritical = false;
      this.requiresUrgentInspection = false;
      this.hazardFlag = "SOUND";
      this.hazardFlagReason = "Score in the safe region (≥ 75.0). Structural integrity verified.";
      this.dueInDays = 365;
    } else if (this.totalScore >= 50.0) {
      this.riskLevel = "MEDIUM";
      this.grade = "C";
      this.isCritical = false;
      this.requiresUrgentInspection = false;
      this.hazardFlag = "MODERATE RISK";
      this.hazardFlagReason = "Score in the moderate region (50.0–74.9). Monitored on 60-day cycle.";
      this.dueInDays = 60;
    } else {
      this.riskLevel = this.totalScore < 30 ? "CRITICAL" : "HIGH";
      this.grade = this.totalScore < 30 ? "F" : "D";
      this.isCritical = true;
      this.requiresUrgentInspection = true;
      this.hazardFlag = "🚩 CRITICAL HAZARD";
      this.hazardFlagReason = `Score below 50.0 (${this.totalScore.toFixed(1)}/100). Urgent structural hazard requiring mandatory officer dispatch.`;
      this.dueInDays = this.totalScore < 30 ? 1 : 14;
    }

    // Formulate Municipal Action Recommendations
    this.buildRecommendations();
  }

  buildRecommendations() {
    this.recommendedActions = [];
    if (this.riskLevel === "CRITICAL") {
      this.recommendedActions.push("Issue immediate Section 127 Municipal Structural Hazard Notice.");
      this.recommendedActions.push("Deploy Senior Structural Engineer for emergency on-site cordoning inspection within 24 hours.");
      this.recommendedActions.push("Evaluate temporary partial evacuation if visual crack displacement exceeds 5mm.");
    } else if (this.riskLevel === "HIGH") {
      this.recommendedActions.push("Schedule mandatory detailed structural audit and ultrasonic/core testing within 14 days.");
      this.recommendedActions.push("Submit verified non-destructive testing (NDT) report to Municipal Authority.");
      this.recommendedActions.push("Prepare structural retrofitting and crack stabilization schematics.");
    } else if (this.riskLevel === "MEDIUM") {
      this.recommendedActions.push("Schedule routine municipal re-inspection within 60 days.");
      this.recommendedActions.push("Instruct building owner/association to patch external spalling and weatherproofing.");
    } else {
      this.recommendedActions.push("Structure in satisfactory condition. Routine annual inspection cycle maintained.");
      this.recommendedActions.push("Ensure periodic roof drainage and facade maintenance.");
    }

    if (!this.building.codeCompliant) {
      this.recommendedActions.push("Commission seismic resilience and fire egress code compliance retrofit.");
    }
    if (this.building.lastInspectionYearsAgo >= 7) {
      this.recommendedActions.push("Audit records update required: Inspection interval exceeded 7-year statutory guideline.");
    }
  }
}

/**
 * Base Abstract Inspection Rule
 */
class InspectionRule {
  /**
   * @param {Building} building
   * @param {SafetyScoreResult} result
   */
  evaluate(building, result) {
    throw new Error("evaluate() method must be implemented by subclasses");
  }
}

/**
 * Age Degradation Rule
 */
class AgeRule extends InspectionRule {
  evaluate(building, result) {
    const age = building.ageYears;
    const rule = "Structural Age Rule";
    const cat = "Lifespan & Fatigue";

    if (age >= 60) {
      result.addFinding(rule, cat, `Age is ${age} yrs (>= 60 yrs): Significant material fatigue, carbonation risk, and potential rebar oxidation.`, 25, "danger");
    } else if (age >= 40) {
      result.addFinding(rule, cat, `Age is ${age} yrs (40-59 yrs): Approaching end of primary design life; high vulnerability to latent structural defects.`, 18, "warning");
    } else if (age >= 25) {
      result.addFinding(rule, cat, `Age is ${age} yrs (25-39 yrs): Moderate aging; foundation settlement and thermal expansion checks required.`, 10, "info");
    } else if (age >= 15) {
      result.addFinding(rule, cat, `Age is ${age} yrs (15-24 yrs): Minor weathering phase.`, 5, "info");
    }
  }
}

/**
 * Construction Material Ductility & Fire Performance Rule
 */
class MaterialRule extends InspectionRule {
  evaluate(building, result) {
    const mat = String(building.primaryMaterial).trim().toUpperCase();
    const rule = "Primary Material Rule";
    const cat = "Material Integrity";

    if (mat === "WOOD" || mat === "TIMBER") {
      result.addFinding(rule, cat, "Wood / Timber framing: elevated combustible load, rot, and pest susceptibility with low seismic damping.", 18, "danger");
    } else if (mat === "BRICK" || mat === "MASONRY") {
      result.addFinding(rule, cat, "Unreinforced / Load-bearing Brick Masonry: low shear ductility under seismic or lateral loads.", 12, "warning");
    } else if (mat === "MIXED" || mat === "COMPOSITE") {
      result.addFinding(rule, cat, "Composite / Mixed Material: potential stiffness discrepancies and differential thermal movements.", 10, "warning");
    } else if (mat === "STEEL") {
      result.addFinding(rule, cat, "Structural Steel Frame: high ductility, but requires ongoing fire-proofing coating and corrosion checks.", 3, "info");
    } else if (mat === "RCC" || mat === "REINFORCED CONCRETE") {
      // 0 pts deduction - standard baseline
    } else {
      result.addFinding(rule, cat, `Non-standard structural material (${building.primaryMaterial}): Elevated uncertainty in load distribution capacity.`, 15, "warning");
    }
  }
}

/**
 * Maintenance & Facade Condition Rule
 */
class MaintenanceRule extends InspectionRule {
  evaluate(building, result) {
    const s = building.maintenanceScore;
    const rule = "Maintenance History Rule";
    const cat = "Physical Upkeep";

    if (s <= 2) {
      result.addFinding(rule, cat, `Critically poor maintenance rating (${s}/10): Visible delamination, rebar spalling, or foundation distress present.`, 25, "danger");
    } else if (s <= 4) {
      result.addFinding(rule, cat, `Substandard maintenance rating (${s}/10): Deferred repairs, persistent moisture leaks, and unsealed surface fissures.`, 18, "warning");
    } else if (s <= 6) {
      result.addFinding(rule, cat, `Average maintenance rating (${s}/10): Routine maintenance backlogs, cosmetic plaster decay.`, 10, "info");
    } else if (s <= 8) {
      result.addFinding(rule, cat, `Good maintenance rating (${s}/10): Regular upkeep; minor localized surface hairline abrasions only.`, 4, "info");
    }
  }
}

/**
 * Code Compliance & Bylaw Standards Rule
 */
class CodeComplianceRule extends InspectionRule {
  evaluate(building, result) {
    if (!building.codeCompliant) {
      result.addFinding(
        "Statutory Code Compliance Rule",
        "Regulatory Standards",
        "Building lacks verified compliance with current National Building Code (NBC) / Seismic Zone IV/V engineering standards.",
        20,
        "danger"
      );
    }
  }
}

/**
 * Inspection Recency & Documentation Rule
 */
class InspectionRecencyRule extends InspectionRule {
  evaluate(building, result) {
    const y = building.lastInspectionYearsAgo;
    const rule = "Inspection Recency Rule";
    const cat = "Audit Monitoring";

    if (y >= 10) {
      result.addFinding(rule, cat, `Last certified structural audit was ${y} years ago (>= 10 yrs): Hazardous audit blindspot; internal status unmonitored.`, 15, "danger");
    } else if (y >= 7) {
      result.addFinding(rule, cat, `Last certified structural audit was ${y} years ago (7-9 yrs): Overdue statutory municipal inspection interval.`, 10, "warning");
    } else if (y >= 5) {
      result.addFinding(rule, cat, `Last certified structural audit was ${y} years ago (5-6 yrs): Approaching statutory inspection renewal threshold.`, 5, "info");
    }
  }
}

/**
 * Height, Lateral Load & Occupancy Risk Rule
 */
class HeightOccupancyRule extends InspectionRule {
  evaluate(building, result) {
    const rule = "Height & Occupancy Consequence Rule";
    const cat = "Consequence Exposure";

    if (building.floors >= 10) {
      result.addFinding(rule, cat, `High-rise configuration (${building.floors} floors): High lateral wind/overturning moments and high evacuation time.`, 8, "warning");
    } else if (building.floors >= 5) {
      result.addFinding(rule, cat, `Mid-rise configuration (${building.floors} floors): Moderate lateral drift risk.`, 4, "info");
    }

    const occ = String(building.occupancyType).trim().toUpperCase();
    if (["INDUSTRIAL", "PUBLIC", "HOSPITAL", "SCHOOL", "ASSEMBLY"].includes(occ)) {
      result.addFinding(rule, cat, `High-consequence occupancy (${building.occupancyType}): High density of vulnerable populations or hazardous operations.`, 7, "danger");
    } else if (["COMMERCIAL", "MIXED"].includes(occ)) {
      result.addFinding(rule, cat, `Medium-consequence occupancy (${building.occupancyType}): Continuous public foot-traffic load.`, 3, "info");
    }
  }
}

/**
 * Vision AI / Photo-Observed Distress Rule
 */
class VisualDistressRule extends InspectionRule {
  evaluate(building, result) {
    const v = building.visionAnalysis;
    if (!v) return;

    const rule = "Visual Telemetry Rule";
    const cat = "Photo Diagnostics";

    // Only apply if custom detected defects exist that exceed baseline maintenance deductions
    if (v.detectedDefects && v.detectedDefects.length > 0) {
      v.detectedDefects.forEach(defect => {
        // Apply minor supplementary telemetry penalty if not already covered
        if (defect.deduction && defect.deduction > 0) {
          result.addFinding(rule, cat, `${defect.name}: ${defect.details}`, Math.min(defect.deduction, 8), defect.severity || "warning");
        }
      });
    }
  }
}

/**
 * Composite OOP Safety Assessment Engine
 */
class SafetyAssessmentEngine {
  constructor() {
    this.rules = [
      new AgeRule(),
      new MaterialRule(),
      new MaintenanceRule(),
      new CodeComplianceRule(),
      new InspectionRecencyRule(),
      new HeightOccupancyRule(),
      new VisualDistressRule()
    ];
  }

  /**
   * Evaluates a building using all registered rules
   * @param {Building} building
   * @returns {SafetyScoreResult}
   */
  assess(building) {
    const result = new SafetyScoreResult(building);
    this.rules.forEach(rule => {
      try {
        rule.evaluate(building, result);
      } catch (err) {
        console.error(`Error executing rule ${rule.constructor.name}:`, err);
      }
    });
    result.finalize();
    return result;
  }
}

// Export for ES Module, browser global, and Node.js
if (typeof window !== "undefined") {
  window.Building = Building;
  window.InspectionFinding = InspectionFinding;
  window.SafetyScoreResult = SafetyScoreResult;
  window.SafetyAssessmentEngine = SafetyAssessmentEngine;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    Building,
    InspectionFinding,
    SafetyScoreResult,
    SafetyAssessmentEngine,
    AgeRule,
    MaterialRule,
    MaintenanceRule,
    CodeComplianceRule,
    InspectionRecencyRule,
    HeightOccupancyRule,
    VisualDistressRule
  };
}
