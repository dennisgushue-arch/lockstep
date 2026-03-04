import { useState } from 'react';
import { VoiceNoteRecorder } from '@/components/voice-note-recorder';
import { useApp } from '@/lib/context';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useLocation } from 'wouter';

export function VoiceNotesPage() {
  const [, navigate] = useLocation();
  const { user } = useApp();
  const [extractedIntent, setExtractedIntent] = useState<{
    intent: string;
    emotion: string;
    obstacles: string;
    suggestedStake: string;
    deadline: string;
  } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    console.log(`Recording complete: ${duration}s, ${blob.size} bytes`);
  };

  const handleUploadStart = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const handleUploadComplete = async (voiceNoteId: string) => {
    setIsExtracting(true);

    try {
      // Call Supabase function to extract intent
      const { data, error: extractError } = await supabase.functions.invoke(
        'extract_intent_from_voice',
        {
          body: { voiceNoteId },
        }
      );

      if (extractError) {
        throw new Error(extractError.message);
      }

      setExtractedIntent(data.extractedIntent);
      setSuccessMessage('Intent extracted. Review below and create a commitment.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed';
      setError(message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleError = (error: string) => {
    setError(error);
  };

  const handleCreateCommitment = async () => {
    if (!extractedIntent) return;

    try {
      // Create commitment with extracted intent
        const deadline = new Date();
        const deadlineDays = parseInt(extractedIntent.deadline.split(' ')[0]);
        deadline.setDate(deadline.getDate() + (Number.isFinite(deadlineDays) ? deadlineDays : 7));

        const creditsCost = parseInt(extractedIntent.suggestedStake);
        const { data: createData, error: createError } = await supabase.functions.invoke(
          'create_commitment',
          {
            body: {
              userId: user?.id,
              intentText: extractedIntent.intent,
              actionText: extractedIntent.intent ?? null,
              creditsCost: Number.isFinite(creditsCost) ? creditsCost : 5,
              consequenceType: 'money',
              scheduledDate: deadline.toISOString(),
              refundOnCompletion: true,
            },
          }
        );

        if (createError || !createData?.success) {
          throw new Error(createError?.message || 'Failed to create commitment');
        }

      setSuccessMessage('✓ PACT HONORED. You kept your word.');
      setExtractedIntent(null);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create commitment';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Your Voice. Your Commitment.
          </h1>
          <p className="text-gray-400">
            Record what you're committing to. We'll extract the intention and suggest a pact.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-300 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Voice Recorder or Extracted Intent */}
        {!extractedIntent ? (
          <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-8">
            <VoiceNoteRecorder
              onRecordingComplete={handleRecordingComplete}
              onUploadStart={handleUploadStart}
              onUploadComplete={handleUploadComplete}
              onError={handleError}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Extracted Intent Display */}
            <div className="bg-gray-900/50 border border-green-500/30 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 text-green-400 font-semibold">
                <CheckCircle className="w-5 h-5" />
                Intent Extracted
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                    Your Commitment
                  </label>
                  <p className="text-lg text-white">{extractedIntent.intent}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                      Emotion Detected
                    </label>
                    <p className="text-white">{extractedIntent.emotion}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                      Suggested Stake
                    </label>
                    <p className="text-white">{extractedIntent.suggestedStake}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                    Obstacles
                  </label>
                  <p className="text-white">{extractedIntent.obstacles}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                    Timeline
                  </label>
                  <p className="text-white">{extractedIntent.deadline}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setExtractedIntent(null)}
                disabled={isExtracting}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                DISCARD
              </button>
              <button
                onClick={handleCreateCommitment}
                disabled={isExtracting}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtracting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    PROCESSING...
                  </>
                ) : (
                  'CREATE PACT'
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Review the extracted commitment above. Edit the text if needed before creating.
            </p>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-12 p-6 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="font-semibold text-blue-300 mb-2">How Voice Notes Work</h3>
          <ul className="text-sm text-blue-200/80 space-y-1">
            <li>• Record 30–90 seconds describing your commitment</li>
            <li>• Include what you're committing to, obstacles, and success criteria</li>
            <li>• AI extracts the core intent and suggests a stake</li>
            <li>• Review and adjust before creating the pact</li>
            <li>• This feeds your AI recommendation engine for future commitments</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
