import { useMemo } from 'react';
import { CheckResult } from '../types';

export const useResults = (results: CheckResult[], showOnlyIssues: boolean) => {
  const filteredResults = useMemo(() => {
    if (!showOnlyIssues) return results;

    const processedUrls = new Set<string>();
    return results.filter(result => {
      if (result.judgment === 'ok') return false;

      const key = (!result.linkText)
        ? `${result.href}-${result.html}`
        : `${result.href}-${result.linkText}`;

      if (processedUrls.has(key)) return false;
      processedUrls.add(key);

      return true;
    });
  }, [results, showOnlyIssues]);

  const groupedResults = useMemo(() => {
    const groups = new Map<string, CheckResult[]>();
    for (const result of filteredResults) {
      const group = groups.get(result.foundOn) || [];
      group.push(result);
      groups.set(result.foundOn, group);
    }
    return groups;
  }, [filteredResults]);

  return {
    filteredResults,
    groupedResults
  };
};
