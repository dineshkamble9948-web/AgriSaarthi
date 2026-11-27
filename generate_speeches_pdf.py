import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 11 * inch - 36, "AgriSaarthi — Technical Presentation Speech Script (6 Speakers)")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)
        
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 36, footer_text)
        self.drawString(54, 36, "CONFIDENTIAL — Academic & Technical Evaluation Script")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 48, 8.5 * inch - 54, 48)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#1B4D3E")     # Deep Forest Green
    secondary_color = colors.HexColor("#26945D")   # Emerald Accent
    dark_text = colors.HexColor("#0F172A")         # Slate 900
    body_text = colors.HexColor("#334155")         # Slate 700
    cue_color = colors.HexColor("#B45309")         # Amber 700 (Stage cues)

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        alignment=TA_CENTER,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=secondary_color,
        alignment=TA_CENTER,
        spaceAfter=15
    )

    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#64748B"),
        alignment=TA_CENTER,
        spaceAfter=20
    )

    speaker_title_style = ParagraphStyle(
        'SpeakerTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=primary_color,
        spaceBefore=10,
        spaceAfter=4
    )

    role_badge_style = ParagraphStyle(
        'RoleBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=secondary_color,
        spaceAfter=8
    )

    speech_body_style = ParagraphStyle(
        'SpeechBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14.5,
        textColor=body_text,
        alignment=TA_JUSTIFY,
        spaceAfter=8
    )

    cue_style = ParagraphStyle(
        'StageCue',
        parent=styles['Normal'],
        fontName='Helvetica-BoldOblique',
        fontSize=9.5,
        leading=13,
        textColor=cue_color,
        spaceAfter=6
    )

    key_points_heading = ParagraphStyle(
        'KPHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=primary_color,
        spaceBefore=4,
        spaceAfter=4
    )

    kp_item_style = ParagraphStyle(
        'KPItem',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=dark_text,
        leftIndent=12,
        spaceAfter=3
    )

    story = []

    # ==================== COVER / HEADER ====================
    story.append(Paragraph("AgriSaarthi (ಅಗಿಸಾರಥಿ)", title_style))
    story.append(Paragraph("AI-Powered Smart Agriculture Decision Support System<br/><b>Comprehensive 6-Speaker Technical Presentation Script</b>", subtitle_style))
    story.append(Paragraph("<b>Presentation Duration:</b> ~15–18 Minutes (2.5 to 3 Mins per Speaker) &nbsp;|&nbsp; <b>Evaluation Focus:</b> Deep Tech Stack & Research Rigor", meta_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=0, spaceAfter=14))

    # Overview Table of Speakers
    speaker_overview_data = [
        [Paragraph("<b>Speaker #</b>", kp_item_style), Paragraph("<b>Assigned Role & Tech Ownership</b>", kp_item_style), Paragraph("<b>Core Modules Covered</b>", kp_item_style), Paragraph("<b>Time</b>", kp_item_style)],
        [Paragraph("<b>Speaker 1</b>", kp_item_style), Paragraph("Project Lead & Systems Architect", kp_item_style), Paragraph("Problem Statement, 3-Tier Microservices, Offline Resilience", kp_item_style), Paragraph("2.5m", kp_item_style)],
        [Paragraph("<b>Speaker 2</b>", kp_item_style), Paragraph("AI & Machine Learning Specialist", kp_item_style), Paragraph("Module 1: Random Forest Crop Recommendation (99.3% acc.)", kp_item_style), Paragraph("2.5m", kp_item_style)],
        [Paragraph("<b>Speaker 3</b>", kp_item_style), Paragraph("Computer Vision & Deep Learning Specialist", kp_item_style), Paragraph("Module 2: MobileNetV2 Disease Detection (38 classes, PyTorch)", kp_item_style), Paragraph("3.0m", kp_item_style)],
        [Paragraph("<b>Speaker 4</b>", kp_item_style), Paragraph("Geospatial & Remote Sensing Engineer", kp_item_style), Paragraph("Module 4 (SoilGrids NPK) & Module 6 (Sentinel-2 NDVI)", kp_item_style), Paragraph("3.0m", kp_item_style)],
        [Paragraph("<b>Speaker 5</b>", kp_item_style), Paragraph("Agro-Meteorology & Market Systems Lead", kp_item_style), Paragraph("Module 3 (Weather / Smart Irrigation) & Module 7 (Mandi Prices)", kp_item_style), Paragraph("2.5m", kp_item_style)],
        [Paragraph("<b>Speaker 6</b>", kp_item_style), Paragraph("Full-Stack & Frontend Lead", kp_item_style), Paragraph("Module 5 (Digital Twin), Module 8 (NBA), Vernacular UX & Cloud", kp_item_style), Paragraph("2.5m", kp_item_style)],
    ]
    t = Table(speaker_overview_data, colWidths=[1.0*inch, 2.5*inch, 3.0*inch, 0.7*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E6F5EB")),
        ('TEXTCOLOR', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    # ==================== SPEAKER 1 ====================
    story.append(Paragraph("SPEAKER 1: Project Lead & Systems Architect", speaker_title_style))
    story.append(Paragraph("TOPIC: Problem Statement, Vision, and Multi-Service Architecture", role_badge_style))
    story.append(Paragraph("[Stage Cue: Stand confidently, address the evaluators respectfully, and open Slide 1 and Slide 2.]", cue_style))
    
    s1_text_1 = (
        "\"Good morning, respected professors, evaluators, and colleagues. Today, our team is proud to present "
        "<b>AgriSaarthi (ಅಗಿಸಾರಥಿ)</b>, an enterprise-grade AI decision support platform engineered specifically "
        "for precision agriculture. In India, over 140 million farmers operate under extreme operational uncertainty. "
        "They face unpredictable microclimates, delayed crop pathology identification which causes up to 35% in preventable "
        "yield loss, unbalanced blanket fertilizer application that degrades soil organic carbon, and severe market price "
        "asymmetry where middlemen exploit their lack of real-time mandi intelligence."
    )
    story.append(Paragraph(s1_text_1, speech_body_style))

    story.append(Paragraph("[Stage Cue: Switch to Slide 3: Architecture Diagram.]", cue_style))
    
    s1_text_2 = (
        "\"Rather than building another simple monolithic application, our research guided us toward a strictly decoupled "
        "<b>3-tier microservice architecture</b>. At the presentation tier, we have a reactive single-page client engineered with "
        "<b>React 19, Vite, and Tailwind Glassmorphism</b>, with full bilingual localization in Kannada and English. "
        "At the API gateway layer, we built an asynchronous REST server using <b>Node.js 20 and Express 5</b>, secured via JWT-based "
        "stateless authentication and role-based access controls. Crucially, we isolated our compute-intensive artificial intelligence "
        "routines into an autonomous <b>Python 3.11 FastAPI microservice</b>. "
        "<br/><br/>"
        "Why this architectural decoupling? Heavy PyTorch tensor matrix operations and machine learning inferences would block "
        "the single-threaded Node.js event loop under concurrent load. By separating FastAPI and managing inference via worker threads, "
        "we achieve sub-50ms API latencies. Furthermore, knowing that rural internet connectivity is notoriously fragile, we implemented "
        "a zero-downtime <b>In-Memory Fallback Cache Engine</b> directly into the backend. If MongoDB Atlas or external satellite APIs "
        "experience network drops, AgriSaarthi seamlessly falls back to local memory caching without throwing 500 errors to the farmer. "
        "<br/><br/>"
        "I will now hand over to <b>Speaker 2</b>, who will unpack the mathematical modeling and machine learning research behind our Crop Recommendation Engine.\""
    )
    story.append(Paragraph(s1_text_2, speech_body_style))

    # Tech Rigor Box
    tech_box_1 = [
        [Paragraph("<b>Key Technical Points Evaluator Will Recognize:</b>", key_points_heading)],
        [Paragraph("• Justification of microservices: Node.js non-blocking I/O for client transactions vs. Python FastAPI for CPU-bound ML tensors.", kp_item_style)],
        [Paragraph("• Resilience engineering: <code>fallbackStore.js</code> provides dual-mode data persistence (MongoDB Atlas + In-Memory Store).", kp_item_style)],
        [Paragraph("• Security posture: JSON Web Tokens (JWT) with bcrypt salt rounds and tenant-scoped farm authorization.", kp_item_style)],
    ]
    t1 = Table(tech_box_1, colWidths=[7.2*inch])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t1)
    story.append(Spacer(1, 14))

    # ==================== SPEAKER 2 ====================
    story.append(Paragraph("SPEAKER 2: AI & Machine Learning Specialist", speaker_title_style))
    story.append(Paragraph("TOPIC: Module 1 — Multi-Variate Random Forest Crop Recommendation", role_badge_style))
    story.append(Paragraph("[Stage Cue: Take over smoothly, project authority on ML algorithms, open Slide 4.]", cue_style))

    s2_text_1 = (
        "\"Thank you, Speaker 1. Moving to our core predictive intelligence layer: <b>Module 1 — AI Crop Recommendation</b>. "
        "A common flaw in rudimentary agricultural projects is relying on simplistic static lookup tables. In reality, crop suitability "
        "is a non-linear optimization problem across a continuous 7-dimensional agronomic hyperspace. "
        "<br/><br/>"
        "Our model evaluates seven continuous features: Soil Macronutrients — Nitrogen (N), Phosphorus (P), and Potassium (K) in mg/kg; "
        "Climatic indicators — Ambient Temperature in Celsius, Relative Humidity percentage, and Annualized Precipitation in millimeters; "
        "and Soil Chemistry — the precise pH level. We benchmarked multiple classifiers including Support Vector Machines, K-Nearest Neighbors, "
        "and Multilayer Perceptrons. We ultimately selected and tuned an ensemble <b>Random Forest Classifier</b>. "
        "<br/><br/>"
        "Why Random Forest? Agricultural survey data contains inherent sensor noise and local variance. Decision trees alone overfit "
        "dramatically. Random Forest constructs an ensemble of de-correlated bootstrap-aggregated decision trees with random feature sub-spacing. "
        "This architectural choice delivered a validated <b>99.3% test accuracy</b> across 22 major commercial and staple crops, including rice, "
        "maize, cotton, chickpea, kidney beans, and coffee."
    )
    story.append(Paragraph(s2_text_1, speech_body_style))

    s2_text_2 = (
        "\"Furthermore, in production, we do not simply output a single label. Our FastAPI endpoint executes probability vector extraction "
        "using <code>predict_proba</code>, ranking the top 3 statistically viable crops with percentage confidence scores. We serialized "
        "the model pipeline using <b>Joblib</b> with strict parameter boundary validation (for instance, temperature bounded between -10°C and 60°C). "
        "This ensures that out-of-range inputs reject gracefully rather than generating agricultural hallucinations. "
        "<br/><br/>"
        "Now, <b>Speaker 3</b> will explain how we engineered our deep learning vision pipeline for leaf disease detection.\""
    )
    story.append(Paragraph(s2_text_2, speech_body_style))

    tech_box_2 = [
        [Paragraph("<b>Key Technical Points Evaluator Will Recognize:</b>", key_points_heading)],
        [Paragraph("• Algorithmic defense: Why ensemble bagging (Random Forest) was chosen over SVM/Neural Nets for noisy agricultural tabular data.", kp_item_style)],
        [Paragraph("• Feature engineering: 7-variable hyperspace (NPK, Temp, Humidity, pH, Rainfall) with continuous range clamping.", kp_item_style)],
        [Paragraph("• Production deployment: Scikit-learn bundle loaded via Joblib, exposing <code>predict_top_three</code> probability ranking.", kp_item_style)],
    ]
    t2 = Table(tech_box_2, colWidths=[7.2*inch])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t2)
    story.append(Spacer(1, 14))

    # ==================== SPEAKER 3 ====================
    story.append(Paragraph("SPEAKER 3: Computer Vision & Deep Learning Specialist", speaker_title_style))
    story.append(Paragraph("TOPIC: Module 2 — Deep Convolutional Neural Network (MobileNetV2) Disease Diagnostics", role_badge_style))
    story.append(Paragraph("[Stage Cue: Step forward, display technical mastery of computer vision and PyTorch, open Slide 5.]", cue_style))

    s3_text_1 = (
        "\"Thank you, Speaker 2. While crop planning is vital before sowing, biological diseases during vegetative growth represent the single "
        "greatest immediate risk to a farmer's livelihood. In <b>Module 2 — Plant Disease Detection</b>, our goal was to provide instantaneous, "
        "laboratory-grade leaf pathology diagnostics from a standard smartphone camera photo. "
        "<br/><br/>"
        "From an engineering perspective, deploying deep convolutional architectures like ResNet-50 or VGG-16 on cloud microservices creates massive "
        "compute bottlenecks: they require high GPU memory and take seconds to execute on shared servers. We researched lightweight architectures "
        "and selected <b>MobileNetV2</b>, fine-tuned on the comprehensive <b>PlantVillage benchmark dataset</b>. "
        "<br/><br/>"
        "MobileNetV2's breakthrough lies in its <b>Depthwise Separable Convolutions</b> and <b>Inverted Residual Blocks with Linear Bottlenecks</b>. "
        "Standard convolutions multiply spatial filtering and channel correlation in one heavy step. MobileNetV2 splits this into a 3x3 depthwise convolution "
        "followed by a 1x1 pointwise convolution. This slashes computational complexity by nearly 9-fold while maintaining high top-1 accuracy. "
        "Our serialized PyTorch checkpoint is merely <b>8.9 Megabytes</b> and executes on CPU in under 120 milliseconds!\""
    )
    story.append(Paragraph(s3_text_1, speech_body_style))

    s3_text_2 = (
        "\"Our neural network classifies across <b>38 distinct crop and pathology classes</b> spanning 14 agricultural cultivars — including tomato, "
        "potato, corn, apple, bell pepper, and grape. It accurately differentiates bacterial spot, late blight, early blight, powdery mildew, "
        "black rot, and viral mosaic from healthy tissue. "
        "<br/><br/>"
        "Our image pipeline in Python uses <b>Torchvision transforms</b>: images are resized to 224x224 pixels, converted to RGB tensors, and normalized "
        "against ImageNet channel means. Softmax outputs are mapped to agronomic guidance. When a disease like Tomato Early Blight is detected, AgriSaarthi "
        "does not just output a cold label; it provides observed symptom verification (such as concentric target spots) and prescribes exact agronomic treatments, "
        "such as Chlorothalonil or organic bio-fungicides like Trichoderma. Furthermore, should the deep learning service be unreachable, we maintain "
        "an active secondary failover adapter to the Pl@ntNet API. "
        "<br/><br/>"
        "Next, <b>Speaker 4</b> will explain our satellite remote sensing and geospatial soil intelligence systems.\""
    )
    story.append(Paragraph(s3_text_2, speech_body_style))

    tech_box_3 = [
        [Paragraph("<b>Key Technical Points Evaluator Will Recognize:</b>", key_points_heading)],
        [Paragraph("• Neural network architecture: Depthwise separable convolutions + inverted residuals in MobileNetV2 cutting weights to 8.9 MB.", kp_item_style)],
        [Paragraph("• Multi-class coverage: 38 PlantVillage classes covering fungal, bacterial, viral, and healthy leaves across 14 crops.", kp_item_style)],
        [Paragraph("• Production image processing: Torchvision transforms, Softmax probability distribution, and programmatic agronomic spray guidance.", kp_item_style)],
    ]
    t3 = Table(tech_box_3, colWidths=[7.2*inch])
    t3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t3)
    story.append(Spacer(1, 14))

    # ==================== SPEAKER 4 ====================
    story.append(Paragraph("SPEAKER 4: Geospatial & Remote Sensing Engineer", speaker_title_style))
    story.append(Paragraph("TOPIC: Module 4 & 6 — Satellite Remote Sensing (Sentinel-2 NDVI) & SoilGrids Nutrition", role_badge_style))
    story.append(Paragraph("[Stage Cue: Maintain an energetic tone, highlight space technology and soil science, open Slide 7 & Slide 9.]", cue_style))

    s4_text_1 = (
        "\"Thank you, Speaker 3. Agriculture cannot be optimized solely at the individual plant level; it requires macro-scale observation. "
        "In <b>Module 6 — Satellite Remote Sensing</b>, AgriSaarthi integrates directly with the <b>European Space Agency (ESA) Copernicus "
        "Data Space Ecosystem (CDSE)</b> to monitor farm health from orbit without requiring expensive ground IoT sensors. "
        "<br/><br/>"
        "We ingest multispectral imagery from the <b>Sentinel-2 constellation</b>, which provides 10-meter spatial resolution and a 5-day revisit cadence. "
        "Our backend authenticates via OAuth2 client credentials and calculates the <b>Normalized Difference Vegetation Index (NDVI)</b>. "
        "The mathematical formula is: NDVI equals (Band 8 Near-Infrared minus Band 4 Red) divided by (Band 8 plus Band 4). "
        "Healthy chlorophyll absorbs red light for photosynthesis while vigorously reflecting near-infrared radiation. "
        "An NDVI greater than 0.6 indicates dense, healthy vegetative canopy. When NDVI drops between 0.2 and 0.4, our system triggers an early warning: "
        "it identifies localized vegetative decline, water stress, or pest infestation days before yellowing is visible from the ground.\""
    )
    story.append(Paragraph(s4_text_1, speech_body_style))

    s4_text_2 = (
        "\"Simultaneously, in <b>Module 4 — Soil Intelligence</b>, we integrate the <b>ISRIC SoilGrids REST API</b>, which provides global 250-meter "
        "gridded soil profiles. We programmatically query and scale physical soil texture — clay, sand, and silt fractions — as well as cation exchange capacity "
        "and soil organic carbon. "
        "<br/><br/>"
        "When the farmer enters their soil laboratory test readings, our agronomic nutrition algorithm calculates the precise nutrient deficit. "
        "Instead of confusing farmers with theoretical elemental figures, AgriSaarthi automatically converts the shortfall into <b>exact commercial fertilizer bags</b>: "
        "quantities of <b>Urea (46% Nitrogen)</b>, <b>DAP (Diammonium Phosphate — 18% N, 46% P2O5)</b>, and <b>MOP (Muriate of Potash — 60% K2O)</b>, "
        "alongside agricultural lime recommendations for acidic soils (pH < 6.0). This prevents over-fertilization, saving input costs by up to 25%. "
        "<br/><br/>"
        "I will now pass the floor to <b>Speaker 5</b> to cover our Weather Intelligence and Market Mandi systems.\""
    )
    story.append(Paragraph(s4_text_2, speech_body_style))

    tech_box_4 = [
        [Paragraph("<b>Key Technical Points Evaluator Will Recognize:</b>", key_points_heading)],
        [Paragraph("• Earth Observation physics: Sentinel-2 Band 8 (NIR) and Band 4 (Red) multispectral ratio computation for NDVI canopy vigor.", kp_item_style)],
        [Paragraph("• API integration: OAuth2 token exchange with Copernicus Data Space Ecosystem (CDSE) with bounding box geometry caching.", kp_item_style)],
        [Paragraph("• Scientific fertilizer conversion: Transforming NPK gaps into commercial stoichiometric bags of Urea, DAP, and MOP.", kp_item_style)],
    ]
    t4 = Table(tech_box_4, colWidths=[7.2*inch])
    t4.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t4)
    story.append(Spacer(1, 14))

    # ==================== SPEAKER 5 ====================
    story.append(Paragraph("SPEAKER 5: Agro-Meteorology & Market Systems Lead", speaker_title_style))
    story.append(Paragraph("TOPIC: Module 3 & 7 — Weather Hydrology & Live Mandi Commodity Intelligence", role_badge_style))
    story.append(Paragraph("[Stage Cue: Speak clearly about practical farmer economics and hydrological algorithms, open Slide 6 & Slide 10.]", cue_style))

    s5_text_1 = (
        "\"Thank you, Speaker 4. A farmer's daily operations are heavily dictated by weather and market economics. "
        "In <b>Module 3 — Weather Intelligence & Smart Irrigation Advisory</b>, we consume geospatial meteorological feeds from the "
        "<b>OpenWeather API</b>. We extract real-time ambient conditions, solar transitions, 3-hour precipitation probability volumes, "
        "and 5-day predictive forecasts tailored to the farm's exact coordinates. "
        "<br/><br/>"
        "However, raw weather data is useless to a farmer unless converted into an operational decision. We built a <b>Rule-Based Agro-Hydrology "
        "Engine</b>. The engine correlates the crop's phenological stage water requirement with upcoming rainfall predictions. If precipitation "
        "greater than or equal to 10 millimeters is forecast within the next 24 to 48 hours, the system generates an urgent alert: "
        "<i>'Delay scheduled irrigation — significant natural rainfall anticipated.'</i> This avoids waterlogging root zones, protects delicate topsoil "
        "from nutrient leaching, and saves groundwater and electricity.\""
    )
    story.append(Paragraph(s5_text_1, speech_body_style))

    s5_text_2 = (
        "\"In parallel, growing a bumper crop yields zero benefit if the farmer is forced to sell at distressed prices. "
        "In <b>Module 7 — Market Intelligence & Mandi Price Forecasting</b>, we established an automated data ingestion pipeline connected "
        "to the <b>Agmarknet portal via Open Government Data (data.gov.in)</b>. "
        "<br/><br/>"
        "Our system tracks real-time agricultural market arrivals across Indian APMC mandis. We normalize Minimum, Maximum, and Modal (prevailing) "
        "prices per quintal. Farmers can dynamically filter by State, District, and Market commodity. To ensure extreme reliability against government "
        "API latency, our backend snapshots successful price payloads into an indexed MongoDB collection. Furthermore, we render historical price trend "
        "charts that allow farmers to identify upward or downward price momentum and decide whether to sell immediately or hold produce in storage. "
        "<br/><br/>"
        "Now, our final speaker, <b>Speaker 6</b>, will present our Farm Digital Twin, What-If simulation engine, and vernacular UX engineering.\""
    )
    story.append(Paragraph(s5_text_2, speech_body_style))

    tech_box_5 = [
        [Paragraph("<b>Key Technical Points Evaluator Will Recognize:</b>", key_points_heading)],
        [Paragraph("• Agro-meteorological logic: Automated threshold rules comparing evapotranspiration demands against upcoming precipitation volumes.", kp_item_style)],
        [Paragraph("• Public sector API pipeline: Ingestion of Agmarknet (data.gov.in) commodity market data with state/district normalization.", kp_item_style)],
        [Paragraph("• Data caching resilience: MongoDB snapshots with TTL-based expiration preventing third-party rate limits.", kp_item_style)],
    ]
    t5 = Table(tech_box_5, colWidths=[7.2*inch])
    t5.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t5)
    story.append(Spacer(1, 14))

    # ==================== SPEAKER 6 ====================
    story.append(Paragraph("SPEAKER 6: Full-Stack & Frontend Lead", speaker_title_style))
    story.append(Paragraph("TOPIC: Module 5 & 8 — Farm Digital Twin, What-If NBA Engine, and Vernacular UX", role_badge_style))
    story.append(Paragraph("[Stage Cue: Step forward to deliver the grand finale, demonstrate UI elegance and NFRs, open Slide 8, 11, and 12.]", cue_style))

    s6_text_1 = (
        "\"Thank you, Speaker 5. All the deep intelligence our team built across satellites, neural networks, and soil models must converge "
        "into an intuitive interface that any farmer can understand in seconds. "
        "<br/><br/>"
        "In <b>Module 5 — Farm Digital Twin & Cadastral Mapping</b>, we implemented interactive GIS boundary tracing using <b>Leaflet and GeoJSON</b>. "
        "A farmer can delineate multi-plot geometries directly over satellite tiles. Our geospatial utility calculates spherical polygon areas in acres "
        "and hectares. Each plot tracks its distinct crop cycle, monitoring phenological stages from Sowing, to Vegetative, Flowering, and Maturity, "
        "maintaining an auditable ledger of seasonal input expenses and historic yields for crop insurance verification. "
        "<br/><br/>"
        "In <b>Module 8</b>, we engineered two high-level decision engines: "
        "First, our <b>What-If Scenario Simulator</b>. Farmers use interactive sliders to model hypothetical conditions — such as a 20% water cut "
        "or a 15% reduction in fertilizer budget — and view projected yield impacts before risking actual capital. "
        "Second, our <b>Next Best Action (NBA) Engine</b>. Rather than overwhelming the farmer with eight complex dashboards, the NBA engine "
        "synthesizes weather warnings, NDVI stress anomalies, crop growth stages, and disease alerts into a prioritized daily feed of the "
        "top 2 to 3 actionable tasks each morning.\""
    )
    story.append(Paragraph(s6_text_1, speech_body_style))

    s6_text_2 = (
        "\"Finally, let us highlight our <b>Non-Functional and Architectural Excellence</b>: "
        "<br/>"
        "1. <b>Vernacular Accessibility:</b> Recognizing that language is the biggest barrier to AI adoption in rural India, we built comprehensive "
        "<b>Kannada (ಕನ್ನಡ) and English localization</b> using React Context across every component, label, and advisory card. "
        "<br/>"
        "2. <b>Enterprise Testing:</b> Our backend test suite contains <b>59 unit and integration tests</b> passing with zero failures. "
        "<br/>"
        "3. <b>Cloud Production Ready:</b> The entire system is containerized with <b>Docker</b> and deployed in live production via automated "
        "<b>Render Blueprints (render.yaml)</b>. "
        "<br/><br/>"
        "In conclusion, AgriSaarthi proves that cutting-edge deep learning, space-borne remote sensing, and soil physics can be synthesized "
        "into a simple, life-changing tool for the everyday farmer. "
        "<br/><br/>"
        "Thank you for your time. We are now open for questions and look forward to demonstrating our live system!\""
    )
    story.append(Paragraph(s6_text_2, speech_body_style))

    tech_box_6 = [
        [Paragraph("<b>Key Technical Points Evaluator Will Recognize:</b>", key_points_heading)],
        [Paragraph("• Geospatial GIS: Spherical GeoJSON polygon boundary tracing and phenological growth cycle tracking.", kp_item_style)],
        [Paragraph("• Decision intelligence: What-If response curve modeling and Next Best Action (NBA) cross-module synthesis.", kp_item_style)],
        [Paragraph("• Software quality: Full React Kannada i18n localization, 59/59 automated tests, and multi-service Render cloud deployment.", kp_item_style)],
    ]
    t6 = Table(tech_box_6, colWidths=[7.2*inch])
    t6.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t6)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully built at: {filename}")

if __name__ == "__main__":
    out_pdf = r"c:\Users\dines\Documents\Projects\AgriSaarthi\AgriSaarthi_6_Speaker_Presentation_Script.pdf"
    build_pdf(out_pdf)
