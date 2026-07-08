import { useState, useEffect, useRef } from 'react';
import { Upload, Sparkles, Languages, AlertCircle, ChevronDown, ChevronUp, Download, Zap, CheckCircle, Mic2, Globe2, Wand2, Star } from 'lucide-react';
import { supabase } from '../lib/auth';

type ErrorDetails = {
  code?: string;
  error?: string;
  hint?: string;
  [key: string]: unknown;
};

const PROCESSING_INSIGHTS = [
  "Clear source audio helps preserve voice tone across languages.",
  "Short pauses between sentences help the dub keep natural timing.",
  "Single-speaker clips usually produce the cleanest voice cloning results.",
  "Your dashboard keeps completed dubs grouped by language for faster sharing.",
  "You can share finished dubs with viewers who do not have a DubStudio account.",
  "Credits are estimated from the media duration before the upload begins.",
  "Completed clips can be downloaded from the dashboard after processing.",
  "Language filters make it easier to manage multiple versions of the same clip.",
];

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const SHUFFLED_INSIGHTS = shuffleArray(PROCESSING_INSIGHTS);

const QUALITY_HIGHLIGHTS = [
  {
    icon: Mic2,
    title: "Professional Voice AI",
    description: "Using ElevenLabs' cutting-edge voice synthesis technology for natural, human-like results"
  },
  {
    icon: Globe2,
    title: "Native-Quality Translation",
    description: "Advanced AI ensures culturally accurate translations that sound natural to native speakers"
  },
  {
    icon: Wand2,
    title: "Voice Tone Preservation",
    description: "Our AI maintains the original speaker's emotion, tone, and speaking style across languages"
  },
  {
    icon: Star,
    title: "Studio-Grade Output",
    description: "Professional dubbing quality that rivals traditional studio productions at a fraction of the cost"
  }
];

const TIPS = [
  "Clear audio with minimal background noise produces the best results",
  "Videos with single speakers are easiest to dub accurately",
  "Pauses between sentences help maintain natural timing",
  "Well-lit videos help our AI understand context better",
  "Professional microphone audio yields Hollywood-quality dubs"
];

const TESTIMONIALS = [
  { text: "The quality is indistinguishable from professional dubbing studios", author: "Content Creator" },
  { text: "Saved me thousands on localization costs", author: "Marketing Director" },
  { text: "My international audience grew 300% after dubbing my videos", author: "YouTube Creator" },
  { text: "The voice tone preservation is incredible", author: "Podcast Host" }
];

const PROCESSING_STAGES = [
  { progress: 0, stage: "Uploading", desc: "Securely transferring your file" },
  { progress: 25, stage: "Transcribing", desc: "Converting speech to text with high accuracy" },
  { progress: 50, stage: "Translating", desc: "Translating while preserving meaning and emotion" },
  { progress: 75, stage: "Synthesizing", desc: "Generating professional voice with AI" },
  { progress: 95, stage: "Finalizing", desc: "Syncing audio and preparing download" }
];

interface DubbingFormProps {
  userId: string;
  onJobComplete: () => void;
}

