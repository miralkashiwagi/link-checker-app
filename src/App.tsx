import React, { useState, useCallback, useRef } from 'react';
import { FileText, Link as LinkIcon, ArrowUpDown, Anchor } from 'lucide-react';
import { Crawler } from './services/Crawler';
import { LinkChecker } from './services/LinkChecker';
import { toAbsoluteUrl } from './utils/helpers';
import { CheckResult } from './types';

// ソート対象のフィールドの型定義
type SortField = 'statusCode' | 'linkText' | 'href' | 'judgment' | 'titleOrTextNode';
// ソートの方向（昇順・降順）の型定義
type SortDirection = 'asc' | 'desc';

function App() {
  // 入力されたURLを管理するstate
  const [urlInput, setUrlInput] = useState<string>('');
  // リンクチェックの結果を管理するstate
  const [results, setResults] = useState<CheckResult[]>([]);
  // チェック中かどうかを管理するstate
  const [isChecking, setIsChecking] = useState(false);
  // 現在のソートフィールドを管理するstate
  const [sortField, setSortField] = useState<SortField>('statusCode');
  // ソートの方向を管理するstate
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  // エラーメッセージを管理するstate
  const [error, setError] = useState<string | null>(null);
  // 問題のあるリンクのみを表示するかどうかを管理するstate
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);
  // 非同期処理のキャンセル用のAbortControllerを管理するref
  const abortControllerRef = useRef<AbortController | null>(null);

  // ソートフィールドが変更された時の処理
  const handleSort = useCallback((field: SortField) => {
    setSortField(field);
    setSortDirection(prev => {
      return field === sortField ? (prev === 'asc' ? 'desc' : 'asc') : 'asc';
    });
  }, [sortField]);

  // 問題のあるリンクのみをフィルタリングする処理
  const filteredResults = React.useMemo(() => {
    if (!showOnlyIssues) return results;

    // 問題のあるリンクのみをフィルタリング
    const processedUrls = new Set<string>();
    return results.filter(result => {

      if (result.judgment === 'ok') return false;

      // リンクテキストが空の場合は、HTML構造も含めて比較
      const key = (!result.linkText)
        ? `${result.href}-${result.html}`
        : `${result.href}-${result.linkText}`;

      if (processedUrls.has(key)) return false;
      processedUrls.add(key);

      return true;
    });
  }, [results, showOnlyIssues]);

  // 結果をソートする処理
  const sortedResults = React.useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      const aValue = a[sortField];
      const bValue = b[sortField];

      // 数値の場合は数値としてソート
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }

      // 文字列の場合は文字列としてソート
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [filteredResults, sortField, sortDirection]);

  // URLごとに結果をグループ化する処理
  const groupedResults = React.useMemo(() => {
    const groups = new Map<string, CheckResult[]>();
    for (const result of sortedResults) {
      const group = groups.get(result.foundOn) || [];
      group.push(result);
      groups.set(result.foundOn, group);
    }
    return groups;
  }, [sortedResults]);

  // リンクチェックを停止する処理
  const stopChecking = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsChecking(false);
      setError('Link checking was cancelled');
    }
  }, []);

  // リンクをチェックする主要な処理
  const checkLinks = async () => {
    // 初期化
    setIsChecking(true);
    setResults([]);
    setError(null);
    abortControllerRef.current = new AbortController();

    // 指定したミリ秒待機する関数
    const delay = (ms: number) => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(resolve, ms);
        abortControllerRef.current?.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('Cancelled'));
        });
      });
    };

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
    // 処理済みのリンクを管理するMap
    const processedLinks = new Map<string, Set<string>>();
    const errors: Array<{ url: string; error: string }> = [];

    try {
      // 各URLに対して処理を実行
      for (const pageUrl of urls) {
        try {
          // キャンセルされた場合は処理を中断
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('Cancelled');
          }

          // レート制限を考慮して待機
          await delay(1000);
          // ページ内のリンクを取得
          const links = await crawler.crawlPage(pageUrl);

          // 各リンクに対して処理を実行
          for (const link of links) {
            if (abortControllerRef.current?.signal.aborted) {
              throw new Error('Cancelled');
            }

            // 相対URLを絶対URLに変換
            const fullUrl = toAbsoluteUrl(link.href, pageUrl);
            if (!fullUrl) continue;

            // リンクテキストが空の場合は、HTMLの構造も含めて比較
            const linkKey = !link.text ? `${link.html}` : link.text;
            const linkTexts = processedLinks.get(fullUrl) || new Set();
            if (linkTexts.has(linkKey)) continue;
            linkTexts.add(linkKey);
            processedLinks.set(fullUrl, linkTexts);

            try {
              // レート制限を考慮して待機
              await delay(1000);
              // リンクの状態をチェック
              const [statusCode, titleOrText] = await linkChecker.checkLink(fullUrl);
              const judgment = linkChecker.judgeLink(
                link.text,
                titleOrText,
                statusCode,
                link.originalHref,
                fullUrl,
                pageUrl
              );

              // 結果を保存
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

            } catch (error) {
              if (error.message === 'Cancelled') throw error;
              const errorMessage = error instanceof Error ? error.message : String(error);
              errors.push({ url: fullUrl, error: errorMessage });
            }
          }
        } catch (error) {
          if (error.message === 'Cancelled') throw error;
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ url: pageUrl, error: errorMessage });
        }
      }

      // エラーがある場合はエラーメッセージを設定
      if (errors.length > 0) {
        setError(`Errors occurred while checking links:\n${errors.map(e => `${e.url}: ${e.error}`).join('\n')}`);
      }
    } catch (error) {
      if (error.message !== 'Cancelled') {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setError(`Failed to check links: ${errorMessage}`);
      }
    } finally {
      // 処理完了時のクリーンアップ
      setIsChecking(false);
      abortControllerRef.current = null;
      crawler.clearProcessedUrls();
    }
  };

  // セッションキャプチャーウィンドウを開く処理
  const handleSessionCapture = useCallback(async () => {
    try {
      const baseUrl = urlInput.trim();
      if (!baseUrl) {
        setError('URLを入力してください');
        return;
      }
      await window.electronAPI.startSessionCapture(baseUrl);
    } catch (err) {
      setError('セッションキャプチャー中にエラーが発生しました: ' + (err as Error).message);
    }
  }, [urlInput]);

  // CSVダウンロード用の関数
  const downloadCsv = useCallback(() => {
    // CSVデータを生成
    const csvContent = [
      ['Found On', 'Link Text', 'URL', 'Original URL', 'Status Code', 'Title/Text', 'Judgment'],
      ...results.map(result => [
        result.foundOn,
        result.linkText,
        result.href,
        result.originalHref,
        result.statusCode,
        result.titleOrTextNode,
        result.judgment
      ])
    ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    // ダウンロード用のBlobを生成
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'link-checker-results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [results]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Link Text Sutability Checker</h1>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex gap-4 items-center">
          <textarea
            className="w-full h-32 p-2 border rounded"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Enter URLs to check (one per line)"
            disabled={isChecking}
          />
          <button
            onClick={handleSessionCapture}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
            title="ログインが必要なページの場合、このボタンを押して認証情報を記録してください"
          >
            <FileText size={20} />
            Basic認証突破
          </button>
        </div>
        </div>


        <div className="flex gap-4 mb-4">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            onClick={checkLinks}
            disabled={isChecking || !urlInput.trim()}
          >
            {isChecking ? 'Checking...' : 'Check Links'}
          </button>

          {isChecking && (
            <button
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              onClick={stopChecking}
            >
              Stop Checking
            </button>
          )}

          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
            onClick={downloadCsv}
            disabled={results.length === 0}
          >
            Download CSV
          </button>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlyIssues}
              onChange={e => setShowOnlyIssues(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span>Show only issues</span>
          </label>

          <p className="text-sm text-gray-500">Note: If a redirect occurs, display the status code and text of the page after redirect.</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {Array.from(groupedResults.entries()).map(([pageUrl, pageResults]) => (
          <div key={pageUrl} className="mb-8">
            <h2 className="text-xl font-bold mb-4">
              <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                {pageUrl}
              </a>
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 cursor-pointer" onClick={() => handleSort('href')}>
                      <div className="flex items-center gap-1">
                        URL
                        {sortField === 'href' && (
                          <ArrowUpDown
                            size={16}
                            className={`transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                          />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-2 cursor-pointer" onClick={() => handleSort('statusCode')}>
                      <div className="flex items-center gap-1">
                        Status
                        {sortField === 'statusCode' && (
                          <ArrowUpDown
                            size={16}
                            className={`transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                          />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-2 cursor-pointer" onClick={() => handleSort('judgment')}>
                      <div className="flex items-center gap-1">
                        Judgment
                        {sortField === 'judgment' && (
                          <ArrowUpDown
                            size={16}
                            className={`transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                          />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-2 cursor-pointer" onClick={() => handleSort('linkText')}>
                      <div className="flex items-center gap-1">
                        Link Text
                        {sortField === 'linkText' && (
                          <ArrowUpDown
                            size={16}
                            className={`transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                          />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-2">Title/Text Node</th>

                  </tr>
                </thead>
                <tbody>
                  {pageResults.map((result, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="px-4 py-2 break-all text-xs">
                        <a href={result.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          {result.href}
                        </a>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded ${result.statusCode === 200 ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                          {result.statusCode}
                        </span>
                      </td>
                      <td className={`px-4 py-2 ${result.judgment === 'error' ? 'text-red-600 font-bold' :
                          result.judgment === 'review' ? 'text-yellow-600 font-bold' :
                            result.judgment === 'empty' ? 'text-red-600 font-bold' :
                              result.judgment === 'dummy' ? 'text-purple-600 font-bold' :
                                result.judgment === 'ok' ? 'text-green-600' : ''
                        }`}>
                        {result.judgment}
                      </td>
                      <td className="px-4 py-2">
                        {(result.isAnchor && result.originalHref !== "#") && (
                          <Anchor size={16} className="inline-block mr-1 text-gray-500" />
                        )}
                        {result.linkText && (
                          <div>{result.linkText}</div>
                        )}
                        {(!result.linkText || result.originalHref === "" || result.originalHref === "#") && (
                          <div className="text-gray-500 text-xs leading-none">
                            <div className="font-mono bg-gray-100 p-1 rounded">
                              <p className="mb-2">Link HTML:</p>
                              <pre className="whitespace-pre-wrap">{result.html}</pre>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">{result.titleOrTextNode}</td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      );
}

      export default App;