import { ref, onMounted, computed } from 'vue'

let patchedHistory = false
let onUpdateHref: (() => void)[] = []

function patchHistory() {
  if (patchedHistory) return
  patchedHistory = true

  let originalPushState: typeof history.pushState
  let originalReplaceState: typeof history.replaceState

  const updateHref = () => {
    onUpdateHref.forEach((fn) => fn())
  }

  onMounted(() => {
    originalPushState = history.pushState
    originalReplaceState = history.replaceState

    history.pushState = function () {
      // @ts-expect-error
      originalPushState.apply(this, arguments)
      updateHref()
    }
    history.replaceState = function () {
      // @ts-expect-error
      originalReplaceState.apply(this, arguments)
      updateHref()
    }

    window.addEventListener('popstate', updateHref)
    window.addEventListener('hashchange', updateHref)
  })
}

// Client-side only
export function useUrl() {
  const href = ref(window.location.href)
  onUpdateHref.push(() => {
    href.value = window.location.href
  })
  patchHistory()

  const url = computed(() => new URL(href.value))
  return url
}
