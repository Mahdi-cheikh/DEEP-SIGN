import WebcamDetector from '../components/WebcamDetector.jsx';

export default function Detect() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Live detection</h1>
        <p className="text-sm text-slate-500">
          Hold a sign in front of your webcam — we'll tell you what it is.
        </p>
      </div>
      <WebcamDetector />
    </div>
  );
}
