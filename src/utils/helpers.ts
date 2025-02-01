/**
 * Check if link text is appropriate by comparing with target text
 */
export function isLinkTextProper(linkText: string, targetText: string): boolean {
  const linkTextLower = linkText.toLowerCase().trim();
  const targetTextLower = targetText.toLowerCase().trim();
  return targetTextLower.includes(linkTextLower);
}

/**
 * Convert relative URL to absolute URL
 */
export function toAbsoluteUrl(href: string, baseUrl: string): string {
  try {
    const url = new URL(href, baseUrl);
    return url.toString();
  } catch {
    return '';
  }
}