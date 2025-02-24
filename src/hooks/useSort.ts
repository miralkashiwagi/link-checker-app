import { useState, useCallback } from 'react';
import { CheckResult } from '../types';

type SortField = 'statusCode' | 'linkText' | 'href' | 'judgment' | 'titleOrTextNode';
type SortDirection = 'asc' | 'desc';

export const useSort = () => {
  const [sortField, setSortField] = useState<SortField>('statusCode');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = useCallback((field: SortField) => {
    setSortField(field);
    setSortDirection(prev => {
      return field === sortField ? (prev === 'asc' ? 'desc' : 'asc') : 'asc';
    });
  }, [sortField]);

  const sortResults = (results: CheckResult[]) => {
    return [...results].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }

      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  };

  return {
    sortField,
    sortDirection,
    handleSort,
    sortResults
  };
};
