# CLAUDE.md — 项目约定与开发指南

本文件供 Claude Code 在协助开发此项目时参考。

## 项目概述

Simple RAG 是一个最小化的检索增强生成（RAG）示例项目，使用 Python 实现，核心依赖为 ChromaDB、Sentence Transformers 和 Anthropic Claude API。

## 技术栈约定

- **Python 版本**：3.10+
- **包管理**：`pip` + `requirements.txt`，使用虚拟环境 `.venv`
- **代码风格**：遵循 PEP 8，类型注解优先，函数保持单一职责
- **API 调用**：所有 Anthropic API 调用统一在 `src/generator.py` 中进行
- **环境变量**：通过 `.env` 文件管理，使用 `python-dotenv` 加载，不得硬编码密钥

## 目录结构说明

```
src/loader.py       # 文档加载，新增格式在此处添加对应 loader 函数
src/embedder.py     # 嵌入模型封装，模型名称通过常量配置
src/vectorstore.py  # ChromaDB 封装，接口需保持稳定
src/retriever.py    # 协调 embedder 与 vectorstore，不含业务逻辑
src/generator.py    # Claude API 调用，prompt 在此文件中维护
main.py             # CLI 入口，仅负责参数解析与流程串联
```

## 开发规范

### 添加新文档格式

在 `src/loader.py` 中新增一个 `load_xxx_file(file_path: str) -> List[dict]` 函数，并在 `load_documents()` 的 `loaders` 字典中注册对应扩展名。每个文档片段的结构必须包含：

```python
{"content": str, "source": str, "index": int}
```

### 修改 Prompt

系统提示词位于 `src/generator.py` 的 `SYSTEM_PROMPT` 常量中。修改时注意：
- 保持"仅基于提供的文档回答"这一核心约束
- 不得让模型编造文档中不存在的内容

### 测试

目前无自动化测试框架。手动测试时使用 `example/sample.txt` 作为测试文档：

```bash
python main.py --docs example/sample.txt --query "RAG 的核心优势是什么？"
```

## 常见问题

**Q：运行时提示找不到 ANTHROPIC_API_KEY**
A：在项目根目录创建 `.env` 文件，写入 `ANTHROPIC_API_KEY=sk-ant-...`

**Q：嵌入模型首次运行很慢**
A：首次运行会自动下载模型文件（约 400MB），下载完成后会缓存到本地。

**Q：如何切换生成模型**
A：修改 `src/generator.py` 中的 `DEFAULT_MODEL` 常量，可用值参考 Anthropic 文档。

## 不建议做的事

- 不要在 `main.py` 中加入业务逻辑，保持其只作为 CLI 入口
- 不要在代码中硬编码 API 密钥或路径
- 不要在单次检索中返回超过 10 个文档片段（影响 context 质量）
- 不要修改 `vectorstore.py` 的公开接口签名，除非同步更新 `retriever.py`
