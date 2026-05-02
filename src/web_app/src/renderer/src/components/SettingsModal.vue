<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  NModal, NCard, NForm, NFormItem, NInput, NButton, NSpace, useMessage
} from 'naive-ui'
import { useRagStore } from '../stores/rag'
import type { AppConfig } from '../types'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ 'update:show': [value: boolean] }>()

const store = useRagStore()
const message = useMessage()

const form = ref<AppConfig>({
  ollama: { baseUrl: '', embedModel: '', chatModel: '' },
  rag: { chunkSize: 500, chunkOverlap: 0, topK: 5, systemPrompt: '' }
})

watch(() => props.show, (val) => {
  if (val && store.config) {
    form.value = JSON.parse(JSON.stringify(store.config))
  }
})

async function save(): Promise<void> {
  await store.saveConfig(form.value)
  message.success('配置已保存')
  emit('update:show', false)
}
</script>

<template>
  <n-modal :show="show" @update:show="emit('update:show', $event)">
    <n-card title="设置" style="width: 480px;" :bordered="false">
      <n-form :model="form" label-placement="left" label-width="120px">
        <n-form-item label="Ollama 地址">
          <n-input v-model:value="form.ollama.baseUrl" placeholder="http://localhost:11434" />
        </n-form-item>
        <n-form-item label="嵌入模型">
          <n-input v-model:value="form.ollama.embedModel" placeholder="bge-m3" />
        </n-form-item>
        <n-form-item label="生成模型">
          <n-input v-model:value="form.ollama.chatModel" placeholder="qwen3:8b" />
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
