import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import { useCallback, useEffect, useRef, useState } from 'react';

import { classifyFrame, toWord } from '../lib/classifier.js';
import { history } from '../lib/history.js';

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

const FRAME_W = 480;
const FRAME_H = 360;
const APPEND_THRESHOLD = 15;
const REARM_THRESHOLD = 12;

let recognizerSingleton = null;
async function getRecognizer() {
  if (recognizerSingleton) return recognizerSingleton;
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  recognizerSingleton = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  return recognizerSingleton;
}

function logDetection(sign, confidence) {
  if (['UNKNOWN', 'NO_HAND', 'NO_INPUT', '—'].includes(sign)) return;
  history.add(sign, confidence);
}

function speak(text) {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export default function WebcamDetector() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const lastSignRef = useRef(null);
  const streakRef = useRef(0);
  const armedRef = useRef(true);
  const noHandStreakRef = useRef(0);

  const [streaming, setStreaming] = useState(false);
  const [modelStatus, setModelStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [sentence, setSentence] = useState([]);

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

  const loop = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const recognizer = await getRecognizer();
    const out = recognizer.recognizeForVideo(video, performance.now());

    const hands = (out.landmarks || []).map((lms, i) => ({
      landmarks: lms,
      handedness: out.handednesses?.[i]?.[0]?.categoryName ?? 'Right',
      builtinGesture: out.gestures?.[i]?.[0]?.categoryName,
      builtinScore: out.gestures?.[i]?.[0]?.score,
    }));

    const classified = classifyFrame(hands);
    const word = toWord(classified.sign);

    setResult({
      sign: word ?? classified.sign,
      confidence: classified.confidence,
      handsDetected: classified.handsDetected,
      landmarks: out.landmarks?.flat() ?? [],
    });

    if (classified.sign === 'NO_HAND') {
      noHandStreakRef.current += 1;
      if (noHandStreakRef.current >= REARM_THRESHOLD) {
        armedRef.current = true;
        lastSignRef.current = null;
        streakRef.current = 0;
      }
    } else {
      noHandStreakRef.current = 0;

      if (classified.sign === lastSignRef.current) {
        streakRef.current += 1;
      } else {
        lastSignRef.current = classified.sign;
        streakRef.current = 1;
      }

      if (armedRef.current && streakRef.current === APPEND_THRESHOLD && word) {
        armedRef.current = false;
        setSentence((prev) => [...prev, word]);
        logDetection(classified.sign, classified.confidence);
        if (autoSpeak) speak(word);
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [autoSpeak]);

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
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopCamera]);

  const start = async () => {
    setModelStatus('loading');
    try {
      await getRecognizer();
      setModelStatus('ready');
    } catch (e) {
      setModelStatus('error');
      setError('Failed to load detection model: ' + e.message);
      return;
    }
    await startCamera();
    lastSignRef.current = null;
    streakRef.current = 0;
    armedRef.current = true;
    noHandStreakRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
  };
  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    stopCamera();
    setResult({ sign: '—', confidence: 0, handsDetected: 0, landmarks: [] });
  };

  const speakSentence = () => speak(sentence.join(' '));
  const clearSentence = () => setSentence([]);
  const deleteLast = () => setSentence((s) => s.slice(0, -1));

  const conf = Math.round((result.confidence || 0) * 100);
  const isReal = result.sign && !['—', 'UNKNOWN', 'NO_HAND', 'NO_INPUT'].includes(result.sign);

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
                  Allow webcam access and click <strong>Start</strong>. Hold a sign for
                  ~0.5s to append it to your sentence; relax your hand briefly to add
                  the next word.
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

        <div className="flex items-center justify-between p-4 border-t border-slate-100 gap-3 flex-wrap">
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
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="rounded"
            />
            Speak each word
          </label>
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Current sign</div>
          <div className={`mt-2 text-3xl font-extrabold ${isReal ? 'text-brand-700' : 'text-slate-400'}`}>
            {result.sign}
          </div>
          <div className="mt-3">
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

        <div className="card">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-slate-500">Sentence</div>
            <div className="text-xs text-slate-400">
              {sentence.length} word{sentence.length === 1 ? '' : 's'}
            </div>
          </div>
          <div className="mt-2 min-h-[3.5rem] text-lg font-semibold text-slate-900 leading-snug break-words">
            {sentence.length ? (
              sentence.map((w, i) => (
                <span
                  key={`${w}-${i}`}
                  className="inline-block mr-1.5 mb-1.5 px-2 py-1 rounded-md bg-brand-50 text-brand-800"
                >
                  {w}
                </span>
              ))
            ) : (
              <span className="text-slate-400 italic font-normal text-sm">
                Hold a sign for a moment to add it to your sentence.
              </span>
            )}
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <button onClick={speakSentence} disabled={!sentence.length} className="btn-primary !px-3 !py-1.5 text-sm">
              Speak
            </button>
            <button onClick={deleteLast} disabled={!sentence.length} className="btn-secondary !px-3 !py-1.5 text-sm">
              Delete last
            </button>
            <button onClick={clearSentence} disabled={!sentence.length} className="btn-secondary !px-3 !py-1.5 text-sm text-red-600">
              Clear
            </button>
          </div>
        </div>

        <div className="card text-sm text-slate-600 leading-relaxed">
          <div className="font-semibold text-slate-800 mb-2">Tips</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Hold a sign steady &mdash; it appends after ~0.5s.</li>
            <li>Briefly drop your hand to add the next word.</li>
            <li>Try: open palm &rarr; thumbs up &rarr; I love you &rarr; peace.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
