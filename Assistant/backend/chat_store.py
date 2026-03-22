"""聊天会话与消息的 SQLite 持久层。"""
from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from config import CHAT_DB_PATH

DEFAULT_TITLE = "新对话"


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(CHAT_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def _row_to_dict(row: sqlite3.Row | None) -> dict | None:
    if row is None:
        return None
    return dict(row)


def _normalize_title(title: str) -> str:
    normalized = " ".join(title.split()).strip()
    return normalized if normalized else DEFAULT_TITLE


def _generate_auto_title(content: str, max_len: int = 24) -> str:
    text = " ".join(content.split()).strip()
    if not text:
        return DEFAULT_TITLE
    if len(text) <= max_len:
        return text
    return f"{text[:max_len]}…"


def init_db() -> None:
    """初始化 SQLite 表结构与索引。"""
    Path(CHAT_DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                auto_title INTEGER NOT NULL DEFAULT 1 CHECK(auto_title IN (0, 1)),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_message_at TEXT NOT NULL,
                deleted_at TEXT
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
            ON conversations(last_message_at DESC);

            CREATE INDEX IF NOT EXISTS idx_conversations_deleted_at
            ON conversations(deleted_at);

            CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
            ON messages(conversation_id, created_at);
            """
        )
        conn.commit()


def create_conversation(title: str | None = None) -> dict:
    now = _utc_now()
    conversation_id = uuid.uuid4().hex
    use_title = _normalize_title(title or DEFAULT_TITLE)
    auto_title = 0 if title and title.strip() else 1

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO conversations (
                id, title, auto_title, created_at, updated_at, last_message_at, deleted_at
            )
            VALUES (?, ?, ?, ?, ?, ?, NULL)
            """,
            (conversation_id, use_title, auto_title, now, now, now),
        )
        conn.commit()

    return get_conversation(conversation_id)


def get_conversation(conversation_id: str, include_deleted: bool = False) -> dict | None:
    where_deleted = "" if include_deleted else "AND deleted_at IS NULL"
    with _connect() as conn:
        row = conn.execute(
            f"""
            SELECT id, title, auto_title, created_at, updated_at, last_message_at, deleted_at
            FROM conversations
            WHERE id = ? {where_deleted}
            LIMIT 1
            """,
            (conversation_id,),
        ).fetchone()
    return _row_to_dict(row)


def list_conversations(limit: int = 50, offset: int = 0) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT
                c.id,
                c.title,
                c.auto_title,
                c.created_at,
                c.updated_at,
                c.last_message_at,
                c.deleted_at,
                (
                    SELECT m.content
                    FROM messages m
                    WHERE m.conversation_id = c.id
                    ORDER BY m.created_at DESC
                    LIMIT 1
                ) AS preview
            FROM conversations c
            WHERE c.deleted_at IS NULL
            ORDER BY c.last_message_at DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        ).fetchall()
    return [dict(row) for row in rows]


def list_messages(conversation_id: str) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, conversation_id, role, content, created_at
            FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
            """,
            (conversation_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def add_message(conversation_id: str, role: str, content: str) -> dict:
    now = _utc_now()
    message_id = uuid.uuid4().hex
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO messages (id, conversation_id, role, content, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (message_id, conversation_id, role, content, now),
        )
        conn.execute(
            """
            UPDATE conversations
            SET updated_at = ?, last_message_at = ?
            WHERE id = ?
            """,
            (now, now, conversation_id),
        )
        conn.commit()

        row = conn.execute(
            """
            SELECT id, conversation_id, role, content, created_at
            FROM messages
            WHERE id = ?
            LIMIT 1
            """,
            (message_id,),
        ).fetchone()
    return dict(row)


def try_auto_title(conversation_id: str) -> dict | None:
    """
    如果仍为默认自动标题且仅有 1 条用户消息，则自动生成标题。
    返回更新后的会话；如果无需更新则返回 None。
    """
    now = _utc_now()
    with _connect() as conn:
        convo = conn.execute(
            """
            SELECT id, title, auto_title
            FROM conversations
            WHERE id = ? AND deleted_at IS NULL
            LIMIT 1
            """,
            (conversation_id,),
        ).fetchone()
        if not convo or convo["auto_title"] != 1:
            return None

        user_count = conn.execute(
            """
            SELECT COUNT(1)
            FROM messages
            WHERE conversation_id = ? AND role = 'user'
            """,
            (conversation_id,),
        ).fetchone()[0]
        if user_count != 1:
            return None

        first_user_row = conn.execute(
            """
            SELECT content
            FROM messages
            WHERE conversation_id = ? AND role = 'user'
            ORDER BY created_at ASC
            LIMIT 1
            """,
            (conversation_id,),
        ).fetchone()
        if not first_user_row:
            return None

        title = _generate_auto_title(first_user_row["content"])
        conn.execute(
            """
            UPDATE conversations
            SET title = ?, updated_at = ?
            WHERE id = ?
            """,
            (title, now, conversation_id),
        )
        conn.commit()

        row = conn.execute(
            """
            SELECT id, title, auto_title, created_at, updated_at, last_message_at, deleted_at
            FROM conversations
            WHERE id = ?
            LIMIT 1
            """,
            (conversation_id,),
        ).fetchone()
    return dict(row)


def rename_conversation(conversation_id: str, title: str) -> dict | None:
    now = _utc_now()
    normalized = _normalize_title(title)
    with _connect() as conn:
        result = conn.execute(
            """
            UPDATE conversations
            SET title = ?, auto_title = 0, updated_at = ?
            WHERE id = ? AND deleted_at IS NULL
            """,
            (normalized, now, conversation_id),
        )
        conn.commit()
        if result.rowcount == 0:
            return None

        row = conn.execute(
            """
            SELECT id, title, auto_title, created_at, updated_at, last_message_at, deleted_at
            FROM conversations
            WHERE id = ?
            LIMIT 1
            """,
            (conversation_id,),
        ).fetchone()
    return dict(row)


def soft_delete_conversation(conversation_id: str) -> bool:
    now = _utc_now()
    with _connect() as conn:
        result = conn.execute(
            """
            UPDATE conversations
            SET deleted_at = ?, updated_at = ?
            WHERE id = ? AND deleted_at IS NULL
            """,
            (now, now, conversation_id),
        )
        conn.commit()
    return result.rowcount > 0
