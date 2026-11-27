import os
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_simple_deck(output_path):
    prs = pptx.Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Palette
    DARK_GREEN = RGBColor(27, 77, 62)       # #1B4D3E
    FOREST_GREEN = RGBColor(38, 148, 93)     # #26945D
    LIGHT_BG = RGBColor(248, 250, 252)       # #F8FAFC
    CARD_BG = RGBColor(255, 255, 255)        # #FFFFFF
    CARD_BORDER = RGBColor(226, 232, 240)    # #E2E8F0
    TEXT_DARK = RGBColor(30, 41, 59)         # #1E293B
    TEXT_MUTED = RGBColor(100, 116, 139)     # #64748B
    WHITE = RGBColor(255, 255, 255)
    ACCENT_GREEN = RGBColor(240, 253, 244)   # #F0FDF4

    def add_top_bar(slide, module_number, module_title, simple_summary):
        # Top banner
        top_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.12))
        top_bar.fill.solid()
        top_bar.fill.fore_color.rgb = FOREST_GREEN
        top_bar.line.fill.background()

        # Title box
        tb = slide.shapes.add_textbox(Inches(0.9), Inches(0.5), Inches(11.5), Inches(1.2))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        p0.text = module_number.upper()
        p0.font.name = "Arial"
        p0.font.size = Pt(11)
        p0.font.bold = True
        p0.font.color.rgb = FOREST_GREEN
        p0.space_after = Pt(2)

        p1 = tf.add_paragraph()
        p1.text = module_title
        p1.font.name = "Arial"
        p1.font.size = Pt(26)
        p1.font.bold = True
        p1.font.color.rgb = DARK_GREEN
        p1.space_after = Pt(4)

        p2 = tf.add_paragraph()
        p2.text = simple_summary
        p2.font.name = "Arial"
        p2.font.size = Pt(14)
        p2.font.color.rgb = TEXT_MUTED

    def add_simple_card(slide, left, top, width, height, title, points, is_highlight=False):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = ACCENT_GREEN if is_highlight else CARD_BG
        shape.line.color.rgb = FOREST_GREEN if is_highlight else CARD_BORDER
        shape.line.width = Pt(1.5 if is_highlight else 1)

        tf = shape.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.35)
        tf.margin_right = Inches(0.35)
        tf.margin_top = Inches(0.35)
        tf.margin_bottom = Inches(0.3)

        p_title = tf.paragraphs[0]
        p_title.text = title
        p_title.font.name = "Arial"
        p_title.font.size = Pt(18)
        p_title.font.bold = True
        p_title.font.color.rgb = DARK_GREEN
        p_title.space_after = Pt(14)

        for pt in points:
            p = tf.add_paragraph()
            p.text = f"•  {pt}"
            p.font.name = "Arial"
            p.font.size = Pt(14)
            p.font.color.rgb = TEXT_DARK
            p.space_after = Pt(12)

    # ==========================================================
    # SLIDE 1: Title
    # ==========================================================
    slide1 = prs.slides.add_slide(blank_layout)
    bg = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(7.5))
    bg.fill.solid()
    bg.fill.fore_color.rgb = DARK_GREEN
    bg.line.fill.background()

    tb = slide1.shapes.add_textbox(Inches(1.2), Inches(1.8), Inches(11.0), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True

    p0 = tf.paragraphs[0]
    p0.text = "SMART FARMING ASSISTANT"
    p0.font.name = "Arial"
    p0.font.size = Pt(14)
    p0.font.bold = True
    p0.font.color.rgb = RGBColor(110, 230, 160)
    p0.space_after = Pt(14)

    p1 = tf.add_paragraph()
    p1.text = "AgriSaarthi (ಅಗಿಸಾರಥಿ)"
    p1.font.name = "Arial"
    p1.font.size = Pt(46)
    p1.font.bold = True
    p1.font.color.rgb = WHITE
    p1.space_after = Pt(10)

    p2 = tf.add_paragraph()
    p2.text = "Grow Smarter. Farm Better."
    p2.font.name = "Arial"
    p2.font.size = Pt(22)
    p2.font.color.rgb = RGBColor(220, 245, 230)
    p2.space_after = Pt(26)

    p3 = tf.add_paragraph()
    p3.text = "A simple, all-in-one AI platform to help farmers make the right decisions every day."
    p3.font.name = "Arial"
    p3.font.size = Pt(16)
    p3.font.color.rgb = RGBColor(190, 220, 205)

    # ==========================================================
    # SLIDE 2: What is AgriSaarthi?
    # ==========================================================
    slide2 = prs.slides.add_slide(blank_layout)
    add_top_bar(slide2, "Introduction", "What is AgriSaarthi?", "One single app that connects soil, weather, satellite, and market data.")

    add_simple_card(slide2, Inches(0.9), Inches(2.0), Inches(5.6), Inches(4.8),
                    "The Problem for Farmers",
                    [
                        "Too many guesswork decisions in daily farming.",
                        "Crop diseases identified too late to save the yield.",
                        "Wasting money on excess fertilizers and water.",
                        "Selling crops at low prices without mandi knowledge.",
                        "Most complex apps are only in English."
                    ])

    add_simple_card(slide2, Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8),
                    "How AgriSaarthi Helps",
                    [
                        "Combines 8 essential farm tools in one easy dashboard.",
                        "Takes a photo of a leaf and detects disease instantly.",
                        "Gives clear advice on water, fertilizer, and harvest.",
                        "Available in both Kannada (ಕನ್ನಡ) and English.",
                        "Works even when the database or internet is slow."
                    ], is_highlight=True)

    # ==========================================================
    # SLIDE 3: Module 1 - Crop Recommendation
    # ==========================================================
    slide3 = prs.slides.add_slide(blank_layout)
    add_top_bar(slide3, "Module 01", "Crop Recommendation", "Tells farmers the best crops to plant in their soil.")

    add_simple_card(slide3, Inches(0.9), Inches(2.0), Inches(5.6), Inches(4.8),
                    "How It Works",
                    [
                        "Farmer enters their soil values: Nitrogen, Phosphorus, Potassium.",
                        "Enter local conditions: Temperature, humidity, pH, and rainfall.",
                        "AI model (Random Forest) checks against 22 crops.",
                        "Achieves 99.3% accuracy in matching crops."
                    ])

    add_simple_card(slide3, Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8),
                    "Farmer Benefit",
                    [
                        "Gives top 3 best-suited crops with match percentages.",
                        "Explains why the soil is good for each crop.",
                        "Avoids planting the wrong crop and losing money.",
                        "Supports smart crop planning each season."
                    ], is_highlight=True)

    # ==========================================================
    # SLIDE 4: Module 2 - Plant Disease Detection
    # ==========================================================
    slide4 = prs.slides.add_slide(blank_layout)
    add_top_bar(slide4, "Module 02", "Plant Disease Detection", "Instant plant disease check from a leaf photo using MobileNetV2 AI.")

    add_simple_card(slide4, Inches(0.9), Inches(2.0), Inches(5.6), Inches(4.8),
                    "How It Works",
                    [
                        "Farmer uploads or takes a photo of an affected leaf.",
                        "Pretrained MobileNetV2 deep learning model scans the image.",
                        "Recognizes 38 crop & disease classes (Tomato, Potato, Corn, Apple, etc.).",
                        "Runs in less than 1 second directly on CPU."
                    ])

    add_simple_card(slide4, Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8),
                    "Farmer Benefit",
                    [
                        "Instantly marks plant as 'Healthy' or 'Disease Detected'.",
                        "Lists observed symptoms so farmers can verify in the field.",
                        "Gives immediate treatment: recommended sprays and organic remedies.",
                        "Prevents disease spread before whole crop is damaged."
                    ], is_highlight=True)

    # ==========================================================
    # SLIDE 5: Module 3 - Weather & Smart Irrigation
    # ==========================================================
    slide5 = prs.slides.add_slide(blank_layout)
    add_top_bar(slide5, "Module 03", "Weather & Smart Irrigation", "Forecasts rain and guides daily watering decisions.")

    add_simple_card(slide5, Inches(0.9), Inches(2.0), Inches(5.6), Inches(4.8),
                    "How It Works",
                    [
                        "Pulls live hyperlocal weather for the farm location.",
                        "Provides 5-day forecast and 3-hour rain predictions.",
                        "Smart engine checks if rain is coming in the next 24-48 hours.",
                        "Compares crop stage water demand with forecast rainfall."
                    ])

    add_simple_card(slide5, Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8),
                    "Farmer Benefit",
                    [
                        "Warns: 'Heavy rain expected — hold off watering today'.",
                        "Saves electricity and precious groundwater.",
                        "Alerts during dry spells before crops suffer heat stress.",
                        "Simple recommendations instead of complex weather charts."
                    ], is_highlight=True)

    # ==========================================================
    # SLIDE 6: Module 4 - Soil Health & Fertilizer
    # ==========================================================
    slide6 = prs.slides.add_slide(blank_layout)
    add_top_bar(slide6, "Module 04", "Soil Health & Precision Fertilizer", "Calculates the exact fertilizer bags needed for the field.")

    add_simple_card(slide6, Inches(0.9), Inches(2.0), Inches(5.6), Inches(4.8),
                    "How It Works",
                    [
                        "Digital Soil Map: Pulls soil pH and texture from SoilGrids.",
                        "Lab Test Input: Farmer enters their soil lab report (N, P, K).",
                        "Calculates the exact nutrient gap for the chosen crop.",
                        "Never guesses; uses scientific agricultural formulas."
                    ])

    add_simple_card(slide6, Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8),
                    "Farmer Benefit",
                    [
                        "Recommends exact commercial bags: Urea, DAP, and MOP.",
                        "Cuts unnecessary fertilizer costs by up to 25%.",
                        "Protects soil health from chemical over-application.",
                        "Suggests lime or gypsum if soil is too acidic or alkaline."
                    ], is_highlight=True)

    # ==========================================================
    # SLIDE 7: Module 5 - Farm Digital Twin & Plot Map
    # ==========================================================
    slide7 = prs.slides.add_slide(blank_layout)
    add_top_bar(slide7, "Module 05", "Farm Digital Twin & Plot Management", "Draw and manage your farm plots on satellite maps.")

    add_simple_card(slide7, Inches(0.9), Inches(2.0), Inches(5.6), Inches(4.8),
                    "How It Works",
                    [
                        "Interactive map lets farmers trace plot boundaries.",
                        "Automatically calculates plot size in acres and hectares.",
                        "Supports multiple plots with different crops on one farm.",
                        "Tracks sowing date, growth stage, and harvest date."
                    ])

    add_simple_card(slide7, Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8),
                    "Farmer Benefit",
                    [
                        "Visual digital map of the entire farm holding.",
                        "Tracks crop stage: Vegetative -> Flowering -> Harvesting.",
                        "Maintains digital logs of expenses, inputs, and past yield.",
                        "Useful documentation for crop insurance and bank loans."
                    ], is_highlight=True)

    # ==========================================================
    # SLIDE 8: Module 6 - Satellite Crop Health (Sentinel-2)
    # ==========================================================
    slide8 = prs.slides.add_slide(blank_layout)
    add_top_bar(slide8, "Module 06", "Satellite Remote Sensing (NDVI)", "Monitors crop growth and health from European Space Agency satellites.")

    add_simple_card(slide8, Inches(0.9), Inches(2.0), Inches(5.6), Inches(4.8),
                    "How It Works",
                    [
                        "Connects to Copernicus Sentinel-2 satellite data.",
                        "Updates every 5 days with 10-meter spatial resolution.",
                        "Measures green plant health index (NDVI).",
                        "Zero sensors or field hardware required."
                    ])

    add_simple_card(slide8, Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8),
                    "Farmer Benefit",
                    [
                        "NDVI > 0.6: Healthy, dense green crop canopy.",
                        "NDVI < 0.3: Spots dry patches or pest damage early.",
                        "Allows inspecting large acres in seconds from the phone.",
                        "Detects hidden stress before visible to the naked eye."
                    ], is_highlight=True)

    # ==========================================================
    # SLIDE 9: Module 7 & 8 - Market Mandis & Next Best Action
    # ==========================================================
    slide9 = prs.slides.add_slide(blank_layout)
    add_top_bar(slide9, "Modules 07 & 08", "Market Prices & Daily Action Cards", "Real mandi prices and personalized daily tasks.")

    add_simple_card(slide9, Inches(0.9), Inches(2.0), Inches(5.6), Inches(4.8),
                    "Module 7: Market Mandi Prices",
                    [
                        "Live APMC prices from Agmarknet (data.gov.in).",
                        "Filter by State, District, and nearby Mandis.",
                        "See Min, Max, and Modal (prevailing) prices (₹/Quintal).",
                        "Helps farmers decide when and where to sell for maximum profit."
                    ])

    add_simple_card(slide9, Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8),
                    "Module 8: Next Best Action (NBA)",
                    [
                        "Combines weather, satellite, crop stage, and disease info.",
                        "Generates top 2-3 prioritized action cards each morning.",
                        "Example: 'Rain forecast tomorrow — delay spraying pesticide'.",
                        "Clear, actionable guidance without information overload."
                    ], is_highlight=True)

    # ==========================================================
    # SLIDE 10: Summary
    # ==========================================================
    slide10 = prs.slides.add_slide(blank_layout)
    add_top_bar(slide10, "Summary", "Why AgriSaarthi Makes a Difference", "Simple, practical technology designed specifically for real farmers.")

    add_simple_card(slide10, Inches(0.9), Inches(2.0), Inches(5.6), Inches(4.8),
                    "Key Advantages",
                    [
                        "Bilingual: Fully available in Kannada (ಕನ್ನಡ) & English.",
                        "Lightweight & Fast: Runs smoothly even on low-end smartphones.",
                        "Offline Resilient: Keeps working if the database slows down.",
                        "Free & Open: Built with modern open-source technologies."
                    ])

    add_simple_card(slide10, Inches(6.8), Inches(2.0), Inches(5.6), Inches(4.8),
                    "The Farmer Impact",
                    [
                        "Higher Yield: Right crop, right fertilizer, early disease cure.",
                        "Lower Costs: Saves money on water and excess chemicals.",
                        "Better Income: Sells produce at the right mandi at the right time.",
                        "Confidence: From guesswork to data-backed farming."
                    ], is_highlight=True)

    prs.save(output_path)
    print(f"Generated simple PowerPoint presentation at: {output_path}")

if __name__ == "__main__":
    out_dir = r"c:\Users\dines\Documents\Projects\AgriSaarthi"
    target = os.path.join(out_dir, "AgriSaarthi_Simple_Presentation.pptx")
    create_simple_deck(target)
