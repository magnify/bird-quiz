export const PLACEHOLDER_SVG = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" fill="none">
    <rect width="200" height="150" fill="#2a2a2e" rx="8"/>
    <path d="M100 35c-15 0-28 10-32 24l-8 4c-3 1-5 4-5 7v6c0 3 2 6 5 7l4 2v20c0 4 3 7 7 7h6c4 0 7-3 7-7v-12h16v12c0 4 3 7 7 7h6c4 0 7-3 7-7v-20l4-2c3-1 5-4 5-7v-6c0-3-2-6-5-7l-8-4c-4-14-17-24-32-24z" fill="#444448" stroke="#555" stroke-width="1.5"/>
    <circle cx="85" cy="65" r="3" fill="#555"/>
    <circle cx="115" cy="65" r="3" fill="#555"/>
    <path d="M95 75c2 3 8 3 10 0" stroke="#555" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
)}`

export function getPlaceholderUrl(): string {
  return PLACEHOLDER_SVG
}
