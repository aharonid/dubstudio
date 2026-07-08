import { useState, useEffect } from 'react';
import { supabase } from '../lib/auth';
import {
  X, User, Video, Download, Share2,
  CheckCircle, XCircle, AlertCircle, LogIn, Zap, DollarSign
} from 'lucide-react';

interface UserProfileProps {
  userId: string;
  onClose: () => void;
}

interface UserData {
  email: string;
  created_at: string;
  credits_balance: number;
  total_minutes_dubbed: number;
  is_admin: boolean;
  is_banned: boolean;
}

interface LoginEvent {
  id: string;
  logged_in_at: string;
  ip_address: string;
  user_agent: string;
  login_method: string;
  success: boolean;
}

interface DubbingJob {
  id: string;
  created_at: string;
  original_filename: string;
  target_language: string;
  status: string;
  duration_minutes: number;
  downloaded_at: string | null;
  abandoned_at: string | null;
  shared_at: string | null;
  is_public: boolean;
  share_count: number;
}

interface Purchase {
  id: string;
  created_at: string;
  credits_purchased: number;
  amount_usd: number;
  payment_status: string;
  discount_applied: number;
}

export default function UserProfile({ userId, onClose }: UserProfileProps) {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);
  const [dubbingJobs, setDubbingJobs] = useState<DubbingJob[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activeTab, setActiveTab] = useState<'activity' | 'logins' | 'purchases'>('activity');

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      const [userResult, loginsResult, jobsResult, purchasesResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('login_history')
          .select('*')
          .eq('user_id', userId)
          .order('logged_in_at', { ascending: false })
          .limit(50),
        supabase
          .from('dubbing_jobs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('credit_purchases')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ]);

      if (userResult.error) throw userResult.error;

      const { data: authUser } = await supabase.auth.admin.getUserById(userId);

      setUserData({
        email: authUser.user?.email || 'Unknown',
        created_at: userResult.data?.created_at || '',
        credits_balance: userResult.data?.credits_balance || 0,
        total_minutes_dubbed: userResult.data?.total_minutes_dubbed || 0,
        is_admin: userResult.data?.is_admin || false,
        is_banned: userResult.data?.is_banned || false
      });

      setLoginHistory(loginsResult.data || []);
      setDubbingJobs(jobsResult.data || []);
      setPurchases(purchasesResult.data || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLanguageName = (code: string) => {
    const languages: { [key: string]: string } = {
      en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
      pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', ru: 'Russian', zh: 'Chinese',
      ja: 'Japanese', ko: 'Korean', hi: 'Hindi', ar: 'Arabic', tr: 'Turkish', cs: 'Czech'
    };
    return languages[code] || code.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-6xl max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-zinc-700 border-t-white rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <p className="text-red-400">Failed to load user data</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-zinc-800 rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{userData.email}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-zinc-400">
                  Joined {formatDate(userData.created_at)}
                </span>
                {userData.is_admin && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                    Admin
                  </span>
                )}
                {userData.is_banned && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                    Banned
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 p-6 border-b border-zinc-800 bg-zinc-900/50">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-500 mb-2">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Credits</span>
            </div>
            <p className="text-2xl font-bold">{userData.credits_balance}</p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Video className="w-4 h-4" />
              <span className="text-sm font-medium">Total Dubbed</span>
            </div>
            <p className="text-2xl font-bold">{userData.total_minutes_dubbed} min</p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">Total Spent</span>
            </div>
            <p className="text-2xl font-bold">
              ${purchases.reduce((sum, p) => sum + p.amount_usd, 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex gap-2 p-6 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'activity'
                ? 'bg-white text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Dubbing History ({dubbingJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('logins')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'logins'
                ? 'bg-white text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Login History ({loginHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'purchases'
                ? 'bg-white text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Purchases ({purchases.length})
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'activity' && (
            <div className="space-y-3">
              {dubbingJobs.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">No dubbing jobs yet</p>
              ) : (
                dubbingJobs.map((job) => (
                  <div key={job.id} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className="font-medium">{job.original_filename}</span>
                      </div>
                      <span className="text-sm text-zinc-400">{formatDate(job.created_at)}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-zinc-500">Language:</span>{' '}
                        <span className="text-zinc-300">{getLanguageName(job.target_language)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Duration:</span>{' '}
                        <span className="text-zinc-300">{job.duration_minutes} min</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Status:</span>{' '}
                        <span className={`capitalize ${
                          job.status === 'completed' ? 'text-green-400' :
                          job.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                        }`}>{job.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.downloaded_at && (
                          <span className="flex items-center gap-1 text-green-400" title="Downloaded">
                            <Download className="w-3 h-3" />
                          </span>
                        )}
                        {job.is_public && (
                          <span className="flex items-center gap-1 text-blue-400" title={`Shared (${job.share_count} views)`}>
                            <Share2 className="w-3 h-3" />
                            {job.share_count}
                          </span>
                        )}
                        {job.abandoned_at && (
                          <span className="flex items-center gap-1 text-orange-400" title="Abandoned">
                            <AlertCircle className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'logins' && (
            <div className="space-y-3">
              {loginHistory.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">No login history</p>
              ) : (
                loginHistory.map((login) => (
                  <div key={login.id} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <LogIn className="w-4 h-4 text-green-400" />
                        <div>
                          <div className="font-medium">{formatDate(login.logged_in_at)}</div>
                          <div className="text-sm text-zinc-400 mt-1">
                            {login.ip_address && <span>IP: {login.ip_address}</span>}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1 max-w-md truncate" title={login.user_agent}>
                            {login.user_agent}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs bg-zinc-700 px-2 py-1 rounded">
                        {login.login_method}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'purchases' && (
            <div className="space-y-3">
              {purchases.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">No purchases yet</p>
              ) : (
                purchases.map((purchase) => (
                  <div key={purchase.id} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <div>
                          <div className="font-medium">{formatDate(purchase.created_at)}</div>
                          <div className="text-sm text-zinc-400 mt-1">
                            {purchase.credits_purchased} credits • ${purchase.amount_usd.toFixed(2)}
                          </div>
                          {purchase.discount_applied > 0 && (
                            <div className="text-xs text-green-400 mt-1">
                              Discount: ${purchase.discount_applied.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        purchase.payment_status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {purchase.payment_status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
