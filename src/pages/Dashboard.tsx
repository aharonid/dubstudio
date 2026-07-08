import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, supabase } from '../lib/auth';
import { Download, AlertCircle, Play, Share2, Check, Volume2, Users, DollarSign, Activity, MessageSquare, BarChart3 } from 'lucide-react';
import DubbingForm from '../components/DubbingForm';
import NavBar from '../components/NavBar';

interface DubbingJob {
  id: string;
  source_filename: string;
  target_language: string;
  status: string;
  audio_url: string | null;
  created_at: string;
  expires_at: string | null;
  download_count: number;
  share_token: string | null;
  is_public: boolean;
  share_count: number;
}

interface JobWithPreview extends DubbingJob {
  previewUrl?: string;
  loadingPreview?: boolean;
}

interface Stats {
  totalUsers: number;
  totalJobs: number;
  totalRevenue: number;
  totalFeedback: number;
  activeUsers7d: number;
  activeUsers30d: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobWithPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const loadedPreviewsRef = useRef<Map<string, string>>(new Map());
  const loadingJobIdsRef = useRef<Set<string>>(new Set());
  const [stats, setStats] = useState<Stats | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchJobs();
    triggerJobMonitor();
    checkAdminAndLoadStats();
    const interval = setInterval(() => {
      fetchJobs();
      triggerJobMonitor();
    }, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const checkAdminAndLoadStats = async () => {
    if (!user) return;

    try {
      const { data: authUser } = await supabase.auth.getUser();
      const isUserAdmin = authUser?.user?.app_metadata?.is_admin === true;
      setIsAdmin(isUserAdmin);

      if (isUserAdmin) {
        await loadStats();
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadStats = async () => {
    try {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id');

      const { data: allJobs } = await supabase
        .from('dubbing_jobs')
        .select('user_id, status, created_at');

      const { data: purchases } = await supabase
        .from('credit_purchases')
        .select('amount_cents, discount_cents');

      const { data: feedback } = await supabase
        .from('feedback_submissions')
        .select('id');

      const totalUsers = profiles?.length || 0;
      const completedJobs = allJobs?.filter(j => j.status === 'completed') || [];
      const totalRevenue = purchases?.reduce((sum, p) => sum + (p.amount_cents - (p.discount_cents || 0)), 0) || 0;

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const activeUsers7Days = new Set(
        allJobs?.filter(j => new Date(j.created_at) > sevenDaysAgo).map(j => j.user_id)
      ).size;

      const activeUsers30Days = new Set(
        allJobs?.filter(j => new Date(j.created_at) > thirtyDaysAgo).map(j => j.user_id)
      ).size;

      setStats({
        totalUsers,
        totalJobs: completedJobs.length,
        totalRevenue: totalRevenue / 100,
        totalFeedback: feedback?.length || 0,
        activeUsers7d: activeUsers7Days,
        activeUsers30d: activeUsers30Days,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const triggerJobMonitor = async () => {
    try {
      const monitorUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/job-monitor`;
      await fetch(monitorUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
    } catch (err) {
      console.error('Job monitor trigger failed:', err);
    }
  };

  const fetchJobs = async () => {
    if (!user) return;

    try {
      const sessionId = localStorage.getItem('dubbing_session_id');

      let query = supabase
        .from('dubbing_jobs')
        .select('*');

      if (sessionId) {
        query = query.or(`user_id.eq.${user.id},session_id.eq.${sessionId}`);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const jobsWithCachedPreviews = (data || []).map(job => {
        const cachedUrl = loadedPreviewsRef.current.get(job.id);
        return cachedUrl ? { ...job, previewUrl: cachedUrl } : job;
      });

      setJobs(jobsWithCachedPreviews);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Failed to load your dubbing jobs');
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async (jobId: string) => {
    if (loadedPreviewsRef.current.has(jobId)) {
      console.log('[PREVIEW DEBUG] Preview already cached for jobId:', jobId);
      return;
    }

    if (loadingJobIdsRef.current.has(jobId)) {
      console.log('[PREVIEW DEBUG] Already loading preview for jobId:', jobId);
      return;
    }

    console.log('[PREVIEW DEBUG] Starting loadPreview for jobId:', jobId);
    loadingJobIdsRef.current.add(jobId);

    setJobs(prevJobs => prevJobs.map(j =>
      j.id === jobId ? { ...j, loadingPreview: true } : j
    ));

    try {
      const downloadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dub-audio/download/${jobId}`;
      console.log('[PREVIEW DEBUG] Fetching from URL:', downloadUrl);

      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      console.log('[PREVIEW DEBUG] Response status:', response.status, 'OK:', response.ok);
      console.log('[PREVIEW DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PREVIEW DEBUG] Response error body:', errorText);
        throw new Error(`Failed to load preview: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      console.log('[PREVIEW DEBUG] Blob received - size:', blob.size, 'type:', blob.type);

      const url = URL.createObjectURL(blob);
      console.log('[PREVIEW DEBUG] Blob URL created:', url);

      loadedPreviewsRef.current.set(jobId, url);

      setJobs(prevJobs => prevJobs.map(j =>
        j.id === jobId ? { ...j, previewUrl: url, loadingPreview: false } : j
      ));

      console.log('[PREVIEW DEBUG] Preview loaded successfully for jobId:', jobId);
    } catch (err) {
      console.error('[PREVIEW DEBUG] Error loading preview for jobId:', jobId, err);
      loadingJobIdsRef.current.delete(jobId);
      setJobs(prevJobs => prevJobs.map(j =>
        j.id === jobId ? { ...j, loadingPreview: false } : j
      ));
    }
  };

  const handleDownload = async (jobId: string, audioOnly = false) => {
    try {
      const downloadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dub-audio/download/${jobId}${audioOnly ? '?audio_only=true' : ''}`;
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
      a.download = audioOnly ? `dubbed_audio_${jobId}.mp3` : `dubbed_${jobId}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await supabase
        .from('dubbing_jobs')
        .update({
          download_count: jobs.find(j => j.id === jobId)!.download_count + 1,
          downloaded_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      fetchJobs();
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download file');
    }
  };

  const handleShare = async (jobId: string) => {
    try {
      const job = jobs.find(j => j.id === jobId);

      if (job?.share_token) {
        const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}share/${job.share_token}`;
        await navigator.clipboard.writeText(shareUrl);
        setCopiedJobId(jobId);
        setShowToast(true);
        setTimeout(() => {
          setCopiedJobId(null);
          setShowToast(false);
        }, 3000);
        return;
      }

      const shareToken = `${jobId.substring(0, 8)}_${Date.now().toString(36)}`;

      const { error } = await supabase
        .from('dubbing_jobs')
        .update({
          share_token: shareToken,
          is_public: true,
        })
        .eq('id', jobId)
        .eq('user_id', user!.id);

      if (error) throw error;

      const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}share/${shareToken}`;
      await navigator.clipboard.writeText(shareUrl);

      setJobs(jobs.map(j => j.id === jobId ? { ...j, share_token: shareToken, is_public: true } : j));
      setCopiedJobId(jobId);
      setShowToast(true);
      setTimeout(() => {
        setCopiedJobId(null);
        setShowToast(false);
      }, 3000);
    } catch (err) {
      console.error('Share error:', err);
      setError('Failed to generate share link');
    }
  };

  const handleTogglePreview = (jobId: string) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
    } else {
      setExpandedJobId(jobId);
      const job = jobs.find(j => j.id === jobId);
      if (job && !job.previewUrl && !job.loadingPreview) {
        loadPreview(jobId);
      }
    }
  };

  useEffect(() => {
    console.log('[PREVIEW DEBUG] useEffect triggered - jobs.length:', jobs.length);
    console.log('[PREVIEW DEBUG] Jobs data:', jobs.map(j => ({
      id: j.id,
      status: j.status,
      hasAudioUrl: !!j.audio_url,
      hasPreviewUrl: !!j.previewUrl,
      loadingPreview: j.loadingPreview,
      filename: j.source_filename
    })));

    jobs.forEach(job => {
      if (job.status === 'completed' && job.audio_url && !job.previewUrl && !job.loadingPreview && !loadingJobIdsRef.current.has(job.id)) {
        console.log('[PREVIEW DEBUG] Triggering loadPreview for job:', job.id, job.source_filename);
        loadPreview(job.id);
      }
    });
  }, [jobs.map(j => `${j.id}-${j.status}-${!!j.previewUrl}-${!!j.loadingPreview}`).join(',')]);

  const getDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getLanguageName = (code: string) => {
    const languages: Record<string, string> = {
      es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
      pt: 'Portuguese', pl: 'Polish', tr: 'Turkish', ru: 'Russian',
      nl: 'Dutch', cs: 'Czech', ar: 'Arabic', zh: 'Chinese',
      ja: 'Japanese', ko: 'Korean', hi: 'Hindi'
    };
    return languages[code] || code;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'processing': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-zinc-400';
    }
  };

  const getExpiryColor = (days: number | null) => {
    if (days === null) return 'text-green-400';
    if (days === 0) return 'text-red-400';
    if (days <= 3) return 'text-yellow-400';
    return 'text-zinc-400';
  };

  const getLanguagePrompt = (code: string) => {
    const prompts: Record<string, string> = {
      'es': '¿Qué estás esperando?',
      'fr': 'Qu\'attendez-vous?',
      'de': 'Worauf wartest du?',
      'it': 'Cosa stai aspettando?',
      'pt': 'O que você está esperando?',
      'nl': 'Waar wacht je op?',
      'pl': 'Na co czekasz?',
      'ru': 'Чего ты ждешь?',
      'zh': '你在等什么？',
      'ja': '何を待っているの？',
      'ko': '무엇을 기다리고 있나요?',
      'hi': 'आप किस बात का इंतज़ार कर रहे हैं?',
      'ar': 'ماذا تنتظر؟',
      'tr': 'Ne bekliyorsun?',
    };
    return prompts[code] || 'What Are You Waiting For?';
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80"></div>

      <div className="relative">
        <NavBar />

        <div className="container mx-auto px-6 py-12 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">My Dashboard</h1>
            <p className="text-zinc-400">Create new dubs and manage your dubbed content</p>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Create New Dub</h2>
            <DubbingForm userId={user!.id} onJobComplete={fetchJobs} />
          </div>

          {isAdmin && stats && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Platform Stats</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Total Users</h3>
                  </div>
                  <p className="text-4xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-zinc-500 mt-1">Registered accounts</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Active (7d)</h3>
                  </div>
                  <p className="text-4xl font-bold">{stats.activeUsers7d}</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    {stats.totalUsers > 0
                      ? `${((stats.activeUsers7d / stats.totalUsers) * 100).toFixed(1)}% of users`
                      : '0% of users'}
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-5 h-5 text-orange-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Active (30d)</h3>
                  </div>
                  <p className="text-4xl font-bold">{stats.activeUsers30d}</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    {stats.totalUsers > 0
                      ? `${((stats.activeUsers30d / stats.totalUsers) * 100).toFixed(1)}% of users`
                      : '0% of users'}
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Completed Jobs</h3>
                  </div>
                  <p className="text-4xl font-bold">{stats.totalJobs}</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    {stats.totalUsers > 0
                      ? `${(stats.totalJobs / stats.totalUsers).toFixed(1)} per user`
                      : '0 per user'}
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Total Revenue</h3>
                  </div>
                  <p className="text-4xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
                  <p className="text-sm text-zinc-500 mt-1">All-time earnings</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Feedback Received</h3>
                  </div>
                  <p className="text-4xl font-bold">{stats.totalFeedback}</p>
                  <p className="text-sm text-zinc-500 mt-1">User submissions</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-8 p-4 bg-red-950/50 border-2 border-red-900 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium mb-1">Error</p>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Your Dubs</h2>
                <p className="text-zinc-400 mt-2">Track expiration dates and download your completed jobs</p>
              </div>
              {jobs.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-400">Filter:</label>
                  <select
                    value={languageFilter}
                    onChange={(e) => setLanguageFilter(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
                  >
                    <option value="all">All Languages</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="nl">Dutch</option>
                    <option value="pl">Polish</option>
                    <option value="ru">Russian</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="hi">Hindi</option>
                    <option value="ar">Arabic</option>
                    <option value="tr">Turkish</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-zinc-700 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
              <p className="text-zinc-400 text-lg">
                No dubbing jobs yet. Upload your first file above to get started!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {jobs.filter(job => languageFilter === 'all' || job.target_language === languageFilter).length === 0 ? (
                <div className="col-span-full bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
                  <p className="text-zinc-400 text-lg">
                    No Dubs in {getLanguageName(languageFilter)}... {getLanguagePrompt(languageFilter)}
                  </p>
                </div>
              ) : null}
              {jobs.filter(job => languageFilter === 'all' || job.target_language === languageFilter).map((job) => {
                const daysRemaining = getDaysRemaining(job.expires_at);
                const isExpired = daysRemaining === 0;
                const neverExpires = daysRemaining === null;
                const isExpanded = expandedJobId === job.id;

                return (
                  <div
                    key={job.id}
                    className={`bg-zinc-900 border ${
                      isExpired ? 'border-red-900/50' : 'border-zinc-800'
                    } rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors duration-300`}
                  >
                    {job.status === 'completed' && job.audio_url && !isExpired && (
                      <div className="relative bg-black group" style={{ aspectRatio: '9/16' }}>
                        {isExpanded ? (
                          <video
                            key={job.id}
                            src={job.previewUrl}
                            controls
                            autoPlay
                            className="w-full h-full object-contain"
                            preload="metadata"
                          >
                            Your browser does not support the video element.
                          </video>
                        ) : job.previewUrl ? (
                          <>
                            <video
                              src={job.previewUrl}
                              className="w-full h-full object-cover"
                              preload="metadata"
                              muted
                            />
                            <button
                              onClick={() => handleTogglePreview(job.id)}
                              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors cursor-pointer"
                            >
                              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Play className="w-6 h-6 text-black ml-0.5" />
                              </div>
                            </button>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                            <div className="w-10 h-10 border-4 border-zinc-600 border-t-white rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                    )}

                    {(job.status !== 'completed' || isExpired) && (
                      <div className="relative bg-zinc-800" style={{ aspectRatio: '9/16' }}>
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center p-4">
                            <Volume2 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                            <p className="text-xs text-zinc-500">
                              {isExpired ? 'Expired' : job.status === 'processing' ? 'Processing' : 'Failed'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-3">
                      <h3 className="text-sm font-semibold mb-2 truncate">
                        {job.source_filename}
                      </h3>

                      <div className="flex flex-col gap-1.5 text-xs mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">
                            {getLanguageName(job.target_language)}
                          </span>
                          <span className={getStatusColor(job.status)}>
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </span>
                        </div>

                        <div className={`${getExpiryColor(daysRemaining)} font-medium`}>
                          {neverExpires
                            ? 'Never expires'
                            : isExpired
                            ? 'Expired'
                            : `${daysRemaining}d left`}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {job.status === 'completed' && job.audio_url && !isExpired && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDownload(job.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-zinc-200 text-black font-semibold py-2 px-3 rounded-lg transition-all duration-300 text-xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Video
                            </button>
                            <button
                              onClick={() => handleShare(job.id)}
                              className={`flex items-center justify-center p-2 rounded-lg transition-all duration-300 ${
                                copiedJobId === job.id
                                  ? 'bg-green-600 text-white'
                                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'
                              }`}
                              title={copiedJobId === job.id ? 'Link copied!' : job.share_token ? 'Copy share link' : 'Create share link'}
                            >
                              {copiedJobId === job.id ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Share2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="border-t border-zinc-800 mt-20">
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-black" />
                </div>
                <span>© 2025 DubDash. All rights reserved.</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <Link to="/contact" className="text-zinc-400 hover:text-white transition-colors">
                  Contact
                </Link>
                <Link to="/terms" className="text-zinc-400 hover:text-white transition-colors">
                  Terms and Conditions
                </Link>
                <Link to="/privacy" className="text-zinc-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-in-right">
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl border border-green-500 flex items-center gap-3 min-w-[280px]">
            <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Link copied!</p>
              <p className="text-sm text-green-100">Share link copied to clipboard</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
