/**
 * AI 助手 - 双栏聊天界面
 * 左侧历史会话，右侧消息区，支持 Markdown 渲染与语音转写输入。
 */
import { marked } from "marked";
import DOMPurify from "dompurify";

const API_BASE = "/api";
const DEFAULT_TITLE = "新对话";
const PLACEHOLDER_TEXT = "说点什么或输入文字开始对话";

const conversationListEl = document.getElementById("conversationList");
const conversationEmptyEl = document.getElementById("conversationEmpty");
const conversationTitleEl = document.getElementById("conversationTitle");
const newConversationBtn = document.getElementById("newConversationBtn");
const deleteDialogEl = document.getElementById("deleteDialog");
const deleteDialogMessageEl = document.getElementById("deleteDialogMessage");
const deleteDialogCancelBtn = document.getElementById("deleteDialogCancelBtn");
const deleteDialogConfirmBtn = document.getElementById("deleteDialogConfirmBtn");

const messagesEl = document.getElementById("messages");
const textInput = document.getElementById("textInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const inputHint = document.getElementById("inputHint");

let conversations = [];
let activeConversationId = null;
let currentMessages = [];
/** 有进行中请求的会话 ID 集合，按会话记录 loading 状态 */
const loadingConversationIds = new Set();
let pendingDeleteConversationId = null;
let inlineTitleEdit = null;

let mediaRecorder = null;
let audioChunks = [];

function toUserFriendlyError(err) {
  console.error(err);
  const msg = err?.message || "";
  if (msg.includes("网络") || msg.includes("fetch") || msg.includes("Failed")) return "网络异常，请检查连接";
  if (msg.includes("404")) return "会话不存在，请新建后重试";
  if (msg.includes("500")) return "服务暂时不可用，请稍后重试";
  if (msg.includes("422")) return "音频格式有误，请重新录制后重试";
  if (msg.includes("401") || msg.includes("403")) return "请求被拒绝";
  if (msg.includes("麦克风") || msg.includes("getUserMedia")) return "无法访问麦克风，请检查权限";
  return "操作失败，请重试";
}

function setHint(msg, isError = false) {
  inputHint.textContent = msg;
  inputHint.className = isError ? "input-hint error" : "input-hint";
}

function renderMarkdown(text) {
  if (!text) return "";
  const raw = marked.parse(text, { async: false });
  const sanitized = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "code", "pre", "ul", "ol", "li", "h1", "h2", "h3", "blockquote", "a", "hr"],
    ALLOWED_ATTR: ["href", "target"],
  });
  return sanitized
    .replace(/<p>(?:\s|&nbsp;|&#160;|&#xA0;|&#12288;|&#x3000;|<br\s*\/?>)*<\/p>/gi, "")
    .replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br><br>");
}

function normalizeAssistantContent(text) {
  if (!text) return "";
  const normalized = String(text)
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\u3000/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""));
  const compacted = [];
  let blankCount = 0;
  for (const line of normalized) {
    if (!line.trim()) {
      blankCount += 1;
      if (blankCount <= 1) compacted.push("");
      continue;
    }
    blankCount = 0;
    compacted.push(line);
  }
  return compacted.join("\n").trim();
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `请求失败: ${res.status}`);
  }
  return res.json();
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(d);
  }
  if (d.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(d);
  }
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "numeric", day: "numeric" }).format(d);
}

