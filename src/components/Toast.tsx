import React from 'react';

interface ToastProps {
  show: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ show, onClose }) => {
  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center shadow-lg">
      <span className="font-medium mr-2">チェック完了!</span>
      <button
        onClick={onClose}
        className="ml-4 text-green-700 hover:text-green-900"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
