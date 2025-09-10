import React from "react";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage: string;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, errorMessage }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 shadow-2xl border border-red-200">
          <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 text-gray-500 hover:bg-white hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="px-6 py-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-500 shadow-lg">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <h2 className="mb-2 text-2xl font-bold text-gray-900">Check-in Failed</h2>
            <p className="mb-6 text-red-600 font-medium">{errorMessage}</p>

            <button onClick={onClose} className="w-full rounded-xl bg-gradient-to-r from-red-500 to-rose-500 py-3 px-6 font-semibold text-white shadow-lg hover:from-red-600 hover:to-rose-600">
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;