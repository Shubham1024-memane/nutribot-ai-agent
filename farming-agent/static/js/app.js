/* ═══════════════════════════════════════════════════════════════════════════
   FarmBot — Frontend Application Logic
   Smart Farming Agent · IBM Watsonx.ai · Granite
   ═══════════════════════════════════════════════════════════════════════════ */

"use strict";

// ── Global State ──────────────────────────────────────────────────────────────
const state = {
  theme:         localStorage.getItem("fb-theme") || "light",
  farmProfile:   JSON.parse(localStorage.getItem("fb-profile") || "{}"),
  currentTab:    "chat",
  isLoading:     false,
};

// ── Init ───────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  restoreProfile();
  updateDashboardStats();
  initChatInput();
});

// ── Theme ──────────────────────────────────────────────────────────────────────
function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = state.theme === "dark" ? "☀️" : "🌙";
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("fb-theme", state.theme);
  applyTheme();
}

// ── Tab Switching ──────────────────────────────────────────────────────────────
const TAB_TITLES = {
  chat:       "💬 AI Farm Chat",
  dashboard:  "🗺️ Farm Dashboard",
  crops:      "🌱 Crop Advisory",
  soil:       "🪨 Soil Analysis",
  pest:       "🐛 Pest & Disease",
  market:     "📈 Mandi Prices",
  irrigation: "💧 Irrigation Plan",
  economics:  "💰 Farm Economics",
  schemes:    "🏛️ Govt Schemes",
};

function switchTab(tabId) {
  // Hide all panels
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  // Activate selected
  const panel = document.getElementById(`panel-${tabId}`);
  if (panel) panel.classList.add("active");

  const navBtn = document.querySelector(`[data-tab="${tabId}"]`);
  if (navBtn) navBtn.classList.add("active");

  const titleEl = document.getElementById("tabTitle");
  if (titleEl) titleEl.textContent = TAB_TITLES[tabId] || tabId;

  // Toggle topbar buttons visibility
  const clearBtn = document.getElementById("clearChatBtn");
  if (clearBtn) clearBtn.style.display = tabId === "chat" ? "flex" : "none";

  state.currentTab = tabId;
  closeSidebar();
}

// ── Mobile Sidebar ─────────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebarOverlay").classList.toggle("open");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("open");
}

// ── Chat Input Auto-resize ─────────────────────────────────────────────────────
function initChatInput() {
  const textarea = document.getElementById("chatInput");
  if (!textarea) return;

  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  });

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

// ── Quick Message ──────────────────────────────────────────────────────────────
function sendQuickMessage(text) {
  const inp = document.getElementById("chatInput");
  if (inp) { inp.value = text; sendMessage(); }
}

// ── Send Chat Message ──────────────────────────────────────────────────────────
async function sendMessage() {
  const inp = document.getElementById("chatInput");
  const msg = (inp.value || "").trim();
  if (!msg || state.isLoading) return;

  // Hide welcome screen
  const welcome = document.getElementById("chatWelcome");
  if (welcome) welcome.style.display = "none";

  inp.value = "";
  inp.style.height = "auto";

  appendMessage("user", msg, formatTime());
  showTyping();
  setButtonLoading(document.getElementById("sendBtn"), true);
  state.isLoading = true;

  try {
    const res = await fetch("/api/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ message: msg, profile: state.farmProfile }),
    });
    const data = await res.json();
    hideTyping();

    if (data.error) {
      appendMessage("bot", `⚠️ **Error:** ${data.error}`, formatTime());
      showToast("AI response failed — check your API credentials", "error");
    } else {
      appendMessage("bot", data.reply, data.timestamp || formatTime());
    }
  } catch (err) {
    hideTyping();
    appendMessage("bot", "⚠️ Connection error. Please check if the server is running.", formatTime());
    showToast("Network error", "error");
  } finally {
    setButtonLoading(document.getElementById("sendBtn"), false);
    state.isLoading = false;
  }
}

