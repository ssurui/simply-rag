import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import App from './App.vue'
import './assets/main.css'

createApp(App).use(createPinia()).use(naive).mount('#app')
