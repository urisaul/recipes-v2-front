import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/pages/my_recipe_book_v2/',
  plugins: [react()],
})
