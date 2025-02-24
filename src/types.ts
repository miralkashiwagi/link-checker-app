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

// ソート関連の型定義
export type SortField = 'statusCode' | 'linkText' | 'href' | 'judgment' | 'titleOrTextNode';
export type SortDirection = 'asc' | 'desc';

// UI関連の型定義
export interface InputSectionProps {
  urlInput: string;
  isChecking: boolean;
  onUrlInputChange: (value: string) => void;
  onSessionCapture: () => void;
  onCheckLinks: () => void;
  onStopChecking: () => void;
  onDownloadCsv: () => void;
  onShowOnlyIssuesChange: (checked: boolean) => void;
  showOnlyIssues: boolean;
  hasResults: boolean;
}

export interface ResultsTableProps {
  groupedResults: Map<string, CheckResult[]>;
  sortField: string;
  sortDirection: string;
  onSort: (field: SortField) => void;
}

export interface ToastProps {
  show: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    electronAPI: {
      fetchUrl: (url: string) => Promise<CrawlerResponse>;
      startSessionCapture: (url: string) => Promise<boolean>;
      openInBrowser: (url: string) => Promise<boolean>;
    }
  }
}