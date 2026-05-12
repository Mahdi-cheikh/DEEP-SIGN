import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const TARGET_FPS = 8; // throttle frames sent over the socket
const JPEG_QUALITY = 0.6;
const FRAME_W = 480;
const FRAME_H = 360;

export default function WebcamDetector() {
  const { token } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);     // hidden encoder canvas
  const overlayRef = useRef(null);    // visible overlay
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const sendingRef = useRef(false);
  const intervalRef = useRef(null);

  const [streaming, setStreaming] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState({
    sign: '—',
    confidence: 0,
    hands_detected: 0,
    annotations: [],
  });

  // ---------- camera ----------
  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: FRAME_W }, height: { ideal: FRAME_H }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch (e) {
      setError(e.message || 'Could not access webcam');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);

  // ---------- socket ----------
  const openSocket = useCallback(() => {
    if (!token) return;
    const ws = new WebSocket(api.wsUrl(token));
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setError('WebSocket error');

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.error) return;
        setResult(data);
        sendingRef.current = false;
      } catch (_) {
        sendingRef.current = false;
      }
    };
  }, [token]);

  const closeSocket = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  // ---------- frame loop ----------
  useEffect(() => {
    if (!streaming || !connected) return;
    intervalRef.current = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ws = wsRef.current;
      if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return;
      if (sendingRef.current) return; // wait for previous reply

      canvas.width = FRAME_W;
      canvas.height = FRAME_H;
      const ctx = canvas.getContext('2d');
      // Mirror to match the on-screen preview.
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

      sendingRef.current = true;
      ws.send(dataUrl);
    }, Math.round(1000 / TARGET_FPS));

    return () => clearInterval(intervalRef.current);
  }, [streaming, connected]);

  // ---------- overlay painting ----------
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    overlay.width = FRAME_W;
    overlay.height = FRAME_H;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!result.annotations?.length) return;

    ctx.fillStyle = '#22d3ee';
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    for (const [nx, ny] of result.annotations) {
      const x = nx * overlay.width;
      const y = ny * overlay.height;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [result]);

  // ---------- cleanup ----------
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      closeSocket();
      stopCamera();
    };
  }, [closeSocket, stopCamera]);

  // ---------- handlers ----------
  const start = async () => {
    await startCamera();
    openSocket();
  };
  const stop = () => {
    clearInterval(intervalRef.current);
    closeSocket();
    stopCamera();
    setResult({ sign: '—', confidence: 0, hands_detected: 0, annotations: [] });
  };

  // ---------- render ----------
  const conf = Math.round((result.confidence || 0) * 100);
  const isReal =
    result.sign && !['—', 'UNKNOWN', 'NO_HAND', 'NO_INPUT'].includes(result.sign);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card !p-0 overflow-hidden">
        <div className="relative bg-slate-900 aspect-[4/3]">
          {/* Preview video (mirrored for natural feel) */}
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover -scale-x-100"
          />
          {/* Landmark overlay — already drawn in mirrored coordinates */}
          <canvas
            ref={overlayRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
          <canvas ref={canvasRef} className="hidden" />

          {!streaming && (
            <div className="absolute inset-0 grid place-items-center text-white text-center px-6">
              <div>
                <div className="text-2xl font-semibold mb-2">Camera off</div>
                <p className="text-slate-300 max-w-md mx-auto">
                  Allow webcam access and click <strong>Start</strong> to begin real-time
                  sign-language detection.
                </p>
              </div>
            </div>
          )}

          <div className="absolute top-3 left-3 flex gap-2">
            <span className={`badge ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {connected ? 'Live' : 'Offline'}
            </span>
            {streaming && (
              <span className="badge bg-white/80 text-slate-700">
                {result.hands_detected} hand{result.hands_detected === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-slate-100">
          {!streaming ? (
            <button onClick={start} className="btn-primary">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
              </svg>
              Start
            </button>
          ) : (
            <button onClick={stop} className="btn-danger">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1.5" /></svg>
              Stop
            </button>
          )}
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Detected sign</div>
          <div className={`mt-2 text-4xl font-extrabold ${isReal ? 'text-brand-700' : 'text-slate-400'}`}>
            {result.sign}
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Confidence</span>
              <span>{conf}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-400 to-brand-700 transition-all"
                style={{ width: `${conf}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card text-sm text-slate-600 leading-relaxed">
          <div className="font-semibold text-slate-800 mb-2">Tips</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Make sure your hand is well lit.</li>
            <li>Frame your whole hand inside the preview.</li>
            <li>Hold a sign steady for ~1 second to log it to history.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