// ── Append Message ─────────────────────────────────────────────────────────────
function appendMessage(role, text, time) {
  const container = document.getElementById("chatMessages");
  if (!container) return;

  const div = document.createElement("div");
  div.className = `message ${role === "user" ? "user-msg" : "bot-msg"}`;

  const avatar = document.createElement("div");
  avatar.className = `msg-avatar ${role === "user" ? "user-avatar" : "bot-avatar"}`;
  avatar.textContent = role === "user" ? "👨‍🌾" : "🌾";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  if (role === "bot" && typeof marked !== "undefined") {
    bubble.innerHTML = marked.parse(text, { breaks: true, gfm: true });
  } else {
    bubble.textContent = text;
  }

  const timeEl = document.createElement("div");
  timeEl.className = "msg-time";
  timeEl.textContent = time || formatTime();

  const inner = document.createElement("div");
  inner.style.cssText = "display:flex;flex-direction:column;max-width:100%";
  inner.appendChild(bubble);
  inner.appendChild(timeEl);

  div.appendChild(avatar);
  div.appendChild(inner);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ── Typing Indicator ───────────────────────────────────────────────────────────
let typingEl = null;
function showTyping() {
  const container = document.getElementById("chatMessages");
  if (!container) return;
  typingEl = document.createElement("div");
  typingEl.className = "message bot-msg";
  typingEl.id = "typingIndicator";
  typingEl.innerHTML = `
    <div class="msg-avatar bot-avatar">🌾</div>
    <div class="msg-bubble" style="padding:8px 14px">
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>`;
  container.appendChild(typingEl);
  container.scrollTop = container.scrollHeight;
}
function hideTyping() {
  const el = document.getElementById("typingIndicator");
  if (el) el.remove();
}

// ── Clear Chat ─────────────────────────────────────────────────────────────────
async function clearChat() {
  try {
    await fetch("/api/clear-history", { method: "POST" });
  } catch (_) { /* ignore */ }
  const msgs = document.getElementById("chatMessages");
  if (msgs) msgs.innerHTML = `
    <div class="chat-welcome" id="chatWelcome">
      <div class="welcome-icon">🌾</div>
      <div class="welcome-title">Jai Kisan! I'm FarmBot 👋</div>
      <div class="welcome-sub">Chat cleared. Ask me anything about smart farming!</div>
    </div>`;
  showToast("Chat cleared", "info");
}

// ── Profile ────────────────────────────────────────────────────────────────────
function saveProfile() {
  state.farmProfile = {
    name:    document.getElementById("profile_name")?.value  || "",
    state:   document.getElementById("profile_state")?.value || "Maharashtra",
    district: document.getElementById("profile_district")?.value || "",
    land_size: document.getElementById("profile_land")?.value || "",
    soil_type: document.getElementById("profile_soil")?.value || "black cotton",
    water_source: document.getElementById("profile_water")?.value || "borewell",
    season:  document.getElementById("profile_season")?.value || "Kharif",
    farming_method: document.getElementById("profile_method")?.value || "conventional",
    current_crops: document.getElementById("profile_crops")?.value || "",
    budget:  document.getElementById("profile_budget")?.value || "",
  };
  localStorage.setItem("fb-profile", JSON.stringify(state.farmProfile));
  updateDashboardStats();
  showToast("Farm profile saved!", "success");

  const hint = document.getElementById("profileHint");
  if (hint) hint.innerHTML = `✅ Profile saved — responses are now personalised for your farm`;
}

function restoreProfile() {
  const p = state.farmProfile;
  if (!p || !Object.keys(p).length) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  set("profile_name",     p.name);
  set("profile_state",    p.state);
  set("profile_district", p.district);
  set("profile_land",     p.land_size);
  set("profile_soil",     p.soil_type);
  set("profile_water",    p.water_source);
  set("profile_season",   p.season);
  set("profile_method",   p.farming_method);
  set("profile_crops",    p.current_crops);
  set("profile_budget",   p.budget);
  updateDashboardStats();
}

function updateDashboardStats() {
  const p = state.farmProfile;
  const season  = p.season || document.getElementById("profile_season")?.value || "—";
  const land    = p.land_size || document.getElementById("profile_land")?.value || "—";
  const soil    = p.soil_type || document.getElementById("profile_soil")?.value || "—";
  const water   = p.water_source || document.getElementById("profile_water")?.value || "—";

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText("dashSeason", season);
  setText("dashLand",   land !== "—" ? land + " ac" : "—");
  setText("dashSoil",   soil.charAt(0).toUpperCase() + soil.slice(1));
  setText("dashWater",  water.charAt(0).toUpperCase() + water.slice(1));
}

// ── Crop Advisory ──────────────────────────────────────────────────────────────
async function getCropAdvisory() {
  const btn = document.getElementById("cropBtn");
  const resultBox = document.getElementById("cropResult");
  setButtonLoading(btn, true);
  resultBox.style.display = "none";

  const profile = {
    state:          document.getElementById("cropState")?.value  || "Maharashtra",
    land_size:      document.getElementById("cropLand")?.value   || "2",
    soil_type:      document.getElementById("cropSoil")?.value   || "black cotton",
    water_source:   document.getElementById("cropWater")?.value  || "borewell",
    season:         document.getElementById("cropSeason")?.value || "Kharif",
    budget:         document.getElementById("cropBudget")?.value || "10000",
    preferred_crop: document.getElementById("cropPreferred")?.value || "any",
    farming_method: document.getElementById("cropMethod")?.value || "conventional",
  };

  try {
    const res  = await fetch("/api/crop-advisory", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, "error"); return; }
    renderResult(resultBox, data.advisory);
    showToast("Crop advisory generated!", "success");
  } catch (err) {
    showToast("Request failed", "error");
  } finally {
    setButtonLoading(btn, false);
  }
}

