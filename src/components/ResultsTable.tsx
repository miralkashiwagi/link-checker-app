import React from 'react';
import {ArrowUpDown, Anchor} from 'lucide-react';
import {CheckResult} from '../types';

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
                <div key={pageUrl} className="my-4 px-1 py-3 bg-white shadow-md rounded">
                    <h2 className="text-md font-bold mb-1 px-2">
                        <a
                            href={pageUrl}
                            className="hover:text-blue-800"
                            onClick={async (e) => {
                                e.preventDefault();
                                await handleOpenInBrowser(pageUrl);
                            }}
                        >
                            {pageUrl}
                        </a>
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm bg-white">
                            <colgroup>
                                <col style={{width: '76px'}}/>
                                <col style={{width: '64px'}}/>
                                <col style={{width: '30%'}}/>
                                <col/>
                                <col style={{width: '30%'}}/>
                            </colgroup>
                            <thead className="bg-gray-100">
                            <tr>
                                <th className="px-2 py-1 cursor-pointer" onClick={() => onSort('judgment')}>
                                    <div className="flex items-center gap-1 text-xs">
                                        判定
                                        {sortField === 'judgment' && (
                                            <ArrowUpDown
                                                size={12}
                                                className={`transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                                            />
                                        )}
                                    </div>
                                </th>
                                <th className="px-2 py-1 cursor-pointer" onClick={() => onSort('statusCode')}>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs">Status</span>
                                        {sortField === 'statusCode' && (
                                            <ArrowUpDown
                                                size={12}
                                                className={`transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                                            />
                                        )}
                                    </div>
                                </th>
                                <th className="px-3 py-1 cursor-pointer" onClick={() => onSort('href')}>
                                    <div className="flex items-center gap-1 text-xs">
                                        URL
                                        {sortField === 'href' && (
                                            <ArrowUpDown
                                                size={12}
                                                className={`transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                                            />
                                        )}
                                    </div>
                                </th>
                                <th className="px-3 py-1 cursor-pointer" onClick={() => onSort('linkText')}>
                                    <div className="flex items-center gap-1 text-xs">
                                        リンクテキスト
                                        {sortField === 'linkText' && (
                                            <ArrowUpDown
                                                size={12}
                                                className={`transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                                            />
                                        )}
                                    </div>
                                </th>
                                <th className="px-3 py-1 bg-red text-xs text-left">ページタイトル or アンカーリンク先テキスト</th>
                            </tr>
                            </thead>
                            <tbody>
                            {pageResults.map((result, index) => (
                                <tr key={`${result.foundOn}-${result.href}-${result.linkText || ''}-${index}`}
                                    className={`border-b border-gray-200 ${
                                        result.judgment === 'error' || result.judgment === 'empty'
                                        ? (index % 2 === 0 ? 'bg-red-100/60' : 'bg-red-100')
                                        : result.judgment === 'review'
                                        ? (index % 2 === 0 ? 'bg-yellow-100/60' : 'bg-yellow-100')
                                        : (index % 2 === 0 ? 'bg-gray-50' : '')
                                    }`}>
                                    <td className={`px-2 py-2 text-xs align-baseline ${
                                        result.judgment === 'error' ? 'text-red-700 font-bold' :
                                            result.judgment === 'review' ? 'text-yellow-700 font-bold' :
                                                result.judgment === 'empty' ? 'text-red-700 font-bold' :
                                                    result.judgment === 'dummy' ? 'text-purple-700 font-bold' :
                                                        result.judgment === 'ok' ? 'text-green-700' : ''
                                    }`}>
                                        {
                                            result.judgment === 'error' ? 'エラー' :
                                                result.judgment === 'review' ? '要チェック' :
                                                    result.judgment === 'empty' ? '未設定' :
                                                        result.judgment === 'dummy' ? 'ダミー' :
                                                            result.judgment === 'ok' ? 'OK' : ''
                                        }
                                    </td>
                                    <td className="px-2 py-2 align-baseline">
                                      <span
                                          className={`px-1 ${result.statusCode === 200 ? 'text-green-800' : 'text-red-800'}`}>
                                        {result.statusCode}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 align-baseline">
                                        <div className="flex items-center gap-1 max-w-md">
                                            {result.isAnchor && <Anchor size={10} className="text-blue-400"/>}
                                            <a
                                                href={result.href}
                                                className="text-blue-600 hover:text-blue-800 break-all text-xs"
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    await handleOpenInBrowser(result.href);
                                                }}
                                            >
                                                {result.href}
                                            </a>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 align-baseline">
                                        {result.linkText && (
                                            <div className="line-clamp-3">
                                                {(result.isAnchor && result.originalHref !== "#") && (
                                                    <Anchor size={10} className="inline-block mr-1 text-gray-400"/>
                                                )}
                                                {result.linkText}
                                            </div>
                                        )}
                                        {(!result.linkText || result.originalHref === "" || result.originalHref === "#") && (
                                            <div className="text-gray-500 text-xs leading-none w-full">
                                                <div className="font-mono bg-gray-100 p-1 rounded">
                                                    <p className="mb-1">Link HTML:</p>
                                                    <pre
                                                        className="whitespace-pre-wrap line-clamp-4">{result.html}</pre>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 align-baseline">
                                        <div className="line-clamp-3">{result.titleOrTextNode}</div>
                                    </td>
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
