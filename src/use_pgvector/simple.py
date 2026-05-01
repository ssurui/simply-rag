import requests
import psycopg
import json
from datetime import datetime
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import CharacterTextSplitter

# 加载文档

def load_document(file_path):
    loader = TextLoader(file_path, encoding="utf-8")
    return loader.load()

# 文本切分

def split_document(documents, chunk_size=500, chunk_overlap=0):
    text_splitter = CharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    return text_splitter.split_documents(documents)

# 获取embedding

def get_embedding(content):
    response = requests.post(
        "http://localhost:11434/api/embed",
        json={"model": "bge-m3", "input": content}
    )
    embedding = response.json()["embeddings"][0]
    return embedding

# 写入数据库

def insert_to_db(file_path, chunk_id, start_index, end_index, content, embedding_str):
    with psycopg.connect(
        host="localhost",
        port=5432,
        user="postgres",
        password="example",
        dbname="postgres"
    ) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO simple_rag (source, chunk_id, start_index, end_index, content, embedding, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    file_path,
                    chunk_id,
                    start_index,
                    end_index,
                    content,
                    embedding_str,
                    datetime.now(),
                    datetime.now()
                )
            )        


# 主流程

def process_file(file_path, chunk_size=500, chunk_overlap=0):
    documents = load_document(file_path)
    split_docs = split_document(documents, chunk_size, chunk_overlap)
    cursor = 0
    for i, doc in enumerate(split_docs):
        content = doc.page_content
        embedding = get_embedding(content)
        embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
        start_index = cursor
        end_index = cursor + len(content)
        insert_to_db(file_path, f"chunk_{i+1}", start_index, end_index, content, embedding_str)
        print(f"Chunk {i+1}: {content[:100]}... 已写入数据库")
        cursor = end_index
    print(f"总分块数: {len(split_docs)}")

# 新增：根据query进行向量查询

def query_by_vector(query, top_k=3):
    embedding = get_embedding(query)
    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
    with psycopg.connect(
        host="localhost",
        port=5432,
        user="postgres",
        password="example",
        dbname="postgres"
    ) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT content, -(embedding <#> %s) AS positive_similarity
                FROM simple_rag
                ORDER BY positive_similarity DESC
                LIMIT %s
                """,
                (embedding_str, top_k)
            )
            results = cur.fetchall()
    return results

if __name__ == "__main__":
#     file_path = "../../docs/MinerU_markdown_2011上海大众新帕萨特汽车维修手册_前半本（1-200）.md"
#     process_file(file_path)

    # file_path = "../../docs/MinerU_markdown_2011上海大众新帕萨特汽车维修手册_后半本（201-391）.md"
    # process_file(file_path)

    query = "更换齿轮油要注意那些？"
    print(query_by_vector(query))