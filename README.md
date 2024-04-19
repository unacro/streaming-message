# Streaming Message

## 介绍

一个基于 [SSE](https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events) 的消息流 API，用于通过 web 协议实时推送消息。（即 ChatGPT 前端交互的实现）

## 安装

```bash
$ git clone https://github.com/unacro/streaming-message.git
$ cd streaming-message
$ cp .env.example .env
$ bun install
$ bun run start

# or 使用其他 Node 环境
$ npm run start # 突然想起并不能 因为肆无忌惮地使用了 Bun 独有的特性 🤣
```

## 用法

### 网页客户端

发送端访问：
```
http://localhost:8000/admin
```

接收端访问：
```
http://localhost:8000/
```

在线预览 Demo：[`sse.osrp.run`](https://sse.osrp.run/)
发送端：[`sse.osrp.run/admin`](https://sse.osrp.run/admin)（临时 token 为 `whatever`）

### 命令行

```bash
# Linux Bash
export TMP_SSE_API="http://localhost:8000"
export TMP_SSE_TOKEN="your_super_secret_token_here"

# Windows PowerShell
$TMP_SSE_API="http://localhost:8000"
$TMP_SSE_TOKEN="your_super_secret_token_here"
```

#### 建立连接

```bash
curl -H Accept:text/event-stream "${TMP_SSE_API}/events"
```

#### 发送消息

GET API：
```bash
curl "${TMP_SSE_API}/api/send/otto?token=${TMP_SSE_TOKEN}&msg=冲！冲刺！"
```

POST API (verified by header)：
```bash
curl -X POST "$TMP_SSE_API/api/send" \
  -H "Authorization: Bearer ${TMP_SSE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"speaker":"♿饲猫棍哥♿","data":{"message":"那我缺的营养这一块谁给我补啊？",from:"curl POST API"},"meta":"custom"}' 
```

POST API (verified by body)：
```bash
curl -X POST "$TMP_SSE_API/api/send" \
  -H "Content-Type: application/json" \
  -d '{"token":"your_super_secret_token_here","speaker":"长期素食","data":{"message":"还追！还追！移速七百多还追！！！",from:"curl POST API"},"meta":"custom"}' 
```
