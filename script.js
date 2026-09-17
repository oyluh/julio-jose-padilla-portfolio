const projectData = {
  recruitment: {
    kicker: "01 / Recruitment",
    status: "In production thinking",
    number: "01",
    title: "Recruitment portal + AI voice interviews",
    description: "A Next.js and TypeScript recruitment system that automates resume screening and AI voice interviews, while keeping decisions reviewable with Google OAuth and human approval points.",
    tags: ["Next.js", "TypeScript", "Voice AI", "OAuth"],
    note: "AI / human loop",
  },
  openclaw: {
    kicker: "02 / Operations",
    status: "Agent ecosystem",
    number: "02",
    title: "Multi-agent OpenClaw ecosystem",
    description: "Specialized agents for Marketing, Analytics, Research, Content, Security, and Campaign Management, coordinated as one operating layer with access control and MCP in the loop.",
    tags: ["OpenClaw", "MCP", "RBAC", "Research"],
    note: "Many agents / one flow",
  },
  growth: {
    kicker: "03 / Growth",
    status: "API automation",
    number: "03",
    title: "Marketing-to-sales automation",
    description: "Connected Meta Ads, Brevo, WordPress, lead generation, analytics, and quotation forwarding with human approval controls built into the flow.",
    tags: ["n8n", "Meta Graph API", "Brevo", "Webhooks"],
    note: "Signal into action",
  },
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const themeButtons = $$('[data-theme-choice]');
const themeStorageKey = "jh-theme";
const themeMeta = $('meta[name="theme-color"]');
function applyTheme(choice, persist = false) {
  if (choice === "dark") document.documentElement.dataset.theme = "dark";
  else if (choice === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = "light";
  themeButtons.forEach((button) => {
    const selected = button.dataset.themeChoice === choice;
    button.setAttribute("aria-pressed", String(selected));
  });
  if (themeMeta) themeMeta.setAttribute("content", choice === "dark" ? "#0b0d12" : "#f7f7f2");
  if (persist) localStorage.setItem(themeStorageKey, choice);
}
const savedTheme = localStorage.getItem(themeStorageKey);
applyTheme(savedTheme === "dark" || savedTheme === "system" ? savedTheme : "light");
themeButtons.forEach((button) => button.addEventListener("click", (event) => {
  const choice = button.dataset.themeChoice;
  const update = () => applyTheme(choice, true);
  if (reduceMotion || typeof document.startViewTransition !== "function") {
    update();
    return;
  }
  document.documentElement.style.setProperty("--theme-x", `${event.clientX || window.innerWidth / 2}px`);
  document.documentElement.style.setProperty("--theme-y", `${event.clientY || 40}px`);
  document.documentElement.classList.add("theme-transition");
  try {
    const transition = document.startViewTransition(update);
    transition.finished.finally(() => document.documentElement.classList.remove("theme-transition"));
  } catch {
    document.documentElement.classList.remove("theme-transition");
    update();
  }
}));

const menuToggle = $(".menu-toggle");
const siteNav = $(".site-nav");
if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });
  $$('a', siteNav).forEach((link) => link.addEventListener("click", () => {
    siteNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  }));
}

const pageTransition = $("[data-page-transition]");
const topbar = $(".topbar");
let pageTransitionTimer;
function scrollToHashTarget(target) {
  const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - (topbar?.offsetHeight || 0) - 10);
  window.scrollTo(0, top);
}
function navigateToHash(hash) {
  const target = $(hash);
  if (!target) return;
  const update = () => {
    history.pushState(null, "", hash);
    scrollToHashTarget(target);
  };
  if (reduceMotion) {
    update();
    return;
  }
  if (typeof document.startViewTransition !== "function") {
    if (!pageTransition) {
      update();
      return;
    }
    window.clearTimeout(pageTransitionTimer);
    pageTransition.classList.remove("is-cover", "is-reveal");
    void pageTransition.offsetWidth;
    pageTransition.classList.add("is-cover");
    window.setTimeout(() => {
      update();
      pageTransition.classList.add("is-reveal");
    }, 220);
    pageTransitionTimer = window.setTimeout(() => {
      pageTransition.classList.remove("is-cover", "is-reveal");
    }, 760);
    return;
  }
  try {
    document.startViewTransition(update);
  } catch {
    update();
  }
}
$$('a[href^="#"]').forEach((link) => link.addEventListener("click", (event) => {
  const hash = link.getAttribute("href");
  if (!hash || hash === "#" || !$(hash)) return;
  event.preventDefault();
  navigateToHash(hash);
}));

