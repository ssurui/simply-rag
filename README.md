# Simple RAG

一个基于 Python 的简单检索增强生成（RAG）系统，支持本地文档问答。使用 ChromaDB 作为向量数据库，Sentence Transformers 进行文本嵌入，Claude 作为生成模型。

## 功能特性

- 支持多种文档格式：TXT、Markdown、PDF
- 使用多语言嵌入模型，原生支持中文
- 基于 ChromaDB 的向量存储，支持内存模式与持久化模式
- 调用 Claude API 生成高质量回答
- 命令行界面，开箱即用

## 系统架构

```
用户问题
    ↓
[嵌入模型] 将问题转换为向量
    ↓
[向量库] 检索最相关的文档片段
    ↓
[Claude] 基于文档片段生成回答
    ↓
最终回答
```

## 快速开始

### 1. 安装依赖

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 配置环境变量

创建 `.env` 文件并填写 Anthropic API 密钥：

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

### 3. 运行示例

```bash
# 对示例文档进行问答
python main.py --docs example/sample.txt --query "RAG 的工作流程是什么？"

# 对整个目录进行索引并问答
python main.py --docs ./my_docs/ --query "你的问题" --top-k 3

# 使用持久化向量库（避免每次重新索引）
python main.py --docs ./my_docs/ --query "你的问题" --persist ./chroma_db
```

### 命令行参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--docs` | 是 | 文档路径（单个文件或目录） |
| `--query` | 是 | 用户问题 |
| `--top-k` | 否 | 检索返回的文档片段数量（默认 5） |
| `--persist` | 否 | 向量库持久化目录（不指定则使用内存模式） |

## 项目结构

```
simple-rag/
├── main.py              # 主入口
├── requirements.txt     # 依赖列表
├── .env                 # 环境变量（需自行创建）
├── src/
│   ├── loader.py        # 文档加载（TXT/MD/PDF）
│   ├── embedder.py      # 文本嵌入
│   ├── vectorstore.py   # 向量存储（ChromaDB）
│   ├── retriever.py     # 检索器
│   └── generator.py     # 生成器（Claude）
└── example/
    └── sample.txt       # 示例文档
```

## 技术栈

| 组件 | 技术选型 |
|------|---------|
| 嵌入模型 | `paraphrase-multilingual-MiniLM-L12-v2` |
| 向量数据库 | ChromaDB |
| 生成模型 | Claude Sonnet（Anthropic） |
| PDF 解析 | PyMuPDF |

## 扩展建议

- **更换嵌入模型**：修改 `src/embedder.py` 中的 `DEFAULT_MODEL`，可换用更大的模型以提升检索质量
- **调整切分策略**：在 `src/loader.py` 中自定义文本切分逻辑
- **更换向量库**：将 `src/vectorstore.py` 替换为 Faiss、Pinecone 等实现
- **多轮对话**：在 `src/generator.py` 中维护对话历史，实现连续问答

## 许可证

MIT License
