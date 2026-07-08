import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BarChart3, Users, TrendingUp, Globe, Calendar, Mail, Star, MessageSquare, Bug, Lightbulb, Heart, ArrowDown, ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

interface QuizResponse {
  id: string;
  email: string | null;
  content_type: string;
  channel_size: string;
  primary_location: string;
  goals: string[];
  content_topic: string;
  current_language: string;
  recommended_languages: string[];
  created_at: string;
}

interface FeedbackSubmission {
  id: string;
  user_id: string | null;
  email: string | null;
  rating: number;
  feedback_type: string;
  message: string;
  allow_testimonial: boolean;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface ConversionFunnel {
  totalSignups: number;
  completedFirstJob: number;
  madePurchase: number;
  signupToJobRate: number;
  jobToPurchaseRate: number;
  overallConversionRate: number;
  avgJobsPerUser: number;
  avgRevenuePerUser: number;
  totalRevenue: number;
  activeUsers7Days: number;
  activeUsers30Days: number;
}

interface CohortData {
  week: string;
  signups: number;
  day1Retention: number;
  day7Retention: number;
  day30Retention: number;
}

export default function Analytics() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'funnel' | 'cohort' | 'quiz' | 'feedback'>('funnel');
  const [quizResponses, setQuizResponses] = useState<QuizResponse[]>([]);
  const [feedbackSubmissions, setFeedbackSubmissions] = useState<FeedbackSubmission[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnel | null>(null);
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, [user]);

