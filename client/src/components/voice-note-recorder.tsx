import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface VoiceNoteRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void;
  onUploadStart?: () => void;
  onUploadComplete?: (voiceNoteId: string) => void;
  onError?: (error: string) => void;
}

export function VoiceNoteRecorder({
  onRecordingComplete,
  onUploadStart,
  onUploadComplete,
  onError,
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [displayDuration, setDisplayDuration] = useState('0:00');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];
      setDuration(0);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        onRecordingComplete?.(blob, duration);

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // Timer for duration display
      let seconds = 0;
      durationIntervalRef.current = setInterval(() => {
        seconds += 1;
        setDuration(seconds);
        setDisplayDuration(formatDuration(seconds));
      }, 1000);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to access microphone';
      onError?.(message);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }
  };

  // Upload to Supabase
  const uploadRecording = async () => {
    if (!recordedBlob) return;

    setIsUploading(true);
    onUploadStart?.();

    try {
      // Create FormData with the audio blob
      const formData = new FormData();
      formData.append('audio', recordedBlob, `voice-note-${Date.now()}.webm`);
      formData.append('duration', duration.toString());

      // Upload to Supabase Edge Function
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (sessionError || !accessToken) {
        throw new Error('You must be signed in to upload voice notes.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe_voice_note`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data = await response.json();
      setRecordedBlob(null);
      setDisplayDuration('0:00');
      onUploadComplete?.(data.voiceNoteId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Upload failed';
      onError?.(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Clear recording
  const clearRecording = () => {
    setRecordedBlob(null);
    setDisplayDuration('0:00');
    setDuration(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-4">
        {/* Recording Button / Duration Display */}
        {!recordedBlob ? (
          <div className="flex flex-col items-center gap-4">
            {isRecording ? (
              <>
                {/* Recording State */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center animate-pulse">
                    <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div className="text-center">
                  <p className="text-4xl font-bold text-red-500 font-mono">
                    {displayDuration}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Recording your commitment...
                  </p>
                </div>

                {/* Stop Button */}
                <button
                  onClick={stopRecording}
                  className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Square className="w-5 h-5" />
                  STOP RECORDING
                </button>
              </>
            ) : (
              <>
                {/* Ready State */}
                <div className="w-24 h-24 rounded-full bg-blue-500/10 border-2 border-blue-500 flex items-center justify-center hover:bg-blue-500/20 transition-colors cursor-pointer"
                  onClick={startRecording}>
                  <Mic className="w-12 h-12 text-blue-400" />
                </div>

                <p className="text-center text-gray-300">
                  Tap to start recording what you're committing to
                </p>

                <button
                  onClick={startRecording}
                  className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Mic className="w-5 h-5" />
                  START RECORDING
                </button>

                <p className="text-xs text-gray-500 text-center">
                  30–90 seconds. Be specific about what you're committing to,
                  obstacles you see, and how you'll know you succeeded.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Review State */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Recording Duration</p>
                  <p className="text-2xl font-bold text-white font-mono">
                    {displayDuration}
                  </p>
                </div>
                <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center">
                  <Mic className="w-8 h-8 text-green-400" />
                </div>
              </div>

              <div className="bg-black/30 rounded px-3 py-2 text-sm text-gray-300">
                Ready to extract your commitment from this recording
              </div>

              {/* Upload Progress */}
              {isUploading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Uploading...</span>
                    <span className="text-gray-500">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={clearRecording}
                  disabled={isUploading}
                  className={cn(
                    'px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors',
                    isUploading
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                  DISCARD
                </button>

                <button
                  onClick={uploadRecording}
                  disabled={isUploading}
                  className={cn(
                    'px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors',
                    isUploading
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  )}
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? 'UPLOADING...' : 'EXTRACT'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
