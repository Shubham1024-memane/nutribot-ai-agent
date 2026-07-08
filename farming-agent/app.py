# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║        AI-POWERED SMART FARMING AGENT — Flask + IBM Watsonx.ai              ║
║        Powered by IBM Granite Language Models · RAG-Ready Architecture      ║
╚══════════════════════════════════════════════════════════════════════════════╝

AGENT_INSTRUCTIONS
==================
Customize the agent's behavior, tone, specializations, and safety rules below.
All settings in this block are injected into the system prompt at runtime.

AGENT_NAME       : FarmBot
AGENT_TONE       : Patient, practical, and respectful. Always speak as a trusted
                   local agricultural expert — use simple language and relatable
                   analogies. Never be condescending about traditional practices.

FARMING_SPECIALIZATION:
  - Kharif, Rabi, and Zaid crop cycle expertise (Indian agricultural calendar)
  - Soil health management: NPK ratios, pH correction, organic amendments
  - Integrated Pest Management (IPM) and bio-pesticide recommendations
  - Drip/sprinkler irrigation scheduling and water conservation
  - Weather-adaptive sowing and harvesting decisions
  - Mandi (market) price trends and profitable selling strategies
  - Government schemes: PM-KISAN, Kisan Credit Card, crop insurance (PMFBY)
  - Organic farming, natural farming (Zero Budget Natural Farming - ZBNF)
  - Horticulture, floriculture, and kitchen garden guidance
  - Livestock and poultry integration with farming

REGIONAL_FOCUS:
  - Maharashtra, Punjab, Haryana, UP, MP, Rajasthan, Karnataka, AP, TN, WB
  - Semi-arid, tropical, alluvial, black cotton, and red laterite soils
  - Water-scarce and rain-fed farming strategies
  - Small & marginal farmer focus (landholding < 2 hectares)

SAFETY_RULES:
  - Never recommend banned pesticides (check CIB&RC list)
  - Always suggest safety equipment (gloves, masks) when recommending chemicals
  - For unusual crop diseases, recommend State Agricultural University helplines
  - Warn about climate risks (excess rain, heatwaves) in planting advice
  - Remind farmers to verify mandi prices from official e-NAM / Agmarknet portals
  - Do not give financial investment advice beyond crop income planning
  - For loan/insurance, always direct to nearest Kisan Seva Kendra or bank

RESPONSE_FORMAT:
  - Use structured markdown with clear headings and bullet points
  - Include actionable steps numbered clearly (Step 1, Step 2 …)
  - Provide cost estimates in INR when discussing inputs/yields
  - Always end with a "Next Action" recommendation
  - Use friendly farming emojis (🌾 🌱 🐛 💧 ☀️) to enhance readability

LANGUAGE_SUPPORT:
  - Respond in the same language the farmer uses (Hindi, Marathi, Kannada, etc.)
  - If language is unclear, default to simple English with Hindi key terms
  - Use local crop names alongside scientific names

SEASONAL_INTELLIGENCE:
  - Automatically factor in current month for crop suitability
  - Reference Indian seasons: Kharif (Jun-Oct), Rabi (Nov-Mar), Zaid (Mar-Jun)
  - Integrate typical monsoon patterns for each region
END_AGENT_INSTRUCTIONS
"""

import sys
import os
from io import TextIOWrapper
if isinstance(sys.stdout, TextIOWrapper):
    sys.stdout.reconfigure(encoding="utf-8")
if isinstance(sys.stderr, TextIOWrapper):
    sys.stderr.reconfigure(encoding="utf-8")

import json
import re
from typing import Optional
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv
from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

# ─── Load environment variables ───────────────────────────────────────────────
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "farming-agent-secret-2024")

# ─── IBM Watsonx.ai Configuration ─────────────────────────────────────────────
IBM_API_KEY    = (os.getenv("IBM_CLOUD_API_KEY") or "").removeprefix("ApiKey-") or None
IBM_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID")
IBM_URL        = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
GRANITE_MODEL  = os.getenv("GRANITE_MODEL_ID", "meta-llama/llama-3-3-70b-instruct")

# ─── Startup credential check ──────────────────────────────────────────────────
print(f"[config] IBM_API_KEY loaded: {'YES (' + IBM_API_KEY[:6] + '...)' if IBM_API_KEY else 'NO — check .env file'}")
print(f"[config] WATSONX_PROJECT_ID: {IBM_PROJECT_ID or 'NOT SET'}")
print(f"[config] WATSONX_URL:        {IBM_URL}")

# ─── Extract AGENT_INSTRUCTIONS from module docstring ─────────────────────────
def _parse_agent_instructions() -> str:
    doc = __doc__ or ""
    match = re.search(
        r"AGENT_INSTRUCTIONS\n={18}(.*?)END_AGENT_INSTRUCTIONS",
        doc, re.DOTALL
    )
    return match.group(1).strip() if match else ""

AGENT_INSTRUCTIONS = _parse_agent_instructions()

# ─── System Prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = f"""You are FarmBot, an expert AI Smart Farming Agent powered by IBM Watsonx.ai.
You support small and marginal Indian farmers with real-time, localized agricultural guidance.

