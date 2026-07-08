import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Star, MessageSquare, Bug, Lightbulb, ThumbsUp } from 'lucide-react';

interface FeedbackSubmission {
  id: string;
  created_at: string;
  user_id: string | null;
  email: string | null;
  rating: number;
  feedback_type: 'bug_report' | 'feature_request' | 'testimonial' | 'general';
  message: string;
  status: 'new' | 'reviewed' | 'acted_upon';
  allow_testimonial: boolean;
}

interface FeedbackStats {
  avgRating: number;
  byType: Record<string, number>;
  byRating: Record<number, number>;
  byStatus: Record<string, number>;
}

export default function UserFeedback() {
  const [feedback, setFeedback] = useState<FeedbackSubmission[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadFeedbackData();
  }, []);

  const loadFeedbackData = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const feedbackData = data || [];
      setFeedback(feedbackData);

      const statsData: FeedbackStats = {
        avgRating: 0,
        byType: {},
        byRating: {},
        byStatus: {}
      };

      let totalRating = 0;
      feedbackData.forEach(f => {
        totalRating += f.rating;
        statsData.byType[f.feedback_type] = (statsData.byType[f.feedback_type] || 0) + 1;
        statsData.byRating[f.rating] = (statsData.byRating[f.rating] || 0) + 1;
        statsData.byStatus[f.status] = (statsData.byStatus[f.status] || 0) + 1;
      });

      statsData.avgRating = feedbackData.length > 0 ? totalRating / feedbackData.length : 0;
      setStats(statsData);
    } catch (err) {
      console.error('Error loading feedback data:', err);
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug_report': return <Bug className="w-4 h-4 text-red-400" />;
      case 'feature_request': return <Lightbulb className="w-4 h-4 text-yellow-400" />;
      case 'testimonial': return <ThumbsUp className="w-4 h-4 text-green-400" />;
      default: return <MessageSquare className="w-4 h-4 text-blue-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      new: 'bg-blue-900/50 text-blue-300 border-blue-800',
      reviewed: 'bg-yellow-900/50 text-yellow-300 border-yellow-800',
      acted_upon: 'bg-green-900/50 text-green-300 border-green-800'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs border ${colors[status as keyof typeof colors] || colors.new}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-600'}`}
          />
        ))}
      </div>
    );
  };

  const filteredFeedback = filter === 'all'
    ? feedback
    : feedback.filter(f => f.feedback_type === filter);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-zinc-400">Loading feedback data...</p>
      </div>
    );
  }

  if (feedback.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">No feedback submissions yet</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">User Feedback</h2>
      <p className="text-zinc-400 mb-8">Total submissions: {feedback.length}</p>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-black border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <h3 className="text-sm font-medium text-zinc-400">Avg Rating</h3>
            </div>
            <p className="text-4xl font-bold">{stats.avgRating.toFixed(1)}</p>
            <div className="mt-2">{renderStars(Math.round(stats.avgRating))}</div>
          </div>

          <div className="bg-black border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Bug className="w-5 h-5 text-red-400" />
              <h3 className="text-sm font-medium text-zinc-400">Bug Reports</h3>
            </div>
            <p className="text-4xl font-bold">{stats.byType['bug_report'] || 0}</p>
          </div>

          <div className="bg-black border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <h3 className="text-sm font-medium text-zinc-400">Feature Requests</h3>
            </div>
            <p className="text-4xl font-bold">{stats.byType['feature_request'] || 0}</p>
          </div>

          <div className="bg-black border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <ThumbsUp className="w-5 h-5 text-green-400" />
              <h3 className="text-sm font-medium text-zinc-400">Testimonials</h3>
            </div>
            <p className="text-4xl font-bold">{stats.byType['testimonial'] || 0}</p>
          </div>
        </div>
      )}

      <div className="bg-black border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">All Feedback</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('bug_report')}
              className={`px-3 py-1 rounded text-sm ${filter === 'bug_report' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              Bugs
            </button>
            <button
              onClick={() => setFilter('feature_request')}
              className={`px-3 py-1 rounded text-sm ${filter === 'feature_request' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              Features
            </button>
            <button
              onClick={() => setFilter('testimonial')}
              className={`px-3 py-1 rounded text-sm ${filter === 'testimonial' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              Testimonials
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredFeedback.map((item) => (
            <div key={item.id} className="border border-zinc-800 rounded-lg p-4 hover:bg-zinc-900/30">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getTypeIcon(item.feedback_type)}
                  <div>
                    <p className="text-sm font-medium">{item.email || 'Anonymous'}</p>
                    <p className="text-xs text-zinc-500">{formatDate(item.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {renderStars(item.rating)}
                  {getStatusBadge(item.status)}
                </div>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{item.message}</p>
              {item.allow_testimonial && (
                <div className="mt-2">
                  <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded">
                    Approved for testimonial
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredFeedback.length === 0 && (
          <p className="text-center text-zinc-500 py-8">No feedback matches this filter</p>
        )}
      </div>
    </div>
  );
}
