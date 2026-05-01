"""检索模块：协调嵌入与向量库完成语义检索"""

from typing import List
from embedder import Embedder
from vectorstore import VectorStore


class Retriever:
    def __init__(self, embedder: Embedder, vectorstore: VectorStore):
        self.embedder = embedder
        self.vectorstore = vectorstore

    def index(self, docs: List[dict]):
        """对文档列表进行嵌入并写入向量库"""
        print(f"[检索] 开始索引 {len(docs)} 条文档…")
        texts = [d["content"] for d in docs]
        embeddings = self.embedder.embed(texts)
        self.vectorstore.add_documents(docs, embeddings)

    def retrieve(self, query: str, top_k: int = 5) -> List[dict]:
        """检索与查询最相关的文档片段"""
        query_vec = self.embedder.embed_one(query)
        results = self.vectorstore.query(query_vec, top_k=top_k)
        return results
