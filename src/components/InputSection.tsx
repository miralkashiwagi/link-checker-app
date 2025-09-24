import React from 'react';
import {Key,FileDown,Play} from 'lucide-react';

interface InputSectionProps {
    urlInput: string;
    isChecking: boolean;
    onUrlInputChange: (value: string) => void;
    onSessionCapture: () => void;
    onCheckLinks: () => void;
    onStopChecking: () => void;
    onDownloadCsv: () => void;
    onShowOnlyIssuesChange: (checked: boolean) => void;
    showOnlyIssues: boolean;
    hasResults: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({
                                                              urlInput,
                                                              isChecking,
                                                              onUrlInputChange,
                                                              onSessionCapture,
                                                              onCheckLinks,
                                                              onStopChecking,
                                                              onDownloadCsv,
                                                              onShowOnlyIssuesChange,
                                                              showOnlyIssues,
                                                              hasResults
                                                          }) => {
    return (
        <div className="flex flex-col gap-4 p-3 shadow-md">
            <div className="flex gap-2 items-center">

                <div className="flex gap-1 flex-col flex-grow">
                    <h2 className="text-xs font-bold">URL（1行に1URL）</h2>
                    <textarea
                        className="w-full h-32 p-2 border rounded"
                        value={urlInput}
                        onChange={(e) => onUrlInputChange(e.target.value)}
                        placeholder="URLを入力してください。1行に1URLずつ。"
                        disabled={isChecking}
                    />
                </div>
                <div className="flex gap-2 flex-col">
                    <button
                        className="px-4 py-2 flex gap-1 items-center bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                        onClick={onCheckLinks}
                        disabled={isChecking || !urlInput.trim()}
                    >
                        <Play size={16}/>
                        {isChecking ? 'チェック中...' : 'チェック開始'}
                    </button>
                    <button
                        onClick={onSessionCapture}
                        className="px-4 py-2 bg-gray-200 text-black rounded hover:bg-sky-200 text-sm flex flex-shrink-0 items-center gap-2"
                        title="ログインが必要なページの場合、このボタンを押して認証情報を記録してください"
                    >
                        <Key size={16}/>
                        認証入力
                    </button>
                </div>
            </div>

            <div className="flex gap-2 items-end">
                <div className="flex gap-4 flex-grow flex-shrink-0">
                    {isChecking && (
                        <button
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                            onClick={onStopChecking}
                        >
                            中断
                        </button>
                    )}

                    {!isChecking && hasResults && (
                        <>
                            <span className="p-2 text-green-600 font-medium">チェック完了!</span>
                            <button
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
                                onClick={onDownloadCsv}
                            >
                                <FileDown size={16}/>
                                CSVダウンロード
                            </button>
                        </>
                    )}
                    {hasResults && (
                        <label className="flex text-sm items-center gap-2">
                            <input
                                type="checkbox"
                                checked={showOnlyIssues}
                                onChange={e => onShowOnlyIssuesChange(e.target.checked)}
                                className="form-checkbox h-5 w-5 text-blue-600"
                            />
                            <span>要チェック項目のみ表示</span>
                        </label>
                    )}
                </div>
                <p className="text-xs text-gray-500">
                    ※リンクテキストとURLが完全に同一のリンクは、2ページ目以降の一覧では省略されます。<br/>
                    ※リダイレクトが発生した場合は、リダイレクト後のページのステータスコード・タイトルを表示します。
                </p>
            </div>
        </div>
    );
};
