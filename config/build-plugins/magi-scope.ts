import type { Plugin } from 'vite'
export function magiScope(): Plugin {
  return {
    name: 'magi-feature-scope',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/renderer/src/assets/main.css')) {
        return
      }
      return code
        .replace(
          "@import 'tailwindcss';",
          "@import 'tailwindcss' source(none);\n@source '../magi';\n@source '../components/ui';"
        )
        .replace(
          /^@import '(?:katex\/[^']+|\.\/(?:rich-markdown-editor|markdown-preview|mobile-page)\.css)';\n/gm,
          ''
        )
    },
    generateBundle() {
      const forbidden =
        /\/src\/(?:renderer\/src\/(?:store\/|app-shell\/|components\/(?:mobile|automations|task-page|settings|skills|artifacts)\/)|main\/(?:startup|telemetry|mobile|automations)\/)/
      const unwanted = [...this.getModuleIds()].filter((id) => forbidden.test(id))
      if (unwanted.length) {
        this.error(`Removed Orca features entered the Magi bundle:\n${unwanted.join('\n')}`)
      }
    }
  }
}
