import { Upload, Clock, Volume2, Languages, AlertCircle, ChevronDown, ChevronUp, HelpCircle, Zap, ChevronLeft, ChevronRight, TrendingUp, MonitorPlay, Dumbbell, UtensilsCrossed } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, supabase } from './lib/auth';
import Footer from './components/Footer';
import NavBar from './components/NavBar';

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function getSessionId() {
  let sessionId = localStorage.getItem('dubbing_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem('dubbing_session_id', sessionId);
  }
  return sessionId;
}

type ErrorDetails = {
  code?: string;
  error?: string;
  hint?: string;
  [key: string]: unknown;
};

const PROCESSING_MESSAGES = [
  "Clear source audio helps preserve voice tone across languages.",
  "Short pauses between sentences help the dub keep natural timing.",
  "Single-speaker clips usually produce the cleanest voice cloning results.",
  "Your dashboard keeps completed dubs grouped by language for faster sharing.",
  "You can share finished dubs with viewers who do not have a DubStudio account.",
  "Credits are estimated from the media duration before the upload begins.",
  "Completed clips can be downloaded from the dashboard after processing.",
  "Language filters make it easier to manage multiple versions of the same clip.",
];

// Shuffle the facts array
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const SHUFFLED_MESSAGES = shuffleArray(PROCESSING_MESSAGES);

