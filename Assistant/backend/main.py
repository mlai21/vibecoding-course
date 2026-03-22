"""相遇地点助手 - 后端服务"""
import json
import logging
import os
import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

from chat_store import (
    create_conversation,
    get_conversation,
    init_db,
    list_conversations,
    list_messages,
    rename_conversation,
    soft_delete_conversation,
    add_message,
    try_auto_title,
)
from config import PORT, STORAGE_DIR

_log_level = getattr(logging, os.environ.get("LOG_LEVEL", "INFO").upper(), logging.INFO)
logging.basicConfig(
    level=_log_level,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="相遇地点助手")


class ChatMessage(BaseModel):
    role: str = Field(..., description="user | assistant | system")
    content: str = Field(..., description="消息内容")


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., description="对话历史")


class CreateConversationRequest(BaseModel):
    title: str | None = Field(default=None, max_length=120, description="会话标题，可选")


class UpdateConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120, description="新的会话标题")


class CreateConversationMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=8000, description="用户输入文本")


def ensure_storage_dir() -> Path:
    """确保 Storage 目录存在"""
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    return STORAGE_DIR


def _extract_text_from_transcript(transcript_data: dict) -> str:
    """从 ASR 转写结果中提取完整文本"""
    texts = []
    for t in transcript_data.get("transcripts", []):
        texts.append(t.get("text", ""))
    return "".join(texts).strip()


@app.on_event("startup")
def startup_event() -> None:
    ensure_storage_dir()
    init_db()
    logger.info("[Startup] 初始化完成 storage=%s", STORAGE_DIR)


def _normalize_text(value: str) -> str:
    return (value or "").strip()


@app.post("/conversations")
async def create_conversation_endpoint(req: CreateConversationRequest | None = None):
    title = req.title if req else None
    conversation = create_conversation(title=title)
    return {"ok": True, "conversation": conversation}


@app.get("/conversations")
async def list_conversations_endpoint(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    items = list_conversations(limit=limit, offset=offset)
    return {"ok": True, "items": items}


@app.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages_endpoint(conversation_id: str):
    conversation = get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="会话不存在或已删除")
    items = list_messages(conversation_id)
    return {"ok": True, "conversation": conversation, "items": items}


@app.post("/conversations/{conversation_id}/messages")
async def create_conversation_message_endpoint(
    conversation_id: str,
    req: CreateConversationMessageRequest,
):
    conversation = get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="会话不存在或已删除")

    user_text = _normalize_text(req.content)
    if not user_text:
        raise HTTPException(status_code=400, detail="消息内容不能为空")

    user_message = add_message(conversation_id=conversation_id, role="user", content=user_text)
    try_auto_title(conversation_id)

    try:
        from services.qwen_chat import chat

        history = list_messages(conversation_id)
        model_messages = [{"role": m["role"], "content": m["content"]} for m in history]
        reply = chat(model_messages)
        assistant_text = _normalize_text(reply) or "抱歉，我暂时无法给出有效回复。"
    except ValueError as e:
        logger.error("[Chat] 配置错误: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("[Chat] 对话失败: %s", e)
        raise HTTPException(status_code=500, detail=f"对话失败: {str(e)}")

    assistant_message = add_message(conversation_id=conversation_id, role="assistant", content=assistant_text)
    updated_conversation = get_conversation(conversation_id)
    return {
        "ok": True,
        "conversation": updated_conversation,
        "user_message": user_message,
        "assistant_message": assistant_message,
    }


@app.patch("/conversations/{conversation_id}")
async def update_conversation_endpoint(conversation_id: str, req: UpdateConversationRequest):
    title = _normalize_text(req.title)
    if not title:
        raise HTTPException(status_code=400, detail="标题不能为空")

    conversation = rename_conversation(conversation_id, title)
    if not conversation:
        raise HTTPException(status_code=404, detail="会话不存在或已删除")
    return {"ok": True, "conversation": conversation}


@app.delete("/conversations/{conversation_id}")
async def delete_conversation_endpoint(conversation_id: str):
    success = soft_delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="会话不存在或已删除")
    return {"ok": True}


