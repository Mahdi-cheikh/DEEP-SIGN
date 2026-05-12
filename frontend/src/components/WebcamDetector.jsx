import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '../context/AuthContext.jsx';
import { classifyFrame } from '../lib/classifier.js';
import { supabase } from '../lib/supabase.js';

// MediaPipe runs entirely client-side. We pull the WASM bundle and model file
// from Google's CDN — both are cached aggressively by the browser after first
// load (~3 MB total).
const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const FRAME_W = 480;
const FRAME_H = 360;

// Require N consecutive frames of the same sign before we log it. This is
// the same debounce the Python WebSocket handler used (~0.5 s @ 30 fps).
const PERSIST_THRESHOLD = 12;

let landmarkerSingleton = null;
async function getLandmarker() {
  if (landmarkerSingleton) return landmarkerSingleton;
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  landmarkerSingleton = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  return landmarkerSingleton;
}

async function logDetection(userId, sign, confidence) {
  if (!userId || ['UNKNOWN', 'NO_HAND', 'NO_INPUT', '—'].includes(sign)) return;
  const { error } = await supabase
    .from('detections')
    .insert({ user_id: userId, sign, confidence: Number(confidence.toFixed(3)) });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to log detection', error);
  }
}

export default function WebcamDetector() {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const lastSignRef = useRef(null);
  const streakRef = useRef(0);

  const [streaming, setStreaming] = useState(false);
  const [modelStatus, setModelStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [result, setResult] = useState({
    sign: '—',
    confidence: 0,
    handsDetected: 0,
    landmarks: [],
  });

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: FRAME_W },
          height: { ideal: FRAME_H },
          facingMode: 'user',
        },
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

  const loop = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const landmarker = await getLandmarker();
    const out = landmarker.detectForVideo(video, performance.now());

    const hands = (out.landmarks || []).map((lms, i) => ({
      landmarks: lms,
      handedness: out.handedness?.[i]?.[0]?.categoryName ?? 'Right',
    }));

    const classified = classifyFrame(hands);

    setResult({
      sign: classified.sign,
      confidence: classified.confidence,
      handsDetected: classified.handsDetected,
      landmarks: out.landmarks?.flat() ?? [],
    });

    if (classified.sign === lastSignRef.current) {
      streakRef.current += 1;
    } else {
      lastSignRef.current = classified.sign;
      streakRef.current = 1;
    }
    if (streakRef.current === PERSIST_THRESHOLD) {
      logDetection(user?.id, classified.sign, classified.confidence);
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [user?.id]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    overlay.width = FRAME_W;
    overlay.height = FRAME_H;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!result.landmarks?.length) return;

    ctx.fillStyle = '#22d3ee';
    for (const p of result.landmarks) {
      const x = (1 - p.x) * overlay.width;
      const y = p.y * overlay.height;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [result]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      stopCamera();
    };
  }, [stopCamera]);

  const start = async () => {
    setModelStatus('loading');
    try {
      await getLandmarker();
      setModelStatus('ready');
    } catch (e) {
      setModelStatus('error');
      setError('Failed to load detection model: ' + e.message);
      return;
    }
    await startCamera();
    lastSignRef.current = null;
    streakRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
  };
  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    stopCamera();
    setResult({ sign: '—', confidence: 0, handsDetected: 0, landmarks: [] });
  };

  const conf = Math.round((result.confidence || 0) * 100);
  const isReal =
    result.sign && !['—', 'UNKNOWN', 'NO_HAND', 'NO_INPUT'].includes(result.sign);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card !p-0 overflow-hidden">
        <div className="relative bg-slate-900 aspect-[4/3]">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover -scale-x-100"
          />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
          {!streaming && (
            <div className="absolute inset-0 grid place-items-center text-white text-center px-6">
              <div>
                <div className="text-2xl font-semibold mb-2">Camera off</div>
                <p className="text-slate-300 max-w-md mx-auto">
                  Allow webcam access and click <strong>Start</strong> to begin real-time
                  sign-language detection. Everything runs in your browser — no frames are
                  sent over the network.
                </p>
              </div>
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-2">
            <span className={`badge ${streaming ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${streaming ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {streaming ? 'Live' : 'Offline'}
            </span>
            {streaming && (
              <span className="badge bg-white/80 text-slate-700">
                {result.handsDetected} hand{result.handsDetected === 1 ? '' : 's'}
              </span>
            )}
            {modelStatus === 'loading' && (
              <span className="badge bg-amber-100 text-amber-700">Loading model…</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-slate-100">
          {!streaming ? (
            <button onClick={start} className="btn-primary">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Start
            </button>
          ) : (
            <button onClick={stop} className="btn-danger">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1.5" />
              </svg>
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
            <li>Hold a sign steady for ~0.5 seconds to log it to history.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
