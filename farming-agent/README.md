# 🌾 FarmBot — AI-Powered Smart Farming Agent

> **Built with IBM Watsonx.ai · IBM Granite LLM · Python Flask**

A production-ready, fully responsive AI smart farming assistant that delivers personalized crop
advisory, soil analysis, pest & disease diagnosis, mandi price intelligence, irrigation planning,
farm economics, and government scheme guidance — all powered by IBM Granite language models.

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 **AI Farm Chat** | Conversational farming Q&A in any Indian language, powered by IBM Granite |
| 🌱 **Crop Advisory** | Season, soil & region-specific crop recommendations with yield estimates |
| 🪨 **Soil Analysis** | NPK-based fertilizer schedules, pH correction, and organic amendment advice |
| 🐛 **Pest & Disease** | Symptom-based IPM diagnosis with bio-pesticide + chemical treatment plans |
| 📈 **Mandi Intelligence** | Crop price trends, best selling strategy, eNAM & MSP guidance |
| 💧 **Irrigation Planner** | Water requirement schedules by crop, stage, and method |
| 💰 **Farm Economics** | Full cost-benefit analysis with break-even yield and ROI |
| 🏛️ **Govt Schemes** | PM-KISAN, PMFBY, KCC, soil health card, and state scheme eligibility |
| 🌙 **Dark Mode** | Full light/dark theme toggle with persistence |
| 📱 **Mobile Responsive** | Works on phones, tablets, and desktops |
| 🇮🇳 **India-First** | Deep knowledge of Indian agri calendar, regional crops, and local schemes |

---

## 🏗️ Project Structure

```
farming-agent/
├── app.py                  ← Flask backend + Watsonx.ai integration
├── requirements.txt        ← Python dependencies
├── .env.example            ← Environment variable template
├── .env                    ← Your secrets (never commit this!)
├── README.md
├── templates/
│   └── index.html          ← Single-page application HTML
└── static/
    ├── css/
    │   └── style.css       ← Complete responsive stylesheet
    └── js/
        └── app.js          ← Frontend logic (chat, crops, soil, pest, market)
```

---

## 🚀 Quick Start

### 1. Navigate to the project folder
```bash
cd farming-agent
```

### 2. Create a Python virtual environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure IBM Cloud credentials
```bash
# Copy the example env file
cp .env.example .env    # Linux/macOS
copy .env.example .env  # Windows

# Edit .env with your actual credentials
notepad .env        # Windows
nano .env           # Linux/macOS
```

Fill in these values in `.env`:
```env
IBM_CLOUD_API_KEY=your_actual_api_key
WATSONX_PROJECT_ID=your_actual_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
GRANITE_MODEL_ID=ibm/granite-3-3-8b-instruct
FLASK_SECRET_KEY=generate-a-random-secret-here
```

### 5. Run the application
```bash
python app.py
```

Open **http://localhost:5000** in your browser 🎉

---

## 🔑 Getting IBM Cloud Credentials