const companion = $("[data-piyu-companion]");
const companionButton = $("[data-piyu-companion-button]");
const companionLine = $("[data-piyu-companion-line]");
const companionCta = $("[data-piyu-companion-cta]");
let companionTimer;

function companionSpeak(text, showContact = false) {
  if (!companionLine || !companion) return;
  companionLine.textContent = text;
  if (companionCta) {
    companionCta.hidden = !showContact;
    companion.classList.toggle("has-cta", showContact);
  }
  companion.classList.remove("is-speaking");
  void companion.offsetWidth;
  companion.classList.add("is-speaking");
  window.clearTimeout(companionTimer);
  companionTimer = window.setTimeout(() => companion.classList.remove("is-speaking"), 5200);
}

if (companionButton) {
  companionButton.addEventListener("click", () => {
    companionSpeak("You found my tiny control panel. Ask me anything.");
    if (typeof openPiyu === "function") openPiyu();
  });
}
companionCta?.addEventListener("click", () => {
  companionSpeak("Excellent choice. Julio is one scroll away.");
  navigateToHash("#contact");
});
if (companion && !reduceMotion) {
  window.setTimeout(() => companionSpeak("Need a tour? I know where the good stuff is."), 900);
}

const projectGrid = $(".project-grid");
if (projectGrid) {
  const filmDetails = {
    recruitment: { kicker: "AI recruitment", number: "01", title: "Recruitment portal + AI voice interviews", description: "A reviewable recruitment flow for screening, voice interviews, and human approval points.", tags: "Next.js · TypeScript · Google OAuth", note: "AI / human loop" },
    openclaw: { kicker: "Agent ecosystems", number: "02", title: "OpenClaw multi-agent ecosystem", description: "Specialized agents for marketing, analytics, research, content, security, and campaigns in one operating layer.", tags: "OpenClaw · MCP · RBAC", note: "Many agents / one flow" },
    meta: { kicker: "Growth systems", number: "03", title: "Meta Ads automation and reporting", description: "Connected campaign data, reporting, and approval controls that keep growth decisions visible.", tags: "Meta Marketing API · Graph API · KPIs", note: "Human approval controls" },
    marketing: { kicker: "Marketing automation", number: "04", title: "Lead generation and publishing", description: "Research, lead generation, content, and publishing connected through focused automation agents.", tags: "n8n · Brevo · WordPress", note: "Specialized agents" },
    sales: { kicker: "Sales operations", number: "05", title: "Marketing-to-sales quotation flow", description: "A connected path from lead signal to quotation forwarding, with review built into the handoff.", tags: "n8n · REST APIs · Webhooks", note: "Signal into action" },
    branch: { kicker: "Internal systems", number: "06", title: "Branch Management Information System", description: "A PHP and MySQL information system with deployment, troubleshooting, and Git based delivery.", tags: "PHP · CodeIgniter · MySQL", note: "Git/GitHub + deployment" },
    media: { kicker: "Decision support", number: "07", title: "Instructional Media Center system", description: "A deployed capstone system for organizing instructional media and supporting practical decisions.", tags: "PHP · MySQL · Hostinger", note: "Capstone system" },
    roar: { kicker: "Client delivery", number: "08", title: "ROAR Training Solutions website", description: "A full-stack WordPress build shaped with Bricks CMS and deployed to Hostinger for a real client.", tags: "WordPress · Bricks CMS · Hostinger", note: "Full-stack web delivery", url: "https://roartrainingsolutions.com.au/" },
  };
  const originalFrames = [...projectGrid.children];
  originalFrames.forEach((card) => {
    const detail = filmDetails[card.dataset.filmProject];
    if (!detail) return;
    const front = document.createElement("span");
    front.className = "project-card-front";
    while (card.firstChild) front.appendChild(card.firstChild);
    const back = document.createElement("span");
    back.className = "project-card-back";
    back.innerHTML = `<span class="project-back-kicker">${detail.kicker}</span><span class="project-back-number">${detail.number}</span><strong>${detail.title}</strong><span class="project-back-copy">${detail.description}</span><span class="project-back-tags">${detail.tags}</span><span class="project-back-foot">${detail.note} · flip back ↺</span>${detail.url ? `<a class="project-back-link" href="${detail.url}" target="_blank" rel="noreferrer">Open project ↗</a>` : ""}`;
    card.append(front, back);
    const toggle = () => {
      const flipped = card.classList.toggle("is-flipped");
      card.setAttribute("aria-pressed", String(flipped));
    };
    card.addEventListener("click", (event) => {
      if (event.target.closest(".project-back-link")) return;
      toggle();
      companionSpeak(`Nice pick. Want to turn ${detail.title.toLowerCase()} into a conversation?`, true);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
        companionSpeak(`Nice pick. Want to turn ${detail.title.toLowerCase()} into a conversation?`, true);
      }
    });
  });
}

