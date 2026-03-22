"""
百炼 Qwen 系列 TTS 语音合成服务
使用 qwen3-tts-flash 模型，通过 DashScope multimodal-generation 接口将文本转为语音，
保存到 Storage 并返回可播放 URL。
"""
import base64
import logging
import os
import uuid
from pathlib import Path

import requests

from config import DASHSCOPE_API_KEY, DASHSCOPE_BASE, DASHSCOPE_TTS_MODEL, DASHSCOPE_TTS_VOICE, STORAGE_DIR

logger = logging.getLogger(__name__)

PROXY_ENV_KEYS = [
    "HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy",
    "ALL_PROXY", "all_proxy", "NO_PROXY", "no_proxy",
]

def _tts_url() -> str:
    return f"{DASHSCOPE_BASE}/api/v1/services/aigc/multimodal-generation/generation"


def _clear_proxy_env() -> None:
    for key in PROXY_ENV_KEYS:
        os.environ.pop(key, None)


def synthesize_to_file(
    text: str,
    output_prefix: str | None = None,
    model: str | None = None,
    voice: str | None = None,
) -> tuple[str, Path]:
    """
    将文本通过百炼 Qwen TTS 合成语音，保存到 Storage，返回可访问的 URL 路径和本地文件路径。

    :param text: 待合成文本
    :param output_prefix: 输出文件名前缀，默认自动生成
    :param model: TTS 模型，默认 DASHSCOPE_TTS_MODEL (qwen3-tts-flash)
    :param voice: 音色，默认 DASHSCOPE_TTS_VOICE (如 Cherry)
    :return: (可访问的 URL 路径如 /storage/xxx.wav, 本地 Path)
    """
    if not DASHSCOPE_API_KEY or DASHSCOPE_API_KEY == "your_api_key_here":
        raise ValueError("请在 .env 中配置有效的 DASHSCOPE_API_KEY")

    text = (text or "").strip()
    if not text:
        raise ValueError("TTS 输入文本不能为空")

    _clear_proxy_env()
    used_model = model or DASHSCOPE_TTS_MODEL
    used_voice = voice or DASHSCOPE_TTS_VOICE
    prefix = output_prefix or uuid.uuid4().hex

    payload = {
        "model": used_model,
        "input": {"text": text},
        "parameters": {"voice": used_voice},
    }

    headers = {
        "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
        "Content-Type": "application/json",
    }

    url = _tts_url()
    logger.info("[TTS] 请求 model=%s voice=%s", used_model, used_voice)
    resp = requests.post(url, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()

    # 解析 TTS 响应：output.audio / output.audio_url / choices[].message.content 等
    audio_url = None
    audio_b64 = None

    output = data.get("output", {})
    if isinstance(output, dict):
        audio_url = output.get("audio_url") or output.get("url")
        audio_b64 = output.get("audio") or output.get("data")
        # Qwen-TTS 可能返回在 output 下的嵌套结构
        audio_obj = output.get("audio", {})
        if isinstance(audio_obj, dict):
            audio_url = audio_url or audio_obj.get("url")
            audio_b64 = audio_b64 or audio_obj.get("data")

    # 部分接口在顶层返回 audio
    audio_wrapper = data.get("audio", {})
    if isinstance(audio_wrapper, dict):
        audio_url = audio_url or audio_wrapper.get("url")
        audio_b64 = audio_b64 or audio_wrapper.get("data")

    # multimodal-generation 可能将音频放在 choices[0].message.content 中
    choices = data.get("output", {}).get("choices", data.get("choices", []))
    if choices and not audio_url and not audio_b64:
        msg = choices[0].get("message", {}) if isinstance(choices[0], dict) else {}
        content = msg.get("content", [])
        if content and isinstance(content[0], dict):
            c = content[0]
            if c.get("type") == "audio" or "audio" in c:
                audio_b64 = c.get("data") or c.get("audio")
            elif "url" in c:
                audio_url = c.get("url")

    if audio_url:
        try:
            audio_resp = requests.get(audio_url, timeout=30)
            audio_resp.raise_for_status()
            audio_bytes = audio_resp.content
        except Exception as e:
            logger.warning("[TTS] 下载 OSS 音频失败: %s", e)
            raise RuntimeError(f"无法下载 TTS 生成的音频: {e}") from e
    elif audio_b64:
        audio_bytes = base64.b64decode(audio_b64)
    else:
        logger.warning("[TTS] 响应结构: output keys=%s", list(output.keys()) if isinstance(output, dict) else "N/A")
        raise ValueError("TTS 响应中未找到 audio_url 或 audio base64，请参考百炼 Qwen-TTS 文档确认响应格式")

    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    ext = "wav"
    if audio_bytes[:4] == b"RIFF" or (len(audio_bytes) > 12 and b"WAVE" in audio_bytes[:12]):
        ext = "wav"
    elif audio_bytes[:3] == b"ID3" or audio_bytes[:2] == b"\xff\xfb":
        ext = "mp3"
    out_path = STORAGE_DIR / f"{prefix}_tts.{ext}"
    out_path.write_bytes(audio_bytes)
    url_path = f"/storage/{out_path.name}"
    logger.info("[TTS] 合成成功 len=%d path=%s", len(audio_bytes), out_path)
    return url_path, out_path
