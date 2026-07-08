import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

interface QuizResponse {
  id: string;
  created_at: string;
  user_id: string;
  user_email?: string;
  content_type: string;
  channel_size: string;
  primary_audience_location: string;
  goals: string;
  content_topic: string;
  current_language: string;
  recommended_languages: string[];
}

interface QuizStats {
  contentTypes: Record<string, number>;
  channelSizes: Record<string, number>;
  locations: Record<string, number>;
  goals: Record<string, number>;
  topics: Record<string, number>;
}

export default function QuizAnalytics() {
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllResponses, setShowAllResponses] = useState(false);

  useEffect(() => {
    loadQuizData();
  }, []);

  const loadQuizData = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const quizData = data || [];

      // Fetch user emails
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email');

      if (profilesError) throw profilesError;

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      const responsesWithEmails = quizData.map(response => ({
        ...response,
        user_email: response.user_id ? emailMap.get(response.user_id) : undefined
      }));

      setResponses(responsesWithEmails);

      const statsData: QuizStats = {
        contentTypes: {},
        channelSizes: {},
        locations: {},
        goals: {},
        topics: {}
      };

      responsesWithEmails.forEach(r => {
        statsData.contentTypes[r.content_type] = (statsData.contentTypes[r.content_type] || 0) + 1;
        statsData.channelSizes[r.channel_size] = (statsData.channelSizes[r.channel_size] || 0) + 1;
        statsData.locations[r.primary_audience_location] = (statsData.locations[r.primary_audience_location] || 0) + 1;
        statsData.goals[r.goals] = (statsData.goals[r.goals] || 0) + 1;
        if (r.content_topic) {
          statsData.topics[r.content_topic] = (statsData.topics[r.content_topic] || 0) + 1;
        }
      });

      setStats(statsData);
    } catch (err) {
      console.error('Error loading quiz data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStatCard = (title: string, data: Record<string, number>) => {
    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);

    return (
      <div className="bg-black border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          {title}
        </h3>
        <div className="space-y-3">
          {sortedEntries.map(([key, count]) => {
            const percent = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-300">{key}</span>
                  <span className="text-zinc-400">{count} ({percent.toFixed(0)}%)</span>
                </div>
                <div className="bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-zinc-400">Loading quiz data...</p>
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">No quiz responses yet</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Quiz Analytics</h2>
      <p className="text-zinc-400 mb-8">Total responses: {responses.length}</p>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {renderStatCard('Content Types', stats.contentTypes)}
          {renderStatCard('Channel Sizes', stats.channelSizes)}
          {renderStatCard('Audience Locations', stats.locations)}
          {renderStatCard('Primary Goals', stats.goals)}
          {Object.keys(stats.topics).length > 0 && renderStatCard('Content Topics', stats.topics)}
        </div>
      )}

      <div className="bg-black border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Recent Responses</h3>
          {responses.length > 20 && (
            <button
              onClick={() => setShowAllResponses(!showAllResponses)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm font-medium"
            >
              {showAllResponses ? (
                <>
                  Show Less
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  View All Responses ({responses.length})
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Date</th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">User Email</th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Content Type</th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Channel Size</th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Location</th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Goal</th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">Current Lang</th>
              </tr>
            </thead>
            <tbody>
              {(showAllResponses ? responses : responses.slice(0, 20)).map((response) => (
                <tr key={response.id} className="border-b border-zinc-800 hover:bg-zinc-900/30">
                  <td className="p-3 text-sm text-zinc-300">{formatDate(response.created_at)}</td>
                  <td className="p-3 text-sm text-zinc-400">
                    {response.user_email || <span className="text-zinc-600">Guest</span>}
                  </td>
                  <td className="p-3 text-sm">{response.content_type}</td>
                  <td className="p-3 text-sm">{response.channel_size}</td>
                  <td className="p-3 text-sm">{response.primary_audience_location}</td>
                  <td className="p-3 text-sm">{response.goals}</td>
                  <td className="p-3 text-sm">{response.current_language}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!showAllResponses && responses.length > 20 && (
          <p className="text-sm text-zinc-500 mt-4">Showing 20 of {responses.length} responses</p>
        )}
      </div>
    </div>
  );
}