const projectFilters = $$('[data-project-filter]');
const projectCards = $$('.project-card');
projectFilters.forEach((filter) => filter.addEventListener('click', () => {
  const selected = filter.dataset.projectFilter;
  projectFilters.forEach((button) => button.setAttribute('aria-pressed', String(button === filter)));
  projectCards.forEach((card) => {
    const visible = selected === 'all' || card.dataset.projectType === selected;
    card.hidden = !visible;
    if (!visible) card.classList.remove('is-flipped');
  });
}));

const stackViewButtons = $$('[data-stack-view]');
const groupedStack = $('[data-stack-grouped]');
const flowStack = $('[data-stack-flow]');
const flowTrack = $('[data-stack-flow-track]');
if (groupedStack && flowStack && flowTrack) {
  const stackItems = $$('.stack-group .stack-chips span', groupedStack).map((item) => item.textContent.trim());
  const flowRow = document.createElement('div');
  flowRow.className = 'stack-flow-row';
  stackItems.forEach((item) => {
    const chip = document.createElement('span');
    chip.textContent = item;
    flowRow.append(chip);
  });
  const flowClone = flowRow.cloneNode(true);
  flowClone.setAttribute('aria-hidden', 'true');
  flowTrack.append(flowRow, flowClone);
  const setStackView = (view) => {
    const flow = view === 'flow';
    stackViewButtons.forEach((choice) => choice.setAttribute('aria-pressed', String(choice.dataset.stackView === view)));
    groupedStack.hidden = flow;
    flowStack.hidden = !flow;
    flowStack.classList.toggle('is-active', flow);
  };
  stackViewButtons.forEach((button) => button.addEventListener('click', () => setStackView(button.dataset.stackView)));
  setStackView('flow');
}

$$('.game-card').forEach((card) => {
  const title = $("h3", card)?.textContent || "that side quest";
  const react = () => companionSpeak(`${title} spotted. Tiny game, big personality.`);
  card.addEventListener("pointerenter", react, { passive: true });
  card.addEventListener("focus", react, { passive: true });
});

const copyEmailButton = $("[data-copy-email]");
const copyStatus = $("[data-copy-status]");
if (copyEmailButton) {
  copyEmailButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText("padillajuliojose@gmail.com");
      if (copyStatus) copyStatus.textContent = "Email copied.";
    } catch {
      if (copyStatus) copyStatus.textContent = "Select the email above to copy it.";
    }
    window.setTimeout(() => {
      if (copyStatus) copyStatus.textContent = "";
    }, 2400);
  });
}

const contactForm = $('[data-contact-form]');
const contactStatus = $('[data-contact-status]');
const contactEndpoint = window.location.protocol === 'file:' ? null : '/api/contact';
function setContactStatus(text, type = '') {
  if (!contactStatus) return;
  contactStatus.textContent = text;
  contactStatus.className = `contact-copy-status ${type}`;
}
function openEmailFallback(formData) {
  const subject = `[Portfolio] ${formData.get('projectType') || 'New inquiry'}`;
  const body = `Name: ${formData.get('name') || ''}\nEmail: ${formData.get('email') || ''}\nProject type: ${formData.get('projectType') || ''}\n\n${formData.get('message') || ''}`;
  window.location.href = `mailto:padillajuliojose@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  setContactStatus('Your email app is ready with the message filled in.', 'success');
}
contactForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!contactForm.checkValidity()) {
    contactForm.reportValidity();
    setContactStatus('Add your name, email, direction, and message first.', 'error');
    return;
  }
  const formData = new FormData(contactForm);
  if (String(formData.get('company') || '').trim()) return;
  const submit = contactForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  setContactStatus('Preparing your signal...', '');
  try {
    if (!contactEndpoint) {
      openEmailFallback(formData);
      return;
    }
    const response = await fetch(contactEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(Object.fromEntries(formData.entries())) });
    const payload = response.headers.get('content-type')?.includes('application/json') ? await response.json() : {};
    if (!response.ok) {
      if (response.status === 404 || response.status === 503) {
        openEmailFallback(formData);
        return;
      }
      throw new Error(payload.error || 'The signal could not be sent.');
    }
    contactForm.reset();
    setContactStatus('Signal sent. Julio will reply soon.', 'success');
  } catch (error) {
    setContactStatus(error.message || 'The signal could not be sent.', 'error');
  } finally {
    submit.disabled = false;
  }
});

const revealItems = $$(".reveal");
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver((entries, current) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        current.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
  revealItems.forEach((item) => observer.observe(item));
}

const botLine = $("[data-bot-line]");
const botLines = [
  "Hi! I am Piyu. Ask me about the systems I build.",
  "I like clean interfaces and useful automations.",
  "Try the public room below. Your message can join the story.",
];
let botLineIndex = 0;
function cycleBotLine() {
  if (!botLine) return;
  botLineIndex = (botLineIndex + 1) % botLines.length;
  botLine.textContent = botLines[botLineIndex];
}
if (!reduceMotion) window.setInterval(cycleBotLine, 7200);

const chatPanel = $("[data-chat-panel]");
const chatForm = $("[data-chat-form]");
const chatMessages = $("[data-messages]");
const chatEmpty = $("[data-chat-empty]");
const chatStatus = $("[data-chat-status]");
const chatName = $("#chat-name");
const chatMessage = $("#chat-message");
const charCount = $("[data-char-count]");
const clientStorageKey = "jh-chat-client-id";
let clientId = localStorage.getItem(clientStorageKey);
if (!clientId) {
  clientId = (crypto.randomUUID ? crypto.randomUUID() : `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  localStorage.setItem(clientStorageKey, clientId);
}
let chatIsOpen = true;
let chatConfigured = true;
const chatEndpoint = window.location.protocol === "file:" ? null : "/api/chat";