### IBM Cloud API Key
1. Go to [IBM Cloud IAM](https://cloud.ibm.com/iam/apikeys)
2. Click **Create an IBM Cloud API key**
3. Copy the key to `.env` → `IBM_CLOUD_API_KEY`

### Watsonx.ai Project ID
1. Go to [IBM watsonx.ai](https://dataplatform.cloud.ibm.com)
2. Open your project → **Manage** tab → **General**
3. Copy the **Project ID** to `.env` → `WATSONX_PROJECT_ID`

### Watsonx.ai Service URL
Choose based on your region:
| Region | URL |
|---|---|
| US South (Dallas) | `https://us-south.ml.cloud.ibm.com` |
| EU (Frankfurt) | `https://eu-de.ml.cloud.ibm.com` |
| UK (London) | `https://eu-gb.ml.cloud.ibm.com` |
| Japan (Tokyo) | `https://jp-tok.ml.cloud.ibm.com` |
| Australia (Sydney) | `https://au-syd.ml.cloud.ibm.com` |

---

## 🤖 Customizing the Agent (AGENT_INSTRUCTIONS)

The `AGENT_INSTRUCTIONS` block at the top of `app.py` lets you fully customize the AI's
behavior **without touching any logic code**:

```python
"""
AGENT_INSTRUCTIONS
==================
AGENT_NAME       : FarmBot
AGENT_TONE       : Patient, practical, and respectful...

FARMING_SPECIALIZATION:
  - Add your regional crop focus here
  - Add specific livestock/horticulture expertise

REGIONAL_FOCUS:
  - Specify your state and soil type focus

SAFETY_RULES:
  - Add custom chemical safety rules here

LANGUAGE_SUPPORT:
  - Specify preferred local language (Hindi, Marathi, etc.)
END_AGENT_INSTRUCTIONS
"""
```

### What you can customize:
| Setting | How to change |
|---|---|
| Agent name & tone | Edit `AGENT_NAME` and `AGENT_TONE` |
| Crop specialization | Add crops, seasons, regions to `FARMING_SPECIALIZATION` |
| Regional focus | Change states and soil types in `REGIONAL_FOCUS` |
| Safety rules | Add/remove rules in `SAFETY_RULES` |
| Language support | Set preferred language in `LANGUAGE_SUPPORT` |
| Seasonal guidance | Adjust `SEASONAL_INTELLIGENCE` section |

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Main application UI |
| `POST` | `/api/chat` | Chat with Granite LLM |
| `POST` | `/api/crop-advisory` | Get crop recommendations |
| `POST` | `/api/soil-analysis` | Soil health + fertilizer advice |
| `POST` | `/api/pest-control` | Pest/disease diagnosis + IPM plan |
| `POST` | `/api/market-advice` | Mandi price strategy |
| `POST` | `/api/irrigation-plan` | Crop irrigation schedule |
| `POST` | `/api/farm-economics` | Cost-benefit calculator |
| `POST` | `/api/govt-schemes` | Eligible government schemes |
| `POST` | `/api/quick-tip` | Seasonal farming tips |
| `POST` | `/api/clear-history` | Clear chat session history |
| `GET` | `/api/health` | Health check |

### Example API calls:
```bash
# Ask FarmBot a question
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Best crop for black cotton soil in Maharashtra this Kharif season?",
       "profile": {"state": "Maharashtra", "soil_type": "black cotton", "season": "Kharif"}}'

# Get crop advisory
curl -X POST http://localhost:5000/api/crop-advisory \
  -H "Content-Type: application/json" \
  -d '{"profile": {"state": "Punjab", "land_size": "5", "soil_type": "alluvial",
        "water_source": "canal", "season": "Rabi", "budget": "25000"}}'

# Diagnose pest
curl -X POST http://localhost:5000/api/pest-control \
  -H "Content-Type: application/json" \
  -d '{"crop": "Cotton", "symptoms": "Leaves yellowing, white fly visible", "growth_stage": "vegetative"}'
```

---

## ☁️ Deployment

### Option A: Gunicorn (Linux/macOS Production)
```bash
gunicorn --workers 2 --bind 0.0.0.0:5000 --timeout 120 app:app
```

### Option B: IBM Cloud Code Engine
```bash
# Install IBM Cloud CLI + Code Engine plugin
ibmcloud login --apikey $IBM_CLOUD_API_KEY
ibmcloud ce project select --name my-project

# Deploy
ibmcloud ce app create \
  --name farmbot \
  --image icr.io/your-namespace/farmbot:latest \
  --port 5000 \
  --env IBM_CLOUD_API_KEY=$IBM_CLOUD_API_KEY \
  --env WATSONX_PROJECT_ID=$WATSONX_PROJECT_ID
```

### Option C: Docker
```dockerfile
# Dockerfile (create in project root)
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--timeout", "120", "app:app"]
```

```bash
docker build -t farmbot .
docker run -p 5000:5000 --env-file .env farmbot
```

### Option D: Heroku / Railway
```bash
# Create Procfile
echo "web: gunicorn app:app --timeout 120 --workers 2" > Procfile
```

---

## 🔧 Configuration Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `IBM_CLOUD_API_KEY` | ✅ Yes | — | IBM Cloud API key |
| `WATSONX_PROJECT_ID` | ✅ Yes | — | Watsonx.ai project ID |
| `WATSONX_URL` | No | `us-south.ml.cloud.ibm.com` | Regional endpoint |
| `GRANITE_MODEL_ID` | No | `ibm/granite-3-3-8b-instruct` | Granite model to use |
| `FLASK_SECRET_KEY` | No | auto-generated | Session encryption key |
| `FLASK_DEBUG` | No | `false` | Enable debug mode |
| `PORT` | No | `5000` | Server port |

---

## 📦 Available Granite Models

| Model ID | Best For |
|---|---|
| `ibm/granite-3-3-8b-instruct` | Best balanced performance (recommended) |
| `ibm/granite-3-2-8b-instruct` | Efficient, good reasoning |
| `ibm/granite-13b-chat-v2` | Larger context, better for long plans |
| `ibm/granite-20b-multilingual` | Multi-language support (ideal for Hindi/regional) |

---

## 🛡️ Security Notes

- **Never commit `.env`** to version control
- Use environment variables or secrets management in production
- Rotate your IBM API key periodically
- Set a strong random `FLASK_SECRET_KEY` in production
- Use HTTPS in production deployments

---

## 🐛 Troubleshooting

**`AuthenticationError` / 401**
→ Check your `IBM_CLOUD_API_KEY` is correct and active

**`ProjectNotFound` / 404**
→ Verify `WATSONX_PROJECT_ID` matches your project

**`Model not found` error**
→ Ensure the model is available in your region/plan; try `ibm/granite-3-2-8b-instruct`

**Slow responses**
→ Normal for LLM inference (5–30s). Agricultural prompts are detailed — higher token count.

**`ModuleNotFoundError`**
→ Run `pip install -r requirements.txt` inside your virtual environment

---

## 🌾 Problem Statement Alignment

This application directly addresses **Problem Statement No. 9 — AI Agent for Smart Farming Advice**:

| Requirement | Implementation |
|---|---|
| Real-time agricultural guidance | IBM Granite LLM via Watsonx.ai |
| Weather-adaptive decisions | Weather-smart farming in AGENT_INSTRUCTIONS |
| Soil conditions advisory | `/api/soil-analysis` endpoint |
| Crop recommendations | `/api/crop-advisory` endpoint |
| Pest control measures | `/api/pest-control` with IPM approach |
| Current market prices (mandi) | `/api/market-advice` with eNAM guidance |
| Local language support | `LANGUAGE_SUPPORT` in agent config |
| Small-scale farmer focus | `REGIONAL_FOCUS` tuned for < 2 ha farms |
| Data-driven decisions | Structured JSON API + Granite reasoning |
| Government scheme navigation | `/api/govt-schemes` endpoint |

---

## 📄 License

MIT License — Free to use, modify, and distribute.

---

*Built with ❤️ using IBM Watsonx.ai · IBM Granite · Python Flask*
*Jai Jawan, Jai Kisan, Jai Vigyan 🇮🇳*
