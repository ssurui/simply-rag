"""嵌入模块：将文本转换为向量表示"""

from typing import List
from sentence_transformers import SentenceTransformer

# 默认使用支持中文的多语言模型
DEFAULT_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"


class Embedder:
    def __init__(self, model_name: str = DEFAULT_MODEL):
        print(f"[嵌入] 加载模型：{model_name}")
        self.model = SentenceTransformer(model_name)

    def embed(self, texts: List[str]) -> List[List[float]]:
        """批量将文本列表转换为向量"""
        vectors = self.model.encode(texts, show_progress_bar=True, normalize_embeddings=True)
        return vectors.tolist()

    def embed_one(self, text: str) -> List[float]:
        """将单条文本转换为向量"""
        vector = self.model.encode(text, normalize_embeddings=True)
        return vector.tolist()
