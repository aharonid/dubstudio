import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '../lib/auth';
import NavBar from '../components/NavBar';
import UserProfile from '../components/UserProfile';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  TrendingUp,
  Calendar,
  Download,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Languages,
  FileAudio,
  HardDrive,
  DollarSign,
  Users,
  Check,
  CreditCard,
  Mail,
  MessageSquare,
  Star,
  Shield,
  AlertTriangle,
  Ban,
  Trash2,
  Globe,
  Database,
  Flag,
  Eye
} from 'lucide-react';

interface DubbingJob {
  id: string;
  dubbing_id: string;
  user_id: string;
  user_email?: string;
  status: string;
  target_language: string;
  source_filename: string;
  audio_url: string | null;
  error_message: string | null;
  error_details: any;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  source_language: string | null;
  file_size_bytes: number | null;
  file_type: string | null;
  duration_seconds: number | null;
  processing_time_seconds: number | null;
  download_count: number;
  downloaded_at: string | null;
  download_format: string | null;
  estimated_cost_usd: number | null;
  credits_used: number;
  expires_at: string | null;
}

interface Stats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  processingJobs: number;
  totalDownloads: number;
  totalFileSize: number;
  totalDuration: number;
  totalProcessingTime: number;
  avgProcessingTime: number;
  totalCost: number;
  languageBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

interface UserAccount {
  id: string;
  email: string;
  created_at: string;
  is_flagged: boolean;
  has_purchased: boolean;
  credits_minutes: number;
  credits_used: number;
  account_flags: any[];
  signup_ip?: string;
  device_fingerprint?: string;
  account_status?: string;
  banned_at?: string;
  ban_reason?: string;
}

interface Purchase {
  id: string;
  user_id: string;
  user_email?: string;
  package_name: string;
  credits_minutes: number;
  amount_usd: number;
  original_amount_usd?: number;
  discount_amount_usd?: number;
  coupon_code?: string;
  status: string;
  created_at: string;
  stripe_session_id: string;
  purchase_ip?: string;
}

interface RevenueStats {
  totalRevenue: number;
  totalPurchases: number;
  paidUsers: number;
  totalUsers: number;
}

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

interface FeedbackSubmission {
  id: string;
  user_id?: string;
  email?: string;
  rating: number;
  feedback_type: string;
  message: string;
  allow_testimonial: boolean;
  status: string;
  admin_notes?: string;
  created_at: string;
}

interface DeletedUserAudit {
  id: string;
  original_user_id: string;
  email: string;
  signup_ip?: string;
  total_credits_purchased: number;
  total_credits_used: number;
  total_jobs_completed: number;
  total_revenue_usd: number;
  signup_date: string;
  deleted_at: string;
  deletion_reason: string;
  deletion_type: string;
}

interface RecentLogin {
  id: string;
  user_id: string;
  email: string;
  logged_in_at: string;
  ip_address: string | null;
}

interface RecentDub {
  id: string;
  dubbing_id: string;
  user_id: string;
  email: string;
  source_filename: string;
  target_language: string;
  status: string;
  created_at: string;
  processing_time_seconds: number | null;
}

