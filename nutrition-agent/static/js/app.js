// ═══════════════════════════════════════════════════════════════════════════
//  NutriBot — Main Application JavaScript
//  Handles: Chat, Dashboard, Meal Planning, BMI, Family Profiles
// ═══════════════════════════════════════════════════════════════════════════

"use strict";

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  darkMode:      localStorage.getItem("darkMode") === "true",
  activeTab:     "chat",
  userProfile:   JSON.parse(localStorage.getItem("userProfile") || "{}"),
  familyMembers: JSON.parse(localStorage.getItem("familyMembers") || "[]"),
  isLoading:     false,
  dailyStats: {
    calories: 0, protein: 0, carbs: 0, fat: 0,
    goal:     2000, meals: 0,
  },
};

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  restoreProfile();
  renderFamilyMembers();
  initChatInput();
  updateDashboardStats();
  initProgressBars();

  // Load saved tab
  const saved = sessionStorage.getItem("activeTab");
  if (saved) switchTab(saved);
});

// ── Theme ─────────────────────────────────────────────────────────────────────
function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.darkMode ? "dark" : "light");
  const btn = document.getElementById("themeToggle");
  if (btn) btn.innerHTML = state.darkMode ? "☀️" : "🌙";
}

function toggleTheme() {
  state.darkMode = !state.darkMode;
  localStorage.setItem("darkMode", state.darkMode);
  applyTheme();
}

// ── Navigation ────────────────────────────────────────────────────────────────
function switchTab(tabId) {
  state.activeTab = tabId;
  sessionStorage.setItem("activeTab", tabId);

  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  const panel = document.getElementById("panel-" + tabId);
  const navEl = document.querySelector(`[data-tab="${tabId}"]`);
  if (panel) panel.classList.add("active");
  if (navEl) navEl.classList.add("active");

  // Update topbar title
  const titles = {
    chat:     "💬 AI Nutrition Chat",
    dashboard:"📊 Nutrition Dashboard",
    meals:    "🍽️ Meal Planner",
    bmi:      "⚖️ BMI Calculator",
    family:   "👨‍👩‍👧‍👦 Family Profiles",
    analyze:  "🔬 Meal Analyzer",
  };
  const titleEl = document.getElementById("tabTitle");
  if (titleEl) titleEl.textContent = titles[tabId] || "NutriBot";

  // Close sidebar on mobile
  closeSidebar();
}

// ── Sidebar Mobile ────────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebarOverlay").classList.toggle("open");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("open");
}

// ── Chat ──────────────────────────────────────────────────────────────────────
function initChatInput() {
  const input = document.getElementById("chatInput");
  if (!input) return;

  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });
}

function sendQuickMessage(text) {
  const input = document.getElementById("chatInput");
  if (input) { input.value = text; sendMessage(); }
}

async function sendMessage() {
  if (state.isLoading) return;

  const input   = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;

  input.value = "";
  input.style.height = "auto";

  // Remove welcome screen
  const welcome = document.getElementById("chatWelcome");
  if (welcome) welcome.remove();

  appendMessage("user", message, formatTime());
  showTyping();
  setLoading(true);

  try {
    const res = await fetch("/api/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ message, profile: state.userProfile }),
    });
    const data = await res.json();

    hideTyping();
    if (data.error) {
      appendMessage("bot", `⚠️ **Error:** ${data.error}`, formatTime());
    } else {
      appendMessage("bot", data.reply, data.timestamp || formatTime());
    }
  } catch (err) {
    hideTyping();
    appendMessage("bot", "⚠️ Connection error. Please check your server.", formatTime());
  } finally {
    setLoading(false);
  }
}

function appendMessage(role, text, time) {
  const container = document.getElementById("chatMessages");
  const isBot = role === "bot";

  const div = document.createElement("div");
  div.className = `message ${isBot ? "bot-msg" : "user-msg"}`;

  div.innerHTML = `
    <div class="msg-avatar ${isBot ? "bot-avatar" : "user-avatar"}">
      ${isBot ? "🥗" : "👤"}
    </div>
    <div>
      <div class="msg-bubble">${isBot ? marked.parse(text) : escapeHtml(text)}</div>
      <div class="msg-time">${time}</div>
    </div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showTyping() {
  const container = document.getElementById("chatMessages");
  const div = document.createElement("div");
  div.id = "typingIndicator";
  div.className = "message bot-msg";
  div.innerHTML = `
    <div class="msg-avatar bot-avatar">🥗</div>
    <div class="msg-bubble">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById("typingIndicator");
  if (el) el.remove();
}

