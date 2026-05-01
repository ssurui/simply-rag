"""文档加载模块：支持 TXT、PDF、Markdown 格式，固定 500 字符分块"""

from pathlib import Path
from typing import List
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import CharacterTextSplitter

CHUNK_SIZE = 500
CHUNK_OVERLAP = 0

_splitter = CharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)


def _split(file_path: str, text: str) -> List[dict]:
    """将原始文本按固定长度切块，返回统一格式"""
    chunks = _splitter.split_text(text)
    return [{"content": chunk, "source": file_path, "index": i} for i, chunk in enumerate(chunks)]


def load_text_file(file_path: str) -> List[dict]:
    """加载纯文本文件"""
    docs = TextLoader(file_path, encoding="utf-8").load()
    return _split(file_path, docs[0].page_content)


def load_pdf_file(file_path: str) -> List[dict]:
    """加载 PDF 文件"""
    import fitz  # PyMuPDF

    with fitz.open(file_path) as pdf:
        text = "\n".join(page.get_text() for page in pdf)
    return _split(file_path, text)


def load_markdown_file(file_path: str) -> List[dict]:
    """加载 Markdown 文件"""
    docs = TextLoader(file_path, encoding="utf-8").load()
    return _split(file_path, docs[0].page_content)


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
