import { defineConfig } from '@unocss/vite'
import presetMini, { colors, type Theme } from '@unocss/preset-mini'
import presetIcons from '@unocss/preset-icons'

export default defineConfig<Theme>({
  presets: [
    presetMini(),
    // @ts-expect-error -- dk what's wrong
    presetIcons(),
  ],
  extendTheme: (theme) => {
    // @ts-expect-error
    theme.colors.gray = colors.trueGray
  },
})