interface RecentSignup {
  id: string;
  email: string;
  created_at: string;
  signup_ip: string | null;
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<DubbingJob[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmission[]>([]);
  const [feedbackSubmissions, setFeedbackSubmissions] = useState<FeedbackSubmission[]>([]);
  const [deletedUsersAudit, setDeletedUsersAudit] = useState<DeletedUserAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'jobs' | 'users' | 'revenue' | 'contact' | 'feedback' | 'security' | 'email'>('revenue');
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [recentLogins, setRecentLogins] = useState<RecentLogin[]>([]);
  const [recentDubs, setRecentDubs] = useState<RecentDub[]>([]);
  const [recentSignups, setRecentSignups] = useState<RecentSignup[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [elevenLabsBalance, setElevenLabsBalance] = useState<number | null>(null);
  const [elevenLabsLoading, setElevenLabsLoading] = useState(false);
  const [lowCreditThreshold, setLowCreditThreshold] = useState(10000); // characters remaining

  useEffect(() => {
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      const interval = setInterval(fetchJobs, 10000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const checkAdmin = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data?.is_admin) {
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      fetchJobs();
      fetchUsers();
      fetchPurchases();
      fetchContactSubmissions();
      fetchFeedbackSubmissions();
      fetchDeletedUsersAudit();
      fetchRecentActivity();
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/dashboard');
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Fetch recent logins (last 5)
      const { data: loginsData, error: loginsError } = await supabase
        .from('login_history')
        .select('id, user_id, logged_in_at, ip_address')
        .order('logged_in_at', { ascending: false })
        .limit(5);

      if (loginsError) throw loginsError;

      // Fetch recent dubbing jobs (last 5)
      const { data: dubsData, error: dubsError } = await supabase
        .from('dubbing_jobs')
        .select('id, dubbing_id, user_id, source_filename, target_language, status, created_at, processing_time_seconds')
        .order('created_at', { ascending: false })
        .limit(5);

      if (dubsError) throw dubsError;

      // Fetch recent signups (last 5)
      const { data: signupsData, error: signupsError } = await supabase
        .from('user_profiles')
        .select('id, email, created_at, signup_ip_address')
        .order('created_at', { ascending: false })
        .limit(5);

      if (signupsError) throw signupsError;

      // Get user emails for logins and dubs
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email');

      if (profilesError) throw profilesError;

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      const loginsWithEmails = (loginsData || []).map(login => ({
        ...login,
        email: emailMap.get(login.user_id) || 'Unknown'
      }));

      const dubsWithEmails = (dubsData || []).map(dub => ({
        ...dub,
        email: emailMap.get(dub.user_id) || 'Unknown'
      }));

      const signupsFormatted = (signupsData || []).map(signup => ({
        id: signup.id,
        email: signup.email,
        created_at: signup.created_at,
        signup_ip: signup.signup_ip_address
      }));

      setRecentLogins(loginsWithEmails);
      setRecentDubs(dubsWithEmails);
      setRecentSignups(signupsFormatted);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email, created_at, account_flags, signup_ip, device_fingerprint, account_status, banned_at, ban_reason')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: credits, error: creditsError } = await supabase
        .from('user_credits')
        .select('user_id, credits_minutes, credits_used');

      if (creditsError) throw creditsError;

      const { data: purchasesData, error: purchasesError } = await supabase
        .from('credit_purchases')
        .select('user_id')
        .eq('status', 'completed');

      if (purchasesError) throw purchasesError;

      const purchaseUserIds = new Set(purchasesData?.map(p => p.user_id) || []);
      const creditsMap = new Map(credits?.map(c => [c.user_id, c]) || []);

      const userList: UserAccount[] = (profiles || []).map(profile => {
        const userCredits = creditsMap.get(profile.id);
        const isFlagged = profile.account_flags && Array.isArray(profile.account_flags) && profile.account_flags.length > 0;

        return {
          id: profile.id,
          signup_ip: profile.signup_ip,
          device_fingerprint: profile.device_fingerprint,
          account_status: profile.account_status || 'active',
          banned_at: profile.banned_at,
          ban_reason: profile.ban_reason,
          email: profile.email,
          created_at: profile.created_at,
          is_flagged: isFlagged,
          has_purchased: purchaseUserIds.has(profile.id),
          credits_minutes: userCredits?.credits_minutes || 0,
          credits_used: userCredits?.credits_used || 0,
          account_flags: profile.account_flags || [],
        };
      });

      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPurchases = async () => {
    try {
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('credit_purchases')
        .select('*')
        .order('created_at', { ascending: false });

      if (purchasesError) throw purchasesError;

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email');

      if (profilesError) throw profilesError;

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      const purchasesWithEmails = (purchasesData || []).map(purchase => ({
        ...purchase,
        user_email: emailMap.get(purchase.user_id) || 'Unknown'
      }));

      setPurchases(purchasesWithEmails);

      // Calculate revenue stats
      const completedPurchases = purchasesData?.filter(p => p.status === 'completed') || [];
      const totalRevenue = completedPurchases.reduce((sum, p) => sum + (Number(p.amount_usd) || 0), 0);
      const paidUserIds = new Set(completedPurchases.map(p => p.user_id));

      // Get total users count
      const { count: totalUsersCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      setRevenueStats({
        totalRevenue,
        totalPurchases: completedPurchases.length,
        paidUsers: paidUserIds.size,
        totalUsers: totalUsersCount || 0
      });
    } catch (error) {
      console.error('Error fetching purchases:', error);
    }
  };

  const fetchContactSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContactSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching contact submissions:', error);
    }
  };

  const handleBanUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Ban ${userEmail}?\n\n• Cannot create new jobs or purchases\n• Can still view/download existing content\n• Keeps all data for audit`)) return;

    const reason = prompt('Ban reason:');
    if (!reason) return;

    setProcessingAction(userId);
    try {
      const { error } = await supabase.rpc('ban_user', {
        target_user_id: userId,
        reason: reason,
        admin_user_id: user?.id
      });

      if (error) throw error;

      alert('User banned successfully');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error banning user:', error);
      alert('Failed to ban user: ' + error.message);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Soft delete user ${userEmail}? Their account will be marked as deleted but data will be preserved.`)) return;

    const reason = prompt('Deletion reason:');
    if (!reason) return;

    setProcessingAction(userId);
    try {
      const { error } = await supabase.rpc('soft_delete_user', {
        target_user_id: userId,
        reason: reason,
        admin_user_id: user?.id
      });

      if (error) throw error;

      alert('User deleted successfully');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user: ' + error.message);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDeleteContactMessage = async (messageId: string) => {
    if (!confirm('Delete this contact message?')) return;

    try {
      const { error } = await supabase
        .from('contact_submissions')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      await fetchContactSubmissions();
    } catch (error: any) {
      console.error('Error deleting contact message:', error);
      alert('Failed to delete message: ' + error.message);
    }
  };

  const handleToggleFlag = async (userId: string, currentFlags: any[]) => {
    setProcessingAction(userId);
    try {
      const newFlags = currentFlags.length > 0 ? [] : ['manual_flag'];

      const { error } = await supabase
        .from('user_profiles')
        .update({ account_flags: newFlags })
        .eq('id', userId);

      if (error) throw error;

      await fetchUsers();
    } catch (error: any) {
      console.error('Error toggling flag:', error);
      alert('Failed to toggle flag: ' + error.message);
    } finally {
      setProcessingAction(null);
    }
  };

  const fetchFeedbackSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbackSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching feedback submissions:', error);
    }
  };

