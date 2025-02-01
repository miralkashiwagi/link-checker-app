import React, { useState, useCallback } from 'react';
import { FileText, Link as LinkIcon, ArrowUpDown } from 'lucide-react';
import { Crawler } from './services/Crawler';
import { LinkChecker } from './services/LinkChecker';
import { toAbsoluteUrl } from './utils/helpers';
import { CheckResult } from './types';

type SortField = 'statusCode' | 'linkText' | 'href' | 'judgment' | 'titleOrTextNode';
type SortDirection = 'asc' | 'desc';

function App() {
  const [urlInput, setUrlInput] = useState<string>('');
  const [results, setResults] = useState<CheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [sortField, setSortField] = useState<SortField>('statusCode');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [error, setError] = useState<string | null>(null);

  const handleSort = useCallback((field: SortField) => {
    setSortField(field);
    setSortDirection(prev => {
      // 同じフィールドをクリックした場合は昇順/降順を切り替え
      return field === sortField ? (prev === 'asc' ? 'desc' : 'asc') : 'asc';
    });
  }, [sortField]);

  const sortedResults = React.useMemo(() => {
    return [...results].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [results, sortField, sortDirection]);

  const checkLinks = async () => {
    setIsChecking(true);
    setResults([]);
    setError(null);

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

    if (urls.length === 0) {
      setError('No valid URLs provided');
      setIsChecking(false);
      return;
    }

    const crawler = new Crawler();
    const linkChecker = new LinkChecker();
    const processedLinks = new Map<string, Set<string>>();
    const errors: Array<{url: string; error: string}> = [];

    try {
      for (const pageUrl of urls) {
        try {
          const links = await crawler.crawlPage(pageUrl);

          for (const link of links) {
            const fullUrl = toAbsoluteUrl(link.href, pageUrl);
            if (!fullUrl) continue;

            const linkTexts = processedLinks.get(fullUrl) || new Set();
            if (linkTexts.has(link.text)) continue;
            linkTexts.add(link.text);
            processedLinks.set(fullUrl, linkTexts);

            try {
              const [statusCode, titleOrText] = await linkChecker.checkLink(fullUrl);
              const judgment = linkChecker.judgeLink(link.text, titleOrText, statusCode);

              setResults(prev => [...prev, {
                foundOn: pageUrl,
                href: fullUrl,
                statusCode,
                linkText: link.text,
                titleOrTextNode: titleOrText,
                judgment,
                error: null,
                html: link.html,
                parentHtml: link.parentHtml
              }]);

            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              errors.push({ url: fullUrl, error: errorMessage });
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ url: pageUrl, error: errorMessage });
        }
      }

      if (errors.length > 0) {
        setError(`Errors occurred while checking links:\n${errors.map(e => `${e.url}: ${e.error}`).join('\n')}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Failed to check links: ${errorMessage}`);
    } finally {
      setIsChecking(false);
      crawler.clearProcessedUrls();
    }
  };

  const downloadCsv = useCallback(() => {
    const headers = ['Found On', 'URL', 'Status', 'Link Text', 'Title/Text', 'Judgment', 'Error'];
    const rows = sortedResults.map(r => [
      r.foundOn,
      r.href,
      r.statusCode,
      r.linkText,
      r.titleOrTextNode,
      r.judgment,
      r.error || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `link-check-results-${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [sortedResults]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Link Checker</h1>
      
      <div className="mb-4">
        <textarea
          className="w-full h-32 p-2 border rounded"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Enter URLs to check (one per line)"
          disabled={isChecking}
        />
      </div>

      <div className="flex gap-4 mb-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          onClick={checkLinks}
          disabled={isChecking || !urlInput.trim()}
        >
          {isChecking ? 'Checking...' : 'Check Links'}
        </button>

        <button
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          onClick={downloadCsv}
          disabled={results.length === 0}
        >
          Download CSV
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="px-4 py-2 cursor-pointer" onClick={() => handleSort('href')}>
                  <div className="flex items-center gap-1">
                    <LinkIcon size={16} />
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
                <th className="px-4 py-2 cursor-pointer" onClick={() => handleSort('titleOrTextNode')}>
                  <div className="flex items-center gap-1">
                    <FileText size={16} />
                    Title/Text
                    {sortField === 'titleOrTextNode' && (
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
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((result, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="px-4 py-2 break-all">
                    <a href={result.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                      {result.href}
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded ${
                      result.statusCode === 200 ? 'bg-green-100 text-green-800' :
                      result.statusCode === 404 ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.statusCode || 'Error'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {result.linkText || (
                      <div className="text-gray-500 text-sm">
                        <div className="font-mono bg-gray-100 p-2 rounded">
                          <p className="mb-2">Link HTML:</p>
                          <pre className="whitespace-pre-wrap">{result.html}</pre>
                          {result.parentHtml && (
                            <>
                              <p className="mt-4 mb-2">Parent HTML:</p>
                              <pre className="whitespace-pre-wrap">{result.parentHtml}</pre>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">{result.titleOrTextNode}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded ${
                      result.judgment === 'appropriate' ? 'bg-green-100 text-green-800' :
                      result.judgment === 'broken' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.judgment}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;