function clampPreview(text, maxLen = 54) {
  const normalized = (text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "暂无消息";
  return normalized.length <= maxLen ? normalized : `${normalized.slice(0, maxLen)}…`;
}

function setControlsDisabled(disabled) {
  sendBtn.disabled = disabled;
  micBtn.disabled = disabled;
  textInput.disabled = disabled;
}

/** 当前会话是否有进行中的请求 */
function isConversationLoading(conversationId) {
  return loadingConversationIds.has(conversationId);
}

/** 仅当正在查看的会话有请求在进行时禁用输入控件 */
function updateControlsState() {
  const disabled = loadingConversationIds.has(activeConversationId);
  setControlsDisabled(disabled);
}

function resolveVoiceAudioUrl(payload) {
  const direct = payload?.tts_api_url || payload?.tts_url || "";
  if (!direct) return "";
  if (direct.startsWith("http://") || direct.startsWith("https://")) return direct;
  if (direct.startsWith("/api/") || direct.startsWith("/storage/") || direct.startsWith("/")) return direct;
  return `${API_BASE}/${direct.replace(/^\//, "")}`;
}

async function fetchTtsForPendingMessages() {
  const pending = document.querySelectorAll(".msg-bubble-wrap[data-tts-pending='true']");
  for (const wrap of pending) {
    const bubble = wrap.querySelector(".msg-bubble");
    const text = (bubble?.textContent || wrap.dataset.ttsContent || "").trim();
    delete wrap.dataset.ttsPending;
    delete wrap.dataset.ttsContent;
    if (!text.trim()) continue;
    const playBtn = wrap.querySelector(".msg-audio-play-btn");
    const audioEl = wrap.querySelector("audio");
    if (!playBtn || !audioEl) continue;
    try {
      const res = await fetch(`${API_BASE}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) throw new Error("TTS 请求失败");
      const data = await res.json();
      const ttsUrl = data?.tts_url || "";
      if (!ttsUrl) throw new Error("无 TTS URL");
      const audioRes = await fetch(ttsUrl.startsWith("http") ? ttsUrl : (ttsUrl.startsWith("/") ? ttsUrl : `/${ttsUrl.replace(/^\//, "")}`));
      if (!audioRes.ok) throw new Error("音频加载失败");
      const blob = await audioRes.blob();
      const blobUrl = URL.createObjectURL(blob);
      audioEl.src = blobUrl;
      playBtn.classList.remove("tts-loading");
      playBtn.querySelector(".play-icon").style.display = "";
      const loadingSpan = playBtn.querySelector(".tts-loading-dots");
      if (loadingSpan) loadingSpan.style.display = "none";
      audioEl.play().catch(() => {});
    } catch (e) {
      console.error("[TTS]", e);
      playBtn.classList.remove("tts-loading");
      playBtn.classList.add("tts-error");
      playBtn.title = "语音生成失败";
      playBtn.querySelector(".play-icon").style.display = "";
      const loadingSpan = playBtn.querySelector(".tts-loading-dots");
      if (loadingSpan) loadingSpan.style.display = "none";
    }
  }
}

function buildMeetingReplyText(result) {
  const parts = [];
  const integrated = (result?.integrated_text || "").trim();
  const fallbackMessage = (result?.message || "").trim();
  if (integrated) {
    parts.push(integrated);
  } else if (fallbackMessage) {
    parts.push(fallbackMessage);
  } else {
    parts.push("已完成语音处理，但暂时没有可展示的推荐结果。");
  }

  const suggestions = result?.meeting?.suggestions;
  if (Array.isArray(suggestions) && suggestions.length) {
    parts.push("", "推荐地点：");
    for (const item of suggestions.slice(0, 3)) {
      const name = item?.name || "未知地点";
      const addr = item?.address || "地址未提供";
      const distance = item?.distance ? `${item.distance}米` : "距离未知";
      parts.push(`- ${name}（${addr}，距中点${distance}）`);
    }
  }

  const errors = result?.meeting?.errors;
  if (Array.isArray(errors) && errors.length) {
    parts.push("", "补充说明：");
    for (const err of errors) {
      parts.push(`- ${err}`);
    }
  }
  return parts.join("\n");
}

function updateActiveConversationPreview(previewText) {
  if (!activeConversationId || !previewText) return;
  updateConversationPreview(activeConversationId, previewText);
}

function updateConversationPreview(conversationId, previewText) {
  if (!conversationId || !previewText) return;
  const idx = conversations.findIndex((c) => c.id === conversationId);
  if (idx < 0) return;
  conversations[idx] = {
    ...conversations[idx],
    preview: previewText,
    last_message_at: new Date().toISOString(),
  };
  renderConversationList();
}

function renderConversationList() {
  conversationListEl.innerHTML = "";
  conversationEmptyEl.classList.toggle("hidden", conversations.length > 0);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  for (const [index, conversation] of conversations.entries()) {
    const item = document.createElement("div");
    item.setAttribute("role", "button");
    item.tabIndex = 0;
    const isActive = conversation.id === activeConversationId;
    const isLoading = loadingConversationIds.has(conversation.id);
    item.className = `conversation-item${isActive ? " active" : ""}${isLoading ? " loading" : ""}`;
    item.dataset.id = conversation.id;
    item.style.setProperty("--stagger-index", String(index));
    item.setAttribute("aria-current", conversation.id === activeConversationId ? "true" : "false");

    const title = conversation.title || DEFAULT_TITLE;
    const preview = clampPreview(conversation.preview);
    const timeText = formatTime(conversation.last_message_at);
    const titleRow = document.createElement("div");
    titleRow.className = "conversation-title-row";

    const isEditingTitle = inlineTitleEdit?.conversationId === conversation.id;
    const titleEl = document.createElement("p");
    titleEl.className = "conversation-title";
    if (isEditingTitle) {
      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.className = "conversation-title-input";
      titleInput.value = inlineTitleEdit.draftTitle;
      titleInput.maxLength = 80;
      titleInput.setAttribute("aria-label", "编辑会话标题");
      titleInput.addEventListener("click", (event) => event.stopPropagation());
      titleInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void submitInlineTitleEdit();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cancelInlineTitleEdit();
        }
      });
      titleInput.addEventListener("blur", () => {
        cancelInlineTitleEdit();
      });
      titleInput.addEventListener("input", () => {
        if (!inlineTitleEdit || inlineTitleEdit.conversationId !== conversation.id) return;
        inlineTitleEdit.draftTitle = titleInput.value;
      });
      titleEl.appendChild(titleInput);
    } else {
      titleEl.textContent = title;
      titleEl.classList.add("conversation-title-editable");
      titleEl.tabIndex = 0;
      titleEl.setAttribute("role", "button");
      titleEl.setAttribute("aria-label", `编辑标题：${title}`);
      titleEl.addEventListener("click", (event) => {
        event.stopPropagation();
        startInlineTitleEdit(conversation.id, title);
      });
      titleEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          startInlineTitleEdit(conversation.id, title);
        }
      });
    }

    const timeEl = document.createElement("p");
    timeEl.className = "conversation-time";
    timeEl.textContent = isLoading ? "思考中…" : timeText;
    const actionsEl = document.createElement("div");
    actionsEl.className = "conversation-actions";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "conversation-action-btn conversation-delete-btn";
    deleteBtn.setAttribute("aria-label", `删除会话：${title}`);
    deleteBtn.title = "删除会话";
    deleteBtn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v8H7V9Zm4 0h2v8h-2V9Zm4 0h2v8h-2V9Z"/><path d="M6 7h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7Z"/></svg>';
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      openDeleteDialog(conversation.id, title);
    });

    const previewEl = document.createElement("p");
    previewEl.className = "conversation-preview";
    previewEl.textContent = preview;

    actionsEl.appendChild(timeEl);
    actionsEl.appendChild(deleteBtn);
    titleRow.appendChild(titleEl);
    titleRow.appendChild(actionsEl);
    item.appendChild(titleRow);
    item.appendChild(previewEl);

    item.addEventListener("click", () => {
      if (inlineTitleEdit?.conversationId === conversation.id) return;
      if (conversation.id === activeConversationId) return;
      void loadMessagesForConversation(conversation.id);
    });
    item.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (inlineTitleEdit?.conversationId === conversation.id) return;
      if (conversation.id === activeConversationId) return;
      void loadMessagesForConversation(conversation.id);
    });
    conversationListEl.appendChild(item);
    if (reducedMotion) {
      item.classList.add("is-visible");
    } else {
      requestAnimationFrame(() => item.classList.add("is-visible"));
    }
  }

  if (inlineTitleEdit) {
    requestAnimationFrame(() => {
      const selector = `.conversation-item[data-id="${inlineTitleEdit.conversationId}"] .conversation-title-input`;
      const input = conversationListEl.querySelector(selector);
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
      }
    });
  }
}

