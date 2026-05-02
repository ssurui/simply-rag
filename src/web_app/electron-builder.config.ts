import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.simple-rag.app',
  productName: 'RAG 智能助手',
  directories: {
    buildResources: 'resources',
    output: 'dist'
  },
  files: ['out/**/*'],
  // LanceDB 含原生模块，必须排除在 asar 之外
  asarUnpack: [
    'node_modules/@lancedb/**',
    'node_modules/apache-arrow/**'
  ],
  mac: {
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
    category: 'public.app-category.productivity',
    icon: 'resources/icon.icns'
  },
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'resources/icon.png'
  },
  linux: {
    target: [{ target: 'AppImage', arch: ['x64'] }],
    category: 'Utility',
    icon: 'resources/icon.png'
  }
}

export default config
