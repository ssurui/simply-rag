import * as lancedb from '@lancedb/lancedb'
import { mkdirSync, existsSync } from 'fs'

export interface DocRecord {
  id: string
  content: string
  source: string
  vector: number[]
}

export interface SearchResult {
  id: string
  content: string
  source: string
  score: number
}

const TABLE_NAME = 'rag_docs'

let db: lancedb.Connection | null = null
let table: lancedb.Table | null = null

async function getDb(dbPath: string): Promise<lancedb.Connection> {
  if (!db) {
    if (!existsSync(dbPath)) mkdirSync(dbPath, { recursive: true })
    db = await lancedb.connect(dbPath)
  }
  return db
}

async function getTable(dbPath: string): Promise<lancedb.Table | null> {
  const conn = await getDb(dbPath)
  const names = await conn.tableNames()
  if (!names.includes(TABLE_NAME)) return null
  if (!table) table = await conn.openTable(TABLE_NAME)
  return table
}

export async function getDocCount(dbPath: string): Promise<number> {
  const t = await getTable(dbPath)
  if (!t) return 0
  return await t.countRows()
}

export async function addDocuments(
  dbPath: string,
  records: DocRecord[],
  mode: 'append' | 'rebuild'
): Promise<void> {
  const conn = await getDb(dbPath)

  if (mode === 'rebuild') {
    const names = await conn.tableNames()
    if (names.includes(TABLE_NAME)) await conn.dropTable(TABLE_NAME)
    table = await conn.createTable(TABLE_NAME, records)
  } else {
    const names = await conn.tableNames()
    if (!names.includes(TABLE_NAME)) {
      table = await conn.createTable(TABLE_NAME, records)
    } else {
      if (!table) table = await conn.openTable(TABLE_NAME)
      await table.add(records)
    }
  }
}

export async function search(
  dbPath: string,
  queryVector: number[],
  topK: number
): Promise<SearchResult[]> {
  const t = await getTable(dbPath)
  if (!t) return []

  const results = await t
    .search(queryVector)
    .distanceType('cosine')
    .limit(topK)
    .toArray()

  return results.map((r) => ({
    id: String(r.id),
    content: String(r.content),
    source: String(r.source),
    score: parseFloat((1 - (r._distance ?? 0)).toFixed(4))
  }))
}

export function resetConnection(): void {
  db = null
  table = null
}
