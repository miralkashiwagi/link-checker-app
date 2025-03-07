import React from 'react';
import { FileText } from 'lucide-react';

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
    <div className="flex flex-col gap-4 p-4">
      <div className="flex gap-4 items-center">
        <textarea
          className="w-full h-32 p-2 border rounded"
          value={urlInput}
          onChange={(e) => onUrlInputChange(e.target.value)}
          placeholder="Enter URLs to check (one per line)"
          disabled={isChecking}
        />
        <button
          onClick={onSessionCapture}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex flex-shrink-0 items-center gap-2"
          title="ログインが必要なページの場合、このボタンを押して認証情報を記録してください"
        >
          <FileText size={20} />
          認証突破
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          onClick={onCheckLinks}
          disabled={isChecking || !urlInput.trim()}
        >
          {isChecking ? 'Checking...' : 'Check Links'}
        </button>

        {isChecking && (
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={onStopChecking}
          >
            Stop Checking
          </button>
        )}

        {!isChecking && hasResults && (
          <>
            <span className="px-4 py-2 text-green-600 font-medium">Done!</span>
            <button
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
              onClick={onDownloadCsv}
            >
              <FileText size={20} />
              Download CSV
            </button>
          </>
        )}

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showOnlyIssues}
            onChange={e => onShowOnlyIssuesChange(e.target.checked)}
            className="form-checkbox h-5 w-5 text-blue-600"
          />
          <span>Show only issues</span>
        </label>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Note: If a redirect occurs, display the status code and text of the page after redirect.
      </p>
    </div>
  );
};