  const fetchDeletedUsersAudit = async () => {
    try {
      const { data, error } = await supabase
        .from('deleted_users_audit')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setDeletedUsersAudit(data || []);
    } catch (error) {
      console.error('Error fetching deleted users audit:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from('dubbing_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email');

      if (profilesError) throw profilesError;

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      const jobsWithEmails = (jobsData || []).map(job => ({
        ...job,
        user_email: job.user_id ? emailMap.get(job.user_id) : undefined
      }));

      setJobs(jobsWithEmails);
      calculateStats(jobsWithEmails);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (jobData: DubbingJob[]) => {
    const completed = jobData.filter(j => j.status === 'completed');
    const failed = jobData.filter(j => j.status === 'failed');
    const processing = jobData.filter(j => j.status === 'processing');

    const languageBreakdown: Record<string, number> = {};
    const statusBreakdown: Record<string, number> = {};

    jobData.forEach(job => {
      languageBreakdown[job.target_language] = (languageBreakdown[job.target_language] || 0) + 1;
      statusBreakdown[job.status] = (statusBreakdown[job.status] || 0) + 1;
    });

    const totalFileSize = jobData.reduce((sum, j) => sum + (j.file_size_bytes || 0), 0);
    const totalDuration = jobData.reduce((sum, j) => sum + (Number(j.duration_seconds) || 0), 0);
    const totalProcessingTime = jobData.reduce((sum, j) => sum + (Number(j.processing_time_seconds) || 0), 0);
    const totalCost = jobData.reduce((sum, j) => sum + (Number(j.estimated_cost_usd) || 0), 0);
    const totalDownloads = jobData.reduce((sum, j) => sum + (j.download_count || 0), 0);

    const jobsWithProcessingTime = jobData.filter(j => j.processing_time_seconds);
    const avgProcessingTime = jobsWithProcessingTime.length > 0
      ? totalProcessingTime / jobsWithProcessingTime.length
      : 0;

    setStats({
      totalJobs: jobData.length,
      completedJobs: completed.length,
      failedJobs: failed.length,
      processingJobs: processing.length,
      totalDownloads,
      totalFileSize,
      totalDuration,
      totalProcessingTime,
      avgProcessingTime,
      totalCost,
      languageBreakdown,
      statusBreakdown,
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
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

  const sendEmailCampaign = async (recipients: 'all_users' | 'test_email') => {
    // For bulk emails, require subject and body
    if (recipients === 'all_users' && (!emailSubject.trim() || !emailBody.trim())) {
      setEmailMessage('Please fill in both subject and body');
      return;
    }

    if (recipients === 'test_email' && !testEmail.trim()) {
      setEmailMessage('Please enter a test email address');
      return;
    }

    setEmailSending(true);
    setEmailMessage('');

    try {
      let recipientEmails: string[] = [];

      if (recipients === 'test_email') {
        recipientEmails = [testEmail];
      } else {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('email')
          .throwOnError();
        recipientEmails = (profiles || []).map(p => p.email);
      }

      if (recipientEmails.length === 0) {
        setEmailMessage('No recipients found');
        setEmailSending(false);
        return;
      }

      // Use test content for test emails, or user-provided content for bulk emails
      const emailContent = recipients === 'test_email'
        ? {
            subject: 'Test Email from DubStudio',
            html: '<h2>Test Email</h2><p>This is a test email to verify your email system is working correctly.</p><p>If you received this email, your email configuration is set up properly!</p>',
          }
        : {
            subject: emailSubject,
            html: emailBody.replace(/\n/g, '<br>'),
          };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: recipientEmails,
            ...emailContent,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setEmailMessage(`Error: ${result.error || 'Failed to send emails'}`);
      } else {
        const successCount = result.results.filter((r: any) => r.status === 'sent').length;
        const failureCount = result.results.filter((r: any) => r.status === 'failed').length;
        setEmailMessage(`Sent: ${successCount}, Failed: ${failureCount}`);

        if (recipients === 'all_users') {
          setEmailSubject('');
          setEmailBody('');
        }
      }
    } catch (error) {
      setEmailMessage(`Error: ${String(error)}`);
    } finally {
      setEmailSending(false);
    }
  };

  const checkElevenLabsBalance = async () => {
    setElevenLabsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-elevenlabs-balance`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        setEmailMessage(error.error || 'Failed to fetch balance');
        setElevenLabsBalance(null);
      } else {
        const data = await response.json();
        const remainingCharacters = data.remaining_characters || 0;
        const characterLimit = data.character_limit || 0;
        const characterCount = data.character_count || 0;
        setElevenLabsBalance(remainingCharacters);
        setEmailMessage(`Characters: ${characterCount.toLocaleString()} / ${characterLimit.toLocaleString()} used (${remainingCharacters.toLocaleString()} remaining)`);
      }
    } catch (error) {
      setEmailMessage(`Error: ${String(error)}`);
      setElevenLabsBalance(null);
    } finally {
      setElevenLabsLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (selectedStatus !== 'all' && job.status !== selectedStatus) return false;
    if (selectedLanguage !== 'all' && job.target_language !== selectedLanguage) return false;
    return true;
  });

  const uniqueLanguages = Array.from(new Set(jobs.map(j => j.target_language))).sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80"></div>

      <div className="relative">
        <NavBar />

        <div className="container mx-auto px-6 py-12 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-zinc-400">Complete overview of all users and dubbing jobs</p>
          </div>

          <div className="mb-8 flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('revenue')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'revenue'
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <DollarSign className="w-5 h-5 inline mr-2" />
              Revenue
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'users'
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              Users
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'jobs'
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <FileAudio className="w-5 h-5 inline mr-2" />
              Jobs
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'contact'
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <Mail className="w-5 h-5 inline mr-2" />
              Contact ({contactSubmissions.length})
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'feedback'
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <MessageSquare className="w-5 h-5 inline mr-2" />
              Feedback ({feedbackSubmissions.length})
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'security'
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <Shield className="w-5 h-5 inline mr-2" />
              Security
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'email'
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <Mail className="w-5 h-5 inline mr-2" />
              Email
            </button>
          </div>

          {activeTab === 'revenue' && revenueStats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm text-zinc-400">Total Revenue</h3>
                  </div>
                  <p className="text-3xl font-bold">${revenueStats.totalRevenue.toFixed(2)}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm text-zinc-400">Total Purchases</h3>
                  </div>
                  <p className="text-3xl font-bold">{revenueStats.totalPurchases}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-sm text-zinc-400">Paid Users</h3>
                  </div>
                  <p className="text-3xl font-bold">{revenueStats.paidUsers}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {((revenueStats.paidUsers / revenueStats.totalUsers) * 100).toFixed(1)}% conversion
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-violet-400" />
                    <h3 className="text-sm text-zinc-400">Total Users</h3>
                  </div>
                  <p className="text-3xl font-bold">{revenueStats.totalUsers}</p>
                </div>
              </div>

              {/* Recent Activity Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Recent Logins */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-400" />
                    Recent Logins (Last 5)
                  </h3>
                  <div className="space-y-3">
                    {recentLogins.length === 0 ? (
                      <p className="text-center text-zinc-500 py-4">No recent logins</p>
                    ) : (
                      recentLogins.map((login) => (
                        <div key={login.id} className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
                          <p className="text-sm font-medium text-white truncate">{login.email}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-zinc-400">
                              {new Date(login.logged_in_at).toLocaleString('en-US', {
                                timeZone: 'America/Los_Angeles',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {login.ip_address && (
                              <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {login.ip_address}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Dubs */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <FileAudio className="w-5 h-5 text-blue-400" />
                    Recent Dubs (Last 5)
                  </h3>
                  <div className="space-y-3">
                    {recentDubs.length === 0 ? (
                      <p className="text-center text-zinc-500 py-4">No recent dubs</p>
                    ) : (
                      recentDubs.map((dub) => (
                        <div key={dub.id} className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
                          <p className="text-sm font-medium text-white truncate" title={dub.source_filename}>
                            {dub.source_filename}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              dub.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                              dub.status === 'failed' ? 'bg-red-900/50 text-red-400' :
                              'bg-yellow-900/50 text-yellow-400'
                            }`}>
                              {dub.status}
                            </span>
                            <span className="text-xs text-zinc-400">{getLanguageName(dub.target_language)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-zinc-500">{dub.email}</span>
                            <span className="text-xs text-zinc-400">
                              {new Date(dub.created_at).toLocaleString('en-US', {
                                timeZone: 'America/Los_Angeles',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Signups */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-400" />
                    Recent Signups (Last 5)
                  </h3>
                  <div className="space-y-3">
                    {recentSignups.length === 0 ? (
                      <p className="text-center text-zinc-500 py-4">No recent signups</p>
                    ) : (
                      recentSignups.map((signup) => (
                        <div key={signup.id} className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
                          <p className="text-sm font-medium text-white truncate">{signup.email}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-zinc-400">
                              {new Date(signup.created_at).toLocaleString('en-US', {
                                timeZone: 'America/Los_Angeles',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {signup.signup_ip && (
                              <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {signup.signup_ip}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6">Recent Purchases</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">User</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Package</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Credits</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Coupon</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Revenue</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Purchase IP</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.slice(0, 50).map((purchase) => {
                        const hasDiscount = purchase.discount_amount_usd && purchase.discount_amount_usd > 0;
                        return (
                        <tr key={purchase.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                          <td className="py-4 px-4 text-sm">{purchase.user_email}</td>
                          <td className="py-4 px-4 text-sm font-medium">{purchase.package_name}</td>
                          <td className="py-4 px-4 text-sm text-zinc-400">{purchase.credits_minutes} min</td>
                          <td className="py-4 px-4 text-sm">
                            {purchase.coupon_code ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-900/30 text-cyan-400 rounded text-xs font-mono font-semibold">
                                {purchase.coupon_code}
                              </span>
                            ) : (
                              <span className="text-zinc-600">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-green-400">
                                ${Number(purchase.amount_usd).toFixed(2)}
                              </span>
                              {hasDiscount && purchase.original_amount_usd && (
                                <span className="text-xs text-zinc-500 line-through">
                                  ${Number(purchase.original_amount_usd).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-zinc-400 font-mono">
                            {purchase.purchase_ip ? (
                              <div className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {purchase.purchase_ip}
                              </div>
                            ) : (
                              <span className="text-zinc-600">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`text-xs font-semibold px-3 py-1 rounded-full ${
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
                          <td className="py-4 px-4 text-sm text-zinc-400">
                            {new Date(purchase.created_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {purchases.length === 0 && (
                    <div className="text-center py-12">
                      <CreditCard className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-400">No purchases yet</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-6">All User Accounts</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Signed Up</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Signup IP</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-zinc-400">Flagged</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Credits Remaining</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u => u.account_status !== 'deleted').map((userAccount) => (
                      <tr key={userAccount.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 ${
                        userAccount.account_status === 'banned' ? 'opacity-60' : ''
                      }`}>
                        <td className="py-4 px-4 text-sm font-medium">
                          {userAccount.email}
                          {userAccount.account_status === 'banned' && (
                            <span className="ml-2 text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded">BANNED</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm text-zinc-400">
                          {new Date(userAccount.created_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td className="py-4 px-4 text-sm text-zinc-400 font-mono">
                          {userAccount.signup_ip ? (
                            <div className="flex items-center gap-2">
                              <Globe className="w-3 h-3" />
                              {userAccount.signup_ip}
                            </div>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`text-xs font-semibold px-3 py-1 rounded-full ${
                              userAccount.has_purchased
                                ? 'bg-green-900/30 text-green-400'
                                : 'bg-zinc-700 text-zinc-300'
                            }`}
                          >
                            {userAccount.has_purchased ? 'PAID' : 'FREE'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {userAccount.is_flagged ? (
                            <div className="inline-flex items-center justify-center w-6 h-6 bg-red-900/30 border-2 border-red-500 rounded">
                              <Check className="w-4 h-4 text-red-400" />
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center w-6 h-6 border-2 border-zinc-700 rounded"></div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-sm">
                          <span className={`font-semibold ${
                            userAccount.credits_minutes - userAccount.credits_used > 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}>
                            {userAccount.credits_minutes - userAccount.credits_used} min
                          </span>
                          <span className="text-zinc-600 text-xs ml-2">
                            ({userAccount.credits_minutes} / {userAccount.credits_used})
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedUserId(userAccount.id)}
                              className="p-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 rounded-lg transition-colors"
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleFlag(userAccount.id, userAccount.account_flags)}
                              disabled={processingAction === userAccount.id}
                              className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                userAccount.is_flagged
                                  ? 'bg-green-900/30 hover:bg-green-900/50 text-green-400'
                                  : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-400'
                              }`}
                              title={userAccount.is_flagged ? 'Remove Flag' : 'Add Flag'}
                            >
                              <Flag className="w-4 h-4" />
                            </button>
                            {userAccount.account_status !== 'banned' && (
                              <button
                                onClick={() => handleBanUser(userAccount.id, userAccount.email)}
                                disabled={processingAction === userAccount.id}
                                className="p-2 bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 rounded-lg transition-colors disabled:opacity-50"
                                title="Ban (can't create new jobs)"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(userAccount.id, userAccount.email)}
                              disabled={processingAction === userAccount.id}
                              className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'jobs' && stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm text-zinc-400">Total Jobs</h3>
                  </div>
                  <p className="text-3xl font-bold">{stats.totalJobs}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm text-zinc-400">Completed</h3>
                  </div>
                  <p className="text-3xl font-bold">{stats.completedJobs}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {((stats.completedJobs / stats.totalJobs) * 100).toFixed(1)}% success rate
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <h3 className="text-sm text-zinc-400">Failed</h3>
                  </div>
                  <p className="text-3xl font-bold">{stats.failedJobs}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {((stats.failedJobs / stats.totalJobs) * 100).toFixed(1)}% failure rate
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-sm text-zinc-400">Processing</h3>
                  </div>
                  <p className="text-3xl font-bold">{stats.processingJobs}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Download className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-sm text-zinc-400">Total Downloads</h3>
                  </div>
                  <p className="text-3xl font-bold">{stats.totalDownloads}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <HardDrive className="w-5 h-5 text-violet-400" />
                    <h3 className="text-sm text-zinc-400">Total File Size</h3>
                  </div>
                  <p className="text-3xl font-bold">{formatBytes(stats.totalFileSize)}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-orange-400" />
                    <h3 className="text-sm text-zinc-400">Avg Processing Time</h3>
                  </div>
                  <p className="text-3xl font-bold">{stats.avgProcessingTime.toFixed(1)}s</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm text-zinc-400">Estimated Cost</h3>
                  </div>
                  <p className="text-3xl font-bold">${stats.totalCost.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Languages className="w-5 h-5" />
                    Language Distribution
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.languageBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([lang, count]) => (
                        <div key={lang} className="flex items-center justify-between">
                          <span className="text-zinc-300">{getLanguageName(lang)}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${(count / stats.totalJobs) * 100}%` }}
                              />
                            </div>
                            <span className="text-white font-medium w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <FileAudio className="w-5 h-5" />
                    Status Breakdown
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.statusBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-zinc-300 capitalize">{status}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  status === 'completed' ? 'bg-green-500' :
                                  status === 'failed' ? 'bg-red-500' :
                                  status === 'processing' ? 'bg-yellow-500' :
                                  'bg-zinc-500'
                                }`}
                                style={{ width: `${(count / stats.totalJobs) * 100}%` }}
                              />
                            </div>
                            <span className="text-white font-medium w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Filter className="w-5 h-5" />
                All Jobs ({filteredJobs.length})
              </h3>
              <div className="flex items-center gap-3">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="processing">Processing</option>
                  <option value="pending">Pending</option>
                </select>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-600"
                >
                  <option value="all">All Languages</option>
                  {uniqueLanguages.map(lang => (
                    <option key={lang} value={lang}>{getLanguageName(lang)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredJobs.map((job) => {
                const isExpanded = expandedJobId === job.id;
                return (
                  <div
                    key={job.id}
                    className={`bg-zinc-800 rounded-xl border ${
                      job.status === 'failed' ? 'border-red-900/50' :
                      job.status === 'completed' ? 'border-green-900/50' :
                      'border-zinc-700'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-white">{job.source_filename}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              job.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                              job.status === 'failed' ? 'bg-red-900/50 text-red-400' :
                              job.status === 'processing' ? 'bg-yellow-900/50 text-yellow-400' :
                              'bg-zinc-700 text-zinc-400'
                            }`}>
                              {job.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <Calendar className="w-4 h-4" />
                            {new Date(job.created_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </div>
                        <button
                          onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                          className="text-zinc-400 hover:text-white transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">Language</p>
                          <p className="text-sm text-white">{getLanguageName(job.target_language)}</p>
                        </div>
                        {job.duration_seconds && (
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Clip Length</p>
                            <p className="text-sm text-white">{formatDuration(Number(job.duration_seconds))}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">Downloads</p>
                          <p className="text-sm text-white">{job.download_count}</p>
                        </div>
                        {job.file_size_bytes && (
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">File Size</p>
                            <p className="text-sm text-white">{formatBytes(job.file_size_bytes)}</p>
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-zinc-700">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Job ID</p>
                              <p className="text-sm text-white font-mono">{job.dubbing_id}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">User</p>
                              <p className="text-sm text-white">{job.user_email || 'Guest'}</p>
                            </div>
                            {job.file_type && (
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">File Type</p>
                                <p className="text-sm text-white">{job.file_type}</p>
                              </div>
                            )}
                            {job.duration_seconds && (
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">Duration</p>
                                <p className="text-sm text-white">{formatDuration(Number(job.duration_seconds))}</p>
                              </div>
                            )}
                            {job.estimated_cost_usd && (
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">Est. Cost</p>
                                <p className="text-sm text-white">${Number(job.estimated_cost_usd).toFixed(4)}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Credits Used</p>
                              <p className="text-sm text-white">{job.credits_used}</p>
                            </div>
                            {job.completed_at && (
                              <div>
                                <p className="text-xs text-zinc-500 mb-1">Completed At</p>
                                <p className="text-sm text-white">{new Date(job.completed_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-zinc-500 mb-1">Expires At</p>
                              <p className="text-sm text-white">{job.expires_at ? new Date(job.expires_at).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium' }) : 'Never'}</p>
                            </div>
                          </div>

                          {job.error_message && (
                            <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-red-400 font-medium mb-1">Error Message</p>
                                  <p className="text-red-300 text-sm">{job.error_message}</p>
                                  {job.error_details && (
                                    <details className="mt-3">
                                      <summary className="text-xs text-red-300 cursor-pointer hover:text-red-200">
                                        Show Error Details
                                      </summary>
                                      <pre className="mt-2 p-3 bg-black/50 rounded text-xs text-red-200 overflow-x-auto">
                                        {JSON.stringify(job.error_details, null, 2)}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredJobs.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400">No jobs match the selected filters</p>
                </div>
              )}
            </div>
          </div>
            </>
          )}

          {activeTab === 'contact' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-6">Contact Form Submissions</h2>
              <div className="space-y-4">
                {contactSubmissions.map((submission) => (
                  <div key={submission.id} className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1">{submission.subject}</h3>
                        <div className="flex items-center gap-4 text-sm text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {submission.email}
                          </span>
                          <span>{submission.name}</span>
                          <span>{new Date(submission.created_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          submission.status === 'new' ? 'bg-blue-900/30 text-blue-400' :
                          submission.status === 'read' ? 'bg-yellow-900/30 text-yellow-400' :
                          'bg-green-900/30 text-green-400'
                        }`}>
                          {submission.status}
                        </span>
                        <button
                          onClick={() => handleDeleteContactMessage(submission.id)}
                          className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors"
                          title="Delete Message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-zinc-300 whitespace-pre-wrap">{submission.message}</p>
                  </div>
                ))}
                {contactSubmissions.length === 0 && (
                  <div className="text-center py-12">
                    <Mail className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400">No contact submissions yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Shield className="w-6 h-6" />
                  Security Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      <h3 className="text-sm text-zinc-400">Flagged Accounts</h3>
                    </div>
                    <p className="text-3xl font-bold">{users.filter(u => u.is_flagged).length}</p>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-5 h-5 text-red-400" />
                      <h3 className="text-sm text-zinc-400">Zero Credits Given</h3>
                    </div>
                    <p className="text-3xl font-bold">{users.filter(u => u.credits_minutes === 0 && !u.has_purchased).length}</p>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
                    <div className="flex items-center gap-3 mb-2">
                      <Activity className="w-5 h-5 text-blue-400" />
                      <h3 className="text-sm text-zinc-400">24h Signups</h3>
                    </div>
                    <p className="text-3xl font-bold">
                      {users.filter(u => {
                        const dayAgo = new Date();
                        dayAgo.setDate(dayAgo.getDate() - 1);
                        return new Date(u.created_at) > dayAgo;
                      }).length}
                    </p>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
                    <div className="flex items-center gap-3 mb-2">
                      <Database className="w-5 h-5 text-green-400" />
                      <h3 className="text-sm text-zinc-400">Storage</h3>
                    </div>
                    <p className="text-sm font-bold text-green-400">Unlimited</p>
                    <p className="text-xs text-zinc-500 mt-1">Clips never expire</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6">Deleted/Banned Users Audit Log</h2>
                <div className="overflow-x-auto mb-8">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Reason</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Revenue</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Jobs</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Deleted Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedUsersAudit.map((audit) => (
                        <tr key={audit.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                          <td className="py-4 px-4 text-sm font-medium">
                            {audit.email}
                            {audit.signup_ip && (
                              <div className="text-xs text-zinc-500 font-mono mt-1 flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {audit.signup_ip}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                              audit.deletion_type === 'ban' ? 'bg-red-900/30 text-red-400' :
                              audit.deletion_type === 'soft_delete' ? 'bg-yellow-900/30 text-yellow-400' :
                              'bg-zinc-700 text-zinc-300'
                            }`}>
                              {audit.deletion_type}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-zinc-400 max-w-xs truncate" title={audit.deletion_reason}>
                            {audit.deletion_reason}
                          </td>
                          <td className="py-4 px-4 text-sm text-green-400 font-semibold">
                            ${Number(audit.total_revenue_usd || 0).toFixed(2)}
                          </td>
                          <td className="py-4 px-4 text-sm text-zinc-400">
                            {audit.total_jobs_completed}
                          </td>
                          <td className="py-4 px-4 text-sm text-zinc-400">
                            {new Date(audit.deleted_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {deletedUsersAudit.length === 0 && (
                    <div className="text-center py-12">
                      <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-400">No deleted or banned users</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6">Flagged Users (Active)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Signup Date</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Credits Given</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Flag Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => u.is_flagged).map((user) => (
                        <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                          <td className="py-4 px-4 text-sm font-medium">{user.email}</td>
                          <td className="py-4 px-4 text-sm text-zinc-400">
                            {new Date(user.created_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-sm font-semibold ${
                              user.credits_minutes === 0 ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                              {user.credits_minutes} min
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-zinc-400">
                            {user.account_flags && user.account_flags[0] ? user.account_flags[0].reason : 'Unknown'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.filter(u => u.is_flagged).length === 0 && (
                    <div className="text-center py-12">
                      <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-400">No flagged accounts</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-6">Feedback Submissions</h2>
              <div className="space-y-4">
                {feedbackSubmissions.map((feedback) => (
                  <div key={feedback.id} className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= feedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-600'
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            feedback.feedback_type === 'bug_report' ? 'bg-red-900/30 text-red-400' :
                            feedback.feedback_type === 'feature_request' ? 'bg-blue-900/30 text-blue-400' :
                            feedback.feedback_type === 'testimonial' ? 'bg-green-900/30 text-green-400' :
                            'bg-zinc-700 text-zinc-300'
                          }`}>
                            {feedback.feedback_type.replace('_', ' ')}
                          </span>
                          {feedback.allow_testimonial && (
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-violet-900/30 text-violet-400">
                              Can use as testimonial
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-400">
                          {feedback.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {feedback.email}
                            </span>
                          )}
                          <span>{new Date(feedback.created_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        feedback.status === 'new' ? 'bg-blue-900/30 text-blue-400' :
                        feedback.status === 'reviewed' ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-green-900/30 text-green-400'
                      }`}>
                        {feedback.status}
                      </span>
                    </div>
                    <p className="text-zinc-300 whitespace-pre-wrap mb-3">{feedback.message}</p>
                    {feedback.admin_notes && (
                      <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-700">
                        <p className="text-xs text-zinc-500 mb-1">Admin Notes:</p>
                        <p className="text-sm text-zinc-400">{feedback.admin_notes}</p>
                      </div>
                    )}
                  </div>
                ))}
                {feedbackSubmissions.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400">No feedback submissions yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Mail className="w-6 h-6" />
                  Email Management
                </h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Send Email to All Users</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="Email subject..."
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Body
                        </label>
                        <textarea
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          placeholder="Email content..."
                          rows={8}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 resize-none"
                        />
                      </div>

                      <button
                        onClick={() => sendEmailCampaign('all_users')}
                        disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold py-3 px-6 rounded-xl transition-all"
                      >
                        {emailSending ? 'Sending...' : 'Send to All Users'}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-zinc-700 pt-6">
                    <h3 className="text-lg font-semibold mb-4">Send Test Email</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Test Email Address
                        </label>
                        <input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="your-email@example.com"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600"
                        />
                      </div>

                      <button
                        onClick={() => sendEmailCampaign('test_email')}
                        disabled={emailSending || !testEmail.trim()}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold py-3 px-6 rounded-xl transition-all"
                      >
                        {emailSending ? 'Sending...' : 'Send Test Email'}
                      </button>
                    </div>
                  </div>

                  {emailMessage && (
                    <div className={`p-4 rounded-xl border ${
                      emailMessage.startsWith('Error')
                        ? 'bg-red-950/50 border-red-900 text-red-400'
                        : 'bg-green-950/50 border-green-900 text-green-400'
                    }`}>
                      {emailMessage}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Email Provider Status</h3>
                <div className="bg-blue-950/30 border border-blue-900 rounded-lg p-4 text-blue-300 text-sm space-y-2">
                  <p>Transactional email requires provider credentials in the deployment environment.</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Configure a verified sender domain.</li>
                    <li>Store provider credentials outside the client app.</li>
                    <li>Send a test message before enabling production notifications.</li>
                  </ol>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-orange-400" />
                  Eleven Labs Credit Monitoring
                </h2>

                <div className="space-y-4">
                  <p className="text-zinc-400 text-sm">
                    Monitor your Eleven Labs API credits and receive alerts when running low or out of credits.
                  </p>

                  <button
                    onClick={checkElevenLabsBalance}
                    disabled={elevenLabsLoading}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold py-3 px-6 rounded-xl transition-all"
                  >
                    {elevenLabsLoading ? 'Checking...' : 'Check Balance'}
                  </button>

                  {elevenLabsBalance !== null && (
                    <div className={`p-4 rounded-xl border-2 ${
                      elevenLabsBalance <= 0
                        ? 'bg-red-950/50 border-red-900'
                        : elevenLabsBalance <= lowCreditThreshold
                        ? 'bg-yellow-950/50 border-yellow-900'
                        : 'bg-green-950/50 border-green-900'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium ${
                            elevenLabsBalance <= 0
                              ? 'text-red-400'
                              : elevenLabsBalance <= lowCreditThreshold
                              ? 'text-yellow-400'
                              : 'text-green-400'
                          }`}>
                            Current Balance
                          </p>
                          <p className={`text-2xl font-bold ${
                            elevenLabsBalance <= 0
                              ? 'text-red-300'
                              : elevenLabsBalance <= lowCreditThreshold
                              ? 'text-yellow-300'
                              : 'text-green-300'
                          }`}>
                            {elevenLabsBalance.toLocaleString()} characters
                          </p>
                        </div>
                        {elevenLabsBalance <= 0 && (
                          <AlertTriangle className="w-8 h-8 text-red-400" />
                        )}
                        {elevenLabsBalance > 0 && elevenLabsBalance <= lowCreditThreshold && (
                          <AlertCircle className="w-8 h-8 text-yellow-400" />
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-zinc-700 pt-4">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Low Credit Alert Threshold: {lowCreditThreshold.toLocaleString()} characters
                    </label>
                    <input
                      type="range"
                      min="1000"
                      max="50000"
                      step="1000"
                      value={lowCreditThreshold}
                      onChange={(e) => setLowCreditThreshold(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      You will receive daily alerts when your balance falls below this amount.
                    </p>
                  </div>

                  <div className="bg-blue-950/30 border border-blue-900 rounded-lg p-4 text-blue-300 text-sm space-y-2">
                    <p className="font-semibold">Alert System Details:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Zero Credit Alert: Sent immediately when balance hits 0 characters</li>
                      <li>• Low Credit Alert: Sent daily when balance is below {lowCreditThreshold.toLocaleString()} characters</li>
                      <li>• Alerts will be sent to: test email in the form above</li>
                      <li>• Setup: Configure in Settings after deployment</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedUserId && (
        <UserProfile
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
