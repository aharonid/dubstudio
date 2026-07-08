import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Volume2, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { signIn, supabase } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setResetEmailSent(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
      });

      if (error) throw error;

      setResetEmailSent(true);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80"></div>

      <div className="relative w-full max-w-md px-6">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Volume2 className="w-6 h-6 text-black" />
            </div>
            <span className="text-2xl font-bold">DubStudio</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-zinc-400">Sign in to access your dashboard</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          {!showForgotPassword ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-950/50 border-2 border-red-900 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium mb-1">Error</p>
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError('');
                  }}
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white hover:bg-zinc-200 disabled:bg-zinc-700 text-black disabled:text-zinc-500 font-semibold py-4 px-6 rounded-xl transition-all duration-300"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-950/50 border-2 border-red-900 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium mb-1">Error</p>
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {resetEmailSent && (
                <div className="p-4 bg-green-950/50 border-2 border-green-900 rounded-xl">
                  <p className="text-green-400 font-medium mb-1">Email sent!</p>
                  <p className="text-green-300 text-sm">
                    Check your email for a password reset link. It may take a few minutes to arrive.
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-xl font-semibold mb-2">Reset Password</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-zinc-300 mb-2">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError('');
                    setResetEmailSent(false);
                  }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300"
                >
                  Back to Sign In
                </button>
                <button
                  type="submit"
                  disabled={loading || resetEmailSent}
                  className="flex-1 bg-white hover:bg-zinc-200 disabled:bg-zinc-700 text-black disabled:text-zinc-500 font-semibold py-4 px-6 rounded-xl transition-all duration-300"
                >
                  {loading ? 'Sending...' : resetEmailSent ? 'Email Sent' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          )}

          {!showForgotPassword && (
            <div className="mt-6 text-center">
              <p className="text-zinc-400 text-sm">
                Don't have an account?{' '}
                <Link to="/signup" className="text-white hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-zinc-400 hover:text-white text-sm transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
