import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, supabase } from '../lib/auth';
import { Volume2, LogOut, CreditCard, Clock, Download, AlertCircle, Zap, Trophy, Lock, LogIn, Shield, Trash2, CheckCircle2 } from 'lucide-react';
import NavBar from '../components/NavBar';

interface Credits {
  credits_minutes: number;
  credits_used: number;
  created_at: string;
  updated_at: string;
}

interface Purchase {
  id: string;
  amount_usd: number;
  credits_minutes: number;
  package_name: string;
  status: string;
  created_at: string;
}

interface Transaction {
  id: string;
  credits_used: number;
  balance_before: number;
  balance_after: number;
  created_at: string;
  dubbing_job_id: string | null;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  milestone_count: number;
  reward_credits: number;
  badge_icon: string;
  display_order: number;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  unlocked_at: string;
  credits_awarded: number;
  achievement: Achievement;
}

interface UserProfile {
  completed_jobs_count: number;
}

interface LanguageStat {
  language: string;
  languageName: string;
  count: number;
  achieved1st: boolean;
  achieved1000: boolean;
  claimed1st: boolean;
  claimed1000: boolean;
}

interface DeletionRequest {
  scheduled_deletion_at: string;
  status: string;
}

export default function Account() {
  const { user, signOut } = useAuth();
  const [credits, setCredits] = useState<Credits | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [languageStats, setLanguageStats] = useState<LanguageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [privacyLoading, setPrivacyLoading] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchAccountData();
  }, [user]);

  const fetchAccountData = async () => {
    try {
      const achievementsRes = await supabase
        .from('achievements')
        .select('*')
        .order('display_order', { ascending: true });

      if (achievementsRes.error) throw achievementsRes.error;
      setAchievements(achievementsRes.data || []);

      if (user) {
        const [creditsRes, purchasesRes, transactionsRes, userAchievementsRes, profileRes, deletionRes] = await Promise.all([
          supabase
            .from('user_credits')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('credit_purchases')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('credit_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('user_achievements')
            .select(`
              *,
              achievement:achievements(*)
            `)
            .eq('user_id', user.id)
            .order('unlocked_at', { ascending: false }),
          supabase
            .from('user_profiles')
            .select('completed_jobs_count')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('data_deletion_requests')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()
        ]);

        if (creditsRes.error) throw creditsRes.error;
        if (purchasesRes.error) throw purchasesRes.error;
        if (transactionsRes.error) throw transactionsRes.error;
        if (userAchievementsRes.error) throw userAchievementsRes.error;
        if (profileRes.error) throw profileRes.error;

        setCredits(creditsRes.data);
        setPurchases(purchasesRes.data || []);
        setTransactions(transactionsRes.data || []);
        setUserAchievements(userAchievementsRes.data || []);
        setUserProfile(profileRes.data);
        setDeletionRequest(deletionRes.data);

        const languageMap: Record<string, string> = {
          es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
          pt: 'Portuguese', pl: 'Polish', tr: 'Turkish', ru: 'Russian',
          nl: 'Dutch', cs: 'Czech', ar: 'Arabic', zh: 'Chinese',
          ja: 'Japanese', ko: 'Korean', hi: 'Hindi'
        };

        const { data: jobStats } = await supabase
          .from('dubbing_jobs')
          .select('target_language')
          .eq('user_id', user.id)
          .eq('status', 'completed');

        const langCounts: Record<string, number> = {};
        jobStats?.forEach(job => {
          langCounts[job.target_language] = (langCounts[job.target_language] || 0) + 1;
        });

        const { data: milestones } = await supabase
          .from('language_milestones')
          .select('language_code, milestone_type')
          .eq('user_id', user.id);

        const claimed: Record<string, { first?: boolean; thousandth?: boolean }> = {};
        milestones?.forEach(m => {
          if (!claimed[m.language_code]) claimed[m.language_code] = {};
          if (m.milestone_type === 'first_dub') claimed[m.language_code].first = true;
          if (m.milestone_type === 'thousandth_dub') claimed[m.language_code].thousandth = true;
        });

        const stats: LanguageStat[] = Object.entries(languageMap).map(([code, name]) => ({
          language: code,
          languageName: name,
          count: langCounts[code] || 0,
          achieved1st: (langCounts[code] || 0) >= 1,
          achieved1000: (langCounts[code] || 0) >= 1000,
          claimed1st: claimed[code]?.first || false,
          claimed1000: claimed[code]?.thousandth || false
        }));

        setLanguageStats(stats.sort((a, b) => b.count - a.count));
      }
    } catch (err) {
      console.error('Error fetching account data:', err);
      setError('Failed to load account data');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimAchievement = async (achievementId: string, achievementName: string) => {
    if (!user) return;
    setClaimingId(achievementId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claim-reward`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'achievement',
            achievementId
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to claim');
      }

      setClaimSuccess(achievementName);
      setTimeout(() => setClaimSuccess(null), 3000);
      fetchAccountData();
    } catch (error) {
      console.error('Claim error:', error);
      alert(error instanceof Error ? error.message : 'Failed to claim reward. Please try again.');
    } finally {
      setClaimingId(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = import.meta.env.BASE_URL;
    } catch (error) {
      console.error('Sign out error:', error);
      alert('Failed to sign out: ' + error);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user) return;
    if (!confirm('Are you sure? Your account will be deleted in 30 days. You can cancel anytime before then.')) return;

    setPrivacyLoading('delete');
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/privacy-manager?action=request-deletion`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) throw new Error('Deletion request failed');

      const data = await response.json();
      setDeletionRequest({
        scheduled_deletion_at: data.scheduled_deletion_at,
        status: 'pending'
      });
    } catch (error) {
      console.error('Deletion error:', error);
      alert('Failed to request deletion. Please try again.');
    } finally {
      setPrivacyLoading(null);
    }
  };

  const handleCancelDeletion = async () => {
    if (!user) return;
    setPrivacyLoading('cancel');
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/privacy-manager?action=cancel-deletion`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) throw new Error('Cancellation failed');

      setDeletionRequest(null);
    } catch (error) {
      console.error('Cancellation error:', error);
      alert('Failed to cancel deletion. Please try again.');
    } finally {
      setPrivacyLoading(null);
    }
  };

  const creditsRemaining = (credits?.credits_minutes || 0) - (credits?.credits_used || 0);
  const usagePercent = credits?.credits_minutes
    ? (credits.credits_used / credits.credits_minutes) * 100
    : 0;

  const completedJobs = userProfile?.completed_jobs_count || 0;

  // Get unique languages count for language diversity achievements
  const uniqueLanguagesCount = new Set(
    languageStats.filter(l => l.count > 0).map(l => l.language)
  ).size;

  const nextAchievement = achievements.find(
    a => a.milestone_count > completedJobs && a.milestone_count > 0 && !userAchievements.some(ua => ua.achievement.id === a.id)
  );
  const progressToNext = nextAchievement
    ? (completedJobs / nextAchievement.milestone_count) * 100
    : 100;

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80"></div>

        <div className="relative">
          <NavBar />

          <div className="container mx-auto px-6 py-20 max-w-4xl">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center">
              <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-zinc-600" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Account Settings</h1>
              <p className="text-xl text-zinc-400 mb-8 max-w-md mx-auto">
                Sign in to view your credits, purchase history, and unlock achievements
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/login?redirect=/account"
                  className="bg-white hover:bg-zinc-200 text-black font-semibold py-4 px-8 rounded-xl transition-all duration-300 flex items-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  Sign In
                </Link>
                <Link
                  to="/signup?redirect=/account"
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300"
                >
                  Create Account
                </Link>
              </div>

              <div className="mt-12 grid md:grid-cols-3 gap-6 text-left">
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
                  <CreditCard className="w-8 h-8 text-zinc-400 mb-3" />
                  <h3 className="font-semibold mb-2">Track Credits</h3>
                  <p className="text-sm text-zinc-400">Monitor your usage and balance</p>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
                  <Trophy className="w-8 h-8 text-zinc-400 mb-3" />
                  <h3 className="font-semibold mb-2">Earn Rewards</h3>
                  <p className="text-sm text-zinc-400">Unlock achievements and free credits</p>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
                  <Clock className="w-8 h-8 text-zinc-400 mb-3" />
                  <h3 className="font-semibold mb-2">View History</h3>
                  <p className="text-sm text-zinc-400">Access all purchases and transactions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80"></div>

      <div className="relative">
        <NavBar />

        {claimSuccess && (
          <div className="fixed top-20 right-6 z-50 bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-4 rounded-xl shadow-2xl shadow-green-500/50 flex items-center gap-3 animate-in slide-in-from-top-5 fade-in duration-300">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Reward Claimed!</p>
              <p className="text-sm opacity-90">{claimSuccess}</p>
            </div>
          </div>
        )}

        <div className="container mx-auto px-6 py-12 max-w-6xl">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Account Settings</h1>
                <p className="text-zinc-400 text-sm md:text-base">Manage your credits and track achievements</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-left md:text-right">
                  <p className="text-xs text-zinc-500">Signed in as</p>
                  <p className="text-sm font-medium text-white truncate max-w-[200px]">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    handleSignOut();
                  }}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 md:py-3 px-4 md:px-6 rounded-xl transition-all duration-300 text-sm md:text-base whitespace-nowrap"
                >
                  <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Sign Out</span>
                  <span className="sm:hidden">Out</span>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-950/50 border-2 border-red-900 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium mb-1">Error</p>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-zinc-700 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-6 mb-12">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                      <Zap className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Your Credits</h2>
                      <p className="text-sm text-zinc-400">Never expire</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-5xl font-bold">{creditsRemaining}</span>
                      <span className="text-zinc-400">left</span>
                    </div>
                    <p className="text-sm text-zinc-500">
                      {credits?.credits_used || 0} of {credits?.credits_minutes || 0} used
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="w-full bg-zinc-800 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-white to-zinc-300 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, usagePercent)}%` }}
                      ></div>
                    </div>
                  </div>

                  <Link
                    to="/pricing"
                    className="w-full bg-white hover:bg-zinc-200 text-black font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    Buy More Credits
                  </Link>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Achievements</h2>
                      <p className="text-sm text-zinc-400">{completedJobs} videos dubbed</p>
                    </div>
                  </div>

                  {nextAchievement && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-zinc-400">
                          Next: {nextAchievement.name}
                        </span>
                        <span className="text-sm font-semibold">
                          {completedJobs}/{nextAchievement.milestone_count}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden mb-2">
                        <div
                          className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, progressToNext)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Reward: {nextAchievement.reward_credits} free credits
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {achievements.map((achievement) => {
                      const isUnlocked = userAchievements.some(ua => ua.achievement.id === achievement.id);
                      const isLanguageDiversity = achievement.milestone_count < 0;
                      const requiredAmount = isLanguageDiversity
                        ? Math.abs(achievement.milestone_count)
                        : achievement.milestone_count;
                      const currentAmount = isLanguageDiversity
                        ? uniqueLanguagesCount
                        : completedJobs;
                      const canClaim = !isUnlocked && currentAmount >= requiredAmount;
                      const isClaiming = claimingId === achievement.id;

                      return (
                        <div
                          key={achievement.id}
                          className={`p-4 rounded-xl border transition-all duration-300 ${
                            isUnlocked
                              ? 'bg-gradient-to-br from-yellow-900/20 to-zinc-800 border-yellow-500/50'
                              : canClaim
                              ? 'bg-zinc-800 border-green-500/50 shadow-lg shadow-green-500/20'
                              : 'bg-zinc-900 border-zinc-800 opacity-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="text-3xl">{achievement.badge_icon}</div>
                            {isUnlocked && <CheckCircle2 className="w-5 h-5 text-yellow-500" />}
                          </div>
                          <p className="text-xs font-semibold mb-1">{achievement.name}</p>
                          <p className="text-xs text-zinc-500 mb-2">
                            {isLanguageDiversity
                              ? `${requiredAmount} languages`
                              : `${requiredAmount} videos`}
                          </p>
                          {canClaim && (
                            <button
                              onClick={() => handleClaimAchievement(achievement.id, achievement.name)}
                              disabled={isClaiming}
                              className="w-full mt-2 py-1.5 px-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white text-xs font-semibold rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                            >
                              {isClaiming ? (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Zap className="w-3 h-3" />
                                  Claim {achievement.reward_credits} credits
                                </>
                              )}
                            </button>
                          )}
                          {isUnlocked && (
                            <div className="mt-2 py-1 px-2 bg-yellow-500/10 rounded text-xs text-yellow-500 text-center">
                              Claimed ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Billing Summary</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
                    <p className="text-sm text-zinc-400 mb-2">Total Spent</p>
                    <p className="text-3xl font-bold">
                      ${purchases
                        .filter(p => p.status === 'completed')
                        .reduce((sum, p) => sum + Number(p.amount_usd), 0)
                        .toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
                    <p className="text-sm text-zinc-400 mb-2">Total Credits Purchased</p>
                    <p className="text-3xl font-bold">
                      {purchases
                        .filter(p => p.status === 'completed')
                        .reduce((sum, p) => sum + p.credits_minutes, 0)} min
                    </p>
                  </div>
                  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
                    <p className="text-sm text-zinc-400 mb-2">Total Purchases</p>
                    <p className="text-3xl font-bold">
                      {purchases.filter(p => p.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-8">
                <h2 className="text-2xl font-bold mb-6">Purchase History</h2>
                {purchases.length === 0 ? (
                  <p className="text-zinc-400 text-center py-8">No purchases yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Package</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Credits</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchases.map((purchase) => (
                          <tr key={purchase.id} className="border-b border-zinc-800/50">
                            <td className="py-4 px-4 text-sm">
                              {new Date(purchase.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-4 px-4 text-sm font-medium">{purchase.package_name}</td>
                            <td className="py-4 px-4 text-sm">{purchase.credits_minutes} min</td>
                            <td className="py-4 px-4 text-sm font-medium">
                              ${Number(purchase.amount_usd).toFixed(2)}
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                  purchase.status === 'completed'
                                    ? 'bg-green-900/30 text-green-400'
                                    : purchase.status === 'pending'
                                    ? 'bg-yellow-900/30 text-yellow-400'
                                    : 'bg-red-900/30 text-red-400'
                                }`}
                              >
                                {purchase.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-8 mt-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Privacy & Security</h2>
                    <p className="text-sm text-zinc-400">Manage your data and privacy</p>
                  </div>
                </div>

                {deletionRequest && deletionRequest.status === 'pending' && (
                  <div className="mb-6 p-4 bg-red-950/50 border-2 border-red-900 rounded-xl">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-400 font-medium mb-1">Account Deletion Scheduled</p>
                        <p className="text-red-300 text-sm mb-2">
                          Your account will be permanently deleted on{' '}
                          {new Date(deletionRequest.scheduled_deletion_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCancelDeletion}
                      disabled={privacyLoading === 'cancel'}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {privacyLoading === 'cancel' ? 'Cancelling...' : 'Cancel Deletion'}
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2 flex items-center gap-2 text-red-400">
                          <Trash2 className="w-5 h-5" />
                          Delete Account
                        </h3>
                        <p className="text-sm text-zinc-400 mb-4">
                          Permanently delete your account and all data after 30 days. You can cancel anytime before deletion.
                        </p>
                        {!deletionRequest && (
                          <button
                            onClick={handleRequestDeletion}
                            disabled={privacyLoading === 'delete'}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {privacyLoading === 'delete' ? 'Processing...' : 'Request Deletion'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
                <div className="mb-6">
                  <h2 className="text-xl md:text-2xl font-bold mb-2">Recent Activity</h2>
                  <p className="text-sm text-zinc-400">Your latest achievements and credit usage</p>
                </div>
                {transactions.length === 0 && userAchievements.length === 0 ? (
                  <p className="text-zinc-400 text-center py-8">No activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {[...userAchievements.map(ua => ({
                      type: 'achievement',
                      data: ua,
                      date: ua.unlocked_at
                    })), ...transactions.map(t => ({
                      type: 'usage',
                      data: t,
                      date: t.created_at
                    }))]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 15)
                      .map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-xl transition-colors"
                        >
                          {item.type === 'achievement' ? (
                            <>
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                  <Trophy className="w-5 h-5 text-yellow-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm">
                                    {(item.data as UserAchievement).achievement.name}
                                  </p>
                                  <p className="text-xs text-zinc-500 mt-0.5">
                                    {new Date(item.date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                <p className="font-bold text-green-400">
                                  +{(item.data as UserAchievement).credits_awarded}
                                </p>
                                <p className="text-xs text-zinc-500">credits</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 bg-zinc-700 rounded-xl flex items-center justify-center flex-shrink-0">
                                  <Download className="w-5 h-5 text-zinc-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm">Video Dubbed</p>
                                  <p className="text-xs text-zinc-500 mt-0.5">
                                    {new Date(item.date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                <p className="font-bold text-red-400">
                                  -{(item.data as Transaction).credits_used}
                                </p>
                                <p className="text-xs text-zinc-500">credits</p>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <footer className="border-t border-zinc-800 mt-20">
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-black" />
                </div>
                <span>© 2025 DubStudio. All rights reserved.</span>
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
    </div>
  );
}
