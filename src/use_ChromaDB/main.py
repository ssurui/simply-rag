"""
Simple RAG - 简单检索增强生成示例

用法：
  # 文档入库（持久化）
  python main.py index --docs <文档路径> --persist <向量库目录>

  # 问答查询（使用已持久化的向量库）
  python main.py query --query <问题> --persist <向量库目录>

  # 一次性完成入库+查询（不持久化）
  python main.py run --docs <文档路径> --query <问题>
"""

import argparse

from loader import load_documents
from embedder import Embedder
from vectorstore import VectorStore
from retriever import Retriever
from generator import Generator


def cmd_index(args):
    """文档入库"""
    print(f"\n[入库] 加载文档：{args.docs}")
    docs = load_documents(args.docs)
    print(f"  共加载 {len(docs)} 个文档片段")

    embedder = Embedder()
    vectorstore = VectorStore(persist_dir=args.persist)
    retriever = Retriever(embedder, vectorstore)

    print("\n[入库] 向量化并写入 ChromaDB…")
    retriever.index(docs)
    print(f"\n[入库] 完成，向量库已保存至：{args.persist}")


def cmd_query(args):
    """问答查询"""
    embedder = Embedder()
    vectorstore = VectorStore(persist_dir=args.persist)
    retriever = Retriever(embedder, vectorstore)

    print(f"\n[查询] 问题：{args.query}")
    results = retriever.retrieve(args.query, top_k=args.top_k)
    print(f"  检索到 {len(results)} 个相关片段")

    answer = Generator().generate(args.query, results)
    print("\n" + "=" * 60)
    print("回答：")
    print("=" * 60)
    print(answer)
    print("=" * 60)


def cmd_run(args):
    """一次性完成入库+查询（内存模式）"""
    print(f"\n[步骤 1/4] 加载文档：{args.docs}")
    docs = load_documents(args.docs)
    print(f"  共加载 {len(docs)} 个文档片段")

    print("\n[步骤 2/4] 初始化组件")
    embedder = Embedder()
    vectorstore = VectorStore(persist_dir=args.persist)
    retriever = Retriever(embedder, vectorstore)

    print("\n[步骤 3/4] 索引文档")
    retriever.index(docs)

    print(f"\n[步骤 4/4] 检索并生成回答")
    print(f"  问题：{args.query}")
    results = retriever.retrieve(args.query, top_k=args.top_k)
    print(f"  检索到 {len(results)} 个相关片段")

    answer = Generator().generate(args.query, results)
    print("\n" + "=" * 60)
    print("回答：")
    print("=" * 60)
    print(answer)
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Simple RAG 问答系统")
    sub = parser.add_subparsers(dest="cmd", required=True)

    # index 子命令
    p_index = sub.add_parser("index", help="文档入库（向量化并持久化）")
    p_index.add_argument("--docs", required=True, help="文档路径（文件或目录）")
    p_index.add_argument("--persist", default="./chroma_db", help="向量库持久化目录（默认 ./chroma_db）")

    # query 子命令
    p_query = sub.add_parser("query", help="问答查询（使用已持久化的向量库）")
    p_query.add_argument("--query", required=True, help="用户问题")
    p_query.add_argument("--persist", default="./chroma_db", help="向量库持久化目录（默认 ./chroma_db）")
    p_query.add_argument("--top-k", type=int, default=5, help="检索片段数量（默认 5）")

    # run 子命令
    p_run = sub.add_parser("run", help="一次性完成入库+查询")
    p_run.add_argument("--docs", required=True, help="文档路径（文件或目录）")
    p_run.add_argument("--query", required=True, help="用户问题")
    p_run.add_argument("--top-k", type=int, default=5, help="检索片段数量（默认 5）")
    p_run.add_argument("--persist", default=None, help="向量库持久化目录（不指定则使用内存）")

    args = parser.parse_args()
    {"index": cmd_index, "query": cmd_query, "run": cmd_run}[args.cmd](args)


if __name__ == "__main__":
    main()
