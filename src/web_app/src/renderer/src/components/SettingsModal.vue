<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  NModal, NCard, NForm, NFormItem, NInput, NButton, NSpace, NDivider, useMessage
} from 'naive-ui'
import { useRagStore } from '../stores/rag'
import type { AppConfig } from '../types'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ 'update:show': [value: boolean] }>()

const store = useRagStore()
const message = useMessage()

const form = ref<AppConfig>({
  embed: { baseUrl: '', model: '' },
  chat: { baseUrl: '', model: '' },
  rag: { chunkSize: 500, chunkOverlap: 0, topK: 5, systemPrompt: '' }
})

watch(() => props.show, (val) => {
  if (val && store.config) {
    form.value = JSON.parse(JSON.stringify(store.config))
  }
})

async function save(): Promise<void> {
  // 用 JSON 序列化消除 Vue Proxy，避免 IPC 克隆失败
  const plain: AppConfig = JSON.parse(JSON.stringify(form.value))
  await store.saveConfig(plain)
  message.success('配置已保存')
  emit('update:show', false)
}
</script>

<template>
  <n-modal :show="show" @update:show="emit('update:show', $event)">
    <n-card title="设置" style="width: 520px;" :bordered="false">
      <n-form :model="form" label-placement="left" label-width="130px">

        <n-divider title-placement="left" style="margin: 0 0 12px;">嵌入模型服务</n-divider>
        <n-form-item label="嵌入服务地址">
          <n-input v-model:value="form.embed.baseUrl" placeholder="http://localhost:11434" />
        </n-form-item>
        <n-form-item label="嵌入模型">
          <n-input v-model:value="form.embed.model" placeholder="bge-m3" />
        </n-form-item>

        <n-divider title-placement="left" style="margin: 12px 0;">生成模型服务</n-divider>
        <n-form-item label="生成服务地址">
          <n-input v-model:value="form.chat.baseUrl" placeholder="http://localhost:11434" />
        </n-form-item>
        <n-form-item label="生成模型">
          <n-input v-model:value="form.chat.model" placeholder="qwen3:8b" />
        </n-form-item>

      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="emit('update:show', false)">取消</n-button>
          <n-button type="primary" @click="save">保存</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>
