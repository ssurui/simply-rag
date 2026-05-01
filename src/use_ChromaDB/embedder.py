"""嵌入模块：调用本地 Ollama 服务生成向量"""

import requests
from typing import List

OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "bge-m3"


class Embedder:
    def __init__(self, model_name: str = DEFAULT_MODEL, base_url: str = OLLAMA_BASE_URL):
        self.model_name = model_name
        self.base_url = base_url
        print(f"[嵌入] 使用 Ollama 模型：{model_name}（{base_url}）")

    def _request(self, texts: List[str]) -> List[List[float]]:
        """调用 Ollama embed 接口，批量获取向量"""
        response = requests.post(
            f"{self.base_url}/api/embed",
            json={"model": self.model_name, "input": texts},
        )
        response.raise_for_status()
        return response.json()["embeddings"]

    def embed(self, texts: List[str]) -> List[List[float]]:
        """批量将文本列表转换为向量"""
        return self._request(texts)

    def embed_one(self, text: str) -> List[float]:
        """将单条文本转换为向量"""
        return self._request([text])[0]
