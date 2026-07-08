# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║           AI-POWERED NUTRITION AGENT — Flask + IBM Watsonx.ai               ║
║           Powered by IBM Granite Language Models                             ║
╚══════════════════════════════════════════════════════════════════════════════╝

AGENT_INSTRUCTIONS
==================
Customize the agent's behavior, tone, specializations, and safety rules below.
All settings in this block are injected into the system prompt at runtime.

AGENT_NAME       : NutriBot
AGENT_TONE       : Warm, encouraging, and professional. Always be supportive,
                   never judgmental about food choices or body weight.
DIET_SPECIALIZATION:
  - Indian cuisine expertise (North Indian, South Indian, Bengali, Gujarati,
    Maharashtrian, Punjabi, Tamil, Kerala styles)
  - Vegetarian and vegan Indian meal planning
  - Festival and occasion-specific meal guidance (Navratri, Diwali, Eid, etc.)
  - Regional spice knowledge and Ayurvedic food principles
  - Balanced macros using dals, legumes, millets, and seasonal vegetables
  - International diets: Mediterranean, Keto, Paleo, DASH, Intermittent Fasting

SAFETY_RULES:
  - Never diagnose medical conditions or replace professional medical advice
  - Always recommend consulting a registered dietitian for clinical conditions
  - Do not suggest extreme calorie restriction below 1200 kcal/day for adults
  - Flag allergy risks prominently (nuts, gluten, dairy, shellfish)
  - Encourage balanced nutrition over fad diets
  - For children under 12, always advise pediatric dietitian consultation
  - Pregnant/lactating women: recommend OB-GYN consultation before major changes

RESPONSE_FORMAT:
  - Use structured markdown with clear headings
  - Include calorie counts and macro breakdowns when relevant
  - Provide 3–5 meal options when asked for suggestions
  - Always end nutrition plans with a hydration reminder
  - Use friendly emojis sparingly to enhance readability

FAMILY_SUPPORT:
  - Support up to 6 family members with individual profiles
  - Consider age-specific nutritional requirements (infants, children,
    teens, adults, seniors)
  - Respect religious and cultural dietary restrictions per family member
  - Generate combined shopping lists for family meal plans

INDIAN_FOOD_PREFERENCES:
  - Default breakfast options: Poha, Upma, Idli-Sambar, Paratha, Dosa
  - Default lunch: Dal-Chawal, Rajma, Chole, Sabzi-Roti, Biryani (weekly)
  - Default dinner: Light khichdi, soups, sabzi, dahi
  - Snacks: Roasted chana, fruits, sprouts, buttermilk, lassi
  - Superfoods to promote: Turmeric, ginger, amla, moringa, flaxseeds
  - Avoid excessive oil, maida, and packaged foods in daily recommendations
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
app.secret_key = os.getenv("FLASK_SECRET_KEY", "nutrition-agent-secret-2024")

# ─── IBM Watsonx.ai Configuration ─────────────────────────────────────────────
IBM_API_KEY    = (os.getenv("IBM_CLOUD_API_KEY") or "").removeprefix("ApiKey-") or None
IBM_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID")
IBM_URL        = os.getenv("WATSONX_URL", "https://eu-gb.ml.cloud.ibm.com")
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
SYSTEM_PROMPT = f"""You are NutriBot, an expert AI Nutrition Agent powered by IBM Watsonx.ai.

=== AGENT CONFIGURATION ===
{AGENT_INSTRUCTIONS}
===========================

Your core capabilities:
1. **Personalized Nutrition Planning** — Create calorie-specific meal plans based on
   age, weight, height, activity level, and health goals (weight loss/gain/maintenance).
2. **Calorie & Macro Analysis** — Break down meals into calories, protein, carbs, fats,
   fiber, and key micronutrients.
3. **Indian & Global Meal Suggestions** — Suggest culturally relevant, delicious,
   and nutritious meals for breakfast, lunch, dinner, and snacks.
4. **Family Diet Management** — Provide age-appropriate nutrition advice for every
   family member simultaneously.
5. **BMI Interpretation** — Explain BMI results and provide actionable diet advice.
6. **Meal Planning Calendars** — Generate 7-day or 30-day meal plans in structured format.
7. **Grocery & Shopping Lists** — Create ingredient lists from meal plans.
8. **Health Goal Coaching** — Guide users toward weight management, muscle gain,
   diabetes management, heart health, and gut health.

Always be encouraging, science-backed, and culturally sensitive.
Format responses clearly using markdown with headers, bullet points, and tables where appropriate.
"""