async function clearChat() {
  await fetch("/api/clear-history", { method: "POST" });
  const container = document.getElementById("chatMessages");
  container.innerHTML = `
    <div class="chat-welcome" id="chatWelcome">
      <div class="welcome-icon">🥗</div>
      <div class="welcome-title">Hello! I'm NutriBot 👋</div>
      <div class="welcome-sub">Your AI-powered nutrition assistant. Ask me anything about diet, meals, and health!</div>
      <div class="quick-chips">
        <span class="chip" onclick="sendQuickMessage('Create a 7-day Indian meal plan for weight loss')">🗓️ 7-Day Meal Plan</span>
        <span class="chip" onclick="sendQuickMessage('What should I eat for a healthy breakfast?')">🌅 Breakfast Ideas</span>
        <span class="chip" onclick="sendQuickMessage('Analyze my diet: dal rice, vegetables, and lassi')">🔬 Analyze My Diet</span>
        <span class="chip" onclick="sendQuickMessage('Give me a high-protein vegetarian diet plan')">💪 High Protein Diet</span>
        <span class="chip" onclick="sendQuickMessage('Suggest healthy Indian snacks under 200 calories')">🥙 Healthy Snacks</span>
        <span class="chip" onclick="sendQuickMessage('What foods should I eat for diabetes management?')">🩺 Diabetes Diet</span>
      </div>
    </div>`;
  showToast("Chat history cleared", "success");
}

// ── Profile ───────────────────────────────────────────────────────────────────
function saveProfile() {
  const fields = ["name","age","gender","weight","height","activity","goal","diet_type","conditions","allergies"];
  fields.forEach(f => {
    const el = document.getElementById("profile_" + f);
    if (el) state.userProfile[f] = el.value;
  });
  localStorage.setItem("userProfile", JSON.stringify(state.userProfile));
  showToast("Profile saved!", "success");
  updateDashboardStats();
}

function restoreProfile() {
  const fields = ["name","age","gender","weight","height","activity","goal","diet_type","conditions","allergies"];
  fields.forEach(f => {
    const el = document.getElementById("profile_" + f);
    if (el && state.userProfile[f]) el.value = state.userProfile[f];
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function updateDashboardStats() {
  const p = state.userProfile;
  if (p.weight && p.height) {
    const h = p.height / 100;
    const bmiVal = (p.weight / (h * h)).toFixed(1);
    const el = document.getElementById("dashBmi");
    if (el) el.textContent = bmiVal;
  }

  if (p.age && p.weight && p.height && p.gender) {
    const calories = estimateCalories(p);
    const el = document.getElementById("dashCalories");
    if (el) el.textContent = calories;
    state.dailyStats.goal = calories;
  }
}

function estimateCalories(p) {
  const w = parseFloat(p.weight) || 70;
  const h = parseFloat(p.height) || 170;
  const a = parseInt(p.age)      || 30;
  const g = p.gender || "male";

  // Mifflin-St Jeor
  let bmr = g === "female"
    ? 10 * w + 6.25 * h - 5 * a - 161
    : 10 * w + 6.25 * h - 5 * a + 5;

  const actMultipliers = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9
  };
  const mult = actMultipliers[p.activity] || 1.55;
  let tdee = Math.round(bmr * mult);

  if      (p.goal === "weight_loss")  tdee -= 300;
  else if (p.goal === "weight_gain")  tdee += 300;
  else if (p.goal === "muscle_gain")  tdee += 200;
  return tdee;
}

function initProgressBars() {
  setTimeout(() => {
    document.querySelectorAll(".progress-bar[data-width]").forEach(bar => {
      bar.style.width = bar.dataset.width + "%";
    });
  }, 300);
}

// ── Nutrition Plan ────────────────────────────────────────────────────────────
async function generateNutritionPlan() {
  saveProfile();
  const btn = document.getElementById("genPlanBtn");
  const result = document.getElementById("planResult");

  setButtonLoading(btn, true);
  result.innerHTML = `<div style="text-align:center;padding:40px"><div class="spinner"></div><p style="margin-top:12px;color:var(--text-muted)">Generating your personalized plan…</p></div>`;
  result.style.display = "block";

  try {
    const res  = await fetch("/api/nutrition-plan", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ profile: state.userProfile }),
    });
    const data = await res.json();
    result.innerHTML = data.error
      ? `<p style="color:var(--danger)">⚠️ ${data.error}</p>`
      : marked.parse(data.plan);
    showToast("Nutrition plan generated!", "success");
  } catch (err) {
    result.innerHTML = `<p style="color:var(--danger)">⚠️ Failed to generate plan. Check server connection.</p>`;
  } finally {
    setButtonLoading(btn, false);
  }
}