// ── Soil Analysis ──────────────────────────────────────────────────────────────
async function analyzeSoil() {
  const btn = document.getElementById("soilBtn");
  const resultBox = document.getElementById("soilResult");
  setButtonLoading(btn, true);
  resultBox.style.display = "none";

  const soil = {
    ph:             document.getElementById("soilPh")?.value      || "",
    nitrogen:       document.getElementById("soilN")?.value       || "",
    phosphorus:     document.getElementById("soilP")?.value       || "",
    potassium:      document.getElementById("soilK")?.value       || "",
    organic_carbon: document.getElementById("soilOC")?.value      || "",
    texture:        document.getElementById("soilTexture")?.value || "loamy",
    crop:           document.getElementById("soilCrop")?.value    || "wheat",
  };

  try {
    const res  = await fetch("/api/soil-analysis", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soil }),
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, "error"); return; }
    renderResult(resultBox, data.analysis);
    showToast("Soil analysis complete!", "success");
  } catch (err) {
    showToast("Request failed", "error");
  } finally {
    setButtonLoading(btn, false);
  }
}

function fillSampleSoil() {
  document.getElementById("soilPh").value      = "7.8";
  document.getElementById("soilN").value       = "180";
  document.getElementById("soilP").value       = "18";
  document.getElementById("soilK").value       = "130";
  document.getElementById("soilOC").value      = "0.4";
  document.getElementById("soilTexture").value = "clay loam";
  document.getElementById("soilCrop").value    = "Wheat";
  showToast("Sample soil data loaded", "info");
}

// ── Pest & Disease ─────────────────────────────────────────────────────────────
async function getPestAdvice() {
  const btn = document.getElementById("pestBtn");
  const resultBox = document.getElementById("pestResult");
  const crop     = document.getElementById("pestCrop")?.value.trim();
  const symptoms = document.getElementById("pestSymptoms")?.value.trim();

  if (!crop || !symptoms) { showToast("Please enter crop name and symptoms", "error"); return; }

  setButtonLoading(btn, true);
  resultBox.style.display = "none";

  try {
    const res  = await fetch("/api/pest-control", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crop, symptoms,
        growth_stage: document.getElementById("pestStage")?.value || "vegetative",
      }),
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, "error"); return; }
    renderResult(resultBox, data.advice);
    showToast("Diagnosis ready!", "success");
  } catch (err) {
    showToast("Request failed", "error");
  } finally {
    setButtonLoading(btn, false);
  }
}

function fillPest(crop, symptoms, stage) {
  const cropEl  = document.getElementById("pestCrop");
  const sympEl  = document.getElementById("pestSymptoms");
  const stageEl = document.getElementById("pestStage");
  if (cropEl)  cropEl.value  = crop;
  if (sympEl)  sympEl.value  = symptoms;
  if (stageEl) stageEl.value = stage;
  document.getElementById("addMemberForm") && document.getElementById("addMemberForm").scrollIntoView();
}

// ── Market Advice ──────────────────────────────────────────────────────────────
async function getMarketAdvice() {
  const btn = document.getElementById("mktBtn");
  const resultBox = document.getElementById("mktResult");
  const crop = document.getElementById("mktCrop")?.value.trim();

  if (!crop) { showToast("Please enter the crop name", "error"); return; }

  setButtonLoading(btn, true);
  resultBox.style.display = "none";

  try {
    const res  = await fetch("/api/market-advice", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crop,
        state:             document.getElementById("mktState")?.value || "Maharashtra",
        quantity_quintals: document.getElementById("mktQty")?.value   || 10,
      }),
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, "error"); return; }
    renderResult(resultBox, data.advice);
    showToast("Market intelligence ready!", "success");
  } catch (err) {
    showToast("Request failed", "error");
  } finally {
    setButtonLoading(btn, false);
  }
}

