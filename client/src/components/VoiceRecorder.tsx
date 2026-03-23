import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, RotateCcw, Upload } from "lucide-react";
import { apiClient } from "../api/client";

interface VoiceRecorderProps {
  onResult: (result: { rawTranscription: string; cleanedText: string; suggestedTitle: string; suggestedServiceIds: string[]; audioFilename: string }) => void;
  onError: (message: string) => void;
}

type RecorderState = "idle" | "recording" | "stopped" | "transcribing";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceRecorder({ onResult, onError }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Revoke the blob URL when the component unmounts to prevent memory leaks.
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // audioUrl is intentionally omitted: we only want to revoke on unmount,
    // not on every url change (the reset() callback already handles mid-session revocation).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);

        // Stop all tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start(); // single chunk — avoids WebM cluster header issues that truncate playback
      setState("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      onError("לא ניתן לגשת למיקרופון. אנא אשר הרשאה ונסה שנית.");
    }
  }, [onError]);

  const stopRecording = useCallback(() => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setState("stopped");
  }, [stopTimer]);

  const reset = useCallback(() => {
    stopTimer();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setState("idle");
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, [audioUrl, stopTimer]);

  const transcribe = useCallback(async () => {
    if (!audioBlob) return;

    setState("transcribing");
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const result = await apiClient.postFormData<{
        rawTranscription: string;
        cleanedText: string;
        suggestedTitle: string;
        suggestedServiceIds: string[];
        audioFilename: string;
      }>("/api/voice/transcribe", formData);

      onResult(result);
      reset();
    } catch (err) {
      setState("stopped");
      onError(err instanceof Error ? err.message : "התמלול נכשל. אנא נסה שנית.");
    }
  }, [audioBlob, onResult, onError, reset]);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {state === "idle" && (
        <>
          <div className="text-center text-text-secondary text-sm">
            לחץ על הכפתור לתחילת הקלטה
          </div>
          <button
            onClick={startRecording}
            className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary-hover active:bg-primary-pressed transition-colors"
            aria-label="התחל הקלטה"
          >
            <Mic size={32} />
          </button>
        </>
      )}

      {state === "recording" && (
        <>
          <div className="flex flex-col items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-error recording-pulse" />
            <span className="text-text-secondary text-sm font-medium">
              מקליט... {formatDuration(duration)}
            </span>
          </div>
          <button
            onClick={stopRecording}
            className="w-20 h-20 rounded-full bg-error text-white flex items-center justify-center shadow-lg hover:opacity-90 active:opacity-80 transition-opacity"
            aria-label="עצור הקלטה"
          >
            <Square size={28} />
          </button>
        </>
      )}

      {state === "stopped" && audioUrl && (
        <>
          <div className="text-center">
            <p className="text-text-secondary text-sm mb-3">הקלטה הסתיימה ({formatDuration(duration)})</p>
            <audio src={audioUrl} controls className="max-w-full rounded-md" />
          </div>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-md text-text-secondary hover:bg-gray-50 transition-colors text-sm"
            >
              <RotateCcw size={16} />
              הקלט מחדש
            </button>
            <button
              onClick={transcribe}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-md hover:bg-primary-hover active:bg-primary-pressed transition-colors text-sm font-medium"
            >
              <Upload size={16} />
              תמלל
            </button>
          </div>
        </>
      )}

      {state === "transcribing" && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">מתמלל ומעבד את ההקלטה...</p>
        </div>
      )}
    </div>
  );
}