// ── BMI ───────────────────────────────────────────────────────────────────────
async function calculateBMI() {
  const weight = parseFloat(document.getElementById("bmiWeight").value);
  const height = parseFloat(document.getElementById("bmiHeight").value);
  const age    = parseInt(document.getElementById("bmiAge").value) || 25;
  const gender = document.getElementById("bmiGender").value;

  if (!weight || !height || weight <= 0 || height <= 0) {
    showToast("Please enter valid weight and height", "error"); return;
  }

  const btn    = document.getElementById("calcBmiBtn");
  const result = document.getElementById("bmiResult");

  setButtonLoading(btn, true);
  result.innerHTML = `<div style="text-align:center;padding:30px"><div class="spinner"></div></div>`;
  result.style.display = "block";

  try {
    const res  = await fetch("/api/bmi", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ weight, height, age, gender }),
    });
    const data = await res.json();

    if (data.error) {
      result.innerHTML = `<p style="color:var(--danger)">⚠️ ${data.error}</p>`;
      return;
    }

    // Calc pointer position (BMI 10–40 range → 0–100%)
    const pct = Math.min(Math.max(((data.bmi - 10) / 30) * 100, 2), 97);

    result.innerHTML = `
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:3rem;font-weight:800;color:${data.color}">${data.bmi}</div>
        <div style="font-size:1rem;color:${data.color};font-weight:600">${data.category}</div>
        <div style="font-size:.8rem;color:var(--text-muted);margin-top:4px">
          Ideal range: ${data.ideal_min} – ${data.ideal_max} kg
        </div>
      </div>
      <div class="bmi-meter">
        <div class="bmi-pointer" id="bmiPointer" style="left:0%">${data.bmi}</div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--text-muted);margin-bottom:16px">
        <span>Underweight<br>&lt;18.5</span>
        <span style="text-align:center">Normal<br>18.5–25</span>
        <span style="text-align:center">Overweight<br>25–30</span>
        <span style="text-align:right">Obese<br>&gt;30</span>
      </div>
      <div class="result-box">${marked.parse(data.advice)}</div>`;

    setTimeout(() => {
      const ptr = document.getElementById("bmiPointer");
      if (ptr) ptr.style.left = pct + "%";
    }, 100);

    showToast(`BMI: ${data.bmi} — ${data.category}`, "info");
  } catch (err) {
    result.innerHTML = `<p style="color:var(--danger)">⚠️ Calculation failed.</p>`;
  } finally {
    setButtonLoading(btn, false);
  }
}

// ── Meal Analysis ─────────────────────────────────────────────────────────────
async function analyzeMeal() {
  const meal   = (document.getElementById("mealInput").value || "").trim();
  if (!meal) { showToast("Please enter a meal to analyze", "error"); return; }

  const btn    = document.getElementById("analyzeMealBtn");
  const result = document.getElementById("analyzeResult");

  setButtonLoading(btn, true);
  result.innerHTML = `<div style="text-align:center;padding:30px"><div class="spinner"></div><p style="margin-top:10px;color:var(--text-muted)">Analyzing nutritional content…</p></div>`;
  result.style.display = "block";

  try {
    const res  = await fetch("/api/meal-analysis", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ meal }),
    });
    const data = await res.json();
    result.innerHTML = data.error
      ? `<p style="color:var(--danger)">⚠️ ${data.error}</p>`
      : marked.parse(data.analysis);
    showToast("Meal analyzed!", "success");
  } catch (err) {
    result.innerHTML = `<p style="color:var(--danger)">⚠️ Analysis failed.</p>`;
  } finally {
    setButtonLoading(btn, false);
  }
}

// ── Quick Suggestions ─────────────────────────────────────────────────────────
async function getQuickSuggestions() {
  const mealType = document.getElementById("sugMealType").value;
  const calories = document.getElementById("sugCalories").value;
  const dietType = document.getElementById("sugDietType").value;

  const btn    = document.getElementById("getSugBtn");
  const result = document.getElementById("sugResult");

  setButtonLoading(btn, true);
  result.innerHTML = `<div style="text-align:center;padding:30px"><div class="spinner"></div></div>`;
  result.style.display = "block";

  try {
    const res  = await fetch("/api/quick-suggestions", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ meal_type: mealType, calories, diet_type: dietType }),
    });
    const data = await res.json();
    result.innerHTML = data.error
      ? `<p style="color:var(--danger)">⚠️ ${data.error}</p>`
      : marked.parse(data.suggestions);
  } catch (err) {
    result.innerHTML = `<p style="color:var(--danger)">⚠️ Failed to get suggestions.</p>`;
  } finally {
    setButtonLoading(btn, false);
  }
}

