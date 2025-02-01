export interface Link {
  href: string;
  text: string;
  ariaLabel?: string;
  imgAlts?: string[];
}

export interface CheckResult {
  foundOn: string;
  href: string;
  statusCode: number;
  linkText: string;
  titleOrTextNode: string;
  judgment: string;
  error?: string | null;
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