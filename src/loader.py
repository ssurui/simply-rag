"""文档加载模块：支持 TXT、PDF、Markdown 格式"""

import os
from pathlib import Path
from typing import List


def load_text_file(file_path: str) -> List[dict]:
    """加载纯文本文件，按段落分割"""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    return [
        {"content": para, "source": file_path, "index": i}
        for i, para in enumerate(paragraphs)
    ]


def load_pdf_file(file_path: str) -> List[dict]:
    """加载 PDF 文件，按页分割"""
    import fitz  # PyMuPDF

    docs = []
    with fitz.open(file_path) as pdf:
        for page_num, page in enumerate(pdf):
            text = page.get_text().strip()
            if text:
                docs.append(
                    {
                        "content": text,
                        "source": file_path,
                        "index": page_num,
                    }
                )
    return docs


def load_markdown_file(file_path: str) -> List[dict]:
    """加载 Markdown 文件，按标题段落分割"""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    sections = []
    current = []
    for line in content.splitlines():
        if line.startswith("#") and current:
            sections.append("\n".join(current))
            current = [line]
        else:
            current.append(line)
    if current:
        sections.append("\n".join(current))

    return [
        {"content": sec.strip(), "source": file_path, "index": i}
        for i, sec in enumerate(sections)
        if sec.strip()
    ]


def load_documents(path: str) -> List[dict]:
    """
    加载单个文件或目录下所有支持的文档。
    支持格式：.txt / .md / .pdf
    """
    loaders = {
        ".txt": load_text_file,
        ".md": load_markdown_file,
        ".pdf": load_pdf_file,
    }

    p = Path(path)
    files = list(p.rglob("*")) if p.is_dir() else [p]

    docs = []
    for f in files:
        loader = loaders.get(f.suffix.lower())
        if loader:
            try:
                docs.extend(loader(str(f)))
            except Exception as e:
                print(f"[警告] 跳过文件 {f}：{e}")
    return docs
