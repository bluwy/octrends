import { defineConfig } from '@unocss/vite'
import presetMini, { colors, type Theme } from '@unocss/preset-mini'

export default defineConfig<Theme>({
  presets: [presetMini()],
  extendTheme: (theme) => {
    // @ts-expect-error
    theme.colors.gray = colors.trueGray
  },
})
