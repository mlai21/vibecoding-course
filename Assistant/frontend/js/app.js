/**
 * 相遇地点助手 - 前端应用
 * 后端接口默认在 8081 端口，开发时通过 Vite 代理 /api -> http://localhost:8081
 */
const API_BASE = "/api";

const recordBtn = document.getElementById("recordBtn");
const recordBtnText = recordBtn.querySelector(".record-btn-text");
const statusContent = document.getElementById("statusContent");
const statusSection = document.getElementById("statusSection");
const resultSection = document.getElementById("resultSection");
const resultAudio = document.getElementById("resultAudio");

let mediaRecorder = null;
let audioChunks = [];

function setStatus(message, type = "info") {
  statusContent.textContent = message;
  statusContent.className = `status-content ${type}`;
}

function clearStatus() {
  statusContent.textContent = "";
  statusContent.className = "status-content";
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      // 必须等 onstop 后再上传，否则 audioChunks 可能仍为空（ondataavailable 异步）
      uploadAndProcess();
    };

    mediaRecorder.start();
    recordBtn.classList.add("recording");
    recordBtnText.textContent = "停止录音";
    clearStatus();
    setStatus("正在录音中…", "info");
  } catch (err) {
    setStatus("无法访问麦克风，请检查权限设置", "error");
    console.error(err);
  }
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return;
  recordBtn.classList.remove("recording");
  recordBtnText.textContent = "开始录音";
  recordBtn.disabled = true;
  setStatus("录音完成，正在处理…", "info");
  mediaRecorder.stop();
  // uploadAndProcess 在 mediaRecorder.onstop 中调用
}

async function uploadAndProcess() {
  if (!audioChunks.length) {
    setStatus("录音数据为空，请重新录制（建议录 2 秒以上）", "error");
    recordBtn.disabled = false;
    return;
  }
  const blob = new Blob(audioChunks, { type: "audio/webm" });
  if (blob.size === 0) {
    setStatus("录音文件为空，请重新录制", "error");
    recordBtn.disabled = false;
    return;
  }
  const formData = new FormData();
  formData.append("audio", blob, "recording.webm");

  try {
    const res = await fetch(`${API_BASE}/process-voice`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `请求失败: ${res.status}`);
    }

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (json.audio_url) {
        resultAudio.src = json.audio_url;
        resultSection.hidden = false;
        resultAudio.play();
        setStatus("处理完成，正在播放推荐结果", "success");
        return;
      }
      if (json.saved) {
        resultSection.hidden = true;
        let msg = json.message || "音频已保存";
        if (json.asr_text) {
          msg += ` 识别：${json.asr_text}`;
        }
        if (json.slots?.my_location && json.slots?.friend_location) {
          msg += ` | 提取：我${json.slots.my_location}，朋友${json.slots.friend_location}`;
        }
        if (json.meeting?.suggestions?.length) {
          const names = json.meeting.suggestions.slice(0, 3).map((s) => s.name).join("、");
          msg += ` | 推荐：${names}`;
        }
        setStatus(msg, "success");
        return;
      }
    }

    const audioBlob = await res.blob();
    const url = URL.createObjectURL(audioBlob);
    resultAudio.src = url;
    resultSection.hidden = false;
    resultAudio.play();
    setStatus("处理完成，正在播放推荐结果", "success");
  } catch (err) {
    setStatus(err.message || "处理失败，请重试", "error");
    resultSection.hidden = true;
    console.error(err);
  } finally {
    recordBtn.disabled = false;
  }
}

recordBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    stopRecording();
  } else {
    startRecording();
  }
});

resultAudio.addEventListener("ended", () => {
  setStatus("播放结束");
});
