<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import {
  NInput, NButton, NSpace, NText, NInputNumber,
  NScrollbar, NCollapse, NCollapseItem, useMessage
} from 'naive-ui'
import { marked } from 'marked'
import { useRagStore } from '../stores/rag'
import type { Chunk } from '../types'

const store = useRagStore()
const message = useMessage()
const question = ref('')
const sentQuestion = ref('')
const scrollbarRef = ref<InstanceType<typeof NScrollbar> | null>(null)

const DEFAULT_SYSTEM_PROMPT = `你是一个阅读理解助手，专门帮助用户基于给定的上下文内容回答问题。
你的任务是：
- 只能依据用户提供的上下文内容进行回答；
- 每个答案中如果有信息来源于上下文，必须标注对应的引用标号（例如：[1]）；
- 如果问题的信息在上下文中找不到，请直接回复："我不知道。"
- 不得使用自己的知识库或常识；
- 回答应简洁明了。`

const systemPrompt = ref(store.config?.rag.systemPrompt ?? DEFAULT_SYSTEM_PROMPT)
const topK = ref(store.config?.rag.topK ?? 5)

const renderedAnswer = computed(() => {
  const text = store.displayAnswer
  if (!text) return ''
  return marked(text) as string
})

function scrollToBottom(): void {
  nextTick(() => scrollbarRef.value?.scrollTo({ top: 9999, behavior: 'smooth' }))
}

async function sendQuery(): Promise<void> {
  const q = question.value.trim()
  if (!q) return
  if (!store.dbStatus.ready) {
    message.warning('向量库为空，请先入库文档')
    return
  }
  if (store.querying) return

  store.querying = true
  store.resetAnswer()
  sentQuestion.value = q
  question.value = ''

  const onContext = (data: unknown) => {
    store.chunks = (data as { chunks: Chunk[] }).chunks
  }
  const onDelta = (data: unknown) => {
    store.rawAnswer += (data as { delta: string }).delta
    scrollToBottom()
  }
  const onDone = () => {
    store.querying = false
    cleanup()
  }
  const onError = (data: unknown) => {
    store.querying = false
    message.error((data as { message: string }).message)
    cleanup()
  }

  function cleanup(): void {
    window.electronAPI.off('query:context')
    window.electronAPI.off('query:delta')
    window.electronAPI.off('query:done')
    window.electronAPI.off('query:error')
  }

  window.electronAPI.on('query:context', onContext)
  window.electronAPI.on('query:delta', onDelta)
  window.electronAPI.on('query:done', onDone)
  window.electronAPI.on('query:error', onError)

  await window.electronAPI.query({
    question: q,
    systemPrompt: systemPrompt.value,
    topK: topK.value
  })
}

function handleEnter(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendQuery()
  }
}

onMounted(() => {
  if (store.config) {
    systemPrompt.value = store.config.rag.systemPrompt
    topK.value = store.config.rag.topK
  }
})
</script>

<template>
  <div style="display: flex; flex-direction: column; height: 100%; gap: 12px;">
    <!-- 设置区 -->
    <n-collapse>
      <n-collapse-item title="系统提示词" name="prompt">
        <n-input
          v-model:value="systemPrompt"
          type="textarea"
          :rows="4"
          placeholder="系统提示词..."
        />
      </n-collapse-item>
    </n-collapse>

    <!-- 回答展示区 -->
    <n-scrollbar ref="scrollbarRef" style="flex: 1; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px;">
      <div v-if="!store.rawAnswer && !store.querying" style="color: #aaa; text-align: center; padding: 40px 0;">
        在下方输入问题开始对话
      </div>
      <template v-else>
        <div style="margin-bottom: 12px; padding: 8px 12px; background: #f0f7ff; border-radius: 6px; border-left: 3px solid #63b3ed;">
          <n-text depth="3" style="font-size: 11px; display: block; margin-bottom: 2px;">问题</n-text>
          <n-text style="font-size: 14px;">{{ sentQuestion }}</n-text>
        </div>
        <div class="markdown-body" v-html="renderedAnswer" />
      </template>
    </n-scrollbar>

    <!-- 检索片段按钮 -->
    <n-button
      v-if="store.chunks.length > 0"
      size="small"
      text
      type="primary"
      @click="store.drawerOpen = true"
    >
      查看检索片段（{{ store.chunks.length }} 条）
    </n-button>

    <!-- 输入区 -->
    <n-space align="end">
      <n-input-number
        v-model:value="topK"
        :min="1"
        :max="20"
        size="small"
        style="width: 130px;"
      >
        <template #prefix><n-text depth="3" style="font-size: 12px;">Top-K</n-text></template>
      </n-input-number>

      <n-input
        v-model:value="question"
        type="textarea"
        :rows="2"
        placeholder="输入问题，Enter 发送，Shift+Enter 换行..."
        style="flex: 1; width: 500px;"
        @keydown="handleEnter"
      />

      <n-button
        type="primary"
        :loading="store.querying"
        :disabled="store.querying || !question.trim()"
        @click="sendQuery"
      >
        发送
      </n-button>
    </n-space>
  </div>
</template>

<style scoped>
.markdown-body {
  font-size: 14px;
  line-height: 1.7;
  color: #333;
}
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 12px 0 6px;
  font-weight: 600;
}
.markdown-body :deep(h1) { font-size: 1.4em; }
.markdown-body :deep(h2) { font-size: 1.2em; }
.markdown-body :deep(h3) { font-size: 1.05em; }
.markdown-body :deep(p) { margin: 6px 0; }
.markdown-body :deep(ul),
.markdown-body :deep(ol) { padding-left: 1.5em; margin: 6px 0; }
.markdown-body :deep(li) { margin: 2px 0; }
.markdown-body :deep(code) {
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 13px;
  font-family: monospace;
}
.markdown-body :deep(pre) {
  background: #f6f8fa;
  padding: 10px 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}
.markdown-body :deep(pre code) { background: none; padding: 0; }
.markdown-body :deep(blockquote) {
  border-left: 3px solid #ddd;
  padding-left: 12px;
  color: #666;
  margin: 6px 0;
}
.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 10px 0;
}
.markdown-body :deep(strong) { font-weight: 600; }
.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}
.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #ddd;
  padding: 6px 10px;
}
.markdown-body :deep(th) { background: #f5f5f5; }
</style>