function setChatStatus(text, type = "") {
  if (!chatStatus) return;
  chatStatus.textContent = text;
  chatStatus.className = `chat-status ${type}`;
}

function formatTime(iso) {
  try { return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso)); } catch (_) { return "now"; }
}

function renderMessages(messages) {
  if (!chatMessages) return;
  chatMessages.replaceChildren();
  if (!messages.length) {
    const empty = document.createElement("div");
    empty.className = "chat-empty";
    empty.textContent = chatConfigured ? "No messages yet. You can be the first voice in the room." : "The shared room is waiting for its Vercel storage connection.";
    chatMessages.append(empty);
    return;
  }
  messages.slice().reverse().forEach((message) => {
    const article = document.createElement("article");
    article.className = `chat-message${message.clientId === clientId ? " own" : ""}`;
    const head = document.createElement("div"); head.className = "chat-message-head";
    const name = document.createElement("span"); name.className = "chat-message-name"; name.textContent = message.name;
    const time = document.createElement("time"); time.className = "chat-message-time"; time.dateTime = message.createdAt; time.textContent = formatTime(message.createdAt);
    const text = document.createElement("p"); text.className = "chat-message-text"; text.textContent = message.message;
    head.append(name, time); article.append(head, text); chatMessages.append(article);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadMessages() {
  if (!chatIsOpen) return;
  if (!chatEndpoint) {
    chatConfigured = false;
    renderMessages([]);
    setChatStatus("Open this portfolio through Vercel to use the shared room.", "error");
    return;
  }
  try {
    const response = await fetch(chatEndpoint, { headers: { Accept: "application/json" }, cache: "no-store" });
    const payload = await response.json();
    chatConfigured = payload.configured !== false;
    renderMessages(Array.isArray(payload.messages) ? payload.messages : []);
    if (!chatConfigured) setChatStatus("Shared history is ready for Vercel KV / Upstash env vars.");
    else if (!chatStatus.textContent) setChatStatus("Live room synced.", "success");
  } catch (_) {
    setChatStatus("The room is temporarily offline. Your draft stays here.", "error");
  }
}

chatMessage?.addEventListener("input", () => { if (charCount) charCount.textContent = chatMessage.value.length; });

chatForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!chatEndpoint) { setChatStatus("Open this portfolio through Vercel to use the shared room.", "error"); return; }
  if (!chatConfigured) { setChatStatus("Connect KV_REST_API_URL and KV_REST_API_TOKEN in Vercel first.", "error"); return; }
  const submit = chatForm.querySelector('button[type="submit"]');
  const name = chatName.value.trim(); const message = chatMessage.value.trim();
  if (name.length < 2 || message.length < 1) { setChatStatus("Add your name and a message first.", "error"); return; }
  submit.disabled = true; setChatStatus("Sending...", "");
  try {
    const response = await fetch(chatEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ name, message, clientId }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not send that message.");
    chatMessage.value = ""; if (charCount) charCount.textContent = "0"; setChatStatus("Sent to the room.", "success"); renderMessages(payload.messages || []); companionSpeak("Plot twist: your message made it into the room.");
  } catch (error) { setChatStatus(error.message || "Could not send that message.", "error"); }
  finally { submit.disabled = false; }
});

