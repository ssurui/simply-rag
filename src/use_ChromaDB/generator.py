"""生成模块：调用本地 Ollama 模型，结合检索结果生成回答"""

import json
import requests
from typing import List

OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "qwen3:8b"

SYSTEM_PROMPT = """你是一个阅读理解助手，专门帮助用户基于给定的上下文内容回答问题。
你的任务是：
- 只能依据用户提供的上下文内容进行回答；
- 每个答案中如果有信息来源于上下文，必须标注对应的引用标号（例如：[1]，也可以是多个标号，例如：[1][3]）；
- 如果问题的信息在上下文中找不到，请直接回复："我不知道。"
- 不得使用自己的知识库或常识来回答问题；
- 回答应简洁明了，不添加额外解释或发挥。

请严格按照用户的指示进行判断和回答。"""


class Generator:
    def __init__(self, model: str = DEFAULT_MODEL, base_url: str = OLLAMA_BASE_URL):
        self.model = model
        self.base_url = base_url

    def generate(self, query: str, context_docs: List[dict]) -> str:
        """根据检索到的文档片段和用户问题生成回答"""
        context_text = "\n\n".join(
            f"片段{i+1}【来源：{d['source']}，相关度：{d['score']}】\n{d['content']}"
            for i, d in enumerate(context_docs)
        )

        user_message = f"""【开始上下文】
{context_text}
【结束上下文】

请回答以下问题：{query}"""

        response = requests.post(
            f"{self.base_url}/api/chat",
            headers={"Content-Type": "application/json"},
            data=json.dumps({
                "model": self.model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                "stream": False,
            }),
        )
        response.raise_for_status()
        answer = response.json()["message"]["content"]
        # 处理 <think> 标签
        answer = answer.replace("<think>", "思考:\n").replace("</think>", "\n\n最终答案:\n")
        return answer
