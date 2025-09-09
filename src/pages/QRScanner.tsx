import React, { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

type Props = {
  onResult?: (text: string) => void;
  onError?: (err: unknown) => void;
  facingMode?: "user" | "environment";
  hint?: string;
  cooldownMs?: number; 
};

const QRScanner: React.FC<Props> = ({
  onResult,
  onError,
  facingMode = "environment",
  hint = "Point the camera at a QR code",
  cooldownMs = 200, // Increased cooldown to prevent rapid scanning
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const nextAllowedRef = useRef<number>(0); 

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [lastScanResult, setLastScanResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const welcomeMessage = 'Welcome to the QR scanner!';


  // Function to handle check-in API call
  const handleCheckIn = useCallback(async (qrData: any) => {
    try {
      setIsProcessing(true);
      setStatus("Processing check-in...");
      const { token } = qrData;
      
      if (!token) {
        throw new Error("Invalid QR code: No token found");
      }

      // Get the current RSVP record
      const rsvpRef = doc(db, "rsvps", token);
      const rsvpSnap = await getDoc(rsvpRef);
      
      if (!rsvpSnap.exists()) {
        throw new Error("RSVP not found");
      }

      const rsvpData = rsvpSnap.data();
      
      // Check if already checked in
      if (rsvpData.status === "checked_in") {
        setStatus(`${rsvpData.name} is already checked in!`);
        return;
      }

      // Update the RSVP record with check-in status
      await updateDoc(rsvpRef, {
        coming: true,
        status: "checked_in",
        checkedInAt: new Date(),
        checkedInBy: "scanner" // You can add user info here if needed
      });

      setStatus(`✅ ${rsvpData.name} checked in successfully!`);
      setLastScanResult(`Welcome ${rsvpData.name}! Email: ${rsvpData.email}`);

      // Optional: Call onResult if provided
      onResult?.(JSON.stringify({
        ...qrData,
        status: "checked_in",
        checkedInAt: new Date().toISOString()
      }));

    } catch (error: any) {
      console.error("Check-in error:", error);
      setStatus(`❌ Check-in failed: ${error.message}`);
      onError?.(error);
    } finally {
      setIsProcessing(false);
      
      // Reset status after 3 seconds
      setTimeout(() => {
        if (running) {
          setStatus(hint);
        }
      }, 3000);
    }
  }, [onResult, onError, hint, running]);

  const start = useCallback(async () => {
    try {
      setStatus("Requesting camera…");

      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }

      // Stop any previous session
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
        (result, err) => {
          if (result && !isProcessing) {
            const now = Date.now();
            if (now < nextAllowedRef.current) return; // ignore duplicates during cooldown
            nextAllowedRef.current = now + cooldownMs;

            const text = result.getText();
            
            try {
              // Try to parse the QR code as JSON
              const qrData = JSON.parse(text);
              
              // Check if it's an RSVP QR code
              if (qrData.t === "rsvp" && qrData.token) {
                handleCheckIn(qrData);
              } else {
                setStatus("❌ Invalid RSVP QR code");
                onResult?.(text);
              }
            } catch (parseError) {
              // If not JSON, treat as regular text
              setStatus("❌ Not an RSVP QR code");
              onResult?.(text);
            }
          } else if (err) {
            // Transient decode errors are expected while scanning; ignore
          }
        }
      );

      setRunning(true);
      setStatus(hint);
    } catch (e: any) {
      setRunning(false);
      if (e?.name === "NotAllowedError") {
        setStatus("Camera permission denied. Allow camera access and retry.");
      } else if (e?.name === "NotFoundError") {
        setStatus("No camera found. Connect a webcam or try another device.");
      } else if (e?.name === "SecurityError") {
        setStatus("Use HTTPS or http://localhost in development.");
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
    setStatus("Stopped");
    setLastScanResult(null);
  }, []);

  useEffect(() => {
    setStatus("Tap Start to open camera.");
    return () => controlsRef.current?.stop();
  }, []);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-neutral-950 p-4">
      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-semibold text-white mb-2">Event Check-in Scanner</h1>
        <a
          href="/generate" // or your generator route
          className="text-sm text-neutral-400 hover:text-white"
        >
          ← Back to Generator
        </a>
      </div>

      <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-black">
        {/* 16:9 video area */}
        <div className="relative aspect-[16/9]">
          <video
            ref={videoRef}
            muted
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
          
          {/* Scan overlay with animation */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-4 border-2 border-white/30 rounded-lg">
              {/* Scanning line animation */}
              {running && !isProcessing && (
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse" />
              )}
            </div>
          </div>
          
          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm">Processing...</p>
              </div>
            </div>
          )}

          {/* Footer controls/status */}
          <div className="absolute inset-x-3 bottom-3">
            <div className="bg-black/80 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-white/90 flex-1">{status}</span>
                <div className="flex gap-2">
                  {!running ? (
                    <button
                      onClick={start}
                      disabled={isProcessing}
                      className="rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                    >
                      Start
                    </button>
                  ) : (
                    <button
                      onClick={stop}
                      disabled={isProcessing}
                      className="rounded-lg border border-red-400/30 bg-red-900/40 px-3 py-2 text-sm text-white hover:bg-red-900/60 focus:outline-none focus:ring-2 focus:ring-red-400/40 disabled:opacity-50"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>
              
              {/* Last scan result */}
              {lastScanResult && (
                <div className="text-xs text-green-400 mt-2 p-2 bg-green-900/20 rounded border border-green-500/30">
                  {lastScanResult}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Message - Outside Camera Area */}
      {welcomeMessage && (
        <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-center max-w-md mx-auto">
          <p className="text-green-400 font-medium">{welcomeMessage}</p>
        </div>
      )}

      {/* Last Scan Result - Outside Camera Area */}
      {lastScanResult && (
        <div className="mt-2 p-3 bg-neutral-800 border border-neutral-600 rounded-lg text-center max-w-md mx-auto">
          <p className="text-neutral-300 text-sm">{lastScanResult}</p>
        </div>
      )}

      <div className="mt-4 text-center max-w-md">
        <p className="text-xs text-neutral-500">
          Scan RSVP QR codes to automatically check in guests.
        </p>
        <p className="text-xs text-neutral-600 mt-1">
          Use <b>HTTPS</b> (or <code>http://localhost</code>) and allow camera permissions.
        </p>
      </div>
    </div>
  );
};

export default QRScanner;