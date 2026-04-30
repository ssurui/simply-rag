"""
Simple RAG - 简单检索增强生成示例
用法：python main.py --docs <文档路径> --query <问题>
"""

import argparse
from dotenv import load_dotenv

from src.loader import load_documents
from src.embedder import Embedder
from src.vectorstore import VectorStore
from src.retriever import Retriever
from src.generator import Generator


def main():
    load_dotenv()

    parser = argparse.ArgumentParser(description="Simple RAG 问答系统")
    parser.add_argument("--docs", required=True, help="文档路径（文件或目录）")
    parser.add_argument("--query", required=True, help="用户问题")
    parser.add_argument("--top-k", type=int, default=5, help="检索返回的文档片段数量（默认 5）")
    parser.add_argument("--persist", default=None, help="向量库持久化目录（不指定则使用内存）")
    args = parser.parse_args()

    # 1. 加载文档
    print(f"\n[步骤 1/4] 加载文档：{args.docs}")
    docs = load_documents(args.docs)
    print(f"  共加载 {len(docs)} 个文档片段")

    # 2. 初始化组件
    print("\n[步骤 2/4] 初始化嵌入模型与向量库")
    embedder = Embedder()
    vectorstore = VectorStore(persist_dir=args.persist)
    retriever = Retriever(embedder, vectorstore)

    # 3. 索引文档
    print("\n[步骤 3/4] 索引文档")
    retriever.index(docs)

    # 4. 检索并生成回答
    print(f"\n[步骤 4/4] 检索并生成回答")
    print(f"  问题：{args.query}")

    results = retriever.retrieve(args.query, top_k=args.top_k)
    print(f"  检索到 {len(results)} 个相关片段")

    generator = Generator()
    answer = generator.generate(args.query, results)

    print("\n" + "=" * 60)
    print("回答：")
    print("=" * 60)
    print(answer)
    print("=" * 60)


if __name__ == "__main__":
    main()
