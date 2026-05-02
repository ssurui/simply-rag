<script setup lang="ts">
import { NDrawer, NDrawerContent, NList, NListItem, NTag, NText, NScrollbar, NDivider } from 'naive-ui'
import { useRagStore } from '../stores/rag'

const store = useRagStore()
</script>

<template>
  <n-drawer v-model:show="store.drawerOpen" :width="480" placement="right">
    <n-drawer-content title="检索到的片段" closable>
      <n-scrollbar style="max-height: calc(100vh - 100px);">
        <n-list v-if="store.chunks.length > 0">
          <n-list-item v-for="(chunk, i) in store.chunks" :key="chunk.id">
            <div style="padding: 8px 0;">
              <n-text style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px;">
                <strong>片段 {{ i + 1 }}</strong>
                <n-tag size="small" type="info">相关度 {{ chunk.score }}</n-tag>
                <n-tag size="small">{{ chunk.source }}</n-tag>
              </n-text>
              <pre style="white-space: pre-wrap; word-break: break-word; font-size: 12px; line-height: 1.6; color: #444; background: #f9f9f9; padding: 8px; border-radius: 4px;">{{ chunk.content }}</pre>
            </div>
            <n-divider v-if="i < store.chunks.length - 1" style="margin: 4px 0;" />
          </n-list-item>
        </n-list>
        <n-text v-else depth="3">暂无片段</n-text>
      </n-scrollbar>
    </n-drawer-content>
  </n-drawer>
</template>