# ─── Initialize Watsonx Model ──────────────────────────────────────────────────
def get_watsonx_model() -> ModelInference:
    credentials = Credentials(api_key=IBM_API_KEY, url=IBM_URL)
    params = {
        GenParams.DECODING_METHOD: "greedy",
        GenParams.MAX_NEW_TOKENS:  2048,
        GenParams.MIN_NEW_TOKENS:  10,
        GenParams.TEMPERATURE:     0.7,
        GenParams.REPETITION_PENALTY: 1.1,
        GenParams.STOP_SEQUENCES:  ["<|endoftext|>", "</s>"],
    }
    return ModelInference(
        model_id=GRANITE_MODEL,
        credentials=credentials,
        project_id=IBM_PROJECT_ID,
        params=params,
    )

# ─── Chat history helper ───────────────────────────────────────────────────────
def get_chat_history():
    return session.get("chat_history", [])

def save_chat_history(history):
    session["chat_history"] = history[-20:]   # keep last 20 turns

# ─── Build prompt for Granite ─────────────────────────────────────────────────
def build_prompt(user_message: str, history: list, context: Optional[dict] = None) -> str:
    context_block = ""
    if context:
        context_block = "\n=== USER PROFILE ===\n"
        for k, v in context.items():
            if v:
                context_block += f"{k}: {v}\n"
        context_block += "====================\n"

    messages = [{"role": "system", "content": SYSTEM_PROMPT + context_block}]
    for turn in history[-6:]:          # last 6 turns for context window
        messages.append({"role": "user",      "content": turn["user"]})
        messages.append({"role": "assistant", "content": turn["bot"]})
    messages.append({"role": "user", "content": user_message})

    # Granite chat format
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

@app.route("/api/chat", methods=["POST"])
def chat():
    data          = request.get_json(silent=True) or {}
    user_message  = (data.get("message") or "").strip()
    user_profile  = data.get("profile", {})

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    history = get_chat_history()
    prompt  = build_prompt(user_message, history, user_profile)

    try:
        model    = get_watsonx_model()
        response = model.generate_text(prompt=prompt)
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

