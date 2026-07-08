import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { TrendingUp, Users, MessageCircle, FileQuestion, Activity } from 'lucide-react';
import { useAuth } from '../lib/auth';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import ConversionFunnel from '../components/ConversionFunnel';
import CohortAnalysis from '../components/CohortAnalysis';
import QuizAnalytics from '../components/QuizAnalytics';
import UserFeedback from '../components/UserFeedback';
import UserActivityLogs from '../components/UserActivityLogs';

type TabType = 'funnel' | 'cohort' | 'quiz' | 'feedback' | 'activity';

export default function Analytics2() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('funnel');
  const [quizCount, setQuizCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoad();
  }, [user]);

  const checkAdminAndLoad = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Check if user is admin using auth metadata
      const { data: authUser, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(`Auth error: ${authError.message}`);
      }

      console.log('Auth user:', authUser?.user?.id);
      console.log('App metadata:', authUser?.user?.app_metadata);

      const isUserAdmin = authUser?.user?.app_metadata?.is_admin === true;
      console.log('Is admin?', isUserAdmin);

      setIsAdmin(isUserAdmin);

      if (isUserAdmin) {
        await loadStats();
      } else {
        setError('Admin access required. Your account is not set as admin.');
      }
    } catch (err) {
      console.error('Error in checkAdminAndLoad:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [quizRes, feedbackRes] = await Promise.all([
        supabase.from('quiz_responses').select('id', { count: 'exact', head: true }),
        supabase.from('feedback_submissions').select('id', { count: 'exact', head: true })
      ]);

      if (quizRes.error) {
        console.error('Error fetching quiz count:', quizRes.error);
      }
      if (feedbackRes.error) {
        console.error('Error fetching feedback count:', feedbackRes.error);
      }

      setQuizCount(quizRes.count || 0);
      setFeedbackCount(feedbackRes.count || 0);
    } catch (err) {
      console.error('Error loading counts:', err);
    }
  };

  if (isLoading) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-zinc-400">Loading...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!user || !isAdmin) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold mb-4">Admin Access Only</h1>
            <p className="text-zinc-400">This page is restricted to administrators.</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="text-center max-w-2xl">
            <h1 className="text-2xl font-bold mb-4 text-red-400">Error</h1>
            <p className="text-zinc-400 mb-4">{error}</p>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left">
              <p className="text-xs text-zinc-500 font-mono whitespace-pre-wrap">{error}</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const tabs = [
    { id: 'funnel' as TabType, label: 'Conversion Funnel', icon: TrendingUp },
    { id: 'cohort' as TabType, label: 'Cohort Analysis', icon: Users },
    { id: 'activity' as TabType, label: 'User Activity', icon: Activity },
    { id: 'quiz' as TabType, label: `Quiz Analytics (${quizCount})`, icon: FileQuestion },
    { id: 'feedback' as TabType, label: `User Feedback (${feedbackCount})`, icon: MessageCircle },
  ];

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-black text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-zinc-400">Advanced analytics and insights</p>
          </div>

          {/* Tabs */}
          <div className="border-b border-zinc-800 mb-8">
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-white'
                        : 'border-transparent text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            {activeTab === 'funnel' && <ConversionFunnel />}
            {activeTab === 'cohort' && <CohortAnalysis />}
            {activeTab === 'activity' && <UserActivityLogs />}
            {activeTab === 'quiz' && <QuizAnalytics />}
            {activeTab === 'feedback' && <UserFeedback />}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
