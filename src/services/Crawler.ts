import { Link, CrawlerResponse } from '../types';

declare global {
  interface Window {
    electronAPI: {
      fetchUrl: (url: string) => Promise<CrawlerResponse>;
    };
  }
}

export class Crawler {
  private readonly parser = new DOMParser();
  private readonly processedUrls = new Set<string>();
  private baseUrl: string = '';

  async crawlPage(url: string): Promise<Link[]> {
    try {
      if (this.processedUrls.has(url)) {
        console.log(`[Crawler] Skipping already processed URL: ${url}`);
        return [];
      }

      this.baseUrl = url;
      console.log(`[Crawler] Crawling page: ${url}`);
      const html = await this.getHtml(url);
      const links = this.extractLinks(html);
      
      this.processedUrls.add(url);
      console.log(`[Crawler] Found ${links.length} links on ${url}`);
      
      return links;
    } catch (error) {
      console.error(`[Crawler] Error crawling ${url}:`, error);
      throw error;
    }
  }

  private async getHtml(url: string): Promise<string> {
    try {
      console.log(`[Crawler] Fetching HTML from ${url}`);
      const result = await window.electronAPI.fetchUrl(url);
      
      if (!result.ok) {
        throw new Error(result.error || `HTTP error! status: ${result.status}`);
      }
      
      return result.text || '';
    } catch (error) {
      console.error(`[Crawler] Failed to fetch ${url}:`, error);
      throw error;
    }
  }

  private resolveUrl(href: string): string {
    try {
      // 既に完全なURLの場合はそのまま返す
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return href;
      }

      // メールリンクやtel:リンクは除外
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
        return '';
      }

      // baseUrlを基準にURLを解決
      const base = new URL(this.baseUrl);
      if (href.startsWith('/')) {
        // ルート相対パスの場合
        return `${base.protocol}//${base.host}${href}`;
      } else if (href.startsWith('#')) {
        // アンカーリンクの場合
        return `${this.baseUrl}${href}`;
      } else {
        // 相対パスの場合
        const path = base.pathname.endsWith('/') ? base.pathname : base.pathname + '/';
        return `${base.protocol}//${base.host}${path}${href}`;
      }
    } catch (error) {
      console.error(`[Crawler] Error resolving URL ${href}:`, error);
      return '';
    }
  }

  private extractLinks(html: string): Link[] {
    try {
      const doc = this.parser.parseFromString(html, 'text/html');
      return Array.from(doc.getElementsByTagName('a'))
        .map(a => {
          const href = this.resolveUrl(a.getAttribute('href') || '');
          if (!href) return null;

          const link: Link = {
            href,
            text: a.textContent?.trim() || ''
          };
          
          const ariaLabel = a.getAttribute('aria-label')?.trim();
          if (ariaLabel) link.ariaLabel = ariaLabel;
          
          const imgAlts = Array.from(a.getElementsByTagName('img'))
            .map(img => img.getAttribute('alt')?.trim())
            .filter((alt): alt is string => alt !== null && alt !== '');
          
          if (imgAlts.length > 0) link.imgAlts = imgAlts;
          
          return link;
        })
        .filter((link): link is Link => link !== null);
    } catch (error) {
      console.error('[Crawler] Error extracting links:', error);
      return [];
    }
  }

  clearProcessedUrls(): void {
    this.processedUrls.clear();
    this.baseUrl = '';
    console.log('[Crawler] Processed URLs cleared');
  }
}