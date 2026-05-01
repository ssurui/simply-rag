import json
import requests
import gradio as gr
from embedder import Embedder
from vectorstore import VectorStore
from retriever import Retriever

# Ollama 配置
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen3:8b"

# ChromaDB 持久化目录
CHROMA_DB_DIR = "./chroma_db"

# 初始化检索组件
embedder = Embedder()
vectorstore = VectorStore(persist_dir=CHROMA_DB_DIR)
retriever = Retriever(embedder, vectorstore)

DEFAULT_SYSTEM_PROMPT = """
你是一个阅读理解助手，专门帮助用户基于给定的上下文内容回答问题。
你的任务是：
- 只能依据用户提供的上下文内容进行回答；
- 每个答案中如果有信息来源于上下文，必须标注对应的引用标号（例如：[1]。也可以是多个标号，例如：[1][3]）；
- 如果问题的信息在上下文中找不到，请直接回复："我不知道。"
- 不得使用自己的知识库或常识来回答问题；
- 回答应简洁明了，不添加额外解释或发挥。

请严格按照用户的指示进行判断和回答。
"""


def rag_chat(user_message, system_prompt, top_k):
    if not user_message or not user_message.strip():
        yield [{"role": "assistant", "content": "⚠️ 请输入有效的问题内容。"}], ""
        return

    rag_results = retriever.retrieve(user_message, top_k=int(top_k))
    context = "\n\n".join(
        [f"片段{i+1}【相关度：{r['score']}】: {r['content']}" for i, r in enumerate(rag_results)]
    )

    prompt = f"""
【开始上下文】
{context}
【结束上下文】

请回答以下问题：
{user_message}
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]

    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/chat",
        headers={"Content-Type": "application/json"},
        data=json.dumps({"model": OLLAMA_MODEL, "messages": messages, "stream": True}),
        stream=True,
    )

    partial = ""
    for line in response.iter_lines():
        if not line:
            continue
        try:
            chunk = json.loads(line.decode("utf-8"))
            delta = chunk.get("message", {}).get("content", "")
            partial += delta
            clean_partial = partial.replace("<think>", "思考:\n").replace("</think>", "\n\n\n\n最终答案:\n")
            yield [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": clean_partial},
            ], context
        except Exception:
            continue


with gr.Blocks(title="RAG智能助手（ChromaDB）") as demo:
    gr.Markdown("# RAG 智能助手（ChromaDB + Ollama）\n\n请输入您的问题，系统会结合知识库智能回答。")
    msg = gr.Textbox(placeholder="请输入您的问题...", label="用户输入")
    system_prompt_box = gr.Textbox(
        value=DEFAULT_SYSTEM_PROMPT,
        label="系统提示词（可修改）",
        lines=2,
    )
    top_k_box = gr.Number(value=10, label="返回片段数（top_k）", precision=0)
    chatbot = gr.Chatbot()
    context_box = gr.Textbox(label="检索到的上下文片段", lines=8, interactive=False)
    gr.ClearButton([msg, chatbot, system_prompt_box, context_box, top_k_box])

    def user_send(message):
        return message

    msg.submit(user_send, [msg], [msg], queue=False).then(
        rag_chat, [msg, system_prompt_box, top_k_box], [chatbot, context_box]
    )

if __name__ == "__main__":
    demo.launch()
