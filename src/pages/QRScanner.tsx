// src/components/QRScanner.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";

type Props = {
  onResult: (text: string) => void;
  onError?: (err: unknown) => void;
  facingMode?: "user" | "environment";
  hint?: string;
  cooldownMs?: number; // debounce between successful scans (default 1500ms)
};

const QRScanner: React.FC<Props> = ({
  onResult,
  onError,
  facingMode = "environment",
  hint = "Point the camera at a QR code",
  cooldownMs = 500,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const nextAllowedRef = useRef<number>(0); // debounce gate

  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Idle");

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
          if (result) {
            const now = Date.now();
            if (now < nextAllowedRef.current) return; // ignore duplicates during cooldown
            nextAllowedRef.current = now + cooldownMs;

            const text = result.getText();
            onResult(text);
            setStatus("Found code — scanning continues…");
            // Keep scanning; do not stop controls
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
  }, [cooldownMs, facingMode, hint, onResult, onError]);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setRunning(false);
    setStatus("Stopped");
  }, []);

  useEffect(() => {
    setStatus("Tap Start to open camera.");
    return () => controlsRef.current?.stop();
  }, []);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-black/5 p-4">
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
          {/* Subtle scan overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 ring-2 ring-white/10"
          />
          {/* Soft vignette */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-black/20"
          />
          {/* Footer controls/status */}
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
            <span className="text-xs text-white/90">{status}</span>
            <div className="flex gap-2">
              {!running ? (
                <button
                  onClick={start}
                  className="rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  Start
                </button>
              ) : (
                <button
                  onClick={stop}
                  className="rounded-lg border border-red-400/30 bg-red-900/40 px-3 py-2 text-sm text-white hover:bg-red-900/60 focus:outline-none focus:ring-2 focus:ring-red-400/40"
                >
                  Stop
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-neutral-600">
        Tip: Use <b>HTTPS</b> (or <code>http://localhost</code>) and allow camera
        permissions.
      </p>
    </div>
  );
};

export default QRScanner;
