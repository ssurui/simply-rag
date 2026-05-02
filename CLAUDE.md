# CLAUDE.md — 项目约定与开发指南

本文件供 Claude Code 在协助开发此项目时参考。所有文档、注释、提交信息均使用中文。

## 项目概述

Simple RAG 是一个本地化 RAG 问答系统，提供三种实现方案：

- **use_ChromaDB**：Python + ChromaDB + Ollama，命令行和 Gradio Web 界面
- **use_pgvector**：Python + PostgreSQL pgvector + Ollama，Gradio Web 界面
- **web_app**：TypeScript + Electron + Vue3 + LanceDB + Ollama，跨平台桌面应用

所有方案的嵌入模型统一使用 `bge-m3`，生成模型统一使用 `qwen3:8b`，均通过本地 Ollama 服务调用（端口 11434）。

## 技术栈

### Python 方案（use_ChromaDB / use_pgvector）

- **Python 版本**：3.10+，使用虚拟环境 `.venv`
- **向量数据库**：ChromaDB（内嵌）或 PostgreSQL + pgvector
- **嵌入模型**：bge-m3（Ollama HTTP API `/api/embed`）
- **生成模型**：qwen3:8b（Ollama HTTP API `/api/chat`，流式）
- **Web 框架**：Gradio 6.x
- **数据库驱动**：psycopg（psycopg3，仅 pgvector 方案）

### Electron 桌面应用（web_app）

- **框架**：Electron + electron-vite + Vue3 + TypeScript
- **UI 组件库**：Naive UI
- **状态管理**：Pinia
- **向量数据库**：LanceDB（`@lancedb/lancedb`，嵌入式，无需服务）
- **文档分块**：自实现递归字符分块（已移除 `@langchain/textsplitters`，避免打包依赖问题）
- **Markdown 渲染**：`marked`
- **打包**：electron-builder（支持 macOS / Windows / Linux）

## 文件说明

```
src/use_ChromaDB/
    main.py           # 命令行入口（index / query / run 子命令）
    simple_ui.py      # Gradio Web 界面
    loader.py         # 文档加载与分块（LangChain CharacterTextSplitter 500字符）
    embedder.py       # Ollama bge-m3 向量化（HTTP POST /api/embed）
    vectorstore.py    # ChromaDB 操作（余弦距离）
    retriever.py      # 检索协调器
    generator.py      # Ollama qwen3:8b 流式生成（处理 <think> 标签）

src/use_pgvector/
    simple.py         # 文档入库 + query_by_vector() 函数
    rag_ui.py         # Gradio Web 界面

src/web_app/src/
    main/
        index.ts          # Electron 主进程入口，创建 BrowserWindow
        config.ts         # 读写 config.json（存于 userData 目录）
        ipc/
            index.ts          # 注册所有 IPC 处理器
            indexHandler.ts   # 文件选择、文档入库（分块→向量化→写入LanceDB）
            queryHandler.ts   # 查询（向量化→检索→流式生成）
            statusHandler.ts  # 数据库状态、配置读写
        rag/
            splitter.ts       # 递归收集 .md 文件，自实现递归字符分块（chunkSize/chunkOverlap）
            embedder.ts       # Ollama /api/embed 调用
            generator.ts      # Ollama /api/chat 流式调用
        db/
            lancedb.ts        # LanceDB 连接、建表、写入、余弦检索
    preload/
        index.ts          # contextBridge 暴露 electronAPI（使用 removeAllListeners 防监听累加）
    renderer/src/
        App.vue           # 布局（需 NMessageProvider 作为根）
        components/
            IndexPanel.vue    # 文档入库面板
            ChatPanel.vue     # 问答面板（显示问题 + Markdown 渲染答案）
            ContextDrawer.vue # 检索片段抽屉
            SettingsModal.vue # 配置弹窗（嵌入/生成服务地址分别配置）
        stores/rag.ts     # Pinia store（dbStatus / indexing / querying / chunks / config）
        types/index.ts    # TypeScript 接口定义 + Window.electronAPI 类型声明
```

