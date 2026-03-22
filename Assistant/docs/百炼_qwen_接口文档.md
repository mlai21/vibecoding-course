# 百炼平台 Qwen3.5-Plus 接口文档

本文档整理自阿里云百炼 DashScope 官方规范，用于本项目调用 qwen3.5-plus 进行槽位提取等文本理解任务。

---

## 一、概述

- **模型**：`qwen3.5-plus`（通义千问 3.5 Plus）
- **类型**：多模态模型，支持纯文本、图像、视频输入
- **文本能力**：支持纯文本对话、JSON 格式输出、槽位提取等
- **鉴权**：`Authorization: Bearer {api-key}`（与 ASR 共用 DASHSCOPE_API_KEY）

---

## 二、调用端点

### 2.1 地域与 URL

| 地域     | 端点                                                                 |
|----------|----------------------------------------------------------------------|
| 中国内地 | `POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation` |
| 新加坡   | `POST https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation` |

### 2.2 与 text-generation 的区别

- **text-generation**：适用于 qwen-plus、qwen-turbo 等纯文本模型
- **multimodal-generation**：适用于 qwen3.5-plus、qwen3-vl-plus 等多模态模型
- qwen3.5-plus 必须使用 **multimodal-generation** 端点

---

## 三、请求格式

### 3.1 请求头

```http
Authorization: Bearer {api_key}
Content-Type: application/json
```

### 3.2 纯文本请求体

即使仅做文本理解，content 也需为数组形式：

```json
{
  "model": "qwen3.5-plus",
  "input": {
    "messages": [
      {
        "role": "system",
        "content": [{"text": "你是一个地址槽位提取助手..."}]
      },
      {
        "role": "user",
        "content": [{"text": "我在北京西单，朋友在国贸"}]
      }
    ]
  },
  "parameters": {
    "result_format": "message",
    "temperature": 0.1,
    "max_tokens": 512
  }
}
```

### 3.3 参数说明

| 参数            | 类型   | 必填 | 说明                                           |
|-----------------|--------|------|------------------------------------------------|
| model           | string | 是   | 固定为 `qwen3.5-plus`                          |
| input.messages  | array  | 是   | 对话消息，content 为 `[{"text": "..."}]`       |
| parameters.result_format | string | 否 | `message`（默认）或 `text`                     |
| parameters.temperature   | number | 否 | 采样温度，0–2                                  |
| parameters.max_tokens    | int    | 否 | 最大生成 token 数                              |

---

## 四、响应格式

### 4.1 非流式响应结构

```json
{
  "output": {
    "choices": [
      {
        "message": {
          "role": "assistant",
          "content": [
            {"text": "{\"my_location\": \"北京西单\", \"friend_location\": \"国贸\"}"}
          ]
        },
        "finish_reason": "stop"
      }
    ]
  },
  "usage": {
    "input_tokens": 100,
    "output_tokens": 50,
    "total_tokens": 150
  },
  "request_id": "xxx"
}
```

### 4.2 提取文本

- `output.choices[0].message.content` 为数组
- 取 `content[0].text` 即助手回复的文本
- 若要求 JSON 输出，需在 system 提示词中明确约定 schema，并在代码中 `json.loads(content[0].text)`

---

## 五、槽位提取示例

**System**：要求严格输出 `{"my_location": "...", "friend_location": "..."}` 格式的 JSON。

**User**：`我在北京西单，朋友在国贸`

**输出**：`{"my_location": "北京西单", "friend_location": "国贸"}`

---

## 六、参考资料

- [千问 API 参考 - DashScope](https://www.alibabacloud.com/help/zh/model-studio/qwen-api-via-dashscope)
- [千问 API 详情](https://help.aliyun.com/zh/dashscope/developer-reference/qwen-api-details)