function openDeleteDialog(conversationId, title) {
  if (!conversationId) return;
  pendingDeleteConversationId = conversationId;
  deleteDialogMessageEl.textContent = `确认删除会话“${title || DEFAULT_TITLE}”吗？删除后无法恢复。`;
  deleteDialogEl.classList.remove("hidden");
  deleteDialogEl.setAttribute("aria-hidden", "false");
  deleteDialogConfirmBtn.focus();
}

function closeDeleteDialog() {
  pendingDeleteConversationId = null;
  deleteDialogEl.classList.add("hidden");
  deleteDialogEl.setAttribute("aria-hidden", "true");
}

function startInlineTitleEdit(conversationId, currentTitle) {
  if (!conversationId) return;
  inlineTitleEdit = {
    conversationId,
    originalTitle: currentTitle || DEFAULT_TITLE,
    draftTitle: currentTitle || DEFAULT_TITLE,
  };
  renderConversationList();
}

function cancelInlineTitleEdit() {
  if (!inlineTitleEdit) return;
  inlineTitleEdit = null;
  renderConversationList();
}

async function submitInlineTitleEdit() {
  if (!inlineTitleEdit) return;
  const { conversationId, originalTitle, draftTitle } = inlineTitleEdit;
  const nextTitle = draftTitle.trim();
  if (!nextTitle) {
    setHint("标题不能为空", true);
    return;
  }

  inlineTitleEdit = null;
  renderConversationList();

  if (nextTitle === originalTitle.trim()) {
    return;
  }

  try {
    await apiFetch(`/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: nextTitle }),
    });
    await syncConversations(activeConversationId);
    updateConversationTitle();
    setHint("");
  } catch (err) {
    setHint(toUserFriendlyError(err), true);
  }
}

async function confirmDeleteConversation() {
  const conversationId = pendingDeleteConversationId;
  if (!conversationId) return;
  closeDeleteDialog();

  try {
    await apiFetch(`/conversations/${conversationId}`, { method: "DELETE" });

    const nextConversation = conversations.find((c) => c.id !== conversationId);
    await syncConversations(nextConversation?.id || null);
    if (activeConversationId) {
      await loadMessagesForConversation(activeConversationId);
    } else {
      renderMessages();
    }
    setHint("会话已删除");
  } catch (err) {
    setHint(toUserFriendlyError(err), true);
  }
}

function renderMessages() {
  messagesEl.innerHTML = "";
  if (!currentMessages.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "messages-placeholder";
    placeholder.innerHTML = `<p>${PLACEHOLDER_TEXT}</p>`;
    messagesEl.appendChild(placeholder);
    return;
  }
  for (const m of currentMessages) {
    appendMessageElement(m.role, m.content, false, m.audioUrl || "");
  }
  scrollToBottom();
}

function appendMessageElement(role, content, isTyping = false, audioUrl = "") {
  const msg = document.createElement("div");
  msg.className = `msg ${role}${isTyping ? " typing" : ""}`;

  const bubbleWrap = document.createElement("div");
  bubbleWrap.className = "msg-bubble-wrap" + (role === "assistant" && !isTyping ? " has-actions" : "");

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  const normalizedAssistantContent = role === "assistant" ? normalizeAssistantContent(content || "") : (content || "");
  if (isTyping) {
    bubble.setAttribute("aria-label", "AI 正在思考");
    bubble.innerHTML = '<span class="typing-dots" aria-hidden="true"><span></span><span></span><span></span></span><span class="sr-only">AI 正在思考</span>';
  } else if (role === "assistant") {
    bubble.innerHTML = renderMarkdown(normalizedAssistantContent);
  } else {
    bubble.textContent = content || "";
  }

  bubbleWrap.appendChild(bubble);

  if (role === "assistant" && !isTyping) {
    const actions = document.createElement("div");
    actions.className = "msg-actions";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "msg-copy-btn";
    copyBtn.setAttribute("aria-label", "复制内容");
    copyBtn.title = "复制内容";
    copyBtn.innerHTML =
      '<svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M20 6L9 17l-5-5"/></svg>';
    copyBtn.addEventListener("click", async () => {
      const text = bubble.textContent || "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.classList.add("copied");
        copyBtn.querySelector(".copy-icon").style.display = "none";
        copyBtn.querySelector(".check-icon").style.display = "";
        copyBtn.title = "已复制";
        setTimeout(() => {
          copyBtn.classList.remove("copied");
          copyBtn.querySelector(".copy-icon").style.display = "";
          copyBtn.querySelector(".check-icon").style.display = "none";
          copyBtn.title = "复制内容";
        }, 1500);
      } catch (e) {
        copyBtn.title = "复制失败";
      }
    });
    actions.appendChild(copyBtn);

    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "msg-audio-play-btn";
    playBtn.setAttribute("aria-label", "播放语音");
    playBtn.title = "播放语音";
    playBtn.innerHTML =
      '<svg class="play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><svg class="pause-icon" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg><span class="tts-loading-dots" style="display:none" aria-hidden="true">⋯</span>';
    const audioEl = document.createElement("audio");
    audioEl.preload = "metadata";
    if (audioUrl) audioEl.src = audioUrl;
    playBtn.addEventListener("click", async () => {
      if (playBtn.classList.contains("tts-loading") || playBtn.classList.contains("tts-error")) return;
      // 若没有音频源，先拉取 TTS（如历史消息从未合成过）
      if (!audioEl.src || audioEl.src === window.location.href) {
        const text = (bubble?.textContent || bubbleWrap.dataset.ttsContent || "").trim().slice(0, 8000);
        if (!text) return;
        playBtn.classList.add("tts-loading");
        playBtn.querySelector(".play-icon").style.display = "none";
        const loadingSpan = playBtn.querySelector(".tts-loading-dots");
        if (loadingSpan) loadingSpan.style.display = "";
        try {
          const res = await fetch(`${API_BASE}/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });
          if (!res.ok) throw new Error("TTS 请求失败");
          const data = await res.json();
          const ttsUrl = data?.tts_url || "";
          if (!ttsUrl) throw new Error("无 TTS URL");
          const audioRes = await fetch(ttsUrl.startsWith("http") ? ttsUrl : (ttsUrl.startsWith("/") ? ttsUrl : `/${ttsUrl.replace(/^\//, "")}`));
          if (!audioRes.ok) throw new Error("音频加载失败");
          const blob = await audioRes.blob();
          audioEl.src = URL.createObjectURL(blob);
          playBtn.classList.remove("tts-loading");
          playBtn.querySelector(".play-icon").style.display = "";
          if (loadingSpan) loadingSpan.style.display = "none";
        } catch (e) {
          console.error("[TTS]", e);
          playBtn.classList.remove("tts-loading");
          playBtn.classList.add("tts-error");
          playBtn.title = "语音生成失败";
          playBtn.querySelector(".play-icon").style.display = "";
          if (loadingSpan) loadingSpan.style.display = "none";
          return;
        }
      }
      if (audioEl.paused) {
        audioEl.play().catch((e) => console.warn("[TTS] 播放失败:", e));
        playBtn.classList.add("is-playing");
        playBtn.querySelector(".play-icon").style.display = "none";
        playBtn.querySelector(".pause-icon").style.display = "";
      } else {
        audioEl.pause();
        playBtn.classList.remove("is-playing");
        playBtn.querySelector(".play-icon").style.display = "";
        playBtn.querySelector(".pause-icon").style.display = "none";
      }
    });
    audioEl.addEventListener("play", () => {
      playBtn.classList.add("is-playing");
      playBtn.querySelector(".play-icon").style.display = "none";
      playBtn.querySelector(".pause-icon").style.display = "";
      const loading = playBtn.querySelector(".tts-loading-dots");
      if (loading) loading.style.display = "none";
    });
    audioEl.addEventListener("pause", () => {
      playBtn.classList.remove("is-playing");
      playBtn.querySelector(".play-icon").style.display = "";
      playBtn.querySelector(".pause-icon").style.display = "none";
    });
    audioEl.addEventListener("ended", () => {
      playBtn.classList.remove("is-playing");
      playBtn.querySelector(".play-icon").style.display = "";
      playBtn.querySelector(".pause-icon").style.display = "none";
    });
    actions.appendChild(playBtn);
    bubbleWrap.appendChild(audioEl);
    bubbleWrap.classList.add("has-audio");

    bubbleWrap.appendChild(actions);
  }

  msg.appendChild(bubbleWrap);
  messagesEl.appendChild(msg);
  scrollToBottom();
  return msg;
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function findConversation(id) {
  return conversations.find((c) => c.id === id) || null;
}

