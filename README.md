# Simple RAG

基于 PostgreSQL + pgvector + Ollama 的本地化检索增强生成（RAG）问答系统。文档分块后通过 bge-m3 模型向量化存入 PostgreSQL，查询时进行语义检索，结合 qwen3:8b 大模型流式生成回答，并提供 Gradio Web 界面。

## 系统架构

```
文档（Markdown）
    ↓
[simple.py] 分块 → bge-m3 向量化 → PostgreSQL（pgvector）
                                          ↓
用户提问 → bge-m3 向量化 → 相似度检索（<#> 内积）
                                          ↓
                              [rag_ui.py] 构建 Prompt
                                          ↓
                              Ollama qwen3:8b 流式生成
                                          ↓
                              Gradio Web 界面展示
```

## 环境依赖

### 本地服务

- **PostgreSQL**：需安装 [pgvector](https://github.com/pgvector/pgvector) 扩展
- **Ollama**：本地运行，需拉取以下模型：
  - `bge-m3`：向量嵌入模型
  - `qwen3:8b`：对话生成模型

### Python 依赖

```bash
pip install psycopg langchain-community langchain-text-splitters requests gradio
```

## 数据库初始化

```sql
-- 安装 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建文档分块表（bge-m3 向量维度为 1024）
CREATE TABLE simple_rag (
    id          SERIAL PRIMARY KEY,
    source      TEXT,
    chunk_id    TEXT,
    start_index INTEGER,
    end_index   INTEGER,
    content     TEXT,
    embedding   vector(1024),
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP
);
```

## 快速开始

### 第一步：文档入库

将 Markdown 文档放入 `docs/` 目录，修改 `src/simple.py` 末尾的 `file_path` 后运行：

```bash
python3 src/simple.py
```

脚本会按 500 字符分块，逐块调用 Ollama bge-m3 生成向量并写入 PostgreSQL。

### 第二步：启动 Web 界面

```bash
cd src
python3 rag_ui.py
```

浏览器访问 `http://localhost:7860`，即可进行问答。

## 项目结构

```
simple-rag/
├── src/
│   ├── simple.py     # 文档加载、分块、向量化、入库及向量查询
│   └── rag_ui.py     # Gradio Web 问答界面
├── docs/             # 待索引的文档（git 忽略）
├── requirements.txt  # Python 依赖
└── .gitignore
```

## 配置说明

| 配置项 | 位置 | 默认值 | 说明 |
|--------|------|--------|------|
| 嵌入模型 | `simple.py` | `bge-m3` | Ollama 中的向量模型 |
| 生成模型 | `rag_ui.py` | `qwen3:8b` | Ollama 中的对话模型 |
| 分块大小 | `simple.py` | `500` 字符 | 可按需调整 |
| 检索数量 | Web 界面 | `10` | 可在页面实时调整 |
| 数据库 | `simple.py` | `localhost:5432` | postgres/example |

## 许可证

MIT License