// ── Irrigation Plan ────────────────────────────────────────────────────────────
async function getIrrigationPlan() {
  const btn = document.getElementById("irrigBtn");
  const resultBox = document.getElementById("irrigResult");
  const crop = document.getElementById("irrigCrop")?.value.trim();

  if (!crop) { showToast("Please enter the crop name", "error"); return; }

  setButtonLoading(btn, true);
  resultBox.style.display = "none";

  try {
    const res  = await fetch("/api/irrigation-plan", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crop,
        land_acres:   document.getElementById("irrigLand")?.value   || 1,
        water_source: document.getElementById("irrigSource")?.value || "borewell",
        method:       document.getElementById("irrigMethod")?.value || "drip",
        growth_stage: document.getElementById("irrigStage")?.value  || "vegetative",
      }),
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, "error"); return; }
    renderResult(resultBox, data.plan);
    showToast("Irrigation plan generated!", "success");
  } catch (err) {
    showToast("Request failed", "error");
  } finally {
    setButtonLoading(btn, false);
  }
}

// ── Farm Economics ─────────────────────────────────────────────────────────────
async function getFarmEconomics() {
  const btn = document.getElementById("econBtn");
  const resultBox = document.getElementById("econResult");
  const crop = document.getElementById("econCrop")?.value.trim();

  if (!crop) { showToast("Please enter the crop name", "error"); return; }

  setButtonLoading(btn, true);
  resultBox.style.display = "none";

  try {
    const res  = await fetch("/api/farm-economics", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crop,
        land_acres: document.getElementById("econLand")?.value   || 2,
        state:      document.getElementById("econState")?.value  || "Maharashtra",
        season:     document.getElementById("econSeason")?.value || "Kharif",
      }),
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, "error"); return; }
    renderResult(resultBox, data.economics);
    showToast("Farm economics calculated!", "success");
  } catch (err) {
    showToast("Request failed", "error");
  } finally {
    setButtonLoading(btn, false);
  }
}

// ── Government Schemes ─────────────────────────────────────────────────────────
async function getGovtSchemes() {
  const btn = document.getElementById("schemeBtn");
  const resultBox = document.getElementById("schemeResult");
  setButtonLoading(btn, true);
  resultBox.style.display = "none";

  try {
    const res  = await fetch("/api/govt-schemes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state:                document.getElementById("schemeState")?.value    || "Maharashtra",
        land_size_hectares:   document.getElementById("schemeLand")?.value     || 1.5,
        category:             document.getElementById("schemeCategory")?.value || "all",
      }),
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, "error"); return; }
    renderResult(resultBox, data.schemes);
    showToast("Eligible schemes found!", "success");
  } catch (err) {
    showToast("Request failed", "error");
  } finally {
    setButtonLoading(btn, false);
  }
}

// ── Quick Tips ─────────────────────────────────────────────────────────────────
async function getQuickTips() {
  const btn = document.getElementById("tipsBtn");
  const resultBox = document.getElementById("tipsResult");
  setButtonLoading(btn, true);
  resultBox.style.display = "none";

  const p = state.farmProfile;

  try {
    const res  = await fetch("/api/quick-tip", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic:  p.current_crops || "general farming",
        season: p.season        || "Kharif",
        state:  p.state         || "Maharashtra",
      }),
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, "error"); return; }
    renderResult(resultBox, data.tips);
    showToast("Tips ready!", "success");
  } catch (err) {
    showToast("Request failed", "error");
  } finally {
    setButtonLoading(btn, false);
  }
}

// ── Render Markdown Result ─────────────────────────────────────────────────────
function renderResult(box, markdown) {
  if (!box) return;
  box.style.display = "block";
  box.classList.add("fade-in");
  if (typeof marked !== "undefined") {
    box.innerHTML = marked.parse(markdown, { breaks: true, gfm: true });
  } else {
    box.textContent = markdown;
  }
  box.scrollTop = 0;
}

// ── Loading Helpers ────────────────────────────────────────────────────────────
function setButtonLoading(btn, val) {
  if (!btn) return;
  if (val) {
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> Processing…`;
    btn.disabled  = true;
  } else {
    if (btn.dataset.origText) btn.innerHTML = btn.dataset.origText;
    btn.disabled = false;
  }
}

// ── Toast Notifications ────────────────────────────────────────────────────────
function showToast(msg, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const toast  = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || "ℹ️"}</span><span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Utilities ──────────────────────────────────────────────────────────────────
function formatTime() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(text) {
  return text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// Configure marked.js
if (typeof marked !== "undefined") {
  marked.setOptions({ breaks: true, gfm: true, sanitize: false });
}