=== AGENT CONFIGURATION ===
{AGENT_INSTRUCTIONS}
===========================

Your core capabilities:
1. **Crop Advisory** — Recommend best crops based on season, soil type, water availability,
   and region. Provide sowing-to-harvest timelines and expected yields.
2. **Soil & Fertilizer Guidance** — Interpret soil health indicators and recommend organic
   or chemical fertilizer schedules with dosage and timing.
3. **Weather-Smart Farming** — Advise on weather-adaptive decisions: delay sowing during
   unseasonal rains, irrigate before predicted dry spells, protect crops from frost.
4. **Pest & Disease Control** — Identify pest/disease symptoms from descriptions and
   recommend IPM solutions (bio-pesticides first, chemical last resort).
5. **Market Intelligence** — Provide mandi price trends, best selling time advice, and
   guidance on FPO/cooperative selling for better margins.
6. **Government Schemes** — Explain PM-KISAN, PMFBY crop insurance, soil health cards,
   KCC loans, and eNAM registration step-by-step.
7. **Irrigation Planning** — Calculate water requirements per crop, schedule drip/flood
   irrigation, and suggest water harvesting techniques.
8. **Farm Economics** — Estimate input costs, expected revenue, and break-even analysis
   for any crop on given land size (in acres/hectares/bigha).

Always be encouraging, science-backed, and respectful of traditional farming wisdom.
Format responses clearly using markdown with headers, bullet points, and tables where appropriate.
Respond in the farmer's language when possible.
"""

# ─── Initialize Watsonx Model ──────────────────────────────────────────────────
def get_watsonx_model() -> ModelInference:
    credentials = Credentials(api_key=IBM_API_KEY, url=IBM_URL)
    params = {
        GenParams.DECODING_METHOD:    "greedy",
        GenParams.MAX_NEW_TOKENS:     2048,
        GenParams.MIN_NEW_TOKENS:     10,
        GenParams.TEMPERATURE:        0.7,
        GenParams.REPETITION_PENALTY: 1.1,
        GenParams.STOP_SEQUENCES:     ["<|endoftext|>", "</s>"],
    }
    return ModelInference(
        model_id=GRANITE_MODEL,
        credentials=credentials,
        project_id=IBM_PROJECT_ID,
        params=params,
    )

# ─── Chat history helpers ──────────────────────────────────────────────────────
def get_chat_history():
    return session.get("chat_history", [])

def save_chat_history(history):
    session["chat_history"] = history[-20:]

# ─── Build prompt for Granite ─────────────────────────────────────────────────
def build_prompt(user_message: str, history: list, context: Optional[dict] = None) -> str:
    context_block = ""
    if context:
        context_block = "\n=== FARM PROFILE ===\n"
        for k, v in context.items():
            if v:
                context_block += f"{k}: {v}\n"
        context_block += "====================\n"

    messages = [{"role": "system", "content": SYSTEM_PROMPT + context_block}]
    for turn in history[-6:]:
        messages.append({"role": "user",      "content": turn["user"]})
        messages.append({"role": "assistant", "content": turn["bot"]})
    messages.append({"role": "user", "content": user_message})

    prompt = ""
    for msg in messages:
        if msg["role"] == "system":
            prompt += f"<|system|>\n{msg['content']}\n"
        elif msg["role"] == "user":
            prompt += f"<|user|>\n{msg['content']}\n"
        elif msg["role"] == "assistant":
            prompt += f"<|assistant|>\n{msg['content']}\n"
    prompt += "<|assistant|>\n"
    return prompt

# ─── Routes ───────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

# ── Chat ──────────────────────────────────────────────────────────────────────
@app.route("/api/chat", methods=["POST"])
def chat():
    data         = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()
    farm_profile = data.get("profile", {})

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    history = get_chat_history()
    prompt  = build_prompt(user_message, history, farm_profile)

    try:
        model     = get_watsonx_model()
        response  = model.generate_text(prompt=prompt)
        bot_reply = response.strip() if isinstance(response, str) else str(response)

        history.append({"user": user_message, "bot": bot_reply,
                         "timestamp": datetime.now().isoformat()})
        save_chat_history(history)

        return jsonify({
            "reply":     bot_reply,
            "timestamp": datetime.now().strftime("%I:%M %p"),
            "model":     GRANITE_MODEL,
        })
    except Exception as exc:
        app.logger.error("Watsonx error: %s", exc)
        return jsonify({"error": str(exc)}), 500

# ── Crop Advisory ──────────────────────────────────────────────────────────────
@app.route("/api/crop-advisory", methods=["POST"])
def crop_advisory():
    data = request.get_json(silent=True) or {}
    p    = data.get("profile", {})

    prompt_text = f"""Generate a detailed crop advisory for a farmer with the following details:
- State/Region: {p.get('state', 'Maharashtra')}
- Land Size: {p.get('land_size', '2')} acres
- Soil Type: {p.get('soil_type', 'black cotton')}
- Water Source: {p.get('water_source', 'borewell')}
- Current Season: {p.get('season', 'Kharif')}
- Preferred Crop: {p.get('preferred_crop', 'any')}
- Budget for Inputs (INR): {p.get('budget', '10000')}
- Farming Method: {p.get('farming_method', 'conventional')}

Provide:
1. **Top 3 Recommended Crops** with reasons (suited to soil, water, season, region)
2. **Sowing Calendar** — exact sowing window, crop duration, harvest month
3. **Expected Yield & Revenue** per acre at current market rates
4. **Input Cost Breakdown** (seeds, fertilizers, pesticides, labour)
5. **Key Risks** and mitigation (weather, pests, price crash)
6. **Variety Recommendations** — high-yield and disease-resistant varieties

Format with clear markdown tables and bullet points."""

    try:
        model    = get_watsonx_model()
        response = model.generate_text(
            prompt=f"<|system|>\n{SYSTEM_PROMPT}\n<|user|>\n{prompt_text}\n<|assistant|>\n"
        )
        return jsonify({"advisory": response.strip(), "generated_at": datetime.now().isoformat()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

# ── Soil Analysis ──────────────────────────────────────────────────────────────
@app.route("/api/soil-analysis", methods=["POST"])
def soil_analysis():
    data = request.get_json(silent=True) or {}
    p    = data.get("soil", {})

    prompt_text = f"""Analyze this soil health report and give fertilizer recommendations:
- pH Level: {p.get('ph', 'unknown')}
- Nitrogen (N): {p.get('nitrogen', 'unknown')} kg/ha
- Phosphorus (P): {p.get('phosphorus', 'unknown')} kg/ha
- Potassium (K): {p.get('potassium', 'unknown')} kg/ha
- Organic Carbon: {p.get('organic_carbon', 'unknown')} %
- Soil Texture: {p.get('texture', 'loamy')}
- Crop Planned: {p.get('crop', 'wheat')}

Provide:
1. **Soil Health Score** (1–10) with interpretation
2. **Deficiency Analysis** — what's missing and its impact on crops
3. **Fertilizer Schedule** — doses, timing, and application method
4. **Organic Amendments** — compost, vermicompost, green manure suggestions
5. **pH Correction** — lime/gypsum/sulphur if needed with quantities
6. **Do's and Don'ts** for this soil type

