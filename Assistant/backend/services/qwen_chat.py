"""
百炼 Qwen3.5-Plus 对话服务
支持多轮对话，使用与 qwen_slots 相同的 API 格式。
"""
import json
import logging
import os
from pathlib import Path

import requests

from config import DASHSCOPE_API_KEY, DASHSCOPE_BASE, DASHSCOPE_QWEN_MODEL

logger = logging.getLogger(__name__)

PROXY_ENV_KEYS = [
    "HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy",
    "ALL_PROXY", "all_proxy", "NO_PROXY", "no_proxy",
]

_PROMPT_FILE = Path(__file__).resolve().parent.parent / "prompts" / "chat_system_prompt.md"
_DEFAULT_PROMPT = """你是一个友好、有帮助的 AI 助手。请用简洁自然的语言与用户对话。
回答要准确、有条理，适当使用段落和列表提升可读性。
如果用户询问位置相关（如见面地点、行程规划等），可以结合高德地图等工具思路给出建议。"""


def _load_system_prompt() -> str:
    """从 markdown 文件加载系统提示词，若文件不存在则使用默认值。"""
    if _PROMPT_FILE.exists():
        try:
            return _PROMPT_FILE.read_text(encoding="utf-8").strip()
        except Exception as e:
            logger.warning("[Qwen Chat] 加载提示词文件失败 %s: %s，使用默认提示词", _PROMPT_FILE, e)
    return _DEFAULT_PROMPT


CHAT_SYSTEM_PROMPT = _load_system_prompt()


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


INTEGRATE_MEETING_SYSTEM = """你是一个友好的相遇地点推荐助手。根据用户语音内容和高德地图返回的相遇地点推荐结果，整合成一段简洁自然的回复。
要求：
1. 用口语化、亲切的语气，直接对用户说话（如「根据您说的位置，我为您推荐...」）
2. 简要概括两个位置与中点，然后自然引出推荐地点
3. 推荐地点用列表形式，每条包含：名称、地址、距中点距离（如有）
4. 若有错误或无法解析的地址，用温和方式说明
5. 控制在一百五十字以内，适合语音播放
6. 不要输出 JSON、Markdown 或多余格式，只输出纯文本"""


def integrate_meeting_result(
    asr_text: str,
    slots: dict,
    meeting_result: dict,
    model: str | None = None,
) -> str:
    """
    将高德相遇地点推荐结果交给 Qwen3.5-flash 整合为自然语言输出。

    :param asr_text: ASR 转写的用户语音文本
    :param slots: 槽位提取结果 {"my_location": "...", "friend_location": "..."}
    :param meeting_result: 高德 get_meeting_suggestions 返回的结果
    :param model: 可选，默认使用 DASHSCOPE_QWEN_MODEL（如 qwen3.5-flash）
    :return: 整合后的自然语言文案
    """
    if not DASHSCOPE_API_KEY or DASHSCOPE_API_KEY == "your_api_key_here":
        raise ValueError("请在 .env 中配置有效的 DASHSCOPE_API_KEY")

    _clear_proxy_env()
    used_model = model or DASHSCOPE_QWEN_MODEL
    url = f"{DASHSCOPE_BASE}/api/v1/services/aigc/multimodal-generation/generation"
    headers = {
        "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
        "Content-Type": "application/json",
    }

    user_content = (
        f"用户语音内容：{asr_text}\n\n"
        f"槽位提取：{json.dumps(slots, ensure_ascii=False)}\n\n"
        f"高德相遇地点推荐结果：{json.dumps(meeting_result, ensure_ascii=False)}\n\n"
        "请根据以上信息整合成一段自然、适合语音播报的回复。"
    )

    payload = {
        "model": used_model,
        "input": {
            "messages": [
                {"role": "system", "content": [{"text": INTEGRATE_MEETING_SYSTEM}]},
                {"role": "user", "content": [{"text": user_content}]},
            ]
        },
        "parameters": {
            "result_format": "message",
            "temperature": 0.5,
            "max_tokens": 512,
        },
    }
    logger.info("[Qwen Integrate] 请求 model=%s", used_model)
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
        text = str(content_arr[0]) if content_arr else ""

    result = (text or "").strip()
    logger.info("[Qwen Integrate] 整合文案长度=%d", len(result))
    return result
