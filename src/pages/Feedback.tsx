import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Volume2, Star, Send, MessageSquare, CheckCircle2, Bug, Lightbulb, Heart } from 'lucide-react';
import { useAuth } from '../lib/auth';
import Footer from '../components/Footer';

type FeedbackType = 'bug_report' | 'feature_request' | 'testimonial' | 'general';

export default function Feedback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [allowTestimonial, setAllowTestimonial] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    if (!message.trim()) {
      alert('Please enter your feedback');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('feedback_submissions').insert({
        user_id: user?.id || null,
        email: email || user?.email || null,
        rating,
        feedback_type: feedbackType,
        message: message.trim(),
        allow_testimonial: allowTestimonial,
      });

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Thank You!</h1>
          <p className="text-zinc-400 text-lg mb-6">
            Your feedback has been submitted successfully. We read every submission and use it to improve DubStudio.
          </p>
          <p className="text-sm text-zinc-500">Redirecting you back to the homepage...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80"></div>

      <div className="relative">
        <nav className="border-b border-zinc-800 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-black" />
                </div>
                <span className="text-xl font-bold">DubStudio</span>
              </Link>
              <div className="flex items-center gap-4">
                <Link to="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">Dashboard</Link>
                <Link to="/quiz" className="text-sm text-zinc-400 hover:text-white transition-colors">Language Quiz</Link>
                <Link to="/pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">Pricing</Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-6 py-12 max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Share Your Feedback</h1>
            <p className="text-xl text-zinc-400">
              We're constantly improving DubStudio. Your feedback helps us build a better product.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12">
            <div className="mb-8">
              <label className="block mb-4">
                <span className="text-lg font-semibold mb-3 block">How would you rate your experience?</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-12 h-12 ${
                          star <= (hoveredRating || rating)
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-zinc-600'
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-zinc-400 mt-2">
                    {rating === 5 && "Amazing! We're thrilled you love DubStudio!"}
                    {rating === 4 && "Great! Thanks for your support!"}
                    {rating === 3 && "Good! We'll work on making it even better."}
                    {rating === 2 && "Thanks for the feedback. We'll do better."}
                    {rating === 1 && "We're sorry. Please tell us how we can improve."}
                  </p>
                )}
              </label>
            </div>

            <div className="mb-8">
              <label className="block mb-3">
                <span className="text-lg font-semibold mb-3 block">What type of feedback is this?</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFeedbackType('bug_report')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    feedbackType === 'bug_report'
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <Bug className="w-5 h-5 mb-2 text-red-400" />
                  <div className="font-medium">Bug Report</div>
                  <div className="text-xs text-zinc-500">Something isn't working</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackType('feature_request')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    feedbackType === 'feature_request'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <Lightbulb className="w-5 h-5 mb-2 text-blue-400" />
                  <div className="font-medium">Feature Request</div>
                  <div className="text-xs text-zinc-500">Suggest an improvement</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackType('testimonial')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    feedbackType === 'testimonial'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <Heart className="w-5 h-5 mb-2 text-green-400" />
                  <div className="font-medium">Testimonial</div>
                  <div className="text-xs text-zinc-500">Share your success story</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackType('general')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    feedbackType === 'general'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <MessageSquare className="w-5 h-5 mb-2 text-purple-400" />
                  <div className="font-medium">General Feedback</div>
                  <div className="text-xs text-zinc-500">Other thoughts or ideas</div>
                </button>
              </div>
            </div>

            <div className="mb-8">
              <label className="block">
                <span className="text-lg font-semibold mb-3 block">Your Feedback</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  rows={6}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
                  required
                />
              </label>
            </div>

            {!user && (
              <div className="mb-8">
                <label className="block">
                  <span className="text-lg font-semibold mb-3 block">
                    Email <span className="text-sm text-zinc-500 font-normal">(optional)</span>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                  <p className="text-sm text-zinc-500 mt-2">
                    In case we want to follow up on your feedback
                  </p>
                </label>
              </div>
            )}

            {(feedbackType === 'testimonial' || rating >= 4) && (
              <div className="mb-8">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowTestimonial}
                    onChange={(e) => setAllowTestimonial(e.target.checked)}
                    className="mt-1 w-5 h-5 bg-zinc-800 border-2 border-zinc-700 rounded checked:bg-blue-500 checked:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors"
                  />
                  <div>
                    <span className="font-medium">You can use this as a testimonial</span>
                    <p className="text-sm text-zinc-500 mt-1">
                      We may feature your feedback on our website or marketing materials
                    </p>
                  </div>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || rating === 0 || !message.trim()}
              className="w-full bg-white hover:bg-zinc-200 disabled:bg-zinc-700 text-black disabled:text-zinc-500 font-semibold py-4 px-8 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 text-lg disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Feedback
                </>
              )}
            </button>
          </form>
        </div>

        <Footer />
      </div>
    </div>
  );
}
