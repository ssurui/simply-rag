"""向量存储模块：基于 ChromaDB 的文档存储与检索"""

from typing import List, Optional
import chromadb
from chromadb.config import Settings


class VectorStore:
    def __init__(self, collection_name: str = "rag_docs", persist_dir: Optional[str] = None):
        if persist_dir:
            self.client = chromadb.PersistentClient(path=persist_dir)
        else:
            self.client = chromadb.EphemeralClient()

        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        print(f"[向量库] 集合 '{collection_name}' 已就绪，当前文档数：{self.collection.count()}")

    def add_documents(self, docs: List[dict], embeddings: List[List[float]]):
        """批量添加文档及其向量"""
        ids = [f"{d['source']}::{d['index']}" for d in docs]
        contents = [d["content"] for d in docs]
        metadatas = [{"source": d["source"], "index": d["index"]} for d in docs]

        self.collection.add(
            ids=ids,
            documents=contents,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        print(f"[向量库] 已添加 {len(docs)} 条文档，当前总数：{self.collection.count()}")

    def query(self, query_embedding: List[float], top_k: int = 5) -> List[dict]:
        """根据查询向量检索最相关的文档"""
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )

        docs = []
        for content, meta, distance in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            docs.append(
                {
                    "content": content,
                    "source": meta["source"],
                    "index": meta["index"],
                    "score": round(1 - distance, 4),  # 余弦相似度
                }
            )
        return docs

    def clear(self):
        """清空集合中的所有文档"""
        self.collection.delete(where={"source": {"$ne": ""}})
        print("[向量库] 已清空所有文档")
