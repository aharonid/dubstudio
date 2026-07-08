import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/auth';
import { Volume2, Download, AlertCircle, Eye } from 'lucide-react';

interface SharedJob {
  id: string;
  original_filename: string;
  target_language: string;
  status: string;
  audio_url: string | null;
  created_at: string;
  share_count: number;
  is_public: boolean;
}

export default function Share() {
  const { token } = useParams<{ token: string }>();
  const [job, setJob] = useState<SharedJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchSharedJob();
    }
  }, [token]);

  const fetchSharedJob = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('dubbing_jobs')
        .select('*')
        .eq('share_token', token)
        .eq('is_public', true)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) {
        setError('This shared link is invalid or has been disabled.');
        setLoading(false);
        return;
      }

      if (data.status !== 'completed' || !data.audio_url) {
        setError('This video is not available for viewing.');
        setLoading(false);
        return;
      }

      setJob(data);

      await supabase
        .from('dubbing_jobs')
        .update({ share_count: data.share_count + 1 })
        .eq('id', data.id);

      const downloadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dub-audio/download/${data.id}`;
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
      } else {
        throw new Error('Failed to load video');
      }
    } catch (err) {
      console.error('Error fetching shared job:', err);
      setError('Failed to load shared video. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (audioOnly = false) => {
    if (!job) return;

    try {
      const downloadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dub-audio/download/${job.id}${audioOnly ? '?audio_only=true' : ''}`;
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = audioOnly ? `dubbed_audio_${job.target_language}.mp3` : `dubbed_${job.target_language}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download file');
    }
  };

  const getLanguageName = (code: string) => {
    const languages: { [key: string]: string } = {
      es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese',
      nl: 'Dutch', pl: 'Polish', ru: 'Russian', zh: 'Chinese', ja: 'Japanese',
      ko: 'Korean', hi: 'Hindi', ar: 'Arabic', tr: 'Turkish', cs: 'Czech'
    };
    return languages[code] || code.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80"></div>

      <div className="relative">
        <nav className="border-b border-zinc-800 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-black" />
              </div>
              <span className="text-xl font-bold">DubStudio</span>
            </Link>
          </div>
        </nav>

        <div className="container mx-auto px-6 py-20 max-w-4xl">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-zinc-700 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12">
              <div className="flex items-start gap-4 mb-6">
                <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
                <div>
                  <h1 className="text-2xl font-bold mb-2">Unable to Load Video</h1>
                  <p className="text-zinc-400">{error}</p>
                </div>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-white hover:bg-zinc-200 text-black font-semibold py-3 px-6 rounded-lg transition-all duration-300"
              >
                Go to Homepage
              </Link>
            </div>
          ) : job && videoUrl ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12">
              <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">{job.original_filename}</h1>
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span>Dubbed to {getLanguageName(job.target_language)}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {job.share_count} views
                  </div>
                </div>
              </div>

              <video
                src={videoUrl}
                controls
                className="w-full rounded-xl bg-black mb-6 max-h-[80vh] object-contain"
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
              </div>

              <div className="mt-8 pt-8 border-t border-zinc-800 text-center">
                <p className="text-zinc-400 mb-4">Create your own dubbed videos</p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 bg-white hover:bg-zinc-200 text-black font-semibold py-3 px-6 rounded-lg transition-all duration-300"
                >
                  Try DubStudio Free
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
