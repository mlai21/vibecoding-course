"""
DeepSeek 槽位提取服务
从用户 Query 中提取「我的位置」和「朋友的位置」两个地址。
使用 HTTP 请求，不使用 SDK。
调用前清除代理环境变量。
"""
import json
import os

import requests

from config import DEEPSEEK_API_KEY, DEEPSEEK_MODEL

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
    if not DEEPSEEK_API_KEY or DEEPSEEK_API_KEY == "your_deepseek_api_key_here":
        raise ValueError("请在 .env 中配置有效的 DEEPSEEK_API_KEY")

    _clear_proxy_env()
    url = "https://api.deepseek.com/chat/completions"
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": SLOT_EXTRACT_SYSTEM},
            {"role": "user", "content": query},
        ],
        "temperature": 0.1,
        "max_tokens": 512,
        "response_format": {"type": "json_object"},
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
    result = json.loads(content)
    return {
        "my_location": result.get("my_location", "").strip() or "",
        "friend_location": result.get("friend_location", "").strip() or "",
    }