Format with a markdown table for the fertilizer schedule."""

    try:
        model    = get_watsonx_model()
        response = model.generate_text(
            prompt=f"<|system|>\n{SYSTEM_PROMPT}\n<|user|>\n{prompt_text}\n<|assistant|>\n"
        )
        return jsonify({"analysis": response.strip()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

# ── Pest & Disease ─────────────────────────────────────────────────────────────
@app.route("/api/pest-control", methods=["POST"])
def pest_control():
    data        = request.get_json(silent=True) or {}
    crop        = (data.get("crop") or "").strip()
    symptoms    = (data.get("symptoms") or "").strip()
    stage       = data.get("growth_stage", "vegetative")

    if not crop or not symptoms:
        return jsonify({"error": "Crop name and symptoms are required"}), 400

    prompt_text = f"""A farmer reports the following problem on their {crop} crop at {stage} stage:
"{symptoms}"

Provide:
1. **Likely Pest/Disease Diagnosis** — name, scientific name, and confidence level
2. **Visual Confirmation** — what else to look for to confirm
3. **Severity Assessment** — mild / moderate / severe based on description
4. **Immediate Action** (within 24 hours) — what to do right now
5. **IPM Treatment Plan**:
   - Bio-pesticide / organic options (first priority)
   - Chemical options (only if severe) with safe dosage and PHI (pre-harvest interval)
6. **Preventive Measures** for the rest of the season
7. **Safety Precautions** when applying treatments

Be specific with product names available in India and dosages."""

    try:
        model    = get_watsonx_model()
        response = model.generate_text(
            prompt=f"<|system|>\n{SYSTEM_PROMPT}\n<|user|>\n{prompt_text}\n<|assistant|>\n"
        )
        return jsonify({"advice": response.strip()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

# ── Market Prices / Mandi ──────────────────────────────────────────────────────
@app.route("/api/market-advice", methods=["POST"])
def market_advice():
    data    = request.get_json(silent=True) or {}
    crop    = (data.get("crop") or "wheat").strip()
    state   = data.get("state", "Punjab")
    qty_qtl = data.get("quantity_quintals", 10)

    prompt_text = f"""A farmer wants to sell {qty_qtl} quintals of {crop} in {state}.

Provide:
1. **Current Mandi Price Range** for {crop} in {state} (approximate MSP + market rate)
2. **Best Selling Strategy** — when to sell, where to sell (local mandi vs eNAM)
3. **Price Trend Analysis** — expected price movement in next 4 weeks
4. **Value Addition Ideas** — processing/grading to get 15–30% higher price
5. **Government Procurement** — MSP procurement centers nearby, eligibility
6. **FPO/Cooperative Advantage** — how collective selling can increase income
7. **Expected Revenue Estimate** for {qty_qtl} quintals

Note: Remind the farmer to verify live prices on eNAM portal (enam.gov.in) and Agmarknet."""

    try:
        model    = get_watsonx_model()
        response = model.generate_text(
            prompt=f"<|system|>\n{SYSTEM_PROMPT}\n<|user|>\n{prompt_text}\n<|assistant|>\n"
        )
        return jsonify({"advice": response.strip()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

# ── Government Schemes ─────────────────────────────────────────────────────────
@app.route("/api/govt-schemes", methods=["POST"])
def govt_schemes():
    data     = request.get_json(silent=True) or {}
    state    = data.get("state", "Maharashtra")
    category = data.get("category", "all")
    land_ha  = data.get("land_size_hectares", 1.5)

    prompt_text = f"""List government agricultural schemes applicable for a farmer in {state}
with {land_ha} hectares of land, looking for: {category} support.

For each relevant scheme provide:
1. **Scheme Name** and implementing ministry/department
2. **Who is Eligible** — specific criteria
3. **Benefit** — amount, subsidy %, or service provided
4. **How to Apply** — step-by-step application process (online/offline)
5. **Documents Required**
6. **Key Deadline / Window** (if any)

Include: PM-KISAN, PMFBY (crop insurance), Soil Health Card, KCC, PM Krishi Sinchai Yojana,
National Horticulture Mission, eNAM, NABARD schemes, and any {state}-specific schemes.

Format as a structured list. Keep language simple."""

    try:
        model    = get_watsonx_model()
        response = model.generate_text(
            prompt=f"<|system|>\n{SYSTEM_PROMPT}\n<|user|>\n{prompt_text}\n<|assistant|>\n"
        )
        return jsonify({"schemes": response.strip()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

# ── Irrigation Planning ────────────────────────────────────────────────────────
@app.route("/api/irrigation-plan", methods=["POST"])
def irrigation_plan():
    data         = request.get_json(silent=True) or {}
    crop         = data.get("crop", "tomato")
    land_acres   = data.get("land_acres", 1)
    water_source = data.get("water_source", "borewell")
    method       = data.get("method", "drip")
    growth_stage = data.get("growth_stage", "vegetative")

    prompt_text = f"""Create a detailed irrigation plan for:
