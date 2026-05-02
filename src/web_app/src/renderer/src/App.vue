<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NLayout, NLayoutSider, NLayoutContent, NLayoutHeader, NButton, NSpace, NText, NMessageProvider } from 'naive-ui'
import { useRagStore } from './stores/rag'
import IndexPanel from './components/IndexPanel.vue'
import ChatPanel from './components/ChatPanel.vue'
import ContextDrawer from './components/ContextDrawer.vue'
import SettingsModal from './components/SettingsModal.vue'

const store = useRagStore()
const showSettings = ref(false)

onMounted(async () => {
  await store.refreshDbStatus()
  await store.loadConfig()
})
</script>

<template>
  <n-message-provider>
    <n-layout style="height: 100vh">
      <n-layout-header style="padding: 0 16px; height: 48px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e0e0e0;">
        <n-text strong style="font-size: 16px;">RAG 智能助手</n-text>
        <n-space>
          <n-text depth="3" style="font-size: 12px;">
            向量库：{{ store.dbStatus.count }} 条文档
          </n-text>
          <n-button size="small" @click="showSettings = true">设置</n-button>
        </n-space>
      </n-layout-header>

      <n-layout has-sider style="height: calc(100vh - 48px);">
        <n-layout-sider
          :width="280"
          :native-scrollbar="false"
          style="border-right: 1px solid #e0e0e0;"
        >
          <div style="padding: 16px;">
            <IndexPanel />
          </div>
        </n-layout-sider>

        <n-layout-content style="padding: 16px; display: flex; flex-direction: column;">
          <ChatPanel />
        </n-layout-content>
      </n-layout>
    </n-layout>

    <ContextDrawer />
    <SettingsModal v-model:show="showSettings" />
  </n-message-provider>
</template>
