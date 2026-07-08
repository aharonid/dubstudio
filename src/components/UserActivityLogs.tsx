import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Clock, LogIn, Video, Activity, TrendingUp } from 'lucide-react';

interface LoginRecord {
  id: string;
  user_id: string;
  logged_in_at: string;
  ip_address: string | null;
  user_agent: string | null;
  login_method: string;
  success: boolean;
}

interface DubbingRecord {
  id: string;
  dubbing_id: string;
  user_id: string;
  status: string;
  processing_time_seconds: number;
  created_at: string;
  completed_at: string;
  source_filename: string;
  target_language: string;
}

interface PerformanceStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgProcessingTime: number;
  totalProcessingTime: number;
  successRate: number;
}

export default function UserActivityLogs() {
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [dubbingHistory, setDubbingHistory] = useState<DubbingRecord[]>([]);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'logins' | 'dubbing'>('logins');

  useEffect(() => {
    loadActivityData();
  }, []);

  const loadActivityData = async () => {
    try {
      const [loginsRes, dubbingRes] = await Promise.all([
        supabase
          .from('login_history')
          .select('*')
          .order('logged_in_at', { ascending: false })
          .limit(100),
        supabase
          .from('dubbing_jobs')
          .select('id, dubbing_id, user_id, status, processing_time_seconds, created_at, completed_at, source_filename, target_language')
          .not('processing_time_seconds', 'is', null)
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      if (loginsRes.error) {
        console.error('Error fetching login history:', loginsRes.error);
      }
      if (dubbingRes.error) {
        console.error('Error fetching dubbing history:', dubbingRes.error);
      }

      setLoginHistory(loginsRes.data || []);
      setDubbingHistory(dubbingRes.data || []);

      const dubbing = dubbingRes.data || [];
      const completed = dubbing.filter(d => d.status === 'completed');
      const failed = dubbing.filter(d => d.status === 'failed');

      const totalProcessingTime = dubbing.reduce((sum, d) => sum + (Number(d.processing_time_seconds) || 0), 0);
      const avgProcessingTime = dubbing.length > 0 ? totalProcessingTime / dubbing.length : 0;

      setPerformanceStats({
        totalJobs: dubbing.length,
        completedJobs: completed.length,
        failedJobs: failed.length,
        avgProcessingTime,
        totalProcessingTime,
        successRate: dubbing.length > 0 ? (completed.length / dubbing.length) * 100 : 0
      });
    } catch (err) {
      console.error('Error loading activity data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };

  const getBrowser = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-zinc-400">Loading activity data...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">User Activity Logs</h2>
      <p className="text-zinc-400 mb-8">Login history and dubbing performance metrics</p>

      {performanceStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-black border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Video className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-medium text-zinc-400">Total Jobs</h3>
            </div>
            <p className="text-3xl font-bold">{performanceStats.totalJobs}</p>
          </div>

          <div className="bg-black border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h3 className="text-sm font-medium text-zinc-400">Success Rate</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">{performanceStats.successRate.toFixed(1)}%</p>
          </div>

          <div className="bg-black border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <h3 className="text-sm font-medium text-zinc-400">Avg Processing</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{formatDuration(performanceStats.avgProcessingTime)}</p>
          </div>

          <div className="bg-black border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-medium text-zinc-400">Total Processing</h3>
            </div>
            <p className="text-3xl font-bold text-cyan-400">{formatDuration(performanceStats.totalProcessingTime)}</p>
          </div>

          <div className="bg-black border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <LogIn className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-medium text-zinc-400">Total Logins</h3>
            </div>
            <p className="text-3xl font-bold text-purple-400">{loginHistory.length}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveView('logins')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeView === 'logins'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <LogIn className="w-4 h-4 inline mr-2" />
          Login History ({loginHistory.length})
        </button>
        <button
          onClick={() => setActiveView('dubbing')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeView === 'dubbing'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <Video className="w-4 h-4 inline mr-2" />
          Dubbing Performance ({dubbingHistory.length})
        </button>
      </div>

      {activeView === 'logins' && (
        <div className="bg-black border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Login History</h3>
          {loginHistory.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">No login records found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left p-3 text-sm font-medium text-zinc-400">Date & Time</th>
                    <th className="text-left p-3 text-sm font-medium text-zinc-400">User ID</th>
                    <th className="text-left p-3 text-sm font-medium text-zinc-400">IP Address</th>
                    <th className="text-left p-3 text-sm font-medium text-zinc-400">Browser</th>
                    <th className="text-left p-3 text-sm font-medium text-zinc-400">Method</th>
                    <th className="text-left p-3 text-sm font-medium text-zinc-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((login) => (
                    <tr key={login.id} className="border-b border-zinc-800 hover:bg-zinc-900/30">
                      <td className="p-3 text-sm">{formatDate(login.logged_in_at)}</td>
                      <td className="p-3 text-sm font-mono text-xs text-zinc-400">
                        {login.user_id.substring(0, 8)}...
                      </td>
                      <td className="p-3 text-sm">{login.ip_address || 'N/A'}</td>
                      <td className="p-3 text-sm">{login.user_agent ? getBrowser(login.user_agent) : 'Unknown'}</td>
                      <td className="p-3 text-sm">{login.login_method}</td>
                      <td className="p-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          login.success ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                        }`}>
                          {login.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeView === 'dubbing' && (
        <div className="bg-black border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Dubbing Performance</h3>
          {dubbingHistory.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">No dubbing records found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left p-3 text-sm font-medium text-zinc-400">Started</th>
                    <th className="text-left p-3 text-sm font-medium text-zinc-400">File</th>
                    <th className="text-left p-3 text-sm font-medium text-zinc-400">Language</th>
                    <th className="text-left p-3 text-sm font-medium text-zinc-400">Status</th>
                    <th className="text-right p-3 text-sm font-medium text-zinc-400">Processing Time</th>
                    <th className="text-left p-3 text-sm font-medium text-zinc-400">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {dubbingHistory.map((job) => (
                    <tr key={job.id} className="border-b border-zinc-800 hover:bg-zinc-900/30">
                      <td className="p-3 text-sm text-zinc-300">{formatDate(job.created_at)}</td>
                      <td className="p-3 text-sm max-w-xs truncate" title={job.source_filename}>
                        {job.source_filename}
                      </td>
                      <td className="p-3 text-sm">{job.target_language}</td>
                      <td className="p-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          job.status === 'completed'
                            ? 'bg-green-900/50 text-green-300'
                            : job.status === 'failed'
                            ? 'bg-red-900/50 text-red-300'
                            : 'bg-yellow-900/50 text-yellow-300'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-right font-mono">
                        <span className={`font-bold ${
                          Number(job.processing_time_seconds) < 30
                            ? 'text-green-400'
                            : Number(job.processing_time_seconds) < 60
                            ? 'text-yellow-400'
                            : 'text-orange-400'
                        }`}>
                          {formatDuration(Number(job.processing_time_seconds))}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-zinc-400">
                        {job.completed_at ? formatDate(job.completed_at) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
