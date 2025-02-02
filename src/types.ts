export interface Link {
  href: string;
  originalHref: string;
  text: string;
  ariaLabel?: string;
  imgAlts?: string[];
  html?: string;
  parentHtml?: string;
  isAnchor?: boolean;
}

export interface CheckResult {
  foundOn: string;
  href: string;
  originalHref: string;
  statusCode: number;
  linkText: string;
  titleOrTextNode: string;
  judgment: string;
  error?: string | null;
  html?: string;
  parentHtml?: string;
  isAnchor: boolean;
}

export interface CrawlerResult {
  url: string;
  links: Link[];
  error?: string;
}

export interface CrawlerResponse {
  ok: boolean;
  status?: number;
  text?: string;
  error?: string;
}

export interface CacheEntry {
  status: number;
  titleOrText: string;
  timestamp: number;
}

declare global {
  interface Window {
    electronAPI: {
      fetchUrl: (url: string) => Promise<CrawlerResponse>;
      startSessionCapture: (url: string) => Promise<boolean>;
    }
  }
}