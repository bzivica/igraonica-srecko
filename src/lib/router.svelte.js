// Minimální hash router (funguje na statickém hostingu jako GitHub Pages bez 404).
// Trasy: #/ = veřejná rezervace, #/admin = administrace herny.

function currentRoute() {
  const hash = window.location.hash.replace(/^#/, '') || '/'
  return hash
}

export const router = $state({ path: currentRoute() })

window.addEventListener('hashchange', () => {
  router.path = currentRoute()
})

export function navigate(path) {
  window.location.hash = path
}