// ── Family Members ────────────────────────────────────────────────────────────
function addFamilyMember() {
  const name  = (document.getElementById("fName").value  || "").trim();
  const age   = (document.getElementById("fAge").value   || "").trim();
  const gender= (document.getElementById("fGender").value|| "male");
  const diet  = (document.getElementById("fDiet").value  || "vegetarian");
  const goal  = (document.getElementById("fGoal").value  || "healthy");
  const cond  = (document.getElementById("fConditions").value || "none");

  if (!name || !age) { showToast("Name and age are required", "error"); return; }
  if (state.familyMembers.length >= 6) { showToast("Maximum 6 family members", "error"); return; }

  const member = { id: Date.now(), name, age, gender, diet, goal, conditions: cond };
  state.familyMembers.push(member);
  localStorage.setItem("familyMembers", JSON.stringify(state.familyMembers));
  renderFamilyMembers();
  clearFamilyForm();
  showToast(`${name} added to family!`, "success");
}

function removeFamilyMember(id) {
  state.familyMembers = state.familyMembers.filter(m => m.id !== id);
  localStorage.setItem("familyMembers", JSON.stringify(state.familyMembers));
  renderFamilyMembers();
}

const AVATARS = ["👨", "👩", "👦", "👧", "👴", "👵", "🧑", "👶"];
function getAvatar(age, gender) {
  const a = parseInt(age);
  if (a < 5)  return "👶";
  if (a < 12) return gender === "female" ? "👧" : "👦";
  if (a < 18) return gender === "female" ? "👧" : "🧑";
  if (a > 60) return gender === "female" ? "👵" : "👴";
  return gender === "female" ? "👩" : "👨";
}

function renderFamilyMembers() {
  const container = document.getElementById("familyGrid");
  if (!container) return;

  const cards = state.familyMembers.map(m => `
    <div class="member-card scale-in" onclick="toggleMemberSelect(${m.id})" id="member-${m.id}">
      <button class="member-remove" onclick="event.stopPropagation();removeFamilyMember(${m.id})" title="Remove">✕</button>
      <div class="member-avatar">${getAvatar(m.age, m.gender)}</div>
      <div class="member-name">${escapeHtml(m.name)}</div>
      <div class="member-info">${m.age} yrs • ${m.gender}</div>
      <div class="member-info" style="margin-top:3px">${m.diet} • ${m.goal.replace("_"," ")}</div>
    </div>`).join("");

  container.innerHTML = cards + `
    <div class="add-member-card" onclick="document.getElementById('addMemberForm').scrollIntoView({behavior:'smooth'})">
      <div style="font-size:1.8rem;margin-bottom:6px">➕</div>
      <div style="font-size:.8rem;font-weight:500">Add Member</div>
      <div style="font-size:.7rem;color:var(--text-muted)">(up to 6)</div>
    </div>`;

  // Update count badge
  const badge = document.getElementById("familyBadge");
  if (badge) badge.textContent = state.familyMembers.length;
}

function toggleMemberSelect(id) {
  const card = document.getElementById("member-" + id);
  if (card) card.classList.toggle("selected");
}

function clearFamilyForm() {
  ["fName","fAge","fConditions"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

async function generateFamilyPlan() {
  if (state.familyMembers.length === 0) {
    showToast("Please add family members first", "error"); return;
  }

  const btn    = document.getElementById("genFamilyBtn");
  const result = document.getElementById("familyPlanResult");

  setButtonLoading(btn, true);
  result.innerHTML = `<div style="text-align:center;padding:30px"><div class="spinner"></div><p style="margin-top:10px;color:var(--text-muted)">Creating family plan for ${state.familyMembers.length} members…</p></div>`;
  result.style.display = "block";

  try {
    const res  = await fetch("/api/family-plan", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ members: state.familyMembers }),
    });
    const data = await res.json();
    result.innerHTML = data.error
      ? `<p style="color:var(--danger)">⚠️ ${data.error}</p>`
      : marked.parse(data.plan);
    showToast(`Family plan for ${data.member_count} members ready!`, "success");
  } catch (err) {
    result.innerHTML = `<p style="color:var(--danger)">⚠️ Failed to generate family plan.</p>`;
  } finally {
    setButtonLoading(btn, false);
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function setLoading(val) {
  state.isLoading = val;
  const btn = document.getElementById("sendBtn");
  if (btn) { btn.disabled = val; btn.innerHTML = val ? "⏳" : "➤"; }
}

function setButtonLoading(btn, val) {
  if (!btn) return;
  btn.disabled = val;
  if (val) {
    btn._origText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> Loading…`;
  } else {
    btn.innerHTML = btn._origText || btn.innerHTML;
  }
}

function showToast(msg, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);

  setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateX(20px)"; toast.style.transition = ".3s ease"; }, 3000);
  setTimeout(() => toast.remove(), 3400);
}

function formatTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Marked.js config ──────────────────────────────────────────────────────────
if (typeof marked !== "undefined") {
  marked.setOptions({
    breaks:  true,
    gfm:     true,
    sanitize: false,
  });
}