const piyuPanel = $("[data-piyu-panel]");
const piyuBackdrop = $(".piyu-backdrop");
const piyuForm = $("[data-piyu-form]");
const piyuMessages = $("[data-piyu-messages]");
const piyuMessage = $("#piyu-message");
const piyuStatus = $("[data-piyu-status]");
const piyuCharCount = $("[data-piyu-char-count]");
const piyuEndpoint = window.location.protocol === "file:" ? null : "/api/piyu";
let piyuIsOpen = false;
let piyuHistory = [];

const scrollTopButton = $("[data-scroll-top]");
const updateScrollTop = () => scrollTopButton?.classList.toggle("is-visible", window.scrollY > 520);
scrollTopButton?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
window.addEventListener("scroll", updateScrollTop, { passive: true });
updateScrollTop();

function setPiyuStatus(text, type = "") {
  if (!piyuStatus) return;
  piyuStatus.textContent = text;
  piyuStatus.className = "chat-status " + type;
}

function addPiyuMessage(role, text) {
  if (!piyuMessages) return;
  const article = document.createElement("article");
  article.className = "chat-message" + (role === "user" ? " own" : "");
  const head = document.createElement("div"); head.className = "chat-message-head";
  const name = document.createElement("span"); name.className = "chat-message-name"; name.textContent = role === "user" ? "You" : "Piyu";
  const time = document.createElement("time"); time.className = "chat-message-time"; time.textContent = "now";
  const body = document.createElement("p"); body.className = "chat-message-text"; body.textContent = text;
  head.append(name, time); article.append(head, body); piyuMessages.append(article); piyuMessages.scrollTop = piyuMessages.scrollHeight;
}

function openPiyu() {
  piyuIsOpen = true; piyuPanel?.classList.add("open"); piyuPanel?.setAttribute("aria-hidden", "false"); piyuBackdrop?.classList.add("open");
  $$('[data-open-piyu]').forEach((trigger) => trigger.setAttribute("aria-expanded", "true"));
  document.body.style.overflow = "hidden"; window.setTimeout(() => piyuMessage?.focus(), 50);
}
function closePiyu() {
  piyuIsOpen = false; piyuPanel?.classList.remove("open"); piyuPanel?.setAttribute("aria-hidden", "true"); piyuBackdrop?.classList.remove("open");
  $$('[data-open-piyu]').forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
  if (!chatIsOpen) document.body.style.overflow = "";
}
function handlePiyuTrigger(event) {
  event.preventDefault();
  event.stopPropagation();
  companionSpeak("Good call. I have the portfolio receipts ready.");
  openPiyu();
}
$$('[data-open-piyu]').forEach((trigger) => trigger.addEventListener("click", handlePiyuTrigger));
$$('[data-piyu-close]').forEach((button) => button.addEventListener("click", closePiyu));
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && piyuIsOpen) closePiyu(); });
piyuMessage?.addEventListener("input", () => { if (piyuCharCount) piyuCharCount.textContent = piyuMessage.value.length; });

piyuForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!piyuEndpoint) { setPiyuStatus("Open this portfolio through Vercel to use Piyu.", "error"); return; }
  const submit = piyuForm.querySelector('button[type="submit"]');
  const message = piyuMessage.value.trim();
  if (message.length < 2) { setPiyuStatus("Write a little more so Piyu can help.", "error"); return; }
  const previousHistory = piyuHistory.slice(-8);
  piyuHistory.push({ role: "user", text: message });
  addPiyuMessage("user", message);
  piyuMessage.value = ""; if (piyuCharCount) piyuCharCount.textContent = "0";
  submit.disabled = true; setPiyuStatus("Piyu is thinking...", "");
  try {
    const response = await fetch(piyuEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ message, history: previousHistory, clientId }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Piyu could not answer that.");
    piyuHistory.push({ role: "model", text: payload.reply });
    addPiyuMessage("model", payload.reply); setPiyuStatus("Piyu is ready for another question.", "success");
  } catch (error) { setPiyuStatus(error.message || "Piyu is temporarily unavailable. Check the connection and try again.", "error"); }
  finally { submit.disabled = false; }
});

loadMessages();
window.setInterval(() => { if (!document.hidden && chatIsOpen) loadMessages(); }, 8000);
