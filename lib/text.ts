export function truncateText(value: string, maxLength: number) {
  return Array.from(value).slice(0, maxLength).join("");
}

export function getTextLength(value: string) {
  return Array.from(value).length;
}