export default function DubbingForm({ userId, onJobComplete }: DubbingFormProps) {
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
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);
  const [estimatedCredits, setEstimatedCredits] = useState<number>(0);
  const [contentType, setContentType] = useState<'quality' | 'tip' | 'testimonial' | 'insight'>('quality');
  const [contentIndex, setContentIndex] = useState(0);
  const statusCheckInterval = useRef<number | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const factInterval = useRef<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setDubbedAudioUrl(null);
      setCompletedJobId(null);
      setError(null);
      setEstimatedCredits(0);

      try {
        const isVideo = selectedFile.type.startsWith('video/');
        const mediaElement = isVideo
          ? document.createElement('video')
          : document.createElement('audio');

        mediaElement.preload = 'metadata';

        const duration = await new Promise<number>((resolve, reject) => {
          mediaElement.onloadedmetadata = () => {
            window.URL.revokeObjectURL(mediaElement.src);
            console.log('Media duration loaded:', mediaElement.duration, 'seconds');
            resolve(mediaElement.duration);
          };
          mediaElement.onerror = () => {
            window.URL.revokeObjectURL(mediaElement.src);
            reject(new Error('Failed to load media metadata'));
          };
          mediaElement.src = URL.createObjectURL(selectedFile);
        });

        const durationMinutes = Math.ceil(duration / 60);
        console.log('Setting estimated credits to:', durationMinutes, 'minutes');
        setEstimatedCredits(durationMinutes);
      } catch (err) {
        console.error('Failed to get media duration:', err);
        setEstimatedCredits(1);
      }
    }
  };


  useEffect(() => {
    if (isProcessing) {
      const contentTypes: Array<'quality' | 'tip' | 'testimonial' | 'insight'> = ['quality', 'tip', 'testimonial', 'insight'];
      let typeIndex = 0;

      factInterval.current = window.setInterval(() => {
        typeIndex = (typeIndex + 1) % contentTypes.length;
        setContentType(contentTypes[typeIndex]);
        setContentIndex((prev) => {
          const maxIndex = contentTypes[typeIndex] === 'quality' ? QUALITY_HIGHLIGHTS.length :
                          contentTypes[typeIndex] === 'tip' ? TIPS.length :
                          contentTypes[typeIndex] === 'testimonial' ? TESTIMONIALS.length :
                          SHUFFLED_INSIGHTS.length;
          return (prev + 1) % maxIndex;
        });
      }, 8000);
    } else {
      if (factInterval.current) {
        clearInterval(factInterval.current);
        factInterval.current = null;
      }
      setContentType('quality');
      setContentIndex(0);
    }

    return () => {
      if (factInterval.current) {
        clearInterval(factInterval.current);
      }
    };
  }, [isProcessing]);

  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }

      // Track abandonment if user leaves while processing
      if (isProcessing && completedJobId) {
        void (async () => {
          try {
            await supabase
              .from('dubbing_jobs')
              .update({ abandoned_at: new Date().toISOString() })
              .eq('id', completedJobId)
              .eq('status', 'pending');
          } catch (err) {
            console.warn('Failed to track abandonment on unmount:', err);
          }
        })();
      }
    };
  }, [isProcessing, completedJobId]);

  const handleCancel = async () => {
    const jobId = completedJobId || statusCheckInterval.current;

    if (abortController.current) {
      abortController.current.abort();
    }
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
      statusCheckInterval.current = null;
    }

    // Track abandonment if there's an active job
    if (jobId) {
      try {
        await supabase
          .from('dubbing_jobs')
          .update({ abandoned_at: new Date().toISOString() })
          .eq('id', jobId)
          .eq('status', 'pending'); // Only mark as abandoned if still pending
      } catch (err) {
        console.warn('Failed to track abandonment:', err);
      }
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

    if (estimatedCredits === 0) {
      setError('Please wait for the video duration to be calculated.');
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
      formData.append('file', file);
      formData.append('targetLanguage', targetLanguage);
      formData.append('userId', userId);
      formData.append('durationMinutes', estimatedCredits.toString());

      console.log('📤 Sending FormData - durationMinutes:', estimatedCredits.toString(), 'estimatedCredits:', estimatedCredits);
      console.log('📤 FormData entries:', Array.from(formData.entries()).map(([k, v]) => `${k}: ${v instanceof File ? v.name : v}`));

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

      // Track free credits usage for non-authenticated users
      if (!userId || userId === 'anonymous') {
        const currentUsed = parseInt(localStorage.getItem('free_credits_used') || '0');
        localStorage.setItem('free_credits_used', String(currentUsed + 1));
      }

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
    const maxAttempts = 120;
    let attempts = 0;

    const checkStatus = async () => {
      try {
        // Trigger job monitor in background every 10 attempts
        if (attempts % 10 === 0) {
          const monitorUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/job-monitor`;
          fetch(monitorUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
          }).catch(() => {});
        }

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
            throw new Error(errorData.error || 'Failed to download audio');
          }

          const contentType = downloadResponse.headers.get('content-type');

          if (contentType?.includes('application/json')) {
            const errorData = await downloadResponse.json();
            throw new Error(errorData.error || 'Received invalid response instead of media file');
          }

          if (!contentType?.includes('audio') && !contentType?.includes('video')) {
            throw new Error(`Expected audio or video file but received: ${contentType}`);
          }

          const audioBlob = await downloadResponse.blob();

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
          onJobComplete();
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

    await checkStatus();
    statusCheckInterval.current = window.setInterval(checkStatus, 2000);
  };

  const handleDownload = async (asAudioOnly: boolean = false) => {
    if (!dubbedAudioUrl || !completedJobId) return;

    try {
      const downloadFormat = asAudioOnly ? 'audio' : 'video';

      const { data: currentJob } = await supabase
        .from('dubbing_jobs')
        .select('download_count')
        .eq('id', completedJobId)
        .maybeSingle();

      await supabase
        .from('dubbing_jobs')
        .update({
          downloaded_at: new Date().toISOString(),
          download_format: downloadFormat,
          download_count: (currentJob?.download_count || 0) + 1,
        })
        .eq('id', completedJobId);

      const response = await fetch(dubbedAudioUrl);
      const blob = await response.blob();

      let finalBlob = blob;
      let extension = 'mp4';
      let filename = `dubbed_${targetLanguage}`;

      if (blob.type.includes('video/mp4')) {
        extension = 'mp4';
      } else if (blob.type.includes('audio/mpeg')) {
        extension = 'mp3';
      } else if (blob.type.includes('audio/webm')) {
        extension = 'webm';
      }

      if (asAudioOnly) {
        try {
          const videoUrl = URL.createObjectURL(blob);
          const video = document.createElement('video');
          video.src = videoUrl;
          video.muted = false;

          await new Promise<void>((resolve, reject) => {
            video.onloadedmetadata = () => resolve();
            video.onerror = () => reject(new Error('Failed to load video'));
          });

          const AudioContextCtor =
            window.AudioContext ||
            (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

          if (!AudioContextCtor) {
            throw new Error('Audio extraction is not supported in this browser');
          }

          const audioContext = new AudioContextCtor();
          const source = audioContext.createMediaElementSource(video);
          const destination = audioContext.createMediaStreamDestination();
          source.connect(destination);

          const mediaRecorder = new MediaRecorder(destination.stream, {
            mimeType: 'audio/webm'
          });

          const chunks: Blob[] = [];
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          const recordingPromise = new Promise<Blob>((resolve) => {
            mediaRecorder.onstop = () => {
              resolve(new Blob(chunks, { type: 'audio/webm' }));
            };
          });

          mediaRecorder.start(100);
          video.play();

          await new Promise<void>((resolve) => {
            video.onended = () => resolve();
          });

          mediaRecorder.stop();
          finalBlob = await recordingPromise;

          URL.revokeObjectURL(videoUrl);
          audioContext.close();

          extension = 'webm';
          filename = `dubbed_${targetLanguage}_audio`;
        } catch (error) {
          console.error('Audio extraction failed:', error);
          alert('Audio extraction failed. Downloading as MP4 instead.');
          filename = `dubbed_${targetLanguage}_audio`;
        }
      }

      const url = window.URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${filename}.${extension}`;

      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setError(`Failed to download file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleNewUpload = () => {
    setFile(null);
    setDubbedAudioUrl(null);
    setCompletedJobId(null);
    setError(null);
    setProgress(0);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-8 md:p-12 shadow-2xl">
      <div className={`grid gap-8 ${isProcessing || dubbedAudioUrl ? 'md:grid-cols-2' : ''}`}>
        <form onSubmit={handleSubmit} className={isProcessing || dubbedAudioUrl ? 'opacity-50 pointer-events-none' : ''}>
          <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-8 sm:p-12 md:p-16 text-center hover:border-zinc-600 hover:bg-zinc-900/50 transition-all duration-300 cursor-pointer group">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept="audio/*,video/*"
              onChange={handleFileChange}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-6"
            >
              <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center group-hover:bg-zinc-700 transition-colors duration-300">
                <Upload className="w-10 h-10 text-zinc-400 group-hover:text-white transition-colors duration-300" />
              </div>
              <div>
                <p className="text-xl font-semibold mb-2">
                  {file ? file.name : 'Drop your file here'}
                </p>
                <p className="text-sm text-zinc-500">
                  Audio or Video • MP3, MP4, MOV, etc. • Max 3 min
                </p>
              </div>
            </label>
          </div>

          {file && (
            <div className="mt-6">
              <label className="block mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Languages className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-300">Target Language</span>
                </div>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 transition-colors"
                  disabled={isProcessing}
                >
                  <option value="en">English</option>
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
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">{statusMessage || 'Processing'}</span>
                    <span className="text-sm font-semibold text-white">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-white to-zinc-300 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="w-full h-full bg-white opacity-50 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              )}

              {file && estimatedCredits > 0 && (
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Estimated Cost</span>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-lg font-bold text-white">{estimatedCredits} credit{estimatedCredits !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">~{estimatedCredits} minute{estimatedCredits !== 1 ? 's' : ''} of dubbing</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 mt-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-700 text-black disabled:text-zinc-500 font-semibold py-5 px-8 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 text-lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Start Dubbing
                    </>
                  )}
                </button>
                {isProcessing && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="mt-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-5 px-6 rounded-2xl transition-all duration-300"
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
          <div className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] p-4 sm:p-8 space-y-6">
            <div className="w-20 h-20 border-8 border-zinc-700 border-t-white rounded-full animate-spin"></div>

            <div className="text-center max-w-lg w-full space-y-4">
              <h3 className="text-xl font-bold">Creating Your Professional Dub</h3>

              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                {PROCESSING_STAGES.map((stage, idx) => {
                  const isActive = progress >= stage.progress && progress < (PROCESSING_STAGES[idx + 1]?.progress || 100);
                  const isComplete = progress > stage.progress;
                  return (
                    <div
                      key={stage.stage}
                      className={`flex items-center gap-3 py-2 transition-opacity ${
                        isActive ? 'opacity-100' : isComplete ? 'opacity-50' : 'opacity-30'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      ) : isActive ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-zinc-600 rounded-full flex-shrink-0" />
                      )}
                      <div className="text-left flex-1">
                        <div className={`text-sm font-medium ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                          {stage.stage}
                        </div>
                        {isActive && (
                          <div className="text-xs text-zinc-500">{stage.desc}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-6 text-left transition-all duration-500">
                {contentType === 'quality' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const IconComponent = QUALITY_HIGHLIGHTS[contentIndex % QUALITY_HIGHLIGHTS.length].icon;
                        return <IconComponent className="w-6 h-6 text-blue-400" />;
                      })()}
                      <h4 className="font-bold text-lg">
                        {QUALITY_HIGHLIGHTS[contentIndex % QUALITY_HIGHLIGHTS.length].title}
                      </h4>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {QUALITY_HIGHLIGHTS[contentIndex % QUALITY_HIGHLIGHTS.length].description}
                    </p>
                  </div>
                )}

                {contentType === 'tip' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Sparkles className="w-5 h-5" />
                      <span className="text-xs font-semibold uppercase tracking-wide">Pro Tip</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {TIPS[contentIndex % TIPS.length]}
                    </p>
                  </div>
                )}

                {contentType === 'testimonial' && (
                  <div className="space-y-3">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed italic">
                      "{TESTIMONIALS[contentIndex % TESTIMONIALS.length].text}"
                    </p>
                    <p className="text-xs text-zinc-500">
                      — {TESTIMONIALS[contentIndex % TESTIMONIALS.length].author}
                    </p>
                  </div>
                )}

                {contentType === 'insight' && (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500 font-medium">DID YOU KNOW?</p>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {SHUFFLED_INSIGHTS[contentIndex % SHUFFLED_INSIGHTS.length]}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-zinc-500">
                  Quality takes time. We're ensuring every detail is perfect.
                </p>
                <p className="text-xs text-zinc-600">
                  Your dub will appear in your Dashboard when ready. Feel free to explore while you wait.
                </p>
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
                  <pre className="text-xs text-red-200 overflow-x-auto whitespace-pre-wrap break-words">
                    {JSON.stringify(errorDetails, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {dubbedAudioUrl && (
          <div className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]">
            <div className="w-full">
              <p className="font-semibold text-lg mb-4 text-center">Preview & Download</p>
              <video
                src={dubbedAudioUrl}
                controls
                className="w-full rounded-lg bg-black mb-6 max-h-[300px]"
                preload="metadata"
              >
                Your browser does not support the video element.
              </video>
              <div className="space-y-3">
                <button
                  onClick={() => handleDownload(false)}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Video (MP4)
                </button>
                <button
                  onClick={handleNewUpload}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Upload Another File
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
