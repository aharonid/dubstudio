import { useEffect, useState } from 'react';
import { supabase } from '../lib/auth';
import { BarChart3, Users, Globe, TrendingUp, Calendar } from 'lucide-react';

interface QuizResponse {
  id: string;
  user_id: string;
  content_type: string;
  channel_size: string;
  primary_audience_location: string;
  goals: string;
  content_topic: string;
  current_language: string;
  recommended_languages: {
    language: string;
    code: string;
    reason: string;
    marketSize: string;
  }[];
  created_at: string;
}

interface Stats {
  total: number;
  contentTypes: Record<string, number>;
  channelSizes: Record<string, number>;
  topics: Record<string, number>;
  locations: Record<string, number>;
}

export default function QuizAdmin() {
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    contentTypes: {},
    channelSizes: {},
    topics: {},
    locations: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[QuizAdmin] useEffect triggered');
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    console.log('[QuizAdmin] fetchResponses START');
    try {
      console.log('[QuizAdmin] Fetching quiz responses...');
      const { data, error } = await supabase
        .from('quiz_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('[QuizAdmin] Quiz responses fetched:', data?.length);

      if (data) {
        console.log('[QuizAdmin] Setting responses and calculating stats');
        setResponses(data);
        calculateStats(data);
        console.log('[QuizAdmin] Stats calculated');
      }
    } catch (error) {
      console.error('[QuizAdmin] Error fetching quiz responses:', error);
    } finally {
      console.log('[QuizAdmin] Setting loading to false');
      setLoading(false);
    }
  };

  const calculateStats = (data: QuizResponse[]) => {
    const newStats: Stats = {
      total: data.length,
      contentTypes: {},
      channelSizes: {},
      topics: {},
      locations: {},
    };

    data.forEach((response) => {
      newStats.contentTypes[response.content_type] = (newStats.contentTypes[response.content_type] || 0) + 1;
      newStats.channelSizes[response.channel_size] = (newStats.channelSizes[response.channel_size] || 0) + 1;
      newStats.topics[response.content_topic] = (newStats.topics[response.content_topic] || 0) + 1;
      newStats.locations[response.primary_audience_location] = (newStats.locations[response.primary_audience_location] || 0) + 1;
    });

    setStats(newStats);
  };

  const getTopItems = (obj: Record<string, number>, limit = 5) => {
    return Object.entries(obj)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading quiz responses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Quiz Analytics</h1>
          <p className="text-zinc-400">View all user quiz responses and insights</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm text-zinc-400">Total Responses</h3>
            </div>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-green-400" />
              <h3 className="text-sm text-zinc-400">Content Types</h3>
            </div>
            <p className="text-3xl font-bold">{Object.keys(stats.contentTypes).length}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm text-zinc-400">Locations</h3>
            </div>
            <p className="text-3xl font-bold">{Object.keys(stats.locations).length}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              <h3 className="text-sm text-zinc-400">Topics</h3>
            </div>
            <p className="text-3xl font-bold">{Object.keys(stats.topics).length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Top Content Types</h3>
            <div className="space-y-3">
              {getTopItems(stats.contentTypes).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-zinc-300 capitalize">{type.replace('_', ' ')}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-white font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Channel Sizes</h3>
            <div className="space-y-3">
              {getTopItems(stats.channelSizes).map(([size, count]) => (
                <div key={size} className="flex items-center justify-between">
                  <span className="text-zinc-300 capitalize">{size}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-white font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Top Topics</h3>
            <div className="space-y-3">
              {getTopItems(stats.topics).map(([topic, count]) => (
                <div key={topic} className="flex items-center justify-between">
                  <span className="text-zinc-300 capitalize">{topic}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-white font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Audience Locations</h3>
            <div className="space-y-3">
              {getTopItems(stats.locations).map(([location, count]) => (
                <div key={location} className="flex items-center justify-between">
                  <span className="text-zinc-300 uppercase">{location}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500"
                        style={{ width: `${(count / stats.total) * 100}%` }}
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
          <h3 className="text-xl font-bold mb-6">Recent Responses</h3>
          <div className="space-y-4">
            {responses.slice(0, 10).map((response) => (
              <div key={response.id} className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Calendar className="w-4 h-4" />
                    {new Date(response.created_at).toLocaleString()}
                  </div>
                  <span className="px-2 py-1 bg-zinc-700 rounded text-xs text-zinc-300">
                    {response.user_id.slice(0, 8)}...
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Content Type</p>
                    <p className="text-sm text-white capitalize">{response.content_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Channel Size</p>
                    <p className="text-sm text-white capitalize">{response.channel_size}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Topic</p>
                    <p className="text-sm text-white capitalize">{response.content_topic}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Location</p>
                    <p className="text-sm text-white uppercase">{response.primary_audience_location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Goal</p>
                    <p className="text-sm text-white capitalize">{response.goals}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Current Lang</p>
                    <p className="text-sm text-white uppercase">{response.current_language}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 mb-2">Recommended Languages</p>
                  <div className="flex flex-wrap gap-2">
                    {response.recommended_languages.map((lang) => (
                      <span
                        key={lang.code}
                        className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs"
                      >
                        {lang.language} ({lang.code})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
