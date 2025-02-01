import { isLinkTextProper } from '../utils/helpers';
import { CacheEntry } from '../types';

export class LinkChecker {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分

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

  async getTitleOrAnchorText(url: string): Promise<string> {
    try {
      const response = await window.electronAPI.fetchUrl(url);
      return response.titleOrText || 'No title found';
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