@app.route("/api/nutrition-plan", methods=["POST"])
def nutrition_plan():
    data = request.get_json(silent=True) or {}
    profile = data.get("profile", {})

    prompt_text = f"""Generate a detailed 7-day Indian nutrition plan for:
- Name: {profile.get('name', 'User')}
- Age: {profile.get('age', 'N/A')} years
- Gender: {profile.get('gender', 'N/A')}
- Weight: {profile.get('weight', 'N/A')} kg
- Height: {profile.get('height', 'N/A')} cm
- Activity Level: {profile.get('activity', 'moderate')}
- Goal: {profile.get('goal', 'maintain weight')}
- Dietary Preference: {profile.get('diet_type', 'vegetarian')}
- Health Conditions: {profile.get('conditions', 'none')}
- Allergies: {profile.get('allergies', 'none')}

Provide:
1. Daily calorie target and macro split
2. 7-day meal plan (Breakfast, Lunch, Dinner, 2 Snacks)
3. Weekly grocery shopping list
4. Hydration goals
5. Key nutritional tips

Use Indian food primarily. Format with clear markdown tables and bullet points."""

    try:
        model    = get_watsonx_model()
        response = model.generate_text(prompt=f"<|system|>\n{SYSTEM_PROMPT}\n<|user|>\n{prompt_text}\n<|assistant|>\n")
        return jsonify({"plan": response.strip(), "generated_at": datetime.now().isoformat()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

@app.route("/api/bmi", methods=["POST"])
def calculate_bmi():
    data   = request.get_json(silent=True) or {}
    weight = float(data.get("weight", 0))
    height = float(data.get("height", 0))
    age    = int(data.get("age", 25))
    gender = data.get("gender", "other")

    if weight <= 0 or height <= 0:
        return jsonify({"error": "Valid weight and height required"}), 400

    height_m = height / 100
    bmi      = round(weight / (height_m ** 2), 1)

    if   bmi < 18.5: category = "Underweight";      color = "#3b82f6"
    elif bmi < 25.0: category = "Normal weight";    color = "#22c55e"
    elif bmi < 30.0: category = "Overweight";       color = "#f59e0b"
    else:            category = "Obese";             color = "#ef4444"

    ideal_weight_low  = round(18.5 * (height_m ** 2), 1)
    ideal_weight_high = round(24.9 * (height_m ** 2), 1)

    prompt_text = f"""A {age}-year-old {gender} has BMI {bmi} ({category}).
Weight: {weight}kg, Height: {height}cm.
Ideal weight range: {ideal_weight_low}–{ideal_weight_high} kg.

Provide:
1. Brief interpretation of this BMI
2. 5 specific Indian diet tips for their goal
3. Exercise recommendations
4. Realistic timeline for reaching ideal weight (if applicable)
Keep it encouraging and actionable. Use bullet points."""

    try:
        model    = get_watsonx_model()
        advice   = model.generate_text(prompt=f"<|system|>\n{SYSTEM_PROMPT}\n<|user|>\n{prompt_text}\n<|assistant|>\n")
        return jsonify({
            "bmi": bmi, "category": category, "color": color,
            "ideal_min": ideal_weight_low, "ideal_max": ideal_weight_high,
            "advice": advice.strip(),
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

@app.route("/api/meal-analysis", methods=["POST"])
def meal_analysis():
    data = request.get_json(silent=True) or {}
    meal = (data.get("meal") or "").strip()

    if not meal:
        return jsonify({"error": "Meal description required"}), 400

    prompt_text = f"""Analyze the nutritional content of this meal: "{meal}"

Provide a detailed breakdown:
1. **Estimated Calories** (total and per serving)
2. **Macronutrients Table**: Protein, Carbohydrates, Fats, Fiber (in grams)
3. **Key Micronutrients**: Iron, Calcium, Vitamin C, B12, Folate (if significant)
4. **Healthiness Score** (1–10) with reasoning
5. **Improvements**: 3 simple swaps to make it healthier
6. **Best time to eat** this meal

Format with markdown tables for the nutritional breakdown."""

    try:
        model    = get_watsonx_model()
        analysis = model.generate_text(prompt=f"<|system|>\n{SYSTEM_PROMPT}\n<|user|>\n{prompt_text}\n<|assistant|>\n")
        return jsonify({"analysis": analysis.strip()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

@app.route("/api/family-plan", methods=["POST"])
def family_plan():
    data    = request.get_json(silent=True) or {}
    members = data.get("members", [])

    if not members:
        return jsonify({"error": "Family members required"}), 400

    member_details = "\n".join([
        f"- {m.get('name','Member')}: Age {m.get('age','N/A')}, "
        f"{m.get('gender','N/A')}, {m.get('diet','vegetarian')}, "
        f"Goal: {m.get('goal','healthy')}, Conditions: {m.get('conditions','none')}"
        for m in members
    ])

    prompt_text = f"""Create a comprehensive family nutrition plan for {len(members)} members:

{member_details}

Provide:
1. Individual daily calorie targets for each member
2. A unified 5-day family meal plan (common meals adapted per person)
3. Age-appropriate portion sizes
4. Combined weekly shopping list
5. Meal prep tips for busy families
6. Special considerations for any health conditions mentioned

Focus on Indian cuisine. Be practical and time-efficient."""

    try:
        model    = get_watsonx_model()
        plan     = model.generate_text(prompt=f"<|system|>\n{SYSTEM_PROMPT}\n<|user|>\n{prompt_text}\n<|assistant|>\n")
        return jsonify({"plan": plan.strip(), "member_count": len(members)})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

@app.route("/api/quick-suggestions", methods=["POST"])
def quick_suggestions():
    data      = request.get_json(silent=True) or {}
    meal_type = data.get("meal_type", "breakfast")
    calories  = data.get("calories", 400)
    diet_type = data.get("diet_type", "vegetarian")
    cuisine   = data.get("cuisine", "Indian")

    prompt_text = f"""Suggest 5 {cuisine} {diet_type} {meal_type} options around {calories} calories each.

For each option provide:
- Dish name and brief description
- Approximate calories and main macros (protein/carbs/fat in grams)
- Preparation time
- Key nutritional benefit
- One variation idea

Format as a numbered list with clear sections."""

    try:
        model       = get_watsonx_model()
        suggestions = model.generate_text(prompt=f"<|system|>\n{SYSTEM_PROMPT}\n<|user|>\n{prompt_text}\n<|assistant|>\n")
        return jsonify({"suggestions": suggestions.strip()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

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
    print(f"[NutriBot] Starting on http://localhost:{port}")
    print(f"[NutriBot] Model: {GRANITE_MODEL}")
    app.run(host="0.0.0.0", port=port, debug=debug)
