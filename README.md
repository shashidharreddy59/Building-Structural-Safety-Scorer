# Building Structural Safety Scorer — Municipal Risk Prioritization System

**Problem Statement No: 113**  
*Create a structural safety assessment tool using a rule-based OOP inspection checklist system that scores buildings against safety parameters (age, material, maintenance history, code compliance) to flag high-risk structures needing urgent inspection. This supports municipal building safety departments in prioritizing limited inspection resources toward the most dangerous structures first.*

---

## 🌟 Key Features

1. **Rule-Based Object-Oriented (OOP) Checklist Engine**
   - Implements the **Strategy Pattern** with individual inspection rules:
     - `AgeRule`: Evaluates structural fatigue and carbonation based on building age.
     - `MaterialRule`: Assesses ductility and fire/decay risk (RCC, Steel, Brick, Wood, Mixed, Non-standard).
     - `MaintenanceRule`: Deducts score for deferred maintenance, spalling, and unaddressed distress (1–10 rating).
     - `CodeComplianceRule`: Penalizes non-compliance with statutory NBC/Seismic building codes.
     - `InspectionRecencyRule`: Flags overdue statutory structural audit intervals.
     - `HeightOccupancyRule`: Evaluates lateral load risk and consequence factors (Hospitals, Schools, High-rises).
     - `VisualDistressRule`: Incorporates computer-vision-detected facade cracks and spalling.

2. **Photo Input & Vision AI Inspection**
   - **Upload & Drag-and-Drop**: Upload images (JPEG, PNG, WEBP) of building elevations.
   - **Live Webcam Integration**: Snap live photos directly from laptop/mobile cameras.
   - **1-Click Test Scenarios**: Instant testing with pre-configured scenarios (`🚨 Severe Cracked Brick`, `⚠️ Aging Concrete School`, `✅ Pristine High-Rise`).
   - **AI Scanned Telemetry & Feature Diagnostics**:
     - **Building Identification**: Identifies building name & typology (e.g., *Industrial Brick Mill / Warehouse*, *Educational Institution*, *Commercial High-Rise*).
     - **Material Recognition**: Detects primary material and specific composition (e.g. *Load-Bearing Fired Red Clay Masonry*, *Reinforced Concrete Moment Frame*) along with visual cues (bond courses, aggregate finish, curtain wall mullions).
     - **Building Age & Era Estimation**: Calculates estimated age in years and construction era (e.g. *Mid-20th Century, circa 1950–1970*) with architectural weathering indicators (carbonation, lack of expansion joints, lime leaching).
     - **Structural Items Recognition**: Identifies and tags distinct structural elements in the image (*Storey slabs, load-bearing piers, window lintels, parapets, diagonal shear cracks*).
     - **HUD Canvas Overlay**: Stamps interactive Head-Up Display inspection tags (*AI ID, Material, Estimated Age, Defect Severity*) directly onto the scanned image.
   - **Google Gemini 2.5 Flash Vision API (Optional)**: Seamless plug-in for multimodal cloud engineering reports with automatic offline fallback.

3. **Municipal Priority Queue & Decision Support**
   - Automatically ranks all monitored buildings by **Highest Risk First** (lowest safety score at top) to allocate scarce inspection engineers where danger is highest.
   - **Live Score Simulator**: Real-time recalculation of scores, letter grades (A–F), and risk levels as inputs are tuned.
   - **Audit Findings Modal**: Full itemized breakdown of penalty deductions and municipal recommendations.
   - **Official Print Citation**: Formatted for printing official municipal structural notices.
   - **CSV Export**: One-click download of the prioritized inspection roster.
   - **Local Persistence**: Saves all state to browser `localStorage`.

---

## 🚀 Running the Website

The website is completely self-contained (HTML, CSS, JavaScript). You can run it either:

### Option 1: Direct Browser Access
Double-click [index.html](file:///d:/Building/index.html) in your file manager to open it in Chrome, Edge, or Firefox.

### Option 2: Local HTTP Server (Active on port 8080)
If you prefer running via HTTP:
```bash
# In d:\Building
python -m http.server 8080
```
Then visit: **`http://localhost:8080/index.html`**

---

## 📂 Project Architecture

```
d:/Building/
├── index.html          # Main Municipal Dashboard UI layout
├── css/
│   └── styles.css      # Custom styles, scanner animations & print template
├── js/
│   ├── models.js       # OOP Domain models & Strategy-pattern inspection rules
│   ├── vision.js       # Computer Vision engine (Sobel operator & telemetry)
│   └── app.js          # Application controller, DOM events, and queue manager
├── images/             # Municipal architectural facade photo dataset
└── README.md           # Documentation and problem statement guide
```
