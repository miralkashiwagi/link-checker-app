import React from 'react';
import { ArrowUpDown, Anchor } from 'lucide-react';
import { CheckResult } from '../types';

interface ResultsTableProps {
  groupedResults: Map<string, CheckResult[]>;
  sortField: string;
  sortDirection: string;
  onSort: (field: any) => void;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  groupedResults,
  sortField,
  sortDirection,
  onSort
}) => {
  const handleOpenInBrowser = async (url: string) => {
    await window.electronAPI.openInBrowser(url);
  };

  return (
    <>
      {Array.from(groupedResults.entries()).map(([pageUrl, pageResults]) => (
        <div key={pageUrl} className="mb-8">
          <h2 className="text-xl font-bold mb-4">
            <a
              href={pageUrl}
              className="text-blue-600 hover:text-blue-800"
              onClick={async (e) => {
                e.preventDefault();
                await handleOpenInBrowser(pageUrl);
              }}
            >
              {pageUrl}
            </a>
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 cursor-pointer" onClick={() => onSort('href')}>
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
                  <th className="px-4 py-2 cursor-pointer" onClick={() => onSort('statusCode')}>
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
                  <th className="px-4 py-2 cursor-pointer" onClick={() => onSort('judgment')}>
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
                  <th className="px-4 py-2 cursor-pointer" onClick={() => onSort('linkText')}>
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
                  <tr key={`${result.foundOn}-${result.href}-${result.linkText || ''}-${index}`} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {result.isAnchor && <Anchor size={16} className="text-blue-500" />}
                        <a
                          href={result.href}
                          className="text-blue-600 hover:text-blue-800"
                          onClick={async (e) => {
                            e.preventDefault();
                            await handleOpenInBrowser(result.href);
                          }}
                        >
                          {result.href}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded ${result.statusCode === 200 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {result.statusCode}
                      </span>
                    </td>
                    <td className={`px-4 py-2 ${
                      result.judgment === 'error' ? 'text-red-600 font-bold' :
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
    </>
  );
};
