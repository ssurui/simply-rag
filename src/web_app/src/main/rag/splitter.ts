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

/**
 * 递归字符分块：依次按分隔符尝试切分，保证每块不超过 chunkSize，相邻块有 chunkOverlap 字符重叠。
 */
function splitText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  const separators = ['\n\n', '\n', '。', '！', '？', '；', ' ', '']

  function _split(text: string, seps: string[]): string[] {
    const sep = seps[0]
    const nextSeps = seps.slice(1)

    let parts: string[]
    if (sep === '') {
      parts = text.split('')
    } else {
      parts = text.split(sep)
    }

    const chunks: string[] = []
    let current = ''

    for (const part of parts) {
      const piece = current ? current + sep + part : part
      if (piece.length <= chunkSize) {
        current = piece
      } else {
        if (current) chunks.push(current)
        if (part.length > chunkSize && nextSeps.length > 0) {
          const sub = _split(part, nextSeps)
          chunks.push(...sub)
          current = ''
        } else {
          current = part
        }
      }
    }
    if (current) chunks.push(current)
    return chunks
  }

  const rawChunks = _split(text, separators)

  // 合并过短的块，加入重叠
  const result: string[] = []
  let i = 0
  while (i < rawChunks.length) {
    let chunk = rawChunks[i]
    // 向后合并直到达到 chunkSize
    while (chunk.length < chunkSize && i + 1 < rawChunks.length) {
      const next = rawChunks[i + 1]
      if (chunk.length + next.length + 1 <= chunkSize) {
        chunk = chunk + '\n' + next
        i++
      } else {
        break
      }
    }
    result.push(chunk.trim())

    // 计算下一块的起始，加入重叠
    if (chunkOverlap > 0 && i + 1 < rawChunks.length) {
      const overlap = chunk.slice(-chunkOverlap)
      if (overlap.trim()) {
        // 将重叠内容拼入下一块
        rawChunks[i + 1] = overlap + '\n' + rawChunks[i + 1]
      }
    }
    i++
  }

  return result.filter(s => s.length > 0)
}

export async function splitDocuments(
  paths: string[],
  chunkSize: number,
  chunkOverlap: number
): Promise<DocChunk[]> {
  const allFiles: string[] = []
  for (const p of paths) {
    allFiles.push(...collectMarkdownFiles(p))
  }

  const chunks: DocChunk[] = []
  for (const file of allFiles) {
    const content = readFileSync(file, 'utf-8')
    const parts = splitText(content, chunkSize, chunkOverlap)
    parts.forEach((part, i) => {
      chunks.push({ content: part, source: basename(file), index: i })
    })
  }
  return chunks
}
