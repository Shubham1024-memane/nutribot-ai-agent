# 🥗 NutriBot — AI-Powered Nutrition Agent

> **Built with IBM Watsonx.ai · IBM Granite LLM · Python Flask**

A production-ready, fully responsive AI nutrition assistant that delivers personalized meal plans, calorie analysis, BMI calculations, and family diet recommendations — all powered by IBM Granite language models.

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 **AI Chat** | Conversational nutrition Q&A with IBM Granite LLM |
| 📊 **Nutrition Dashboard** | Profile-based calorie & macro estimates + 7-day plan generation |
| 🍽️ **Meal Planner** | Quick meal suggestions by type, calories, and diet |
| 🔬 **Meal Analyzer** | Deep nutritional breakdown of any described meal |
| ⚖️ **BMI Calculator** | BMI + AI-powered personalized diet advice |
| 👨‍👩‍👧‍👦 **Family Profiles** | Up to 6 family members with individual diet plans |
| 🌙 **Dark Mode** | Full light/dark theme toggle with persistence |
| 📱 **Mobile Responsive** | Works beautifully on phones, tablets, and desktops |
| 🇮🇳 **Indian Food Focus** | Deep knowledge of Indian cuisine, regional dishes, Ayurveda |

---

## 🏗️ Project Structure

```
nutrition-agent/
├── app.py                  ← Flask backend + Watsonx.ai integration
├── requirements.txt        ← Python dependencies
├── .env.example            ← Environment variable template
├── .env                    ← Your secrets (never commit this!)
├── .gitignore
├── README.md
├── templates/
│   └── index.html          ← Single-page application HTML
└── static/
    ├── css/
    │   └── style.css       ← Complete responsive stylesheet
    └── js/
        └── app.js          ← Frontend logic (chat, BMI, meals, family)
```

---

## 🚀 Quick Start

### 1. Clone / Navigate to the project
```bash
cd nutrition-agent
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
cp .env.example .env

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

The `AGENT_INSTRUCTIONS` block at the top of `app.py` lets you fully customize the AI's behavior **without touching any logic code**:

```python
"""
AGENT_INSTRUCTIONS
==================
AGENT_NAME       : NutriBot
AGENT_TONE       : Warm, encouraging, and professional...
DIET_SPECIALIZATION:
  - Indian cuisine expertise...
  - Add your regional cuisine focus here
SAFETY_RULES:
  - Add custom safety constraints here
INDIAN_FOOD_PREFERENCES:
  - Customize default food suggestions here
END_AGENT_INSTRUCTIONS
"""
```

### What you can customize:
| Setting | How to change |
|---|---|
| Agent name & tone | Edit `AGENT_NAME` and `AGENT_TONE` |
| Diet specialization | Add cuisines, dietary systems to `DIET_SPECIALIZATION` |
| Safety rules | Add/remove rules in `SAFETY_RULES` |
| Food preferences | Modify default Indian foods in `INDIAN_FOOD_PREFERENCES` |
| Response format | Change `RESPONSE_FORMAT` for different output styles |
| Family support rules | Edit `FAMILY_SUPPORT` section |

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Main application UI |
| `POST` | `/api/chat` | Chat with Granite LLM |
| `POST` | `/api/nutrition-plan` | Generate 7-day meal plan |
| `POST` | `/api/bmi` | Calculate BMI + get advice |
| `POST` | `/api/meal-analysis` | Analyze meal nutrition |
| `POST` | `/api/family-plan` | Generate family meal plan |
| `POST` | `/api/quick-suggestions` | Get quick meal suggestions |
| `POST` | `/api/clear-history` | Clear chat session history |
| `GET` | `/api/health` | Health check |

### Example API call:
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Give me a 3-day weight loss meal plan", "profile": {"age": "30", "weight": "75", "height": "170", "goal": "weight_loss"}}'
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
  --name nutribot \
  --image icr.io/your-namespace/nutribot:latest \
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
docker build -t nutribot .
docker run -p 5000:5000 --env-file .env nutribot
```

### Option D: Heroku / Railway
```bash
# Procfile content:
# web: gunicorn app:app --timeout 120 --workers 2
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
| `ibm/granite-20b-multilingual` | Multi-language support |

---

## 🛡️ Security Notes

- **Never commit `.env`** to version control — it's in `.gitignore`
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
→ Normal for LLM inference (5–30s). Consider streaming in future versions.

**`ModuleNotFoundError`**
→ Run `pip install -r requirements.txt` inside your virtual environment

---

## 📄 License

MIT License — Free to use, modify, and distribute.

---

*Built with ❤️ using IBM Watsonx.ai · IBM Granite · Python Flask*
