import { useState, useRef, useCallback } from 'react';
import { Crawler } from '../services/Crawler';
import { LinkChecker } from '../services/LinkChecker';
import { toAbsoluteUrl } from '../utils/helpers';
import { CheckResult } from '../types';

export const useLinksChecker = () => {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const delay = (ms: number) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, ms);
      abortControllerRef.current?.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Cancelled'));
      });
    });
  };

  const stopChecking = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsChecking(false);
      setError('Link checking was cancelled');
    }
  }, []);

  const checkLinks = async (urlInput: string) => {
    // 初期化
    setIsChecking(true);
    setResults([]);
    setError(null);
    setShowToast(false);
    abortControllerRef.current = new AbortController();

    // 入力されたURLを処理
    const urls = urlInput
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(url => {
        try {
          const urlObj = new URL(url);
          return urlObj.toString();
        } catch {
          return null;
        }
      })
      .filter((url): url is string => url !== null);

    // 有効なURLがない場合はエラー
    if (urls.length === 0) {
      setError('No valid URLs provided');
      setIsChecking(false);
      return;
    }

    const crawler = new Crawler();
    const linkChecker = new LinkChecker();
    const processedLinks = new Map<string, Set<string>>();
    const errors: Array<{ url: string; error: string }> = [];

    try {
      for (const pageUrl of urls) {
        try {
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('Cancelled');
          }

          await delay(1000);
          const links = await crawler.crawlPage(pageUrl);

          for (const link of links) {
            if (abortControllerRef.current?.signal.aborted) {
              throw new Error('Cancelled');
            }

            const fullUrl = toAbsoluteUrl(link.href, pageUrl);
            if (!fullUrl) continue;

            const linkKey = !link.text ? `${link.html}` : link.text;
            const linkTexts = processedLinks.get(fullUrl) || new Set();
            if (linkTexts.has(linkKey)) continue;
            linkTexts.add(linkKey);
            processedLinks.set(fullUrl, linkTexts);

            await delay(1000);
            
            if (abortControllerRef.current?.signal.aborted) {
              throw new Error('Cancelled');
            }

            const [statusCode, titleOrText] = await linkChecker.checkLink(fullUrl);
            
            if (abortControllerRef.current?.signal.aborted) {
              throw new Error('Cancelled');
            }

            const judgment = linkChecker.judgeLink(
              link.text,
              titleOrText,
              statusCode,
              link.originalHref,
              fullUrl,
              pageUrl
            );

            setResults(prev => [...prev, {
              foundOn: pageUrl,
              href: fullUrl,
              originalHref: link.originalHref,
              statusCode,
              linkText: link.text,
              titleOrTextNode: titleOrText,
              judgment,
              error: null,
              html: link.html,
              parentHtml: link.parentHtml,
              isAnchor: link.isAnchor || false
            }]);
          }
        } catch (error) {
          if (error.message === 'Cancelled') throw error;
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ url: pageUrl, error: errorMessage });
        }
      }

      if (errors.length > 0) {
        setError(`Errors occurred while checking links:\n${errors.map(e => `${e.url}: ${e.error}`).join('\n')}`);
      }
    } catch (error) {
      if (error.message === 'Cancelled') {
        setError('Link checking was cancelled');
      } else {
        setError(`An error occurred: ${error.message}`);
      }
    } finally {
      setIsChecking(false);
      if (!error && !abortControllerRef.current?.signal.aborted) {
        setShowToast(true);
      }
      abortControllerRef.current = null;
      crawler.clearProcessedUrls();
    }
  };

  return {
    results,
    isChecking,
    error,
    showToast,
    setShowToast,
    checkLinks,
    stopChecking
  };
};
