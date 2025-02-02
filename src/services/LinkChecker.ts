import { isLinkTextProper } from '../utils/helpers';
import { CacheEntry } from '../types';

export class LinkChecker {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 1 * 60 * 1000; // 1分
  private readonly parser = new DOMParser();

  private isAnchorLink(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hash !== '';
    } catch (error) {
      return false;
    }
  }

  private getBaseUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.hash = '';
      return urlObj.toString();
    } catch (error) {
      return url;
    }
  }

  private getAnchorId(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hash.slice(1);
    } catch (error) {
      return '';
    }
  }

  async checkLink(url: string): Promise<[number, string]> {
    const now = Date.now();
    const cached = this.cache.get(url);
    
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return [cached.status, cached.titleOrText];
    }

    try {
      const status = await this.getStatusCode(url);
      const titleOrText = await this.getTitleOrAnchorText(url);
      
      this.cache.set(url, {
        status,
        titleOrText,
        timestamp: now
      });

      return [status, titleOrText];
    } catch (error) {
      throw error;
    }
  }

  async getStatusCode(url: string): Promise<number> {
    try {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('Unsupported protocol');
      }


      const isAnchor = this.isAnchorLink(url);
      const targetUrl = isAnchor ? this.getBaseUrl(url) : url;
      
      const response = await window.electronAPI.fetchUrl(targetUrl);
      // レスポンスのステータスコードをそのまま返す（undefinedの場合は0）
      return response.status ?? 0;
    } catch (error) {
      // エラー時は0を返す
      return 0;
    }
  }

  private findAnchorText(html: string, anchorId: string): string {
    try {
      const doc = this.parser.parseFromString(html, 'text/html');
      
      const element = doc.getElementById(anchorId);
      if (!element) {
        return '';
      }

      if (/^h[1-6]$/i.test(element.tagName)) {
        return element.textContent?.trim() || '';
      }

      let currentElement: Element | null = element;
      while (currentElement) {
        let sibling = currentElement.previousElementSibling;
        while (sibling) {
          if (/^h[1-6]$/i.test(sibling.tagName)) {
            return sibling.textContent?.trim() || '';
          }
          sibling = sibling.previousElementSibling;
        }
        
        currentElement = currentElement.parentElement;
        if (currentElement && /^h[1-6]$/i.test(currentElement.tagName)) {
          return currentElement.textContent?.trim() || '';
        }
      }

      const headingInside = element.querySelector('h1, h2, h3, h4, h5, h6');
      if (headingInside) {
        return headingInside.textContent?.trim() || '';
      }

      const firstParagraph = element.querySelector('p');
      if (firstParagraph) {
        const text = firstParagraph.textContent?.trim() || '';
        return text.length > 100 ? text.slice(0, 100) + '...' : text;
      }

      const text = element.textContent?.trim() || '';
      return text.length > 100 ? text.slice(0, 100) + '...' : text;

    } catch (error) {
      return '';
    }
  }

  async getTitleOrAnchorText(url: string): Promise<string> {
    try {
      const response = await window.electronAPI.fetchUrl(url);
      // if (!response.ok || !response.text) {
      //   return 'No content found';
      // }

      const isAnchor = this.isAnchorLink(url);
      if (isAnchor) {
        const anchorId = this.getAnchorId(url);
        const anchorText = this.findAnchorText(response.text, anchorId);
        if (anchorText) {
          return anchorText;
        }
      }

      const doc = this.parser.parseFromString(response.text, 'text/html');
      return doc.title || 'No title found';

    } catch (error) {
      return 'Error fetching content';
    }
  }

  judgeLink(linkText: string, titleOrText: string, statusCode: number, href: string, fullUrl: string, foundOn: string): string {
    // 空のhrefをチェック
    if (href === '') {
      return 'empty';
    }

    // ダミーリンク（#）をチェック
    if (href === '#') {
      return 'dummy';
    }

    try {
      // #topリンクの特別処理
      const hrefUrl = new URL(fullUrl);
      const currentUrl = new URL(foundOn);
      
      if (hrefUrl.hash === '#top' && 
          hrefUrl.origin === currentUrl.origin && 
          hrefUrl.pathname === currentUrl.pathname) {
        return 'ok';
      }
    } catch (error) {
      // URLのパースに失敗した場合は無視して続行
    }

    // ステータスコード 200番台・300番台以外をエラー
    if (statusCode < 200 || statusCode >= 400) {
      return 'error';
    }

    if (!isLinkTextProper(linkText, titleOrText)) {
      return 'review';
    }

    return 'ok';
  }

  clearCache(): void {
    this.cache.clear();
  }
}