# CLAUDE.md — 项目约定与开发指南

本文件供 Claude Code 在协助开发此项目时参考。所有文档、注释、提交信息均使用中文。

## 项目概述

Simple RAG 是一个本地化 RAG 问答系统，核心链路为：

**文档入库**：Markdown 文件 → LangChain 分块 → Ollama bge-m3 向量化 → PostgreSQL（pgvector）

**在线问答**：用户提问 → bge-m3 向量化 → PostgreSQL 相似度检索 → Ollama qwen3:8b 流式生成 → Gradio 展示

## 技术栈

- **Python 版本**：3.10+，使用虚拟环境 `.venv`
- **向量数据库**：PostgreSQL + pgvector 扩展
- **嵌入模型**：bge-m3（通过 Ollama 本地调用，端口 11434）
- **生成模型**：qwen3:8b（通过 Ollama 本地调用）
- **Web 框架**：Gradio 6.x
- **数据库驱动**：psycopg（psycopg3）

## 文件说明

```
src/simple.py    # 文档处理与数据库操作的核心模块
src/rag_ui.py    # Web 界面，依赖 simple.py 中的 query_by_vector()
docs/            # 存放待索引的原始文档（已加入 .gitignore，不提交）
```

## 数据库约定

- 表名：`simple_rag`
- 向量字段：`embedding vector(1024)`（bge-m3 输出维度）
- 相似度计算：`-(embedding <#> %s)` 负内积，归一化向量下等价于余弦相似度
- 连接配置在 `simple.py` 中硬编码，修改时同步更新 `rag_ui.py` 中的导入依赖

## 开发规范

### 新增文档格式支持

在 `simple.py` 中参考 `load_document()` 函数，替换或扩展 LangChain 的 Loader，保持返回格式兼容 `split_document()` 的输入。

### 修改 Prompt

系统提示词位于 `rag_ui.py` 的 `DEFAULT_SYSTEM_PROMPT` 常量中，修改时保留"只能依据上下文回答"这一核心约束。

### 安装依赖

始终使用虚拟环境安装，避免污染系统 Python：

```bash
source .venv/bin/activate
pip install 包名
```

## 运行方式

```bash
# 文档入库
python3 src/simple.py

# 启动 Web 界面（需在 src 目录下运行，因为 rag_ui.py 直接 import simple）
cd src && python3 rag_ui.py
# 访问 http://localhost:7860
```

## 注意事项

- `rag_ui.py` 中 `from simple import query_by_vector` 要求在 `src/` 目录下运行，否则找不到模块
- Ollama 服务必须在本地 11434 端口运行，且已拉取 `bge-m3` 和 `qwen3:8b` 模型
- `docs/` 目录已加入 `.gitignore`，文档不会提交到仓库
- PostgreSQL 连接密码为 `example`，生产环境请改用环境变量管理