## 关键约定

### AppConfig 结构

```typescript
interface AppConfig {
  embed: { baseUrl: string; model: string }   // 嵌入模型服务（可独立配置）
  chat:  { baseUrl: string; model: string }   // 生成模型服务（可独立配置）
  rag:   { chunkSize: number; chunkOverlap: number; topK: number; systemPrompt: string }
}
```

配置存储于 `userData/config.json`，兼容旧格式（`ollama.baseUrl`）自动迁移。

### IPC 通信

- 主进程 → 渲染进程：`getWin()?.webContents.send(channel, data)`
- 渲染进程 → 主进程：`ipcRenderer.invoke(channel, payload)`（返回 Promise）
- 流式事件频道：`index:progress`、`index:done`、`index:error`、`query:context`、`query:delta`、`query:done`、`query:error`
- preload 的 `on/off` 使用 `removeAllListeners` 而非 `removeListener`，避免 HMR 后监听器累加导致重复触发
- `registerIpcHandlers` 在 `app.whenReady()` 中只调用一次（不在 `createWindow` 里），避免 macOS 关闭窗口后重新激活时重复注册报错
- 各 handler 通过 `() => mainWindow` getter 访问窗口，确保窗口重建后引用仍有效

### Vue Proxy 与 IPC

通过 IPC 传递 Vue 响应式数据时，必须先转为普通对象/数组：

```typescript
// 错误：selectedPaths.value 是 Proxy，无法被结构化克隆
window.electronAPI.indexDocuments({ paths: selectedPaths.value, mode })

// 正确
window.electronAPI.indexDocuments({ paths: [...selectedPaths.value], mode })
```

### LanceDB 原生模块

`@lancedb/lancedb` 包含原生二进制，打包时需配置 `asarUnpack`：

```typescript
// electron-builder.config.ts
asarUnpack: ['node_modules/@lancedb/**', 'node_modules/apache-arrow/**']
```

### pgvector 相似度计算

```sql
SELECT content, -(embedding <#> %s) AS positive_similarity
FROM simple_rag
ORDER BY positive_similarity DESC
LIMIT %s
```

负内积 `<#>` 在归一化向量下等价于余弦相似度。

## 开发规范

### Python 依赖

始终使用虚拟环境安装：

```bash
source .venv/bin/activate
pip install 包名
```

### Electron 开发

```bash
cd src/web_app
npm run dev      # 开发模式（主进程变更需重启，渲染进程支持 HMR）
```

主进程代码修改后需要完整重启 `npm run dev`，渲染进程（Vue 组件）修改后 HMR 自动生效。

退出后若终端显示异常（括号粘贴模式残留），运行：

```bash
printf '\e[?2004l'; stty sane
```

### 图标

应用图标存放于 `src/web_app/resources/`：
- `icon.icns`：macOS 专用（含 16~1024 各尺寸）
- `icon.png`：Windows / Linux 通用（1024×1024）
- `src/renderer/public/icon.png`：界面标题栏展示用

### 修改 Prompt

系统提示词默认值在 `ChatPanel.vue` 的 `DEFAULT_SYSTEM_PROMPT` 常量中，用户也可在界面上实时修改。核心约束"只能依据上下文回答"不得删除。

## 注意事项

- Ollama 服务必须在本地 11434 端口运行，且已拉取 `bge-m3` 和 `qwen3:8b` 模型
- `docs/` 目录已加入 `.gitignore`，文档不会提交到仓库
- `src/web_app/node_modules/` 和 `src/web_app/out/` 已加入 `.gitignore`
- PostgreSQL 连接密码为 `example`，生产环境请改用环境变量管理
- `rag_ui.py` 中 `from simple import query_by_vector` 要求在 `src/use_pgvector/` 目录下运行
