/** Client-side navigation without a router dependency. */
export function navigate(to: string) {
  history.pushState(null, '', to)
  dispatchEvent(new PopStateEvent('popstate'))
  scrollTo(0, 0)
}
