"""
百炼 Qwen3.5-Plus 对话服务
支持多轮对话，使用与 qwen_slots 相同的 API 格式。
"""
import json
import logging
import os

import requests

from config import DASHSCOPE_API_KEY, DASHSCOPE_BASE, DASHSCOPE_QWEN_MODEL

logger = logging.getLogger(__name__)

PROXY_ENV_KEYS = [
    "HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy",
    "ALL_PROXY", "all_proxy", "NO_PROXY", "no_proxy",
]

CHAT_SYSTEM_PROMPT = """你是一个友好、有帮助的 AI 助手。请用简洁自然的语言与用户对话。
回答要准确、有条理，适当使用段落和列表提升可读性。
如果用户询问位置相关（如见面地点、行程规划等），可以结合高德地图等工具思路给出建议。"""


def _clear_proxy_env() -> None:
    for key in PROXY_ENV_KEYS:
        os.environ.pop(key, None)


def chat(messages: list[dict], system_prompt: str = CHAT_SYSTEM_PROMPT) -> str:
    """
    调用 Qwen3.5-Plus 进行对话。

    :param messages: [{"role":"user"|"assistant"|"system", "content":"..."}, ...]
    :param system_prompt: 系统提示词，默认友好助手
    :return: 模型回复的文本
    """
    if not DASHSCOPE_API_KEY or DASHSCOPE_API_KEY == "your_api_key_here":
        raise ValueError("请在 .env 中配置有效的 DASHSCOPE_API_KEY")

    _clear_proxy_env()
    url = f"{DASHSCOPE_BASE}/api/v1/services/aigc/multimodal-generation/generation"
    headers = {
        "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
        "Content-Type": "application/json",
    }

    api_messages = [{"role": "system", "content": [{"text": system_prompt}]}]
    for m in messages:
        if m.get("role") == "system":
            continue
        api_messages.append({
            "role": m.get("role", "user"),
            "content": [{"text": m.get("content", "") or ""}],
        })

    payload = {
        "model": DASHSCOPE_QWEN_MODEL,
        "input": {"messages": api_messages},
        "parameters": {
            "result_format": "message",
            "temperature": 0.7,
            "max_tokens": 2048,
        },
    }
    logger.info("[Qwen Chat] 请求 messages_count=%d", len(api_messages))
    resp = requests.post(url, headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    data = resp.json()

    content_arr = (
        data.get("output", {})
        .get("choices", [{}])[0]
        .get("message", {})
        .get("content", [])
    )
    text = ""
    if content_arr and isinstance(content_arr[0], dict):
        text = content_arr[0].get("text", "")
    else:
        text = str(content_arr[0]) if content_arr else ""

    logger.info("[Qwen Chat] 回复长度=%d", len(text))
    return text.strip()