function updateConversationTitle() {
  const active = findConversation(activeConversationId);
  conversationTitleEl.textContent = active?.title || DEFAULT_TITLE;
}

async function syncConversations(preferredId = activeConversationId) {
  const data = await apiFetch("/conversations");
  conversations = data.items || [];

  if (!conversations.length) {
    activeConversationId = null;
    currentMessages = [];
    renderConversationList();
    updateConversationTitle();
    renderMessages();
    updateControlsState();
    return;
  }

  const hasPreferred = preferredId && conversations.some((c) => c.id === preferredId);
  activeConversationId = hasPreferred ? preferredId : conversations[0].id;
  renderConversationList();
  updateConversationTitle();
  updateControlsState();
}

async function createConversation() {
  const data = await apiFetch("/conversations", { method: "POST" });
  return data.conversation;
}

async function loadMessagesForConversation(conversationId) {
  activeConversationId = conversationId;
  renderConversationList();
  updateConversationTitle();

  const data = await apiFetch(`/conversations/${conversationId}/messages`);
  currentMessages = (data.items || []).map((item) => {
    if (item?.role !== "assistant") return item;
    return { ...item, content: normalizeAssistantContent(item.content || "") };
  });
  if (data.conversation) {
    const index = conversations.findIndex((c) => c.id === data.conversation.id);
    if (index >= 0) conversations[index] = { ...conversations[index], ...data.conversation };
  }
  updateConversationTitle();
  renderMessages();
  updateControlsState();
}