- Crop: {crop}
- Land Area: {land_acres} acres
- Water Source: {water_source}
- Irrigation Method: {method}
- Current Growth Stage: {growth_stage}

Provide:
1. **Water Requirement** — litres per day/week at this growth stage
2. **Irrigation Schedule** — frequency, duration, time of day
3. **Critical Irrigation Stages** — when water stress causes maximum damage
4. **Water-Saving Tips** specific to {method} irrigation
5. **Indicators of Over/Under-Watering** — what to look for
6. **Estimated Water Cost** (per hour pump running cost in INR)
7. **Rainwater Harvesting** tips to supplement {water_source}

Format with a weekly irrigation schedule table."""

    try:
        model    = get_watsonx_model()
        response = model.generate_text(
            prompt=f"<|system|>\n{SYSTEM_PROMPT}\n<|user|>\n{prompt_text}\n<|assistant|>\n"
        )
        return jsonify({"plan": response.strip()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

# ── Farm Economics Calculator ──────────────────────────────────────────────────
@app.route("/api/farm-economics", methods=["POST"])
def farm_economics():
    data       = request.get_json(silent=True) or {}
    crop       = data.get("crop", "wheat")
    land_acres = float(data.get("land_acres", 2))
    state      = data.get("state", "Punjab")
    season     = data.get("season", "Rabi")

    prompt_text = f"""Calculate detailed farm economics for growing {crop} on {land_acres} acres
in {state} during {season} season.

Provide a complete financial analysis:
1. **Input Cost Breakdown** (INR per acre and total):
   - Seeds, Fertilizers (NPK), Pesticides, Irrigation, Labour, Land preparation, Misc
2. **Total Investment Required** for {land_acres} acres
3. **Expected Yield** (quintal/acre) — minimum, average, and excellent scenarios
4. **Revenue Estimate** at MSP and open market price
5. **Profit/Loss Analysis** — net profit per acre and total
6. **Break-even Yield** — minimum yield to recover costs
7. **ROI (Return on Investment)** percentage
8. **Risk Factors** that could affect profitability
9. **Tips to Reduce Costs** by 10–20%

Format with clear INR amounts in a markdown table."""

    try:
        model    = get_watsonx_model()
        response = model.generate_text(
            prompt=f"<|system|>\n{SYSTEM_PROMPT}\n<|user|>\n{prompt_text}\n<|assistant|>\n"
        )
        return jsonify({"economics": response.strip()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

# ── Quick Tip ─────────────────────────────────────────────────────────────────
@app.route("/api/quick-tip", methods=["POST"])
def quick_tip():
    data     = request.get_json(silent=True) or {}
    topic    = data.get("topic", "general")
    season   = data.get("season", "Kharif")
    state    = data.get("state", "India")

    prompt_text = f"""Give 5 practical, actionable farming tips for {topic} during {season} season
in {state}. Each tip should be:
- Immediately actionable (can be done today or this week)
- Low-cost or free
- Backed by agricultural science
- Relevant to small/marginal farmers

Format as a numbered list. Keep each tip concise (2–3 sentences max).
End with one important warning or caution for this season."""

    try:
        model    = get_watsonx_model()
        response = model.generate_text(
            prompt=f"<|system|>\n{SYSTEM_PROMPT}\n<|user|>\n{prompt_text}\n<|assistant|>\n"
        )
        return jsonify({"tips": response.strip()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

# ── Utility routes ─────────────────────────────────────────────────────────────
@app.route("/api/clear-history", methods=["POST"])
def clear_history():
    session.pop("chat_history", None)
    return jsonify({"status": "cleared"})

@app.route("/api/health")
def health_check():
    return jsonify({
        "status":  "healthy",
        "model":   GRANITE_MODEL,
        "version": "1.0.0",
        "time":    datetime.now().isoformat(),
    })

# ─── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port  = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    print(f"[FarmBot] Starting on http://localhost:{port}")
    print(f"[FarmBot] Model: {GRANITE_MODEL}")
    app.run(host="0.0.0.0", port=port, debug=debug)