function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [, setCurrentJobId] = useState<string | null>(null);
  const [, setCompletedJobId] = useState<string | null>(null);
  const [showFaq, setShowFaq] = useState(false);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [estimatedCredits, setEstimatedCredits] = useState<number>(0);
  const [testimonialsIndex, setTestimonialsIndex] = useState(0);
  const statusCheckInterval = useRef<number | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const factInterval = useRef<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchCredits();
    }
  }, [user]);

  const fetchCredits = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('user_credits')
        .select('credits_minutes, credits_used')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCreditsRemaining(data.credits_minutes - data.credits_used);
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setDubbedAudioUrl(null);
      setCompletedJobId(null);
      setError(null);

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const durationMinutes = Math.ceil(video.duration / 60);
        console.log('🎬 [App.tsx] Video duration:', video.duration, 'seconds →', durationMinutes, 'minutes');
        setEstimatedCredits(durationMinutes);
      };
      video.onerror = () => {
        console.error('❌ [App.tsx] Failed to load video metadata');
        window.URL.revokeObjectURL(video.src);
        setEstimatedCredits(1); // fallback
      };
      video.src = URL.createObjectURL(selectedFile);
    }
  };

  useEffect(() => {
    if (isProcessing) {
      factInterval.current = window.setInterval(() => {
        setCurrentFactIndex((prev) => (prev + 1) % SHUFFLED_MESSAGES.length);
      }, 15000);
    } else {
      if (factInterval.current) {
        clearInterval(factInterval.current);
        factInterval.current = null;
      }
      setCurrentFactIndex(0);
    }

    return () => {
      if (factInterval.current) {
        clearInterval(factInterval.current);
      }
    };
  }, [isProcessing]);

  useEffect(() => {
    const restoreExistingJob = async () => {
      const sessionId = getSessionId();
      console.log('[RESTORE] Session ID:', sessionId);

      const { data, error } = await supabase
        .from('dubbing_jobs')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('[RESTORE] Query result:', { data, error });

      if (data) {
        console.log('[RESTORE] Found job:', data.id, 'Status:', data.status);
        setCurrentJobId(data.id);

        if (data.status === 'processing') {
          console.log('[RESTORE] Resuming processing job');
          setIsProcessing(true);
          setStatusMessage('Resuming job...');
          setTargetLanguage(data.target_language);
          pollJobStatus(data.id);
        } else if (data.status === 'completed' && data.audio_url) {
          console.log('[RESTORE] Restoring completed job, fetching audio...');
          setCompletedJobId(data.id);
          setTargetLanguage(data.target_language);

          try {
            // Fetch the audio through our download endpoint to get a blob URL
            const downloadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dub-audio/download/${data.id}`;
            console.log('[RESTORE] Downloading from:', downloadUrl);

            const downloadResponse = await fetch(downloadUrl, {
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
            });

            if (downloadResponse.ok) {
              const audioBlob = await downloadResponse.blob();
              const audioUrl = URL.createObjectURL(audioBlob);
              setDubbedAudioUrl(audioUrl);
              console.log('[RESTORE] Audio restored successfully');
            } else {
              console.error('[RESTORE] Failed to download audio:', downloadResponse.status);
              setError('Failed to restore previous audio');
            }
          } catch (err) {
            console.error('[RESTORE] Error downloading audio:', err);
            setError('Failed to restore previous audio');
          }
          setStatusMessage('');
        } else if (data.status === 'failed') {
          console.log('[RESTORE] Job failed:', data.error_message);
          setError(data.error_message || 'Job failed');
          if (data.error_details) {
            setErrorDetails(data.error_details);
          }
        }
      } else {
        console.log('[RESTORE] No existing job found');
      }
    };

    restoreExistingJob();

    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, []);

  const handleCancel = () => {
    if (abortController.current) {
      abortController.current.abort();
    }
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
      statusCheckInterval.current = null;
    }
    setIsProcessing(false);
    setCurrentJobId(null);
    setProgress(0);
    setStatusMessage('');
    setError('Processing cancelled');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (!user) {
      setError('Please sign in to use the dubbing feature');
      setTimeout(() => {
        window.location.href = `${import.meta.env.BASE_URL}account`;
      }, 2000);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setErrorDetails(null);
    setShowDebug(false);
    setStatusMessage('Uploading file...');
    abortController.current = new AbortController();

    try {
      const formData = new FormData();

      if (file) {
        formData.append('file', file);
      }

      formData.append('targetLanguage', targetLanguage);
      formData.append('userId', user.id);
      formData.append('durationMinutes', estimatedCredits.toString());

      console.log('📤 [App.tsx] Sending durationMinutes:', estimatedCredits);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dub-audio`;

      setStatusMessage('Submitting dubbing job...');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData,
        signal: abortController.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to submit dubbing job' }));
        setErrorDetails(errorData as ErrorDetails);
        throw new Error(errorData.error || 'Failed to submit dubbing job');
      }

      const jobData = await response.json();
      const jobId = jobData.jobId;
      setCurrentJobId(jobId);

      setProgress(10);
      setStatusMessage('Processing audio...');
      await pollJobStatus(jobId);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsProcessing(false);
      setCurrentJobId(null);
      setProgress(0);
      setStatusMessage('');
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 120; // 120 * 2s = 4 minutes max
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dub-audio/status/${jobId}`;

        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to check job status');
        }

        const job = await response.json();

        if (job.status === 'completed') {
          setProgress(95);
          setStatusMessage('Downloading audio...');

          if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
            statusCheckInterval.current = null;
          }

          const downloadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dub-audio/download/${jobId}`;
          const downloadResponse = await fetch(downloadUrl, {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
          });

          if (!downloadResponse.ok) {
            const errorData = await downloadResponse.json().catch(() => ({ error: 'Failed to download audio' }));
            console.error('Download failed:', errorData);
            throw new Error(errorData.error || 'Failed to download audio');
          }

          // Verify we're actually getting media (audio or video), not JSON error
          const contentType = downloadResponse.headers.get('content-type');
          console.log('Download content-type:', contentType);

          if (contentType?.includes('application/json')) {
            const errorData = await downloadResponse.json();
            console.error('Received JSON instead of media:', errorData);
            throw new Error(errorData.error || 'Received invalid response instead of media file');
          }

          if (!contentType?.includes('audio') && !contentType?.includes('video')) {
            console.error('Unexpected content type:', contentType);
            throw new Error(`Expected audio or video file but received: ${contentType}`);
          }

          const audioBlob = await downloadResponse.blob();
          console.log('Media blob size:', audioBlob.size, 'type:', audioBlob.type);

          // Verify blob is not empty
          if (audioBlob.size === 0) {
            throw new Error('Received empty media file');
          }

          const audioUrl = URL.createObjectURL(audioBlob);

          setProgress(100);
          setDubbedAudioUrl(audioUrl);
          setIsProcessing(false);
          setCompletedJobId(jobId);
          setCurrentJobId(null);
          setStatusMessage('');

          console.log('[COMPLETE] Job finished, redirecting to dashboard');

          // Redirect to dashboard to view and download
          navigate('/dashboard');
        } else if (job.status === 'failed') {
          const errorMsg = job.error_message || 'Dubbing job failed';
          setError(errorMsg);
          setErrorDetails((job.error_details || { error: job.error_message }) as ErrorDetails);
          setShowDebug(true);
          setIsProcessing(false);
          setCurrentJobId(null);
          setProgress(0);
          setStatusMessage('');

          if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
            statusCheckInterval.current = null;
          }
        } else {
          attempts++;
          const progressPercent = 10 + Math.min(85, (attempts / maxAttempts) * 85);
          setProgress(progressPercent);
          setStatusMessage(`Processing audio... (${Math.floor(progressPercent)}%)`);

          if (attempts >= maxAttempts) {
            throw new Error('Job timeout - taking too long to complete');
          }
        }
      } catch (err) {
        console.error('Status check error:', err);
        setError(err instanceof Error ? err.message : 'Failed to check job status');
        setIsProcessing(false);
        setStatusMessage('');
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
          statusCheckInterval.current = null;
        }
      }
    };

    // Initial check
    await checkStatus();

    // Poll every 2 seconds
    statusCheckInterval.current = window.setInterval(checkStatus, 2000);
  };


  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative">
        <NavBar />

        <div className="container mx-auto px-6 py-16 md:py-24 max-w-6xl">
          <header className="mb-16 md:mb-24">
            <div className="max-w-4xl">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 md:mb-8 leading-[1.1] tracking-tight">
                Your voice.<br/>
                Every language.
              </h1>
              <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl leading-relaxed mb-8">
                Dub videos into 15+ languages. Organize by language in your dashboard. Share with work teams or family abroad. Perfect for business and personal use.
              </p>
              <div className="flex flex-wrap gap-4 text-base text-zinc-500 mb-10">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>3-min clips in 80 seconds</span>
                </div>
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  <span>15+ languages</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  <span>Voice cloning included</span>
                </div>
              </div>
              {user && creditsRemaining !== null && (
                <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2 mb-6">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-zinc-300">{creditsRemaining} minutes remaining</span>
                </div>
              )}
              {!user && (
                <div className="inline-flex items-center gap-2 bg-white text-black rounded-lg px-4 py-2 mb-6 font-medium">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">Get 3 free minutes</span>
                </div>
              )}
            </div>
          </header>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 md:p-10 mb-20">
            {user && (
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Try it out</h2>
                <Link
                  to="/dashboard"
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors"
                >
                  View Dashboard
                </Link>
              </div>
            )}
            {!user && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Try it out</h2>
              </div>
            )}
            <div className={`grid gap-8 ${isProcessing || dubbedAudioUrl ? 'md:grid-cols-2' : ''}`}>
              <form onSubmit={handleSubmit} className={dubbedAudioUrl ? '' : (isProcessing ? 'opacity-50 pointer-events-none' : '')}>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-10 sm:p-12 md:p-16 text-center hover:border-white/30 hover:bg-white/[0.02] transition-all cursor-pointer group">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="audio/*,video/*"
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-5"
                  >
                    <Upload className="w-12 h-12 text-zinc-500 group-hover:text-white transition-colors" />
                    <div>
                      <p className="text-lg font-medium mb-1">
                        {file ? file.name : 'Drop your video here'}
                      </p>
                      <p className="text-sm text-zinc-500">
                        MP4, MOV, MP3 • Up to 3 minutes
                      </p>
                    </div>
                  </label>
                </div>

              {file && (
                <div className="mt-6">
                  <label className="block mb-4">
                    <span className="text-sm font-medium text-zinc-300 mb-3 block">Dub into</span>
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3.5 text-white focus:outline-none focus:border-white/20 transition-colors"
                      disabled={isProcessing}
                    >
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                      <option value="pt">Portuguese</option>
                      <option value="pl">Polish</option>
                      <option value="tr">Turkish</option>
                      <option value="ru">Russian</option>
                      <option value="nl">Dutch</option>
                      <option value="cs">Czech</option>
                      <option value="ar">Arabic</option>
                      <option value="zh">Chinese</option>
                      <option value="ja">Japanese</option>
                      <option value="ko">Korean</option>
                      <option value="hi">Hindi</option>
                    </select>
                  </label>

                  {isProcessing && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-sm text-zinc-400">{statusMessage || 'Processing'}</span>
                        <span className="text-sm font-medium text-white">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-white h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {file && estimatedCredits > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Cost</span>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold text-white">{estimatedCredits} min</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!user && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
                      <p className="text-white text-sm font-medium mb-1">Sign in to dub</p>
                      <p className="text-zinc-400 text-xs">
                        Get 3 free minutes when you create an account
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {!user ? (
                      <Link
                        to="/account"
                        className="flex-1 bg-white hover:bg-zinc-100 text-black font-medium py-3.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        Sign in to dub
                      </Link>
                    ) : (
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="flex-1 bg-white hover:bg-zinc-100 disabled:bg-white/10 text-black disabled:text-zinc-500 font-medium py-3.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            Dubbing...
                          </>
                        ) : (
                          'Start dubbing'
                        )}
                      </button>
                    )}
                    {isProcessing && (
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="bg-white/10 hover:bg-white/20 text-white font-medium py-3.5 px-5 rounded-lg transition-colors"
                        title="Cancel processing"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </form>

            {isProcessing && (
              <div className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] p-4 sm:p-8">
                <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
                <div className="text-center max-w-md">
                  <p className="text-base font-medium mb-1">Processing</p>
                  <p className="text-sm text-zinc-500 mb-8">{statusMessage}</p>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                    <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">Did you know?</p>
                    <p className="text-sm text-zinc-300 leading-relaxed">{SHUFFLED_MESSAGES[currentFactIndex]}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6">
                <div className="p-4 bg-red-950/50 border-2 border-red-900 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-400 font-medium mb-1">Error</p>
                      <p className="text-red-300 text-sm">{error}</p>

                      {errorDetails?.code === 'WORKER_LIMIT' && (
                        <div className="mt-3 p-3 bg-yellow-950/30 border border-yellow-900/50 rounded-lg">
                          <p className="text-yellow-300 text-xs font-medium mb-2">⚠️ Worker Limit Exceeded</p>
                          <p className="text-yellow-200/80 text-xs leading-relaxed mb-2">
                            The edge function ran out of compute resources. This usually happens with large files or during high load.
                          </p>
                          <p className="text-yellow-200/80 text-xs leading-relaxed">
                            <strong>Solutions:</strong>
                          </p>
                          <ul className="text-yellow-200/80 text-xs mt-1 ml-4 list-disc space-y-1">
                            <li>Try a shorter audio file (under 2 minutes recommended)</li>
                            <li>Compress your audio file before uploading</li>
                            <li>Wait a moment and try again</li>
                            <li>Check logs in Supabase Dashboard → Functions → dub-audio → Logs</li>
                          </ul>
                        </div>
                      )}

                      {errorDetails && (
                        <button
                          onClick={() => setShowDebug(!showDebug)}
                          className="mt-3 flex items-center gap-2 text-xs text-red-300 hover:text-red-200 transition-colors"
                        >
                          {showDebug ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {showDebug ? 'Hide' : 'Show'} Technical Details
                        </button>
                      )}
                    </div>
                  </div>
                  {showDebug && errorDetails && (
                    <div className="mt-4 p-3 bg-black/50 rounded-lg border border-red-900/50">
                      <div className="mb-3">
                        <p className="text-xs text-red-300 font-semibold mb-1">Full Error Response:</p>
                      </div>
                      <pre className="text-xs text-red-200 overflow-x-auto whitespace-pre-wrap break-words">
                        {JSON.stringify(errorDetails, null, 2)}
                      </pre>
                      {errorDetails.hint && (
                        <div className="mt-3 pt-3 border-t border-red-900/30">
                          <p className="text-xs text-red-300 font-semibold mb-1">💡 Hint:</p>
                          <p className="text-xs text-red-200">{errorDetails.hint}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>

          <div className="mb-20">
            <div className="mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">How it works</h2>
              <p className="text-zinc-400 text-lg">Three steps to global reach</p>
            </div>
            <div className="relative">
              <div className="hidden md:grid md:grid-cols-3 gap-6">
                <div className="relative">
                  <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                    <div className="text-3xl font-bold mb-4 text-zinc-600">01</div>
                    <h3 className="text-lg font-semibold mb-2">Upload & dub</h3>
                    <p className="text-zinc-400 leading-relaxed text-sm">
                      Drop your video, pick a language, done in 80 seconds
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                    <div className="text-3xl font-bold mb-4 text-zinc-600">02</div>
                    <h3 className="text-lg font-semibold mb-2">Organize by language</h3>
                    <p className="text-zinc-400 leading-relaxed text-sm">
                      Dashboard auto-organizes by language. Filter to see Spanish, French, or all
                    </p>
                  </div>
                </div>

                <div>
                  <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                    <div className="text-3xl font-bold mb-4 text-zinc-600">03</div>
                    <h3 className="text-lg font-semibold mb-2">Share anywhere</h3>
                    <p className="text-zinc-400 leading-relaxed text-sm">
                      One-click sharing. Send to colleagues or family overseas. No account needed to watch
                    </p>
                  </div>
                </div>
              </div>

              <div className="md:hidden space-y-4">
                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                  <div className="text-3xl font-bold mb-4 text-zinc-600">01</div>
                  <h3 className="text-lg font-semibold mb-2">Upload & dub</h3>
                  <p className="text-zinc-400 leading-relaxed text-sm">
                    Drop your video, pick a language, done in 80 seconds
                  </p>
                </div>
                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                  <div className="text-3xl font-bold mb-4 text-zinc-600">02</div>
                  <h3 className="text-lg font-semibold mb-2">Organize by language</h3>
                  <p className="text-zinc-400 leading-relaxed text-sm">
                    Dashboard auto-organizes by language. Filter to see Spanish, French, or all
                  </p>
                </div>
                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                  <div className="text-3xl font-bold mb-4 text-zinc-600">03</div>
                  <h3 className="text-lg font-semibold mb-2">Share anywhere</h3>
                  <p className="text-zinc-400 leading-relaxed text-sm">
                    One-click sharing. Send to colleagues or family overseas. No account needed to watch
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-20">
            <div className="mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Why creators use this</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <Clock className="w-8 h-8 text-white mb-4" />
                <h3 className="text-lg font-semibold mb-2">Fast</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  80 seconds for a 3-minute clip. No queues, no waiting.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <Volume2 className="w-8 h-8 text-white mb-4" />
                <h3 className="text-lg font-semibold mb-2">Your voice</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  AI clones your tone and style. Sounds like you in every language.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <Zap className="w-8 h-8 text-white mb-4" />
                <h3 className="text-lg font-semibold mb-2">Simple pricing</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  No subscriptions. Pay per minute. 3 minutes free to start.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-20">
            <div className="mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Perfect for work and family</h2>
              <p className="text-zinc-400 text-lg">Organize and share videos with anyone, anywhere</p>
            </div>
            <div className="grid md:grid-cols-2 gap-5">

              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-2">Family videos</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                  Send clips to grandma in her native language. Your dashboard keeps all language versions organized - Spanish for one relative, French for another. One-click sharing makes it effortless to send family moments to relatives overseas. They don't need an account, just click the link and watch.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-2">Work presentations</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                  Organize training videos, product demos, and team updates by language in your dashboard. Filter by German for your Berlin office, Spanish for Mexico City. Share links directly with international teams. Track which versions you've shared and when they expire.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-2">Content creators</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                  Dashboard shows all your dubbed shorts organized by language. Filter to see only your Spanish versions, only French, or view everything. Share clips across platforms or send preview links to sponsors. Perfect for managing multilingual content at scale.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-2">Course creators</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-3">
                  Turn English tutorials into Spanish, French, German versions. Organize each language in your dashboard. Share lesson links with international students. Track which language versions are most popular. Same course, global reach.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-20">
            <div className="mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">What creators say</h2>
              <p className="text-zinc-400 text-lg">See the impact of <span className="text-cyan-400 font-semibold">going multilingual</span></p>
            </div>
            <div className="hidden md:grid md:grid-cols-2 gap-6">
              <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Marketing Creator</h4>
                    <p className="text-xs text-zinc-500">12K subscribers → 48K in 3 months</p>
                  </div>
                </div>
                <p className="text-zinc-300 leading-relaxed mb-4">
                  "I make shorts from my marketing tutorials. Started dubbing them into Spanish and Portuguese. My channel exploded in Latin America. 4x growth in 90 days."
                </p>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    +300% views
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    +36K new subs
                  </div>
                </div>
              </div>

              <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center">
                    <MonitorPlay className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Tech Reviewer</h4>
                    <p className="text-xs text-zinc-500">22K subscribers, German + French expansion</p>
                  </div>
                </div>
                <p className="text-zinc-300 leading-relaxed mb-4">
                  "I make tech review shorts. Dubbing into German and French was a no-brainer. Now I'm monetizing in 3 countries instead of one. Same content, triple the revenue."
                </p>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    3x revenue
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    2 new markets
                  </div>
                </div>
              </div>

              <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                    <Dumbbell className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Fitness Coach</h4>
                    <p className="text-xs text-zinc-500">35K subscribers, 5 languages</p>
                  </div>
                </div>
                <p className="text-zinc-300 leading-relaxed mb-4">
                  "My workout shorts were doing well in English. Dubbed into Spanish, Hindi, and Arabic. Now my content reaches global audiences. Same 60-second workouts, 5x the reach."
                </p>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    5x reach
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Global audience
                  </div>
                </div>
              </div>

              <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                    <UtensilsCrossed className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Food Vlogger</h4>
                    <p className="text-xs text-zinc-500">8K → 32K subscribers in 4 months</p>
                  </div>
                </div>
                <p className="text-zinc-300 leading-relaxed mb-4">
                  "Recipe shorts translate perfectly. Started with French and Italian for my European audience. The engagement was instant. Dubbing costs less than my ingredient budget."
                </p>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    +400% growth
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    2 new markets
                  </div>
                </div>
              </div>
            </div>

            <div className="md:hidden">
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${testimonialsIndex * 100}%)` }}
                >
                  <div className="w-full flex-shrink-0 px-4">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Marketing Creator</h4>
                          <p className="text-xs text-zinc-500">12K subscribers → 48K in 3 months</p>
                        </div>
                      </div>
                      <p className="text-zinc-300 leading-relaxed mb-4">
                        "I make shorts from my marketing tutorials. Started dubbing them into Spanish and Portuguese. My channel exploded in Latin America. 4x growth in 90 days."
                      </p>
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          +300% views
                        </div>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          +36K new subs
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full flex-shrink-0 px-4">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center">
                          <MonitorPlay className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Tech Reviewer</h4>
                          <p className="text-xs text-zinc-500">22K subscribers, German + French expansion</p>
                        </div>
                      </div>
                      <p className="text-zinc-300 leading-relaxed mb-4">
                        "I make tech review shorts. Dubbing into German and French was a no-brainer. Now I'm monetizing in 3 countries instead of one. Same content, triple the revenue."
                      </p>
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          3x revenue
                        </div>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          2 new markets
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full flex-shrink-0 px-4">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                          <Dumbbell className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Fitness Coach</h4>
                          <p className="text-xs text-zinc-500">35K subscribers, 5 languages</p>
                        </div>
                      </div>
                      <p className="text-zinc-300 leading-relaxed mb-4">
                        "My workout shorts were doing well in English. Dubbed into Spanish, Hindi, and Arabic. Now my content reaches global audiences. Same 60-second workouts, 5x the reach."
                      </p>
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          5x reach
                        </div>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          Global audience
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full flex-shrink-0 px-4">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                          <UtensilsCrossed className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Food Vlogger</h4>
                          <p className="text-xs text-zinc-500">8K → 32K subscribers in 4 months</p>
                        </div>
                      </div>
                      <p className="text-zinc-300 leading-relaxed mb-4">
                        "Recipe shorts translate perfectly. Started with French and Italian for my European audience. The engagement was instant. Dubbing costs less than my ingredient budget."
                      </p>
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          +400% growth
                        </div>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          2 new markets
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setTestimonialsIndex(Math.max(0, testimonialsIndex - 1))}
                  disabled={testimonialsIndex === 0}
                  className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((index) => (
                    <button
                      key={index}
                      onClick={() => setTestimonialsIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === testimonialsIndex ? 'bg-white w-8' : 'bg-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setTestimonialsIndex(Math.min(3, testimonialsIndex + 1))}
                  disabled={testimonialsIndex === 3}
                  className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-8 md:p-12 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
                </div>
                <button
                  onClick={() => setShowFaq(!showFaq)}
                  className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  {showFaq ? (
                    <>
                      Hide <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Show <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {showFaq && (
                <div className="space-y-6">
                  <div className="border-l-2 border-cyan-600 pl-6">
                    <h3 className="text-lg font-semibold mb-2">How does the dashboard help me organize my dubbed videos?</h3>
                    <p className="text-zinc-400 leading-relaxed">
                      Your dashboard displays all dubbed videos in an organized grid. Filter by language to quickly find your Spanish, French, German, or any other language versions. Perfect for managing multiple language versions of the same content, whether for work presentations or family videos. Each clip shows its language, completion status, and expiration date at a glance.
                    </p>
                  </div>

                  <div className="border-l-2 border-cyan-600 pl-6">
                    <h3 className="text-lg font-semibold mb-2">Can I share dubbed videos with colleagues or family abroad?</h3>
                    <p className="text-zinc-400 leading-relaxed">
                      Yes! Every completed dub includes a one-click share button. Generate a shareable link instantly and send it to anyone - no account required for them to watch. Perfect for sharing work presentations with international teams or sending family moments to grandma in her native language. The dashboard makes it easy to manage and reshare videos whenever you need.
                    </p>
                  </div>

                  <div className="border-l-2 border-cyan-600 pl-6">
                    <h3 className="text-lg font-semibold mb-2">How much money can I make by going multilingual?</h3>
                    <p className="text-zinc-400 leading-relaxed">
                      Creators who dub content into 3–5 languages typically see 2–4x subscriber growth within 3 months. More subscribers = more ad revenue, sponsorships, and product sales. If you're making $1,000/month now, dubbing could get you to $3,000–4,000/month with the same content output.
                    </p>
                  </div>

                  <div className="border-l-2 border-cyan-600 pl-6">
                    <h3 className="text-lg font-semibold mb-2">Which languages should I target first for maximum growth?</h3>
                    <p className="text-zinc-400 leading-relaxed">
                      Start with Spanish, 500M+ speakers and incredibly high engagement on YouTube and TikTok. Then add French and German for European markets. These three languages alone can triple your potential audience. If your content works in Asia, add Japanese, Korean, and Chinese for explosive growth.
                    </p>
                  </div>

                  <div className="border-l-2 border-cyan-600 pl-6">
                    <h3 className="text-lg font-semibold mb-2">Will dubbing hurt my SEO or algorithm performance?</h3>
                    <p className="text-zinc-400 leading-relaxed">
                      Absolutely not. Create separate channels for each language or use YouTube's multi-language audio feature. The algorithm loves when you tap into underserved language markets. Many creators see 2–4x faster growth in new language channels because there's less competition.
                    </p>
                  </div>

                  <div className="border-l-2 border-cyan-600 pl-6">
                    <h3 className="text-lg font-semibold mb-2">How fast can I start seeing results?</h3>
                    <p className="text-zinc-400 leading-relaxed">
                      Dub your first video in under 2 minutes. Upload 10 shorts, get them all dubbed in 20 minutes. Many creators see engagement from new language audiences within 24–48 hours of posting. The barrier to entry is gone – start today and reach global audiences tomorrow.
                    </p>
                  </div>

                  <div className="border-l-2 border-cyan-600 pl-6">
                    <h3 className="text-lg font-semibold mb-2">Does the AI voice dubbing sound natural enough for my audience?</h3>
                    <p className="text-zinc-400 leading-relaxed">
                      Yes. Our AI voice dubbing technology preserves your unique tone, pitch, and speaking style in every language. Your audience will still recognize your voice, just speaking their language fluently. The voice cloning is so advanced that most viewers can't tell it's AI-generated. Try it free for 3 minutes and hear the quality yourself.
                    </p>
                  </div>

                  <div className="border-l-2 border-cyan-600 pl-6">
                    <h3 className="text-lg font-semibold mb-2">What formats can I download for different platforms?</h3>
                    <p className="text-zinc-400 leading-relaxed">
                      Download full video (MP4) ready for YouTube, TikTok, Instagram Reels, and Facebook. Or get audio-only files (WebM) for podcasts, Spotify, or voiceovers. Every export is optimized for the platform you're targeting – no technical skills needed.
                    </p>
                  </div>

                  <div className="border-l-2 border-cyan-600 pl-6">
                    <h3 className="text-lg font-semibold mb-2">Is there a free trial?</h3>
                    <p className="text-zinc-400 leading-relaxed">
                      Yes! Get 3 FREE minutes when you sign up. That's enough to dub 2–3 shorts and see the results yourself. No credit card required. Experience the quality, test it on your audience, then decide if it's right for you.
                    </p>
                  </div>

                  <div className="border-l-2 border-cyan-600 pl-6">
                    <h3 className="text-lg font-semibold mb-2">What languages are supported?</h3>
                    <p className="text-zinc-400 leading-relaxed mb-3">
                      We support 15+ languages including Spanish, French, German, Italian, Portuguese, Polish, Turkish, Russian, Dutch, Czech, Arabic, Chinese, Japanese, Korean, and Hindi. More languages are added regularly based on creator demand.
                    </p>
                    <p className="text-zinc-400 leading-relaxed">
                      <span className="font-semibold text-white">Translation Accuracy:</span> Our AI translations are powered by advanced machine learning with 95%+ accuracy. If you encounter any issues, contact our support team on the <Link to="/contact" className="text-cyan-400 hover:text-cyan-300 underline">contact page</Link> and we'll make it right.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

export default App;
