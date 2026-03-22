"""
百炼 Qwen3.5-Plus 槽位提取服务
从用户 Query 中提取「我的位置」和「朋友的位置」两个地址。
使用 HTTP 请求，不使用 SDK。
调用前清除代理环境变量。
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


def _clear_proxy_env() -> None:
    for key in PROXY_ENV_KEYS:
        os.environ.pop(key, None)


SLOT_EXTRACT_SYSTEM = """你是一个地址槽位提取助手。从用户描述中提取两个人的位置信息。
用户会描述「我」和「朋友」各自的位置（可能是地址、地标、商圈等）。
请严格按以下 JSON 格式输出，不要输出任何其他内容：
{
  "my_location": "我的位置（中文地址或地标，若无法识别填空字符串）",
  "friend_location": "朋友的位置（中文地址或地标，若无法识别填空字符串）"
}"""


def extract_locations(query: str) -> dict[str, str]:
    """
    从用户 Query 中提取两个地址槽位。

    :param query: 用户输入的文本，如「我在北京西单，朋友在国贸」
    :return: {"my_location": "...", "friend_location": "..."}
    """
    if not DASHSCOPE_API_KEY or DASHSCOPE_API_KEY == "your_api_key_here":
        raise ValueError("请在 .env 中配置有效的 DASHSCOPE_API_KEY")

    _clear_proxy_env()
    url = f"{DASHSCOPE_BASE}/api/v1/services/aigc/multimodal-generation/generation"
    headers = {
        "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": DASHSCOPE_QWEN_MODEL,
        "input": {
            "messages": [
                {"role": "system", "content": [{"text": SLOT_EXTRACT_SYSTEM}]},
                {"role": "user", "content": [{"text": query}]},
            ]
        },
        "parameters": {
            "result_format": "message",
            "temperature": 0.1,
            "max_tokens": 512,
        },
    }
    logger.info("[Qwen] 槽位提取请求 query=%r", query)
    resp = requests.post(url, headers=headers, json=payload, timeout=60)
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
        text = str(content_arr[0]) if content_arr else "{}"

    logger.info("[Qwen] 槽位提取原始输出 text=%r", text)

    result = json.loads(text)
    slots = {
        "my_location": result.get("my_location", "").strip() or "",
        "friend_location": result.get("friend_location", "").strip() or "",
    }
    logger.info("[Qwen] 槽位提取结果 slots=%s", slots)
    return slots
