<script setup lang="ts">
import { ref } from 'vue'
import {
  NButton, NSpace, NRadioGroup, NRadioButton, NProgress,
  NText, NDivider, NList, NListItem, NEllipsis, useMessage
} from 'naive-ui'
import { useRagStore } from '../stores/rag'

const store = useRagStore()
const message = useMessage()
const mode = ref<'append' | 'rebuild'>('append')
const selectedPaths = ref<string[]>([])

async function selectFiles(): Promise<void> {
  const files = await window.electronAPI.selectFiles()
  if (files.length > 0) {
    selectedPaths.value = [...new Set([...selectedPaths.value, ...files])]
  }
}

async function selectDirectory(): Promise<void> {
  const dir = await window.electronAPI.selectDirectory()
  if (dir) {
    selectedPaths.value = [...new Set([...selectedPaths.value, dir])]
  }
}

function removePath(path: string): void {
  selectedPaths.value = selectedPaths.value.filter((p) => p !== path)
}

async function startIndex(): Promise<void> {
  if (selectedPaths.value.length === 0) {
    message.warning('请先选择文件或目录')
    return
  }

  store.indexing = true
  store.indexProgress = { current: 0, total: 0, file: '准备中...' }

  const onProgress = (data: unknown) => {
    const p = data as { current: number; total: number; file: string }
    store.indexProgress = p
  }
  const onDone = async (data: unknown) => {
    const d = data as { total: number }
    store.indexing = false
    await store.refreshDbStatus()
    message.success(`入库完成，共处理 ${d.total} 个片段`)
    window.electronAPI.off('index:progress', onProgress)
    window.electronAPI.off('index:done', onDone)
    window.electronAPI.off('index:error', onError)
  }
  const onError = (data: unknown) => {
    const e = data as { message: string }
    store.indexing = false
    message.error(`入库失败：${e.message}`)
    window.electronAPI.off('index:progress', onProgress)
    window.electronAPI.off('index:done', onDone)
    window.electronAPI.off('index:error', onError)
  }

  window.electronAPI.on('index:progress', onProgress)
  window.electronAPI.on('index:done', onDone)
  window.electronAPI.on('index:error', onError)

  await window.electronAPI.indexDocuments({ paths: selectedPaths.value, mode: mode.value })
}
</script>

<template>
  <n-space vertical :size="16">
    <n-text strong>文档入库</n-text>

    <n-space>
      <n-button size="small" @click="selectFiles">选择文件</n-button>
      <n-button size="small" @click="selectDirectory">选择目录</n-button>
    </n-space>

    <n-list v-if="selectedPaths.length > 0" bordered size="small" style="max-height: 200px; overflow-y: auto;">
      <n-list-item v-for="p in selectedPaths" :key="p" style="padding: 4px 8px;">
        <n-space justify="space-between" align="center">
          <n-ellipsis style="max-width: 180px; font-size: 12px;">{{ p }}</n-ellipsis>
          <n-button text size="tiny" type="error" @click="removePath(p)">✕</n-button>
        </n-space>
      </n-list-item>
    </n-list>
    <n-text v-else depth="3" style="font-size: 12px;">暂未选择文件</n-text>

    <n-divider style="margin: 0;" />

    <div>
      <n-text style="font-size: 12px; margin-bottom: 8px; display: block;">入库方式</n-text>
      <n-radio-group v-model:value="mode" size="small">
        <n-radio-button value="append">追加</n-radio-button>
        <n-radio-button value="rebuild">清空重建</n-radio-button>
      </n-radio-group>
    </div>

    <n-button
      type="primary"
      block
      :loading="store.indexing"
      :disabled="store.indexing || selectedPaths.length === 0"
      @click="startIndex"
    >
      {{ store.indexing ? '入库中...' : '开始入库' }}
    </n-button>

    <div v-if="store.indexing">
      <n-progress
        type="line"
        :percentage="store.indexPercent"
        :indicator-placement="'inside'"
        processing
      />
      <n-text depth="3" style="font-size: 11px; margin-top: 4px; display: block;">
        {{ store.indexProgress.current }} / {{ store.indexProgress.total }} — {{ store.indexProgress.file }}
      </n-text>
    </div>

    <n-divider style="margin: 0;" />
    <n-text depth="3" style="font-size: 12px;">
      向量库已有 <strong>{{ store.dbStatus.count }}</strong> 条文档
    </n-text>
  </n-space>
</template>