@app.post("/process-voice")
async def process_voice(audio: UploadFile = File(...)):
    """
    接收前端上传的音频文件，保存到 Storage；
    调用百炼 ASR 转写 -> Qwen3.5-Plus 槽位提取 -> 高德相遇地点推荐；
    各环节结果均保存到 Storage。
    """
    logger.info("[Process] 收到音频上传请求")
    if not audio.filename and not audio.content_type:
        raise HTTPException(status_code=400, detail="请上传音频文件")

    ext = Path(audio.filename or "audio").suffix or ".webm"
    filename = f"{uuid.uuid4().hex}{ext}"
    storage = ensure_storage_dir()
    filepath = storage / filename

    try:
        content = await audio.read()
        filepath.write_bytes(content)
    except Exception as e:
        logger.exception("[Process] 保存音频失败")
        raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")

    logger.info("[Process] 音频已保存 filepath=%s size=%d", filepath, len(content))

    prefix = filepath.stem
    asr_text = ""
    asr_path = None
    slots = {}
    slots_path = None
    meeting_result = {}
    meeting_path = None

    # 1. ASR 转写
    try:
        from services.bailian_asr import transcribe_and_save

        transcript_data, asr_path = transcribe_and_save(filepath, output_prefix=prefix)
        asr_text = _extract_text_from_transcript(transcript_data)
        logger.info("[ASR] 转写完成 asr_text=%r asr_path=%s", asr_text, asr_path)
    except ValueError as e:
        logger.error("[ASR] 配置错误: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("[ASR] 转写失败: %s", e)
        raise HTTPException(status_code=500, detail=f"ASR 转写失败: {str(e)}")

    if not asr_text:
        logger.warning("[Process] ASR 未识别到有效文本")
        return {
            "message": "音频已保存，ASR 未识别到有效文本",
            "saved": True,
            "filename": filename,
            "path": str(filepath),
            "asr_text": "",
            "asr_path": str(asr_path) if asr_path else None,
            "slots": {},
            "meeting": {},
        }

    # 2. Qwen3.5-Plus 槽位提取
    try:
        from services.qwen_slots import extract_locations

        slots = extract_locations(asr_text)
        slots_path = storage / f"{prefix}_slots.json"
        slots_path.write_text(json.dumps(slots, ensure_ascii=False, indent=2))
        logger.info("[Slots] 槽位提取完成 slots=%s slots_path=%s", slots, slots_path)
    except ValueError as e:
        logger.error("[Slots] 配置错误: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("[Slots] 槽位提取失败: %s", e)
        raise HTTPException(status_code=500, detail=f"槽位提取失败: {str(e)}")

    my_loc = slots.get("my_location", "")
    friend_loc = slots.get("friend_location", "")

    if not my_loc or not friend_loc:
        logger.warning("[Process] 槽位不完整 my_loc=%r friend_loc=%r", my_loc, friend_loc)
        return {
            "message": "槽位提取完成，但未能识别出两个有效地址",
            "saved": True,
            "filename": filename,
            "path": str(filepath),
            "asr_text": asr_text,
            "asr_path": str(asr_path) if asr_path else None,
            "slots": slots,
            "slots_path": str(slots_path) if slots_path else None,
            "meeting": {},
        }

    # 3. 高德相遇地点推荐
    try:
        from services.amap_client import get_meeting_suggestions

        meeting_result = get_meeting_suggestions(my_loc, friend_loc)
        meeting_path = storage / f"{prefix}_meeting.json"
        meeting_path.write_text(json.dumps(meeting_result, ensure_ascii=False, indent=2))
        logger.info(
            "[Amap] 相遇地点推荐完成 suggestions_count=%d meeting_path=%s",
            len(meeting_result.get("suggestions", [])),
            meeting_path,
        )
    except ValueError as e:
        logger.error("[Amap] 配置错误: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("[Amap] 高德接口调用失败: %s", e)
        raise HTTPException(status_code=500, detail=f"高德接口调用失败: {str(e)}")

    logger.info("[Process] 全流程完成 filename=%s", filename)
    has_suggestions = bool(meeting_result.get("suggestions"))
    return {
        "message": "音频已保存，ASR 转写完成，已推荐相遇地点" if has_suggestions else "音频已保存，ASR 转写完成，但未能找到附近见面地点（可能是地理编码或周边无 POI）",
        "saved": True,
        "filename": filename,
        "path": str(filepath),
        "asr_text": asr_text,
        "asr_path": str(asr_path) if asr_path else None,
        "slots": slots,
        "slots_path": str(slots_path) if slots_path else None,
        "meeting": meeting_result,
        "meeting_path": str(meeting_path) if meeting_path else None,
    }


@app.post("/asr")
async def asr_only(audio: UploadFile = File(...)):
    """
    仅做 ASR 转写，返回转写文本。供聊天界面语音输入使用。
    """
    logger.info("[ASR] 收到音频上传请求")
    if not audio.filename and not audio.content_type:
        raise HTTPException(status_code=400, detail="请上传音频文件")

    ext = Path(audio.filename or "audio").suffix or ".webm"
    filename = f"{uuid.uuid4().hex}{ext}"
    storage = ensure_storage_dir()
    filepath = storage / filename

    try:
        content = await audio.read()
        filepath.write_bytes(content)
    except Exception as e:
        logger.exception("[ASR] 保存音频失败")
        raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")

    prefix = filepath.stem
    try:
        from services.bailian_asr import transcribe_and_save

        transcript_data, asr_path = transcribe_and_save(filepath, output_prefix=prefix)
        asr_text = _extract_text_from_transcript(transcript_data)
        logger.info("[ASR] 转写完成 asr_text=%r", asr_text)
        return {"text": asr_text, "ok": True}
    except ValueError as e:
        logger.error("[ASR] 配置错误: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("[ASR] 转写失败: %s", e)
        raise HTTPException(status_code=500, detail=f"ASR 转写失败: {str(e)}")


@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    """
    与 AI 助手对话，使用 Qwen3.5-Plus 模型。
    """
    logger.info("[Chat] 收到对话请求 messages_count=%d", len(req.messages))
    try:
        from services.qwen_chat import chat

        messages = [{"role": m.role, "content": m.content} for m in req.messages]
        reply = chat(messages)
        return {"reply": reply, "ok": True}
    except ValueError as e:
        logger.error("[Chat] 配置错误: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("[Chat] 对话失败: %s", e)
        raise HTTPException(status_code=500, detail=f"对话失败: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
