# Simple RAG

用 Python 实现的简单 RAG（检索增强生成）示例项目，提供两种技术方案，可按需选用。

## 两种实现方案

### 方案一：use_ChromaDB

使用 ChromaDB 作为向量数据库，Sentence Transformers 进行本地嵌入，Claude API 生成回答。适合快速原型验证，无需额外部署数据库。

```
文档（TXT / Markdown / PDF）
    ↓
分块 → Sentence Transformers 向量化 → ChromaDB
                                           ↓
用户提问 → 向量化 → 相似度检索
                                           ↓
                              Claude API 生成回答
```

### 方案二：use_pgvector

使用 PostgreSQL + pgvector 作为向量数据库，Ollama bge-m3 进行嵌入，Ollama qwen3:8b 生成回答，并提供 Gradio Web 界面。适合数据需要持久化、完全本地化运行的场景。

```
文档（Markdown）
    ↓
分块 → Ollama bge-m3 向量化 → PostgreSQL（pgvector）
                                           ↓
用户提问 → 向量化 → 相似度检索（内积）
                                           ↓
                              Ollama qwen3:8b 流式生成
                                           ↓
                              Gradio Web 界面展示
```

## 项目结构

```
simple-rag/
├── main.py                        # use_ChromaDB 方案的命令行入口
├── requirements.txt               # Python 依赖
├── example/
│   └── sample.txt                 # 示例文档
├── docs/                          # 待索引文档（已 git 忽略）
└── src/
    ├── use_ChromaDB/              # 方案一：ChromaDB + Claude API
    │   ├── loader.py              # 文档加载（TXT / Markdown / PDF）
    │   ├── embedder.py            # 文本向量化（Sentence Transformers）
    │   ├── vectorstore.py         # 向量存储与检索（ChromaDB）
    │   ├── retriever.py           # 检索协调器
    │   └── generator.py           # 回答生成（Claude API）
    └── use_pgvector/              # 方案二：pgvector + Ollama
        ├── simple.py              # 文档入库 & 向量查询
        └── rag_ui.py              # Gradio Web 问答界面
```

## 快速开始

### 方案一：use_ChromaDB

**安装依赖**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**配置 Claude API Key**

```bash
# 创建 .env 文件
echo "ANTHROPIC_API_KEY=your_key_here" > .env
```

**运行**

```bash
# 使用示例文档问答
python main.py --docs example/sample.txt --query "RAG 的工作流程是什么？"

# 指定 top-k 和持久化目录
python main.py --docs ./docs/ --query "你的问题" --top-k 3 --persist ./chroma_db
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `--docs` | 是 | 文档路径（文件或目录） |
| `--query` | 是 | 用户问题 |
| `--top-k` | 否 | 检索片段数量（默认 5） |
| `--persist` | 否 | 向量库持久化目录（不填则内存模式） |

---

### 方案二：use_pgvector

**前置条件**

- 本地运行 PostgreSQL，并安装 pgvector 扩展
- 本地运行 Ollama，并拉取所需模型：

```bash
ollama pull bge-m3
ollama pull qwen3:8b
```

**数据库初始化**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

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

**文档入库**

将文档放入 `docs/` 目录，修改 `src/use_pgvector/simple.py` 末尾的 `file_path`，然后运行：

```bash
cd src/use_pgvector
python3 simple.py
```

**启动 Web 界面**

```bash
cd src/use_pgvector
python3 rag_ui.py
# 浏览器访问 http://localhost:7860
```

## 方案对比

| 对比项 | use_ChromaDB | use_pgvector |
|--------|-------------|-------------|
| 向量数据库 | ChromaDB（内嵌） | PostgreSQL + pgvector |
| 嵌入模型 | Sentence Transformers（本地） | Ollama bge-m3（本地服务） |
| 生成模型 | Claude API（云端） | Ollama qwen3:8b（本地） |
| Web 界面 | 无（命令行） | Gradio |
| 数据持久化 | 可选 | 是 |
| 完全本地化 | 否 | 是 |

## 许可证

MIT License
