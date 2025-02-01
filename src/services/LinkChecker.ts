import { isLinkTextProper } from '../utils/helpers';
import { CacheEntry } from '../types';

export class LinkChecker {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分
  private readonly parser = new DOMParser();

  private isAnchorLink(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hash !== '';
    } catch (error) {
      console.error(`[LinkChecker] Invalid URL: ${url}`, error);
      return false;
    }
  }

  private getBaseUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.hash = '';
      return urlObj.toString();
    } catch (error) {
      console.error(`[LinkChecker] Error getting base URL for ${url}:`, error);
      return url;
    }
  }

  private getAnchorId(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hash.slice(1);
    } catch (error) {
      console.error(`[LinkChecker] Error getting anchor ID for ${url}:`, error);
      return '';
    }
  }

  async checkLink(url: string): Promise<[number, string]> {
    console.log(`[LinkChecker] Checking link: ${url}`);
    
    // キャッシュをチェック
    const now = Date.now();
    const cached = this.cache.get(url);
    
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`[LinkChecker] Cache hit for ${url}`);
      return [cached.status, cached.titleOrText];
    }

    try {
      const status = await this.getStatusCode(url);
      const titleOrText = await this.getTitleOrAnchorText(url);
      
      // 結果をキャッシュ
      this.cache.set(url, {
        status,
        titleOrText,
        timestamp: now
      });

      return [status, titleOrText];
    } catch (error) {
      console.error(`[LinkChecker] Error checking link ${url}:`, error);
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
      return response.status || 404;
    } catch (error) {
      console.error(`[LinkChecker] Error getting status code for ${url}:`, error);
      return 404;
    }
  }

  private findAnchorText(html: string, anchorId: string): string {
    try {
      const doc = this.parser.parseFromString(html, 'text/html');
      
      // IDで要素を検索
      const element = doc.getElementById(anchorId);
      if (!element) {
        console.warn(`[LinkChecker] Element with id '${anchorId}' not found`);
        return '';
      }

      // 1. 要素自体が見出しの場合はそのテキストを返す
      if (/^h[1-6]$/i.test(element.tagName)) {
        return element.textContent?.trim() || '';
      }

      // 2. 要素の前の兄弟または親から最も近い見出しを探す
      let currentElement: Element | null = element;
      while (currentElement) {
        // 前の兄弟要素をチェック
        let sibling = currentElement.previousElementSibling;
        while (sibling) {
          if (/^h[1-6]$/i.test(sibling.tagName)) {
            return sibling.textContent?.trim() || '';
          }
          sibling = sibling.previousElementSibling;
        }
        
        // 親要素に移動
        currentElement = currentElement.parentElement;
        if (currentElement && /^h[1-6]$/i.test(currentElement.tagName)) {
          return currentElement.textContent?.trim() || '';
        }
      }

      // 3. 要素内の最初の見出しを探す
      const headingInside = element.querySelector('h1, h2, h3, h4, h5, h6');
      if (headingInside) {
        return headingInside.textContent?.trim() || '';
      }

      // 4. 要素自体のテキストを返す（最初の段落または短いテキスト）
      const firstParagraph = element.querySelector('p');
      if (firstParagraph) {
        const text = firstParagraph.textContent?.trim() || '';
        // 長すぎる場合は最初の100文字まで
        return text.length > 100 ? text.slice(0, 100) + '...' : text;
      }

      // 段落がない場合は要素自体のテキストを制限付きで返す
      const text = element.textContent?.trim() || '';
      return text.length > 100 ? text.slice(0, 100) + '...' : text;

    } catch (error) {
      console.error(`[LinkChecker] Error finding anchor text:`, error);
      return '';
    }
  }

  async getTitleOrAnchorText(url: string): Promise<string> {
    try {
      const response = await window.electronAPI.fetchUrl(url);
      if (!response.ok || !response.text) {
        return 'No content found';
      }

      const isAnchor = this.isAnchorLink(url);
      if (isAnchor) {
        const anchorId = this.getAnchorId(url);
        const anchorText = this.findAnchorText(response.text, anchorId);
        if (anchorText) {
          return anchorText;
        }
      }

      // アンカーテキストが見つからない、または通常のURLの場合はページタイトルを返す
      const doc = this.parser.parseFromString(response.text, 'text/html');
      return doc.title || 'No title found';

    } catch (error) {
      console.error(`[LinkChecker] Error getting title/text for ${url}:`, error);
      return 'Error fetching content';
    }
  }

  judgeLink(linkText: string, titleOrText: string, statusCode: number): string {
    if (statusCode !== 200) {
      return 'broken';
    }

    if (!isLinkTextProper(linkText, titleOrText)) {
      return 'needs review';
    }

    return 'appropriate';
  }

  clearCache(): void {
    this.cache.clear();
    console.log('[LinkChecker] Cache cleared');
  }
}