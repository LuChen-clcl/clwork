# TapShow

TapShow 是一个围绕「拍照定格 + 手绘草图 + AI 生成贴图 + 实时视频挂载预览」构建的本地 H5 原型。

它的核心体验不是传统滤镜，而是让用户先拍一帧、再画一个简单草图，最后把 AI 生成的创意贴图直接挂回实时视频画面里。

![TapShow 封面](./docs/tapshow-cover.png)

## Demo

![TapShow Demo](./docs/tapshow-demo.gif)

## 功能概览

### 单人创作

- 打开页面后自动请求摄像头权限
- 点击 `拍照` 冻结当前画面
- 直接在底图上画草图
- 调用生图模型生成 3 张候选贴图
- 将贴图实时挂载到视频预览
- 支持保存贴图、模板、照片

### 双人互动

- 创建房间或加入房间
- 发送自己的当前画面给对方
- 拉取对方冻结帧后进行涂鸦
- 给对方生成候选贴图并发送
- 对方收到后可直接挂载到本地视频预览

### 资产库

- 浏览模板
- 浏览已保存贴图和照片资产

## 使用流程

### 单人模式

1. 打开页面并允许摄像头权限
2. 点击 `拍照`
3. 在画面上直接画草图
4. 点击 `生成贴图`
5. 从候选结果里选择一张
6. 在右侧实时视频中查看挂载效果
7. 需要时保存贴图、模板或照片

### 双人模式

1. 一台设备创建房间
2. 另一台设备加入房间
3. 任一方发送自己的当前画面
4. 对方拉取画面并进行草图标注
5. 点击生成并选择候选贴图
6. 将当前候选发送给对方
7. 对方在自己的视频预览中查看挂载结果

## 运行环境

- Python 3.10+
- 支持摄像头权限的现代浏览器
- 如果要测试双人模式，建议两台设备位于同一局域网，并通过 HTTPS 地址访问

## 快速开始

### 1. 配置 API Key

项目不会再从 `model_config.json` 读取敏感密钥。

你可以用以下任一方式配置生图 `API Key`：

方式一：在项目根目录创建 `.ark_api_key`

```text
ark-xxxx
```

方式二：使用环境变量

```bash
export ARK_API_KEY=ark-xxxx
```

可参考示例文件：

- `.ark_api_key.example`

### 2. 检查模型配置

非敏感配置放在 `model_config.json`，例如：

```json
{
  "base_url": "https://ark.cn-beijing.volces.com/api/v3/images/generations",
  "model": "doubao-seedream-5-0-260128"
}
```

### 3. 启动项目

```bash
python3 app.py
```

启动后默认会同时开启：

- HTTP: `http://127.0.0.1:8000`
- HTTPS: `https://127.0.0.1:8443`
- WS: `ws://127.0.0.1:8765`
- WSS: `wss://127.0.0.1:8766`

如果要在局域网内给其他设备访问，使用本机局域网 IP 对应的 HTTPS 地址。

## 项目结构

```text
TapShownew/
├─ app.py
├─ bg_remove.py
├─ model_config.json
├─ .ark_api_key.example
├─ static/
│  ├─ index.html
│  ├─ app.js
│  └─ styles.css
├─ docs/
│  ├─ tapshow-cover.png
│  └─ tapshow-demo.gif
├─ data/
└─ certs/
```

## 技术栈

- 前端：原生 HTML / CSS / JavaScript
- 后端：Python 标准库 HTTP Server
- 实时能力：WebSocket / 局域网互动链路
- 视觉跟踪：MediaPipe Face Landmarker
- 数据存储：本地 JSON 文件

## 注意事项

- `.ark_api_key` 属于本地私密文件，不要提交到仓库
- `model_config.json` 只建议放非敏感配置
- 首次打开页面如果看不到画面，先确认浏览器是否拦截了摄像头权限
- 双人模式下如果设备无法互联，优先检查是否使用了同一个 HTTPS 局域网地址

## 当前状态

这是一个可运行的原型工程，适合演示完整创作链路与局域网互动能力。

当前重点包括：

- 单人生成链路可运行
- 双人互动主流程已接通
- 贴图挂载与资产保存可用
