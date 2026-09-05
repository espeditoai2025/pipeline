export function useRouter() {
  return { refresh: () => window.dispatchEvent(new Event("fixture-refresh")), push: (url: string) => { window.history.pushState({}, "", url); window.dispatchEvent(new Event("fixture-refresh")); } };
}
export function useSearchParams() { return new URLSearchParams(window.location.search); }
