import React, { useEffect } from "react";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestName: string;
  guestEmail: string;
  checkInTime: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ 
  isOpen, 
  onClose, 
  guestName, 
  guestEmail, 
  checkInTime 
}) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => onClose(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 shadow-2xl border border-green-200">
          <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 text-gray-500 hover:bg-white hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="px-6 py-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg animate-bounce">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="mb-2 text-2xl font-bold text-gray-900">Entry Approved!</h2>
            <p className="mb-6 text-lg text-green-600 font-medium">Welcome to the event</p>

            <div className="mb-6 rounded-xl bg-white/80 p-4 border border-green-100">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Guest Name</span>
                  <span className="text-sm font-bold text-gray-900">{guestName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Email</span>
                  <span className="text-sm text-gray-700">{guestEmail}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Check-in Time</span>
                  <span className="text-sm text-gray-700">{checkInTime}</span>
                </div>
              </div>
            </div>

            <button onClick={onClose} className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 py-3 px-6 font-semibold text-white shadow-lg hover:from-green-600 hover:to-emerald-600">
              Continue Scanning
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;