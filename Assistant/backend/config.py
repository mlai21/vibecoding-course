"""从 .env 加载配置，不从系统环境变量读取"""
import os
from pathlib import Path

from dotenv import load_dotenv

# 明确指定 .env 路径，确保只读本项目配置
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_env_path)

# 服务端口（dotenv 会将 .env 载入 os.environ）
PORT = int(os.environ.get("PORT", "8081"))

# 项目根目录（backend 所在目录）
BASE_DIR = Path(__file__).resolve().parent

# 音频存储目录
STORAGE_DIR_NAME = os.environ.get("STORAGE_DIR", "Storage")
STORAGE_DIR = BASE_DIR / STORAGE_DIR_NAME

# 百炼平台配置
DASHSCOPE_API_KEY = os.environ.get("DASHSCOPE_API_KEY", "")
DASHSCOPE_ASR_MODEL = os.environ.get("DASHSCOPE_ASR_MODEL", "fun-asr")
DASHSCOPE_REGION = os.environ.get("DASHSCOPE_REGION", "cn")

# 百炼 API 基础域名
DASHSCOPE_BASE = (
    "https://dashscope.aliyuncs.com"
    if DASHSCOPE_REGION == "cn"
    else "https://dashscope-intl.aliyuncs.com"
)

# 百炼 Qwen 槽位提取模型
DASHSCOPE_QWEN_MODEL = os.environ.get("DASHSCOPE_QWEN_MODEL", "qwen3.5-plus")

# 高德地图配置
AMAP_KEY = os.environ.get("AMAP_KEY", "")
