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
      this.baseUrl = url;
      if (this.processedUrls.has(url)) {
        return [];
      }
      this.processedUrls.add(url);

      const html = await this.getHtml(url);
      return this.extractLinks(html);
    } catch (error) {
      throw error;
    }
  }

  private async getHtml(url: string): Promise<string> {
    try {
      const result = await window.electronAPI.fetchUrl(url);
      if (!result.ok) {
        throw new Error(result.error || `HTTP error! status: ${result.status}`);
      }
      return result.text || '';
    } catch (error) {
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
        try {
          // URLのコンストラクタを使って正しく解決
          const resolvedUrl = new URL(href, this.baseUrl);
          return resolvedUrl.toString();
        } catch (error) {
          return '';
        }
      }
    } catch (error) {
      return '';
    }
  }

  private getLinkText(element: HTMLAnchorElement): string {
    // 1. aria-labelを優先
    const ariaLabel = element.getAttribute('aria-label')?.trim();
    if (ariaLabel) return ariaLabel;

    // title属性をチェック
    const title = element.getAttribute('title')?.trim(); 
    if (title) return title;

    // 2. img要素のalt属性をチェック
    const imgAlts = Array.from(element.getElementsByTagName('img'))
      .map(img => img.getAttribute('alt')?.trim())
      .filter((alt): alt is string => alt !== null && alt !== '');
    if (imgAlts.length > 0) return imgAlts.join(' ');

    // 3. 直接のテキストノードのみを取得
    const textNodes = Array.from(element.childNodes)
      .filter(node => node.nodeType === 3) // テキストノードのみ
      .map(node => node.textContent?.trim())
      .filter((text): text is string => text !== null && text !== '');
    
    // テキストノードが見つかった場合はそれを使用
    if (textNodes.length > 0) return textNodes.join(' ');

    // 4. 上記で見つからない場合は、すべてのテキストを取得
    return element.textContent?.trim() || '';
  }

  private extractLinks(html: string): Link[] {
    try {
      const doc = this.parser.parseFromString(html, 'text/html');
      return Array.from(doc.getElementsByTagName('a'))
        .map(a => {
          const originalHref = a.getAttribute('href') || '';
          const href = this.resolveUrl(originalHref);
          if (!href && originalHref !== '' && originalHref !== '#') return null;

          const text = this.getLinkText(a);
          const isAnchor = originalHref.startsWith('#') || href.includes('#');

          const link: Link = {
            href,
            originalHref,
            text,
            html: a.outerHTML,
            parentHtml: a.parentElement?.outerHTML,
            isAnchor
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
      return [];
    }
  }

  clearProcessedUrls(): void {
    this.processedUrls.clear();
    this.baseUrl = '';
  }
}