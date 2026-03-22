"""
百炼平台 Fun-ASR 录音文件识别
使用 HTTP 请求，不使用 SDK。
调用前清除代理环境变量。
"""
import json
import logging
import time
from pathlib import Path

import requests

logger = logging.getLogger(__name__)

from config import (
    DASHSCOPE_API_KEY,
    DASHSCOPE_ASR_MODEL,
    DASHSCOPE_BASE,
    STORAGE_DIR,
)

# 需清除的代理相关环境变量
PROXY_ENV_KEYS = [
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "http_proxy",
    "https_proxy",
    "ALL_PROXY",
    "all_proxy",
    "NO_PROXY",
    "no_proxy",
]


def _clear_proxy_env() -> None:
    """清除所有代理相关环境变量，避免影响百炼 API 调用"""
    import os

    for key in PROXY_ENV_KEYS:
        os.environ.pop(key, None)


def _get_headers(include_oss_resolve: bool = False) -> dict:
    headers = {
        "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
        "Content-Type": "application/json",
    }
    if include_oss_resolve:
        headers["X-DashScope-OssResourceResolve"] = "enable"
    return headers


def _get_upload_policy() -> dict:
    """获取文件上传凭证"""
    _clear_proxy_env()
    url = f"{DASHSCOPE_BASE}/api/v1/uploads"
    params = {"action": "getPolicy", "model": DASHSCOPE_ASR_MODEL}
    resp = requests.get(url, headers=_get_headers(), params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if "data" not in data:
        raise ValueError(f"获取上传凭证失败: {data}")
    return data["data"]


def _upload_to_oss(policy: dict, file_path: Path) -> str:
    """上传文件到 OSS，返回 oss:// URL"""
    _clear_proxy_env()
    key = f"{policy['upload_dir']}/{file_path.name}"
    with open(file_path, "rb") as f:
        files = {"file": (file_path.name, f)}
        data = {
            "OSSAccessKeyId": policy["oss_access_key_id"],
            "Signature": policy["signature"],
            "policy": policy["policy"],
            "x-oss-object-acl": policy["x_oss_object_acl"],
            "x-oss-forbid-overwrite": policy["x_oss_forbid_overwrite"],
            "key": key,
            "success_action_status": "200",
        }
        resp = requests.post(
            policy["upload_host"],
            data=data,
            files=files,
            timeout=60,
        )
    resp.raise_for_status()
    return f"oss://{key}"


def _submit_asr_task(file_urls: list[str]) -> str:
    """提交 ASR 转写任务，返回 task_id"""
    _clear_proxy_env()
    url = f"{DASHSCOPE_BASE}/api/v1/services/audio/asr/transcription"
    payload = {
        "model": DASHSCOPE_ASR_MODEL,
        "input": {"file_urls": file_urls},
        "parameters": {"channel_id": [0], "language_hints": ["zh"]},
    }
    headers = _get_headers(include_oss_resolve=True)
    headers["X-DashScope-Async"] = "enable"
    resp = requests.post(
        url,
        headers=headers,
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()
    out = resp.json().get("output", {})
    task_id = out.get("task_id")
    if not task_id:
        raise ValueError(f"提交任务失败: {resp.text}")
    return task_id


def _poll_task_result(task_id: str, max_wait: int = 120, interval: float = 1.0) -> dict:
    """轮询任务结果，返回 output"""
    _clear_proxy_env()
    url = f"{DASHSCOPE_BASE}/api/v1/tasks/{task_id}"
    headers = _get_headers()
    elapsed = 0
    while elapsed < max_wait:
        resp = requests.post(url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        output = data.get("output", {})
        status = output.get("task_status")
        if status == "SUCCEEDED":
            return output
        if status in ("FAILED", "CANCELED"):
            raise RuntimeError(f"ASR 任务失败: {output}")
        time.sleep(interval)
        elapsed += interval
    raise TimeoutError(f"ASR 任务超时（{max_wait}s）")


def _fetch_transcription(transcription_url: str) -> dict:
    """从 transcription_url 下载识别结果 JSON"""
    _clear_proxy_env()
    resp = requests.get(transcription_url, timeout=30)
    resp.raise_for_status()
    return resp.json()


def transcribe_and_save(audio_path: Path, output_prefix: str = None) -> tuple[dict, Path]:
    """
    对本地音频执行 ASR 转写，并将结果保存到 Storage。

    :param audio_path: 音频文件路径
    :param output_prefix: 输出文件名前缀（不含扩展名），默认使用音频文件名
    :return: (转写结果 dict, 保存路径 Path)
    """
    if not DASHSCOPE_API_KEY or DASHSCOPE_API_KEY == "your_api_key_here":
        raise ValueError("请在 .env 中配置有效的 DASHSCOPE_API_KEY")

    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise FileNotFoundError(f"音频文件不存在: {audio_path}")

    prefix = output_prefix or audio_path.stem

    # 1. 获取上传凭证并上传到 OSS
    logger.info("[ASR] 获取上传凭证")
    policy = _get_upload_policy()
    oss_url = _upload_to_oss(policy, audio_path)
    logger.info("[ASR] 已上传 OSS oss_url=%s", oss_url)

    # 2. 提交 ASR 任务
    task_id = _submit_asr_task([oss_url])
    logger.info("[ASR] 已提交任务 task_id=%s", task_id)

    # 3. 轮询结果
    output = _poll_task_result(task_id)
    results = output.get("results", [])
    if not results:
        raise RuntimeError("未获取到识别结果")

    first = results[0]
    if first.get("subtask_status") != "SUCCEEDED":
        raise RuntimeError(
            f"转写失败: {first.get('code', '')} {first.get('message', '')}"
        )

    transcription_url = first.get("transcription_url")
    if not transcription_url:
        raise RuntimeError("缺少 transcription_url")

    # 4. 获取转写 JSON
    transcript_data = _fetch_transcription(transcription_url)

    # 5. 保存到 Storage
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    out_path = STORAGE_DIR / f"{prefix}_asr.json"
    out_path.write_text(json.dumps(transcript_data, ensure_ascii=False, indent=2))
    text_preview = _extract_text_preview(transcript_data)
    logger.info("[ASR] 转写完成 out_path=%s text_preview=%r", out_path, text_preview[:80] if text_preview else "")

    return transcript_data, out_path


def _extract_text_preview(transcript_data: dict) -> str:
    texts = []
    for t in transcript_data.get("transcripts", []):
        texts.append(t.get("text", ""))
    return "".join(texts).strip()
