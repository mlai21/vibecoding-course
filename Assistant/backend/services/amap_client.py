"""
高德地图 Web 服务 API 客户端
用于地理编码、计算中点、周边 POI 搜索（相遇地点推荐）。
使用 HTTP 请求，不使用 SDK。
"""
import logging
import os
import time
from urllib.parse import urlencode

import requests

from config import AMAP_KEY

logger = logging.getLogger(__name__)

PROXY_ENV_KEYS = [
    "HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy",
    "ALL_PROXY", "all_proxy", "NO_PROXY", "no_proxy",
]


def _clear_proxy_env() -> None:
    for key in PROXY_ENV_KEYS:
        os.environ.pop(key, None)


def geocode(address: str, city: str = None) -> tuple[float, float] | None:
    """
    地理编码：将地址转为经纬度。

    :param address: 地址或地标，如「西单」「北京国贸」
    :param city: 可选，限定城市
    :return: (经度, 纬度) 或 None
    """
    if not AMAP_KEY or AMAP_KEY == "your_amap_key_here":
        raise ValueError("请在 .env 中配置有效的 AMAP_KEY")

    _clear_proxy_env()
    params = {"key": AMAP_KEY, "address": address}
    if city:
        params["city"] = city
    url = f"https://restapi.amap.com/v3/geocode/geo?{urlencode(params)}"
    logger.debug("[Amap] 地理编码 request address=%r", address)
    t0 = time.perf_counter()
    resp = requests.get(url, timeout=10)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    logger.info("[Amap] 地理编码耗时 %.0fms address=%r", elapsed_ms, address)
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "1" or not data.get("geocodes"):
        logger.warning("[Amap] 地理编码失败 address=%r status=%s", address, data.get("status"))
        return None
    loc = data["geocodes"][0].get("location", "")
    if not loc:
        return None
    parts = loc.split(",")
    if len(parts) != 2:
        return None
    return float(parts[0]), float(parts[1])


def search_around(lon: float, lat: float, keywords: str = "咖啡|餐厅|商场", radius: int = 3000) -> list[dict]:
    """
    周边搜索：在指定经纬度附近搜索 POI。

    :param lon: 经度
    :param lat: 纬度
    :param keywords: 搜索关键词，多个用 | 分隔
    :param radius: 搜索半径（米）
    :return: POI 列表 [{"name": "...", "address": "...", "location": "lon,lat", "distance": "..."}, ...]
    """
    if not AMAP_KEY or AMAP_KEY == "your_amap_key_here":
        raise ValueError("请在 .env 中配置有效的 AMAP_KEY")

    _clear_proxy_env()
    params = {
        "key": AMAP_KEY,
        "location": f"{lon},{lat}",
        "keywords": keywords,
        "radius": radius,
        "offset": 10,
    }
    url = f"https://restapi.amap.com/v3/place/around?{urlencode(params)}"
    t0 = time.perf_counter()
    resp = requests.get(url, timeout=10)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    logger.info("[Amap] 周边搜索耗时 %.0fms location=(%.4f, %.4f)", elapsed_ms, lon, lat)
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "1" or "pois" not in data:
        return []
    pois = []
    for p in data.get("pois", []):
        pois.append({
            "name": p.get("name", ""),
            "address": p.get("address", ""),
            "location": p.get("location", ""),
            "distance": p.get("distance", ""),
            "type": p.get("type", ""),
        })
    return pois


# 常见城市名，用于从地址中推断城市（限定地理编码范围，避免「国贸」等歧义地址匹配到错误城市）
_CITY_NAMES = ("北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "西安", "南京", "苏州", "天津", "重庆", "长沙", "青岛", "厦门", "宁波", "东莞", "佛山", "沈阳", "大连", "济南", "郑州", "哈尔滨", "昆明", "南宁", "福州", "石家庄", "南昌", "长春", "贵阳", "太原", "乌鲁木齐", "兰州", "银川", "海口", "拉萨", "呼和浩特")


def _extract_city(address: str) -> str | None:
    """从地址字符串中提取城市名。"""
    if not address:
        return None
    for city in _CITY_NAMES:
        if city in address:
            return city
    return None


def get_meeting_suggestions(my_location: str, friend_location: str) -> dict:
    """
    根据两个地址，计算中点并推荐周边见面地点。

    :param my_location: 我的位置（地址/地标）
    :param friend_location: 朋友的位置
    :return: {
        "my_coords": [lon, lat] | None,
        "friend_coords": [lon, lat] | None,
        "midpoint": {"lon": x, "lat": y} | None,
        "suggestions": [{"name": "...", "address": "...", ...}],
        "errors": [str]
    }
    """
    result = {
        "my_coords": None,
        "friend_coords": None,
        "midpoint": None,
        "suggestions": [],
        "errors": [],
    }

    # 推断城市：若任一方地址含城市名，用该城市限定地理编码，避免「国贸」等匹配到错误城市
    city_hint = _extract_city(my_location) or _extract_city(friend_location)

    t_total = time.perf_counter()
    coord1 = geocode(my_location, city=city_hint)
    coord2 = geocode(friend_location, city=city_hint)

    if not coord1:
        result["errors"].append(f"无法解析「我的位置」: {my_location}")
        logger.warning("[Amap] 地理编码失败 my_location=%r", my_location)
    else:
        result["my_coords"] = list(coord1)
        logger.info("[Amap] 我的位置 geocode my_location=%r -> %s", my_location, coord1)

    if not coord2:
        result["errors"].append(f"无法解析「朋友的位置」: {friend_location}")
        logger.warning("[Amap] 地理编码失败 friend_location=%r", friend_location)
    else:
        result["friend_coords"] = list(coord2)
        logger.info("[Amap] 朋友位置 geocode friend_location=%r -> %s", friend_location, coord2)

    if not coord1 or not coord2:
        return result

    lon1, lat1 = coord1
    lon2, lat2 = coord2
    mid_lon = (lon1 + lon2) / 2
    mid_lat = (lat1 + lat2) / 2
    result["midpoint"] = {"lon": mid_lon, "lat": mid_lat}

    logger.info("[Amap] 计算中点 mid=(%.4f, %.4f) 开始周边搜索", mid_lon, mid_lat)
    suggestions = search_around(mid_lon, mid_lat)
    result["suggestions"] = suggestions[:5]  # 最多 5 条
    total_ms = (time.perf_counter() - t_total) * 1000
    logger.info(
        "[Amap] 相遇地点推荐全链路耗时 %.0fms suggestions_count=%d names=%s",
        total_ms,
        len(result["suggestions"]),
        [s["name"] for s in result["suggestions"]],
    )
    return result
