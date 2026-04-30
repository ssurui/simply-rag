"""生成模块：基于 Claude 模型，结合检索结果生成回答"""

import os
from typing import List
import anthropic

DEFAULT_MODEL = "claude-sonnet-4-6"
DEFAULT_MAX_TOKENS = 1024

SYSTEM_PROMPT = """你是一个专业的知识问答助手。
请严格根据用户提供的参考文档回答问题，不要编造文档中不存在的内容。
如果参考文档中没有相关信息，请明确告知用户。
回答应简洁、准确、有条理。"""


class Generator:
    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        max_tokens: int = DEFAULT_MAX_TOKENS,
    ):
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise EnvironmentError("请设置环境变量 ANTHROPIC_API_KEY")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model
        self.max_tokens = max_tokens

    def generate(self, query: str, context_docs: List[dict]) -> str:
        """根据检索到的文档片段和用户问题生成回答"""
        context_text = "\n\n".join(
            f"【来源：{d['source']}，相关度：{d['score']}】\n{d['content']}"
            for d in context_docs
        )

        user_message = f"""以下是参考文档内容：

{context_text}

---

用户问题：{query}

请根据以上参考文档回答用户问题。"""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        return response.content[0].text