  const checkAdminAndLoadData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: authUser } = await supabase.auth.getUser();
      const isUserAdmin = authUser?.user?.app_metadata?.is_admin === true;
      setIsAdmin(isUserAdmin);

      if (isUserAdmin) {
        await Promise.all([
          loadConversionFunnel(),
          loadCohortData(),
          loadQuizResponses(),
          loadFeedback()
        ]);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuizResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizResponses(data || []);
    } catch (error) {
      console.error('Error loading quiz responses:', error);
    }
  };

  const loadFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbackSubmissions(data || []);
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const loadConversionFunnel = async () => {
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, created_at');

      if (profileError) throw profileError;

      const { data: allJobs, error: jobError } = await supabase
        .from('dubbing_jobs')
        .select('user_id, status, created_at');

      if (jobError) throw jobError;

      const { data: purchases, error: purchaseError } = await supabase
        .from('credit_purchases')
        .select('user_id, amount_cents, discount_cents');

      if (purchaseError) throw purchaseError;

      const totalSignups = profiles?.length || 0;
      const completedJobs = allJobs?.filter(j => j.status === 'completed') || [];
      const usersWithJobs = new Set(completedJobs.map(j => j.user_id)).size;
      const usersWithPurchases = new Set(purchases?.map(p => p.user_id)).size;

      const signupToJobRate = totalSignups > 0 ? (usersWithJobs / totalSignups) * 100 : 0;
      const jobToPurchaseRate = usersWithJobs > 0 ? (usersWithPurchases / usersWithJobs) * 100 : 0;
      const overallConversionRate = totalSignups > 0 ? (usersWithPurchases / totalSignups) * 100 : 0;

      const avgJobsPerUser = totalSignups > 0 ? completedJobs.length / totalSignups : 0;
      const totalRevenue = purchases?.reduce((sum, p) => sum + (p.amount_cents - (p.discount_cents || 0)), 0) || 0;
      const avgRevenuePerUser = totalSignups > 0 ? totalRevenue / 100 / totalSignups : 0;

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const activeUsers7Days = new Set(
        allJobs?.filter(j => new Date(j.created_at) > sevenDaysAgo).map(j => j.user_id)
      ).size;

      const activeUsers30Days = new Set(
        allJobs?.filter(j => new Date(j.created_at) > thirtyDaysAgo).map(j => j.user_id)
      ).size;

      setConversionFunnel({
        totalSignups,
        completedFirstJob: usersWithJobs,
        madePurchase: usersWithPurchases,
        signupToJobRate,
        jobToPurchaseRate,
        overallConversionRate,
        avgJobsPerUser,
        avgRevenuePerUser,
        totalRevenue: totalRevenue / 100,
        activeUsers7Days,
        activeUsers30Days
      });
    } catch (error) {
      console.error('Error loading conversion funnel:', error);
    }
  };

  const loadCohortData = async () => {
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, created_at')
        .order('created_at', { ascending: false});

      if (profileError) throw profileError;

      const { data: loginHistory, error: loginError } = await supabase
        .from('login_history')
        .select('user_id, login_at');

      if (loginError) throw loginError;

      const cohorts: { [key: string]: CohortData } = {};
      const now = new Date();

      profiles?.forEach(profile => {
        const signupDate = new Date(profile.created_at);
        const weekStart = new Date(signupDate);
        weekStart.setDate(signupDate.getDate() - signupDate.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!cohorts[weekKey]) {
          cohorts[weekKey] = {
            week: weekKey,
            signups: 0,
            day1Retention: 0,
            day7Retention: 0,
            day30Retention: 0
          };
        }

        cohorts[weekKey].signups++;

        const userLogins = loginHistory?.filter(l => l.user_id === profile.id).map(l => new Date(l.login_at));

        const daysSinceSignup = Math.floor((now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceSignup >= 1) {
          const day1 = new Date(signupDate);
          day1.setDate(day1.getDate() + 1);
          const returnedDay1 = userLogins?.some(login => {
            return login.getTime() >= day1.getTime() && login.getTime() < day1.getTime() + (24 * 60 * 60 * 1000);
          });
          if (returnedDay1) cohorts[weekKey].day1Retention++;
        }

        if (daysSinceSignup >= 7) {
          const day7 = new Date(signupDate);
          day7.setDate(day7.getDate() + 7);
          const returnedDay7 = userLogins?.some(login => login >= day7);
          if (returnedDay7) cohorts[weekKey].day7Retention++;
        }

        if (daysSinceSignup >= 30) {
          const day30 = new Date(signupDate);
          day30.setDate(day30.getDate() + 30);
          const returnedDay30 = userLogins?.some(login => login >= day30);
          if (returnedDay30) cohorts[weekKey].day30Retention++;
        }
      });

      const cohortArray = Object.values(cohorts)
        .sort((a, b) => new Date(b.week).getTime() - new Date(a.week).getTime())
        .slice(0, 12);

      setCohortData(cohortArray);
    } catch (error) {
      console.error('Error loading cohort data:', error);
    }
  };

  const updateFeedbackStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('feedback_submissions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      loadFeedback();
    } catch (error) {
      console.error('Error updating feedback:', error);
    }
  };

  const countByField = (field: keyof QuizResponse) => {
    const counts: Record<string, number> = {};
    quizResponses.forEach(response => {
      const value = response[field];
      if (Array.isArray(value)) {
        value.forEach(v => {
          counts[v] = (counts[v] || 0) + 1;
        });
      } else if (value) {
        counts[value as string] = (counts[value as string] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const getPercentage = (count: number, total: number) => {
    return total > 0 ? ((count / total) * 100).toFixed(1) : '0';
  };

  const getFeedbackIcon = (type: string) => {
    switch (type) {
      case 'bug_report': return <Bug className="w-4 h-4 text-red-400" />;
      case 'feature_request': return <Lightbulb className="w-4 h-4 text-blue-400" />;
      case 'testimonial': return <Heart className="w-4 h-4 text-green-400" />;
      default: return <MessageSquare className="w-4 h-4 text-purple-400" />;
    }
  };

  const getFeedbackTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const averageRating = feedbackSubmissions.length > 0
    ? (feedbackSubmissions.reduce((sum, f) => sum + f.rating, 0) / feedbackSubmissions.length).toFixed(1)
    : '0';

  const testimonials = feedbackSubmissions.filter(f => f.allow_testimonial && f.rating >= 4);

  if (isLoading) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-zinc-400">Loading analytics...</p>
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

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-black text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-zinc-400">Insights from quiz responses and user feedback</p>
          </div>

          <div className="flex gap-4 mb-8 border-b border-zinc-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab('funnel')}
              className={`pb-4 px-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'funnel'
                  ? 'border-b-2 border-white text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Conversion Funnel
            </button>
            <button
              onClick={() => setActiveTab('cohort')}
              className={`pb-4 px-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'cohort'
                  ? 'border-b-2 border-white text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Cohort Analysis
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`pb-4 px-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'quiz'
                  ? 'border-b-2 border-white text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Quiz Analytics ({quizResponses.length})
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`pb-4 px-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'feedback'
                  ? 'border-b-2 border-white text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              User Feedback ({feedbackSubmissions.length})
            </button>
          </div>

          {activeTab === 'funnel' && conversionFunnel && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Total Signups</h3>
                  </div>
                  <p className="text-4xl font-bold">{conversionFunnel.totalSignups}</p>
                  <p className="text-sm text-zinc-500 mt-1">All registered users</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Active (7d)</h3>
                  </div>
                  <p className="text-4xl font-bold">{conversionFunnel.activeUsers7Days}</p>
                  <p className="text-sm text-zinc-500 mt-1">{((conversionFunnel.activeUsers7Days / conversionFunnel.totalSignups) * 100).toFixed(1)}% of users</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-orange-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Active (30d)</h3>
                  </div>
                  <p className="text-4xl font-bold">{conversionFunnel.activeUsers30Days}</p>
                  <p className="text-sm text-zinc-500 mt-1">{((conversionFunnel.activeUsers30Days / conversionFunnel.totalSignups) * 100).toFixed(1)}% of users</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Paid Users</h3>
                  </div>
                  <p className="text-4xl font-bold">{conversionFunnel.madePurchase}</p>
                  <p className="text-sm text-zinc-500 mt-1">{conversionFunnel.overallConversionRate.toFixed(1)}% conversion</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Avg Jobs/User</h3>
                  </div>
                  <p className="text-4xl font-bold">{conversionFunnel.avgJobsPerUser.toFixed(2)}</p>
                  <p className="text-sm text-zinc-500 mt-1">Per registered user</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Total Revenue</h3>
                  </div>
                  <p className="text-4xl font-bold">${conversionFunnel.totalRevenue.toFixed(2)}</p>
                  <p className="text-sm text-zinc-500 mt-1">All-time revenue</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-sm font-medium text-zinc-400">ARPU</h3>
                  </div>
                  <p className="text-4xl font-bold">${conversionFunnel.avgRevenuePerUser.toFixed(2)}</p>
                  <p className="text-sm text-zinc-500 mt-1">Avg revenue per user</p>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <h3 className="text-xl font-bold mb-8">Conversion Funnel</h3>

                <div className="flex flex-col items-center gap-6 max-w-3xl mx-auto">
                  <div className="w-full">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-8 text-center shadow-lg">
                      <div className="text-5xl font-bold mb-2">{conversionFunnel.totalSignups}</div>
                      <div className="text-xl font-semibold mb-1">Free Signups</div>
                      <div className="text-blue-200 text-sm">100% of users</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <ArrowDown className="w-8 h-8 text-zinc-600" />
                    <div className="text-sm text-zinc-500 my-2">
                      {conversionFunnel.signupToJobRate.toFixed(1)}% conversion
                    </div>
                    <div className="text-red-400 text-sm">
                      -{(conversionFunnel.totalSignups - conversionFunnel.completedFirstJob)} dropped off
                    </div>
                  </div>

                  <div className="w-full" style={{ width: `${Math.max(30, (conversionFunnel.completedFirstJob / conversionFunnel.totalSignups) * 100)}%` }}>
                    <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-8 text-center shadow-lg">
                      <div className="text-5xl font-bold mb-2">{conversionFunnel.completedFirstJob}</div>
                      <div className="text-xl font-semibold mb-1">Completed First Job</div>
                      <div className="text-green-200 text-sm">{conversionFunnel.signupToJobRate.toFixed(1)}% of signups</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <ArrowDown className="w-8 h-8 text-zinc-600" />
                    <div className="text-sm text-zinc-500 my-2">
                      {conversionFunnel.jobToPurchaseRate.toFixed(1)}% conversion
                    </div>
                    <div className="text-red-400 text-sm">
                      -{(conversionFunnel.completedFirstJob - conversionFunnel.madePurchase)} dropped off
                    </div>
                  </div>

                  <div className="w-full" style={{ width: `${Math.max(30, (conversionFunnel.madePurchase / conversionFunnel.totalSignups) * 100)}%` }}>
                    <div className="bg-gradient-to-r from-purple-600 to-purple-500 rounded-2xl p-8 text-center shadow-lg">
                      <div className="text-5xl font-bold mb-2">{conversionFunnel.madePurchase}</div>
                      <div className="text-xl font-semibold mb-1">Made Purchase</div>
                      <div className="text-purple-200 text-sm">{conversionFunnel.overallConversionRate.toFixed(1)}% of signups</div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-zinc-800 rounded-xl">
                  <h4 className="font-semibold mb-4">Key Insights</h4>
                  <div className="space-y-2 text-sm text-zinc-300">
                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 mt-1 text-blue-400 flex-shrink-0" />
                      <span><strong>Signup to First Job:</strong> {conversionFunnel.signupToJobRate.toFixed(1)}% of users complete their first dubbing job. {conversionFunnel.signupToJobRate < 50 ? 'Consider improving onboarding or reducing friction.' : 'Strong initial engagement!'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 mt-1 text-green-400 flex-shrink-0" />
                      <span><strong>Job to Purchase:</strong> {conversionFunnel.jobToPurchaseRate.toFixed(1)}% of users who complete a job make a purchase. {conversionFunnel.jobToPurchaseRate < 30 ? 'Consider improving monetization flow or value proposition.' : 'Good conversion from free to paid!'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 mt-1 text-purple-400 flex-shrink-0" />
                      <span><strong>Overall:</strong> {conversionFunnel.overallConversionRate.toFixed(1)}% of all signups become paying customers. {conversionFunnel.overallConversionRate < 5 ? 'Focus on retention and monetization.' : 'Solid overall conversion rate!'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cohort' && (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4">User Retention by Signup Week</h3>
                <p className="text-sm text-zinc-400 mb-6">Track how many users return after 1, 7, and 30 days from signup</p>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Week Starting</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-zinc-400">Signups</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-zinc-400">Day 1</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-zinc-400">Day 7</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-zinc-400">Day 30</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohortData.map((cohort) => {
                        const day1Rate = cohort.signups > 0 ? (cohort.day1Retention / cohort.signups) * 100 : 0;
                        const day7Rate = cohort.signups > 0 ? (cohort.day7Retention / cohort.signups) * 100 : 0;
                        const day30Rate = cohort.signups > 0 ? (cohort.day30Retention / cohort.signups) * 100 : 0;

                        return (
                          <tr key={cohort.week} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                            <td className="py-4 px-4 text-sm">{new Date(cohort.week).toLocaleDateString()}</td>
                            <td className="py-4 px-4 text-center text-sm font-semibold">{cohort.signups}</td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-semibold">{cohort.day1Retention}</span>
                                <span className={`text-xs ${day1Rate >= 50 ? 'text-green-400' : day1Rate >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                                  {day1Rate.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-semibold">{cohort.day7Retention}</span>
                                <span className={`text-xs ${day7Rate >= 40 ? 'text-green-400' : day7Rate >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                                  {day7Rate.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-semibold">{cohort.day30Retention}</span>
                                <span className={`text-xs ${day30Rate >= 30 ? 'text-green-400' : day30Rate >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                                  {day30Rate.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Avg Day 1 Retention</h3>
                  </div>
                  <p className="text-4xl font-bold">
                    {cohortData.length > 0
                      ? (cohortData.reduce((sum, c) => sum + (c.signups > 0 ? (c.day1Retention / c.signups) * 100 : 0), 0) / cohortData.length).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">Users returning after 1 day</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Avg Day 7 Retention</h3>
                  </div>
                  <p className="text-4xl font-bold">
                    {cohortData.length > 0
                      ? (cohortData.reduce((sum, c) => sum + (c.signups > 0 ? (c.day7Retention / c.signups) * 100 : 0), 0) / cohortData.length).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">Users returning after 7 days</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Avg Day 30 Retention</h3>
                  </div>
                  <p className="text-4xl font-bold">
                    {cohortData.length > 0
                      ? (cohortData.reduce((sum, c) => sum + (c.signups > 0 ? (c.day30Retention / c.signups) * 100 : 0), 0) / cohortData.length).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">Users returning after 30 days</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quiz' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Total Responses</h3>
                  </div>
                  <p className="text-4xl font-bold">{quizResponses.length}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Mail className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Email Captures</h3>
                  </div>
                  <p className="text-4xl font-bold">
                    {quizResponses.filter(r => r.email).length}
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">
                    {getPercentage(quizResponses.filter(r => r.email).length, quizResponses.length)}% conversion
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-medium text-zinc-400">This Week</h3>
                  </div>
                  <p className="text-4xl font-bold">
                    {quizResponses.filter(r => {
                      const date = new Date(r.created_at);
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return date > weekAgo;
                    }).length}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold">Content Types</h3>
                  </div>
                  <div className="space-y-4">
                    {countByField('content_type').map(([type, count]) => (
                      <div key={type}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                          <span className="text-sm text-zinc-400">{count} ({getPercentage(count, quizResponses.length)}%)</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${getPercentage(count, quizResponses.length)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Globe className="w-5 h-5 text-orange-400" />
                    <h3 className="text-lg font-semibold">Most Recommended Languages</h3>
                  </div>
                  <div className="space-y-4">
                    {countByField('recommended_languages').slice(0, 8).map(([lang, count]) => (
                      <div key={lang}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">{lang}</span>
                          <span className="text-sm text-zinc-400">{count} recommendations</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all"
                            style={{ width: `${(count / quizResponses.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'feedback' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Total Feedback</h3>
                  </div>
                  <p className="text-4xl font-bold">{feedbackSubmissions.length}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Average Rating</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-4xl font-bold">{averageRating}</p>
                    <span className="text-zinc-500">/5</span>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Heart className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Testimonials</h3>
                  </div>
                  <p className="text-4xl font-bold">{testimonials.length}</p>
                  <p className="text-sm text-zinc-500 mt-1">Ready to use</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Bug className="w-5 h-5 text-red-400" />
                    <h3 className="text-sm font-medium text-zinc-400">Bug Reports</h3>
                  </div>
                  <p className="text-4xl font-bold">
                    {feedbackSubmissions.filter(f => f.feedback_type === 'bug_report' && f.status === 'new').length}
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">Need attention</p>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
                <h3 className="text-lg font-semibold mb-6">All Feedback</h3>
                <div className="space-y-4">
                  {feedbackSubmissions.map((feedback) => (
                    <div key={feedback.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {getFeedbackIcon(feedback.feedback_type)}
                          <div>
                            <div className="font-medium">{getFeedbackTypeLabel(feedback.feedback_type)}</div>
                            <div className="text-sm text-zinc-500">
                              {new Date(feedback.created_at).toLocaleDateString()} at{' '}
                              {new Date(feedback.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= feedback.rating
                                    ? 'fill-yellow-500 text-yellow-500'
                                    : 'text-zinc-600'
                                }`}
                              />
                            ))}
                          </div>
                          <select
                            value={feedback.status}
                            onChange={(e) => updateFeedbackStatus(feedback.id, e.target.value)}
                            className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-zinc-500"
                          >
                            <option value="new">New</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="acted_upon">Acted Upon</option>
                          </select>
                        </div>
                      </div>

                      <p className="text-zinc-300 leading-relaxed mb-4">{feedback.message}</p>

                      <div className="flex items-center gap-4 text-sm text-zinc-500">
                        {feedback.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {feedback.email}
                          </div>
                        )}
                        {feedback.allow_testimonial && (
                          <div className="flex items-center gap-2 text-green-400">
                            <Heart className="w-4 h-4" />
                            Can use as testimonial
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
