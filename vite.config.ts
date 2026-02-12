import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import unocss from '@unocss/vite'

export default defineConfig({
  plugins: [vue(), unocss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