async function ensureActiveConversation() {
  if (activeConversationId) return activeConversationId;
  const conversation = await createConversation();
  await syncConversations(conversation.id);
  await loadMessagesForConversation(conversation.id);
  return conversation.id;
}

async function sendUserMessage(text) {
  if (!text) return;
  const trimmed = text.trim();
  if (!trimmed) return;

  let conversationId;
  try {
    conversationId = await ensureActiveConversation();
  } catch (err) {
    setHint(toUserFriendlyError(err), true);
    return;
  }
  if (loadingConversationIds.has(conversationId)) return;

  currentMessages.push({ role: "user", content: trimmed });
  renderMessages();
  textInput.value = "";
  textInput.style.height = "auto";

  loadingConversationIds.add(conversationId);
  renderConversationList();
  updateControlsState();
  setHint("正在思考…");

  const typingEl = appendMessageElement("assistant", "", true);

  try {
    const data = await apiFetch(`/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: trimmed }),
    });

    const assistantText = normalizeAssistantContent(data?.assistant_message?.content || "抱歉，我暂时无法给出有效回复。");
    currentMessages.push({ role: "assistant", content: assistantText });

    if (activeConversationId === conversationId) {
      typingEl.remove();
      renderMessages();
      const lastAssistant = messagesEl.querySelector(".msg.assistant:last-of-type .msg-bubble-wrap");
      if (lastAssistant && assistantText.trim()) {
        lastAssistant.dataset.ttsPending = "true";
        lastAssistant.dataset.ttsContent = assistantText.trim();
        const playBtn = lastAssistant.querySelector(".msg-audio-play-btn");
        if (playBtn) {
          playBtn.classList.add("tts-loading");
          playBtn.querySelector(".play-icon").style.display = "none";
          const loadingSpan = playBtn.querySelector(".tts-loading-dots");
          if (loadingSpan) loadingSpan.style.display = "";
        }
        fetchTtsForPendingMessages();
      }
      setHint("");
    } else {
      typingEl.remove();
    }

    await syncConversations(activeConversationId);
    updateConversationTitle();
  } catch (err) {
    const msg = toUserFriendlyError(err);
    if (activeConversationId === conversationId) {
      typingEl.classList.remove("typing");
      const bubble = typingEl.querySelector(".msg-bubble");
      if (bubble) bubble.textContent = msg;
      setHint(msg, true);
      try {
        await loadMessagesForConversation(conversationId);
      } catch (syncErr) {
        console.error(syncErr);
      }
    } else {
      typingEl.remove();
      await syncConversations(activeConversationId);
    }
  } finally {
    loadingConversationIds.delete(conversationId);
    renderConversationList();
    updateControlsState();
    textInput.focus();
  }
}

async function createAndSwitchConversation() {
  try {
    const conversation = await createConversation();
    await syncConversations(conversation.id);
    await loadMessagesForConversation(conversation.id);
    textInput.focus();
  } catch (err) {
    setHint(toUserFriendlyError(err), true);
  }
}

async function uploadAndProcessVoice() {
  if (!audioChunks.length) {
    setHint("录音数据为空，请重新录制（建议 2 秒以上）", true);
    return null;
  }
  const blob = new Blob(audioChunks, { type: "audio/webm" });
  if (!blob.size) {
    setHint("录音文件为空，请重新录制", true);
    return null;
  }

  const formData = new FormData();
  formData.append("audio", blob, "recording.webm");

  setHint("正在识别并推荐见面地点…");
  const res = await fetch(`${API_BASE}/process-voice`, { method: "POST", body: formData });
  setHint("");

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `语音处理失败: ${res.status}`);
  }
  const data = await res.json();
  return data || {};
}

async function startRecording() {
  if (loadingConversationIds.has(activeConversationId)) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      micBtn.classList.remove("recording");
      const convId = await ensureActiveConversation();
      loadingConversationIds.add(convId);
      renderConversationList();
      updateControlsState();
      try {
        const result = await uploadAndProcessVoice();
        const transcript = (result?.asr_text || "").trim();
        const assistantText = normalizeAssistantContent(buildMeetingReplyText(result));
        const audioUrl = resolveVoiceAudioUrl(result);

        if (activeConversationId === convId) {
          currentMessages.push({
            role: "user",
            content: transcript || "（语音未识别到明确文本）",
          });
          currentMessages.push({
            role: "assistant",
            content: assistantText,
            audioUrl,
          });
          renderMessages();
          setHint(audioUrl ? "处理完成，已生成可播放语音" : "处理完成，已生成文本推荐");
        }
        updateConversationPreview(convId, assistantText);
      } catch (err) {
        setHint(toUserFriendlyError(err), true);
      } finally {
        loadingConversationIds.delete(convId);
        renderConversationList();
        updateControlsState();
        textInput.focus();
      }
    };

    mediaRecorder.start();
    micBtn.classList.add("recording");
    setHint("正在录音，点击停止");
  } catch (err) {
    setHint(toUserFriendlyError(err), true);
  }
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state !== "recording") return;
  mediaRecorder.stop();
}

async function bootstrap() {
  try {
    await syncConversations();
    if (!activeConversationId) {
      const conversation = await createConversation();
      await syncConversations(conversation.id);
    }
    if (activeConversationId) {
      await loadMessagesForConversation(activeConversationId);
    }
  } catch (err) {
    setHint(toUserFriendlyError(err), true);
  }
}

sendBtn.addEventListener("click", () => {
  void sendUserMessage(textInput.value);
});

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    void sendUserMessage(textInput.value);
  }
});

textInput.addEventListener("input", () => {
  textInput.style.height = "auto";
  textInput.style.height = `${Math.min(textInput.scrollHeight, 140)}px`;
});

micBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    stopRecording();
  } else {
    void startRecording();
  }
});

newConversationBtn.addEventListener("click", () => {
  void createAndSwitchConversation();
});

deleteDialogCancelBtn.addEventListener("click", () => {
  closeDeleteDialog();
});

deleteDialogConfirmBtn.addEventListener("click", () => {
  void confirmDeleteConversation();
});

deleteDialogEl.addEventListener("click", (event) => {
  if (event.target === deleteDialogEl) {
    closeDeleteDialog();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !deleteDialogEl.classList.contains("hidden")) {
    closeDeleteDialog();
  }
});

void bootstrap();
