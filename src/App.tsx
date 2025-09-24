import React, { useState, useCallback } from 'react';
import { useLinksChecker } from './hooks/useLinksChecker';
import { useSort } from './hooks/useSort';
import { useResults } from './hooks/useResults';
import { Toast } from './components/Toast';
import { InputSection } from './components/InputSection';
import { ResultsTable } from './components/ResultsTable';

function App() {
  const [urlInput, setUrlInput] = useState<string>('');
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);

  const {
    results,
    isChecking,
    error,
    showToast,
    setShowToast,
    checkLinks,
    stopChecking
  } = useLinksChecker();

  const {
    sortField,
    sortDirection,
    handleSort,
    sortResults
  } = useSort();

  const { groupedResults } = useResults(sortResults(results), showOnlyIssues);

  const handleSessionCapture = useCallback(async () => {
    try {
      const baseUrl = urlInput.trim();
      if (!baseUrl) {
        throw new Error('URLを入力してください');
      }
      await window.electronAPI.startSessionCapture(baseUrl);
    } catch (err) {
      throw new Error('セッションキャプチャー中にエラーが発生しました: ' + (err as Error).message);
    }
  }, [urlInput]);

  const downloadCsv = useCallback(() => {
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
    <div className="mx-auto p-4">
      <Toast show={showToast} onClose={() => setShowToast(false)} />
      <h1 className="text-lg font-bold mb-1">LinkLegit - Link Text Sutability Checker</h1>
      <InputSection
        urlInput={urlInput}
        isChecking={isChecking}
        onUrlInputChange={setUrlInput}
        onSessionCapture={handleSessionCapture}
        onCheckLinks={() => checkLinks(urlInput)}
        onStopChecking={stopChecking}
        onDownloadCsv={downloadCsv}
        onShowOnlyIssuesChange={setShowOnlyIssues}
        showOnlyIssues={showOnlyIssues}
        hasResults={results.length > 0}
      />
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <ResultsTable
        groupedResults={groupedResults}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    </div>
  );
}

export default App;