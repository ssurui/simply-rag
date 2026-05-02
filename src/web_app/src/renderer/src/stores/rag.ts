import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppConfig, Chunk, DbStatus, IndexProgress } from '../types'

export const useRagStore = defineStore('rag', () => {
  // 数据库状态
  const dbStatus = ref<DbStatus>({ count: 0, ready: false })

  // 入库状态
  const indexing = ref(false)
  const indexProgress = ref<IndexProgress>({ current: 0, total: 0, file: '' })

  // 查询状态
  const querying = ref(false)
  const rawAnswer = ref('')        // 原始流式内容（含 <think> 标签）
  const chunks = ref<Chunk[]>([])
  const drawerOpen = ref(false)

  // 配置
  const config = ref<AppConfig | null>(null)

  // 计算：将 <think>...</think> 替换为可读格式
  const displayAnswer = computed(() => {
    return rawAnswer.value
      .replace(/<think>/g, '\n💭 **思考：**\n')
      .replace(/<\/think>/g, '\n\n---\n\n**最终答案：**\n')
  })

  const indexPercent = computed(() => {
    if (indexProgress.value.total === 0) return 0
    return Math.round((indexProgress.value.current / indexProgress.value.total) * 100)
  })

  async function refreshDbStatus(): Promise<void> {
    dbStatus.value = await window.electronAPI.getDbStatus()
  }

  async function loadConfig(): Promise<void> {
    config.value = await window.electronAPI.getConfig()
  }

  async function saveConfig(cfg: AppConfig): Promise<void> {
    await window.electronAPI.saveConfig(cfg)
    config.value = cfg
  }

  function resetAnswer(): void {
    rawAnswer.value = ''
    chunks.value = []
  }

  return {
    dbStatus,
    indexing,
    indexProgress,
    indexPercent,
    querying,
    rawAnswer,
    displayAnswer,
    chunks,
    drawerOpen,
    config,
    refreshDbStatus,
    loadConfig,
    saveConfig,
    resetAnswer
  }
})
