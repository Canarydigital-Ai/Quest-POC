import React, { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import SuccessModal from "../components/modal/SuccessModal"; 
import ErrorModal from "../components/modal/ErrorModal"; 

interface QRScannerProps {
  onResult?: (text: string) => void;
  onError?: (err: unknown) => void;
  facingMode?: "user" | "environment";
  hint?: string;
  cooldownMs?: number; 
}

const QRScanner: React.FC<QRScannerProps> = ({
  onResult,
  onError,
  facingMode = "environment",
  hint = "Point the camera at a QR code",
  cooldownMs = 200, 
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const nextAllowedRef = useRef<number>(0); 

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successData, setSuccessData] = useState({ name: '', email: '', time: '' });
  const [errorMessage, setErrorMessage] = useState('');

  const handleCheckIn = useCallback(async (qrData: any) => {
    try {
      setIsProcessing(true);
      setStatus("Processing check-in...");
      const { token } = qrData;
      
      if (!token) {
        throw new Error("Invalid QR code: No token found");
      }

      const rsvpRef = doc(db, "rsvps", token);
      const rsvpSnap = await getDoc(rsvpRef);
      
      if (!rsvpSnap.exists()) {
        throw new Error("RSVP not found");
      }

      const rsvpData = rsvpSnap.data();
      
      if (rsvpData.status === "checked_in") {
        setErrorMessage(`${rsvpData.name} is already checked in!`);
        setShowErrorModal(true);
        setTimeout(() => setShowErrorModal(false), 800);
        return;
      }

      await updateDoc(rsvpRef, {
        coming: true,
        status: "checked_in",
        checkedInAt: new Date(),
        checkedInBy: "scanner"
      });

      const checkInTime = new Date().toLocaleString();
      setSuccessData({
        name: rsvpData.name,
        email: rsvpData.email,
        time: checkInTime
      });
      setShowSuccessModal(true);

      onResult?.(JSON.stringify({
        ...qrData,
        status: "checked_in",
        checkedInAt: new Date().toISOString()
      }));

    } catch (error: any) {
      console.error("Check-in error:", error);
      setErrorMessage(error.message);
      setShowErrorModal(true);
      setTimeout(() => setShowErrorModal(false), 800);
      onError?.(error);
    } finally {
      setIsProcessing(false);
      setStatus("Ready for next scan");
    }
  }, [onResult, onError]);

  const start = useCallback(async () => {
    try {
      setStatus("Requesting camera…");

      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }

      controlsRef.current?.stop();
      controlsRef.current = null;

      const video = videoRef.current!;
      controlsRef.current = await readerRef.current.decodeFromConstraints(
        {
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        video,
        (result) => {
          if (result && !isProcessing) {
            const now = Date.now();
            if (now < nextAllowedRef.current) return;
            nextAllowedRef.current = now + cooldownMs;

            const text = result.getText();
            
            try {
              const qrData = JSON.parse(text);
              
              if (qrData.t === "rsvp" && qrData.token) {
                handleCheckIn(qrData);
              } else {
                setErrorMessage("Invalid RSVP QR code format");
                setShowErrorModal(true);
                onResult?.(text);
              }
            } catch (parseError) {
              if (text.includes('demo-valid')) {
                handleCheckIn({ t: "rsvp", token: "valid" });
              } else if (text.includes('demo-invalid')) {
                handleCheckIn({ t: "rsvp", token: "invalid" });
              } else if (text.includes('demo-checked')) {
                handleCheckIn({ t: "rsvp", token: "checked-in" });
              } else {
                setErrorMessage("Not a valid RSVP QR code");
                setShowErrorModal(true);
                onResult?.(text);
              }
            }
          }
        }
      );

      setRunning(true);
      setStatus(hint);
    } catch (e: any) {
      setRunning(false);
      if (e?.name === "NotAllowedError") {
        setStatus("Camera permission denied. Please allow camera access and retry.");
      } else if (e?.name === "NotFoundError") {
        setStatus("No camera found. Please connect a webcam or try another device.");
      } else if (e?.name === "SecurityError") {
        setStatus("Please use HTTPS or http://localhost for development.");
      } else {
        setStatus("Unable to start camera.");
      }
      onError?.(e);
    }
  }, [cooldownMs, facingMode, hint, onResult, onError, handleCheckIn, isProcessing]);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setRunning(false);
    setStatus("Camera stopped");
  }, []);

  useEffect(() => {
    setStatus("Ready to scan - Tap Start to begin");
    return () => controlsRef.current?.stop();
  }, []);

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-white/10 p-3 backdrop-blur-sm">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text">
            Event Check-in Scanner
          </h1>
          <p className="text-gray-300">Scan QR codes for instant guest check-in</p>
        </div>

        <div className="relative w-full max-w-6xl bg-red-900 ">
          <div className="overflow-hidden rounded-3xl border border-white/20 bg-black/40 backdrop-blur-sm shadow-2xl">
            <div className="relative aspect-[16/9]">
              <video
                ref={videoRef}
                muted
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
              
              {/* Scan Overlay */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-black/30"></div>
                
                <div className="absolute left-1/2 top-1/2 w-64 h-64 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="absolute inset-0 bg-transparent border-2 border-green-400 rounded-2xl shadow-2xl shadow-green-400/20"></div>
                  
                  {/* Corner crosshairs */}
                  <div className="absolute -top-2 -left-2">
                    <div className="w-8 h-2 bg-green-400 rounded-full"></div>
                    <div className="w-2 h-8 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="absolute -top-2 -right-2">
                    <div className="w-8 h-2 bg-green-400 rounded-full ml-auto"></div>
                    <div className="w-2 h-8 bg-green-400 rounded-full ml-auto"></div>
                  </div>
                  <div className="absolute -bottom-2 -left-2">
                    <div className="w-2 h-8 bg-green-400 rounded-full"></div>
                    <div className="w-8 h-2 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="absolute -bottom-2 -right-2">
                    <div className="w-2 h-8 bg-green-400 rounded-full ml-auto"></div>
                    <div className="w-8 h-2 bg-green-400 rounded-full ml-auto"></div>
                  </div>
                  
                  {/* Center crosshair */}
                  <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-6 h-0.5 bg-green-400 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="w-0.5 h-6 bg-green-400 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                  </div>
                  
                  {/* Scanning Animation */}
                  {running && !isProcessing && (
                    <>
                      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse transform -translate-y-1/2"></div>
                      <div className="absolute left-1/2 inset-y-0 w-0.5 bg-gradient-to-b from-transparent via-green-400 to-transparent animate-pulse transform -translate-x-1/2"></div>
                    </>
                  )}
                  
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center">
                    <p className="text-sm text-green-400 font-medium bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                      Position QR code here
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Processing Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center text-white">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg font-medium">Processing check-in...</p>
                    <p className="text-sm text-gray-300">Please wait</p>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="absolute inset-x-4 bottom-4">
                <div className="bg-black/80 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-400 mb-1">Status</p>
                      <p className="text-sm text-white">{status}</p>
                    </div>
                    <div className="flex gap-3">
                      {!running ? (
                        <button
                          onClick={start}
                          disabled={isProcessing}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-semibold text-white shadow-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Start Scanning
                        </button>
                      ) : (
                        <button
                          onClick={stop}
                          disabled={isProcessing}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-6 py-3 font-semibold text-white shadow-lg hover:from-red-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Stop
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        guestName={successData.name}
        guestEmail={successData.email}
        checkInTime={successData.time}
      />

      <ErrorModal 
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        errorMessage={errorMessage}
      />
    </>
  );
};

export default QRScanner;