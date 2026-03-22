/**
 * AI 助手 - 聊天界面
 * 支持文字输入与语音转写（ASR）
 */
import { marked } from "marked";
import DOMPurify from "dompurify";

const API_BASE = "/api";

const messagesEl = document.getElementById("messages");
const placeholderEl = document.getElementById("placeholder");
const textInput = document.getElementById("textInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const inputHint = document.getElementById("inputHint");

let chatHistory = [];
let mediaRecorder = null;
let audioChunks = [];
let isProcessing = false;

/** 将错误转为简短用户提示，不暴露后端详情 */
function toUserFriendlyError(err) {
  console.error(err);
  const msg = err?.message || "";
  if (msg.includes("网络") || msg.includes("fetch") || msg.includes("Failed")) return "网络异常，请检查连接";
  if (msg.includes("500")) return "服务暂时不可用，请稍后重试";
  if (msg.includes("401") || msg.includes("403")) return "请求被拒绝";
  if (msg.includes("麦克风") || msg.includes("getUserMedia")) return "无法访问麦克风，请检查权限";
  return "操作失败，请重试";
}

function setHint(msg, isError = false) {
  inputHint.textContent = msg;
  inputHint.className = isError ? "input-hint error" : "input-hint";
}

/** 将 Markdown 转为安全 HTML */
function renderMarkdown(text) {
  if (!text) return "";
  const raw = marked.parse(text, { async: false });
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "code", "pre", "ul", "ol", "li", "h1", "h2", "h3", "blockquote", "a", "hr"],
    ALLOWED_ATTR: ["href", "target"],
  });
}

function hidePlaceholder() {
  placeholderEl.classList.add("hidden");
}

function appendMessage(role, content, isTyping = false) {
  hidePlaceholder();
  const msg = document.createElement("div");
  msg.className = `msg ${role}${isTyping ? " typing" : ""}`;
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  if (role === "assistant" && !isTyping && content) {
    bubble.innerHTML = renderMarkdown(content);
  } else {
    bubble.textContent = content;
  }
  msg.appendChild(bubble);
  messagesEl.appendChild(msg);
  scrollToBottom();
  return msg;
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function updateLastBubble(content, removeTyping = false) {
  const last = messagesEl.querySelector(".msg:last-child");
  if (!last) return;
  if (removeTyping) last.classList.remove("typing");
  const bubble = last.querySelector(".msg-bubble");
  if (bubble) bubble.textContent = content;
  scrollToBottom();
}

async function callChat() {
  const messages = chatHistory.map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `请求失败: ${res.status}`);
  }
  const data = await res.json();
  if (!data.ok || !data.reply) throw new Error("未收到有效回复");
  return data.reply;
}

async function sendUserMessage(text) {
  if (!text || isProcessing) return;
  const trimmed = text.trim();
  if (!trimmed) return;

  chatHistory.push({ role: "user", content: trimmed });
  appendMessage("user", trimmed);
  textInput.value = "";
  textInput.style.height = "auto";

  isProcessing = true;
  sendBtn.disabled = true;
  micBtn.disabled = true;
  setHint("正在思考…");

  const typingEl = appendMessage("assistant", "", true);

  try {
    const reply = await callChat();
    chatHistory.push({ role: "assistant", content: reply });
    typingEl.classList.remove("typing");
    typingEl.querySelector(".msg-bubble").innerHTML = renderMarkdown(reply);
    setHint("");
  } catch (err) {
    const msg = toUserFriendlyError(err);
    typingEl.classList.remove("typing");
    typingEl.querySelector(".msg-bubble").textContent = msg; // 错误信息保持纯文本
    setHint(msg, true);
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
    micBtn.disabled = false;
    textInput.focus();
  }
}

async function uploadAndTranscribe() {
  if (!audioChunks.length) {
    setHint("录音数据为空，请重新录制（建议 2 秒以上）", true);
    return null;
  }
  const blob = new Blob(audioChunks, { type: "audio/webm" });
  if (blob.size === 0) {
    setHint("录音文件为空，请重新录制", true);
    return null;
  }
  const formData = new FormData();
  formData.append("audio", blob, "recording.webm");

  setHint("正在转写…");
  const res = await fetch(`${API_BASE}/asr`, {
    method: "POST",
    body: formData,
  });
  setHint("");

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `转写失败: ${res.status}`);
  }
  const data = await res.json();
  if (!data.ok) throw new Error(data.detail || "转写失败");
  return data.text || "";
}

async function startRecording() {
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
      micBtn.disabled = true;
      try {
        const text = await uploadAndTranscribe();
        if (text && text.trim()) {
          await sendUserMessage(text);
        } else if (text !== null) {
          setHint("未识别到有效内容", true);
        }
      } catch (err) {
        setHint(toUserFriendlyError(err), true);
      } finally {
        micBtn.disabled = false;
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

// Text send
sendBtn.addEventListener("click", () => sendUserMessage(textInput.value));

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendUserMessage(textInput.value);
  }
});

// Auto-resize textarea
textInput.addEventListener("input", () => {
  textInput.style.height = "auto";
  textInput.style.height = Math.min(textInput.scrollHeight, 120) + "px";
});

// Mic
micBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    stopRecording();
  } else {
    startRecording();
  }
});
