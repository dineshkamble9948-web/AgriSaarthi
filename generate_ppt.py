import os
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck(output_path):
    prs = pptx.Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Palette
    DARK_GREEN = RGBColor(27, 77, 62)       # #1B4D3E
    FOREST_GREEN = RGBColor(38, 148, 93)     # #26945D
    ACCENT_LIGHT = RGBColor(230, 245, 235)   # #E6F5EB
    TEXT_DARK = RGBColor(17, 24, 39)         # #111827
    TEXT_MUTED = RGBColor(100, 116, 139)     # #64748B
    CARD_BG = RGBColor(248, 250, 252)        # #F8FAFC
    BORDER_COLOR = RGBColor(226, 232, 240)   # #E2E8F0
    WHITE = RGBColor(255, 255, 255)

    def add_header(slide, tag, title, subtitle=""):
        # Top green bar
        top_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.12))
        top_bar.fill.solid()
        top_bar.fill.fore_color.rgb = FOREST_GREEN
        top_bar.line.fill.background()

        # Header box
        header_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.733), Inches(1.1))
        tf = header_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        p0.text = tag.upper()
        p0.font.name = "Arial"
        p0.font.size = Pt(11)
        p0.font.bold = True
        p0.font.color.rgb = FOREST_GREEN
        p0.space_after = Pt(4)

        p1 = tf.add_paragraph()
        p1.text = title
        p1.font.name = "Arial"
        p1.font.size = Pt(24)
        p1.font.bold = True
        p1.font.color.rgb = DARK_GREEN

        if subtitle:
            p1.space_after = Pt(2)
            p2 = tf.add_paragraph()
            p2.text = subtitle
            p2.font.name = "Arial"
            p2.font.size = Pt(12)
            p2.font.color.rgb = TEXT_MUTED

    def add_card(slide, left, top, width, height, title, items, highlight=False, badge=""):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = ACCENT_LIGHT if highlight else CARD_BG
        shape.line.color.rgb = FOREST_GREEN if highlight else BORDER_COLOR
        shape.line.width = Pt(1.5 if highlight else 1)

        tf = shape.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.25)
        tf.margin_right = Inches(0.25)
        tf.margin_top = Inches(0.25)
        tf.margin_bottom = Inches(0.2)

        if badge:
            pb = tf.paragraphs[0]
            pb.text = badge.upper()
            pb.font.name = "Arial"
            pb.font.size = Pt(9)
            pb.font.bold = True
            pb.font.color.rgb = FOREST_GREEN
            pb.space_after = Pt(4)
            p_title = tf.add_paragraph()
        else:
            p_title = tf.paragraphs[0]

        p_title.text = title
        p_title.font.name = "Arial"
        p_title.font.size = Pt(16)
        p_title.font.bold = True
        p_title.font.color.rgb = DARK_GREEN
        p_title.space_after = Pt(10)

        for item in items:
            p = tf.add_paragraph()
            p.text = f"•  {item}"
            p.font.name = "Arial"
            p.font.size = Pt(12)
            p.font.color.rgb = TEXT_DARK
            p.space_after = Pt(6)

    # ==========================================================
    # SLIDE 1: Title Slide
    # ==========================================================
    slide1 = prs.slides.add_slide(blank_layout)
    bg = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(7.5))
    bg.fill.solid()
    bg.fill.fore_color.rgb = DARK_GREEN
    bg.line.fill.background()

    # Inner decorative container
    inner = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.8), Inches(11.733), Inches(5.9))
    inner.fill.solid()
    inner.fill.fore_color.rgb = RGBColor(20, 60, 48)
    inner.line.color.rgb = FOREST_GREEN
    inner.line.width = Pt(2)

    tb = slide1.shapes.add_textbox(Inches(1.4), Inches(1.5), Inches(10.5), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True

    p_badge = tf.paragraphs[0]
    p_badge.text = "SMART FARMING • PRECISION AGRICULTURE • AI ASSISTANT"
    p_badge.font.name = "Arial"
    p_badge.font.size = Pt(13)
    p_badge.font.bold = True
    p_badge.font.color.rgb = RGBColor(90, 220, 140)
    p_badge.space_after = Pt(14)

    p_title = tf.add_paragraph()
    p_title.text = "AgriSaarthi (ಅಗಿಸಾರಥಿ)"
    p_title.font.name = "Arial"
    p_title.font.size = Pt(46)
    p_title.font.bold = True
    p_title.font.color.rgb = WHITE
    p_title.space_after = Pt(10)

    p_sub = tf.add_paragraph()
    p_sub.text = "AI-Powered Smart Agriculture Decision Support System"
    p_sub.font.name = "Arial"
    p_sub.font.size = Pt(22)
    p_sub.font.color.rgb = RGBColor(220, 240, 230)
    p_sub.space_after = Pt(24)

    p_tag = tf.add_paragraph()
    p_tag.text = "From Data to Decisions — Personalized Intelligence for Every Farmer."
    p_tag.font.name = "Arial"
    p_tag.font.size = Pt(14)
    p_tag.font.italic = True
    p_tag.font.color.rgb = RGBColor(160, 210, 185)
    p_tag.space_after = Pt(28)

    p_foot = tf.add_paragraph()
    p_foot.text = "Tech Stack: React 19 • Node.js Express • Python FastAPI • PyTorch MobileNetV2 • Scikit-Learn • Sentinel-2 GIS"
    p_foot.font.name = "Arial"
    p_foot.font.size = Pt(12)
    p_foot.font.color.rgb = RGBColor(180, 200, 190)

    # ==========================================================
    # SLIDE 2: Problem Statement & Vision
    # ==========================================================
    slide2 = prs.slides.add_slide(blank_layout)
    add_header(slide2, "Introduction", "The Problem & AgriSaarthi Vision", "Bridging the gap between raw agronomic data and actionable farmer decisions.")

    add_card(slide2, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Agricultural Challenges Today",
             [
                 "Fragmented Information: Farmers consult disjointed channels for weather, mandi prices, and crop advice.",
                 "Delayed Disease Identification: Plant pathologies are diagnosed late, causing up to 30-40% yield loss.",
                 "Suboptimal Chemical Application: Blanket fertilizer spraying degrades soil health and escalates input costs.",
                 "Volatile Market Decisions: Inability to forecast mandi price movements leads to distress selling at low rates.",
                 "Language & Digital Barriers: Most sophisticated agro-tech portals lack intuitive vernacular support."
             ])

    add_card(slide2, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "The AgriSaarthi Solution",
             [
                 "Unified Digital Command: 8 specialized intelligence modules consolidated into one intuitive dashboard.",
                 "Deep Learning Diagnostics: Instant leaf disease identification powered by pretrained MobileNetV2 across 38 classes.",
                 "Hyperlocal Science: ISRIC SoilGrids API + OpenWeather rule engine for custom fertilizer & irrigation.",
                 "Copernicus Satellite GIS: Space-borne Sentinel-2 remote sensing to monitor crop vigor via NDVI without physical sensors.",
                 "Vernacular First: Complete bilingual accessibility in Kannada (ಕನ್ನಡ) & English."
             ], highlight=True, badge="Project Vision")

    # ==========================================================
    # SLIDE 3: System Architecture
    # ==========================================================
    slide3 = prs.slides.add_slide(blank_layout)
    add_header(slide3, "Architecture", "Multi-Service Cloud & Offline Architecture", "Robust microservice design ensuring high performance, decoupling, and offline resilience.")

    add_card(slide3, Inches(0.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "Frontend Client",
             [
                 "React 19 + Vite Single Page Application.",
                 "Lucide UI + Responsive Glassmorphism Styling.",
                 "Leaflet GIS interactive plot mapping.",
                 "Dynamic Bilingual Translation (English & Kannada Context).",
                 "Offline-first client caching."
             ], badge="UI Layer")

    add_card(slide3, Inches(4.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "Backend API Gateway",
             [
                 "Node.js 20 + Express 5 API Server.",
                 "JWT Authentication & Farm-Scoped RBAC.",
                 "Resilient In-Memory Fallback Store (operates smoothly even if DB is offline).",
                 "Multi-Service Orchestrator (bridges ML Service, OpenWeather, Agmarknet, CDSE).",
                 "Full test coverage (59 unit/integration tests)."
             ], highlight=True, badge="Gateway Layer")

    add_card(slide3, Inches(8.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "AI / ML Microservice",
             [
                 "Python 3.11 + FastAPI async engine.",
                 "Crop Recommendation: Random Forest (22 crops, 99.3% accuracy).",
                 "Disease Detection: Pretrained MobileNetV2 (38 classes, PyTorch CPU).",
                 "Low-memory footprint (<250 MB RAM).",
                 "Real-time heuristic agronomic validation."
             ], badge="Intelligence Layer")

    # ==========================================================
    # SLIDE 4: Module 1 - Crop Recommendation
    # ==========================================================
    slide4 = prs.slides.add_slide(blank_layout)
    add_header(slide4, "Module 01", "AI Crop Recommendation Engine", "Precision crop matching based on multi-variate agro-climatic conditions.")

    add_card(slide4, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Model & Agronomic Parameters",
             [
                 "Machine Learning Algorithm: Random Forest Classifier trained on agricultural datasets.",
                 "7 Key Soil & Climate Inputs:",
                 "  • NPK Macronutrients: Nitrogen (N), Phosphorus (P), Potassium (K).",
                 "  • Climate Factors: Ambient Temperature (°C) & Relative Humidity (%).",
                 "  • Environmental: Soil pH level & Annual Rainfall (mm).",
                 "High Accuracy: 99.3% validation accuracy across 22 major Indian commercial and food crops."
             ])

    add_card(slide4, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Outputs & Value Delivered",
             [
                 "Top-3 Ranked Predictions: Delivers ranked crop choices with probability confidence scores.",
                 "Agronomic Feasibility: Explains why specific crops thrive in the supplied soil matrix.",
                 "Risk Mitigation: Avoids crop failure caused by sowing ill-suited varieties in nutrient-deficient plots.",
                 "Interactive What-If Support: Allows farmers to simulate changes in rainfall or fertilizer to evaluate alternatives."
             ], highlight=True, badge="Capabilities")

    # ==========================================================
    # SLIDE 5: Module 2 - Disease Detection (MobileNetV2)
    # ==========================================================
    slide5 = prs.slides.add_slide(blank_layout)
    add_header(slide5, "Module 02", "Plant Disease Detection (MobileNetV2)", "Instant leaf image diagnostics using deep convolutional neural networks.")

    add_card(slide5, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Deep Learning Architecture",
             [
                 "Pretrained Model: MobileNetV2 fine-tuned on the PlantVillage benchmark dataset.",
                 "Lightweight Checkpoint: 8.9 MB PyTorch model running on CPU in under 150ms.",
                 "38 Plant Disease & Healthy Classes:",
                 "  • Crops: Tomato, Potato, Corn, Apple, Grape, Peach, Bell Pepper, Blueberry, Cherry, Soybean, Strawberry, Squash.",
                 "  • Pathologies: Late Blight, Early Blight, Black Rot, Powdery Mildew, Bacterial Spot, Mosaic Virus, Rust, Leaf Scorch.",
                 "Clean Failover: Integrated secondary fallback to Pl@ntNet API catalog."
             ])

    add_card(slide5, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Actionable Agronomic Guidance",
             [
                 "Instant Health Badge: Distinguishes 'Healthy Plant' from 'Disease Detected' with confidence score.",
                 "Observed Symptoms Checklist: Bulleted breakdown of lesion characteristics, fungal spots, and chlorosis.",
                 "Prescriptive Treatment Advice: Actionable chemical fungicides (e.g. Copper hydroxide, Mancozeb) and organic bio-controls (Neem oil, Trichoderma).",
                 "Top Match Distribution: Displays visual progress bars for alternative differential diagnoses."
             ], highlight=True, badge="Outputs")

    # ==========================================================
    # SLIDE 6: Module 3 - Weather & Irrigation Advisory
    # ==========================================================
    slide6 = prs.slides.add_slide(blank_layout)
    add_header(slide6, "Module 03", "Weather Intelligence & Smart Irrigation", "Transforming meteorological forecasts into actionable field watering decisions.")

    add_card(slide6, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Hyperlocal Weather Tracking",
             [
                 "Integration: OpenWeather API REST endpoints linked to farm geographic coordinates.",
                 "Current Conditions: Live temperature, relative humidity, wind speed, solar sunrise/sunset.",
                 "Short-Term Outlook: 3-hour precipitation probability and volume.",
                 "Extended Horizon: 5-day agro-meteorological forecasting with trend analysis.",
                 "Reliable Fallback: Robust caching prevents disruption during third-party rate limits."
             ])

    add_card(slide6, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Rule-Based Irrigation Engine",
             [
                 "Agro-Hydrology Logic: Evaluates crop growth stage water demands against forecast rainfall.",
                 "Water Conservation: If significant rain (≥10mm) is imminent, automatically alerts the farmer: 'Delay irrigation — rain expected'.",
                 "Stress Prevention: Recommends field moisture checks during extended dry spells.",
                 "Anti-Hallucination Design: Never fabricates sensor readings; clearly marks advisory as forecast-driven."
             ], highlight=True, badge="Smart Advisory")

    # ==========================================================
    # SLIDE 7: Module 4 - Soil Intelligence & Fertilizer
    # ==========================================================
    slide7 = prs.slides.add_slide(blank_layout)
    add_header(slide7, "Module 04", "Soil Intelligence & Precision Nutrition", "Scientific fertilizer dosage calculation and digital soil property profiling.")

    add_card(slide7, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Digital Soil Profiling (SoilGrids)",
             [
                 "ISRIC SoilGrids Integration: 250m resolution global geospatial soil data.",
                 "Chemical Properties: Soil pH, Total Organic Carbon, Cation Exchange Capacity (CEC).",
                 "Physical Texture: Scientific sand, silt, and clay fraction scaling (converted to percentage).",
                 "Zero Guesswork: Coordinates validated strictly; non-existent points marked unavailable rather than fabricated."
             ])

    add_card(slide7, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Targeted Fertilizer Advisory",
             [
                 "NPK Deficit Calculation: Compares farmer soil test lab readings against standard crop recommendations.",
                 "Commercial Fertilizer Breakdown: Translates raw NPK shortfalls into exact commercial bags:",
                 "  • Urea (46% N)",
                 "  • DAP (18% N, 46% P2O5)",
                 "  • MOP (60% K2O)",
                 "Soil Amendment Guidance: Recommends agricultural lime for acidic soils (pH < 6.0) or gypsum for alkaline soils."
             ], highlight=True, badge="Nutrition Engine")

    # ==========================================================
    # SLIDE 8: Module 5 - Farm Digital Twin & GIS Mapping
    # ==========================================================
    slide8 = prs.slides.add_slide(blank_layout)
    add_header(slide8, "Module 05", "Farm Digital Twin & Geospatial Plots", "Interactive cadastral plot boundaries and multi-season lifecycle records.")

    add_card(slide8, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Geospatial Plot Boundaries",
             [
                 "Interactive Leaflet GIS Map: Polygon drawing tool to trace farm and plot perimeter.",
                 "GeoJSON Standards: Accurate spherical area calculation (in acres and hectares).",
                 "Multi-Plot Support: Divide holdings into distinct plots with dedicated soil types and crops.",
                 "Farmer Security: Plot data is strictly owner-scoped and protected by JWT auth."
             ])

    add_card(slide8, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Crop Lifecycle Management",
             [
                 "Phenological Growth Stages: Tracks progress from Germination -> Vegetative -> Flowering -> Maturity.",
                 "Sowing & Harvest Estimation: Farmer-entered dates establish positive growing seasons.",
                 "Activity & Yield Logging: Records input expenses, fertilizer applications, and historical harvests across seasons.",
                 "Digital Farm Record: Creates an auditable history enabling crop insurance verification."
             ], highlight=True, badge="Digital Records")

    # ==========================================================
    # SLIDE 9: Module 6 - Satellite Remote Sensing (NDVI)
    # ==========================================================
    slide9 = prs.slides.add_slide(blank_layout)
    add_header(slide9, "Module 06", "Satellite Remote Sensing (Sentinel-2)", "Macro-level vegetative health monitoring from space without in-situ IoT hardware.")

    add_card(slide9, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "European Space Agency CDSE Integration",
             [
                 "Sentinel-2 Multispectral Imagery: 10-meter spatial resolution with 5-day revisit cycle.",
                 "Automated Cloud Masking: Filters cloudy or corrupted observation passes automatically.",
                 "Authentication: Secure OAuth2 client credentials integration with Copernicus Data Space.",
                 "Geometry-Scoped Cache: Satellite tiles cached strictly by bounding box to preserve API quotas."
             ])

    add_card(slide9, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "NDVI Analytics & Crop Health",
             [
                 "Normalized Difference Vegetation Index: NDVI = (NIR - Red) / (NIR + Red).",
                 "Vigor Classification:",
                 "  • NDVI > 0.6: Dense, vigorous green vegetative canopy.",
                 "  • NDVI 0.3 - 0.6: Moderate growth; early vegetative stage.",
                 "  • NDVI < 0.3: Soil exposure, water stress, or crop decline.",
                 "Early Anomaly Detection: Detects plot-level pest or moisture stress before it is visible to the naked eye."
             ], highlight=True, badge="Vegetation Index")

    # ==========================================================
    # SLIDE 10: Module 7 - Market Mandi Intelligence
    # ==========================================================
    slide10 = prs.slides.add_slide(blank_layout)
    add_header(slide10, "Module 07", "Market Intelligence & Mandi Prices", "Real-time APMC commodity price tracking to empower farmer market bargaining.")

    add_card(slide10, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Data Pipeline & Integration",
             [
                 "Source Feed: Agmarknet (Ministry of Agriculture / Open Government Data Platform).",
                 "Multi-Level Filtering: Filter live mandi reports by State, District, Market, and Commodity.",
                 "Price Metrics: Tracks Minimum, Maximum, and Modal (prevailing) prices per quintal (₹/Qtl).",
                 "Resilient Caching: Snapshots valid market data in MongoDB to protect against upstream downtime."
             ])

    add_card(slide10, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Commercial Decision Support",
             [
                 "Historical Trend Visualization: Interactive chart of modal price trajectories.",
                 "Market Comparison: Compare nearby mandis to identify better selling prices.",
                 "Harvest Timing: Helps farmers decide whether to harvest immediately or store produce.",
                 "Direct Bargaining Power: Removes reliance on exploitative middlemen by equipping farmers with live market facts."
             ], highlight=True, badge="Market Analytics")

    # ==========================================================
    # SLIDE 11: Module 8 - What-If & Next Best Action
    # ==========================================================
    slide11 = prs.slides.add_slide(blank_layout)
    add_header(slide11, "Module 08", "What-If Simulator & Next Best Action", "Strategic scenario testing and synthesized daily task prioritization.")

    add_card(slide11, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "What-If Scenario Simulator",
             [
                 "Interactive Sliders: Farmers simulate shifts in irrigation levels (-30% to +30%), fertilizer cuts, or weather shocks.",
                 "Impact Projections: Estimates potential yield change (%) and financial input cost difference.",
                 "Climate Resilience: Prepares farmers for unseasonal dry spells or budget constraints before committing investments.",
                 "Science-Backed Sensitivity Curves: Uses agronomic response modeling rather than random guesses."
             ])

    add_card(slide11, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Next Best Action (NBA) Engine",
             [
                 "Cross-Module Synthesis: Combines weather alerts, NDVI drops, growth stages, and disease reports into a unified feed.",
                 "Prioritized Action Cards: Categorized by urgency (High Priority Alert, Recommended Task, Routine Activity).",
                 "Context-Aware: E.g., 'Rain forecast in 24 hours — hold pesticide spray on Tomato plot'.",
                 "Farmer Focus: Reduces cognitive overload by surfacing the 2-3 most critical tasks each morning."
             ], highlight=True, badge="Decision Engine")

    # ==========================================================
    # SLIDE 12: Non-Functional & Conclusion
    # ==========================================================
    slide12 = prs.slides.add_slide(blank_layout)
    add_header(slide12, "Summary", "Non-Functional Excellence & Project Impact", "Built for accessibility, high reliability, and real-world farm deployment.")

    add_card(slide12, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Enterprise Non-Functional Features",
             [
                 "Vernacular Localization: Full Kannada (ಕನ್ನಡ) & English translation across navigation, dashboard, and advice.",
                 "Zero-Downtime Fallback: High-resilience in-memory store keeps the portal 100% operational even during database or external network dropouts.",
                 "Privacy & Consent: Built-in consent checkboxes (NFR10) and strict user-scoped tenancy isolation.",
                 "Production Cloud Ready: Containerized multi-service deployment with Docker & Render Blueprint (render.yaml)."
             ], badge="NFR Highlights")

    add_card(slide12, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Conclusion & Project Impact",
             [
                 "Holistic Transformation: From reactive guessing to proactive precision farming.",
                 "Economic Empowerment: Lower input expenditure on fertilizers + higher yield quality + better mandi sale timing.",
                 "Scalable Foundation: Ready to expand with IoT soil moisture probes, drone hyper-spectral imagery, and local voice assistants.",
                 "AgriSaarthi: Delivering data-driven agricultural intelligence directly into the hands of every farmer."
             ], highlight=True, badge="Conclusion")

    prs.save(output_path)
    print(f"Successfully generated PowerPoint presentation at: {output_path}")

if __name__ == "__main__":
    out_dir = r"c:\Users\dines\Documents\Projects\AgriSaarthi"
    target = os.path.join(out_dir, "AgriSaarthi_Project_Presentation.pptx")
    create_deck(target)
