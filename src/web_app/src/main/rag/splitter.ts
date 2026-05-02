import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname, basename } from 'path'

export interface DocChunk {
  content: string
  source: string
  index: number
}

function collectMarkdownFiles(inputPath: string): string[] {
  const stat = statSync(inputPath)
  if (stat.isFile()) {
    return extname(inputPath).toLowerCase() === '.md' ? [inputPath] : []
  }
  const files: string[] = []
  for (const entry of readdirSync(inputPath)) {
    files.push(...collectMarkdownFiles(join(inputPath, entry)))
  }
  return files
}

export async function splitDocuments(
  paths: string[],
  chunkSize: number,
  chunkOverlap: number
): Promise<DocChunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap })

  const allFiles: string[] = []
  for (const p of paths) {
    allFiles.push(...collectMarkdownFiles(p))
  }

  const chunks: DocChunk[] = []
  for (const file of allFiles) {
    const content = readFileSync(file, 'utf-8')
    const parts = await splitter.splitText(content)
    parts.forEach((part, i) => {
      chunks.push({ content: part, source: basename(file), index: i })
    })
  }
  return chunks
}
