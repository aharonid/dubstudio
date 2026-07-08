import { Link } from 'react-router-dom';
import { Volume2, Zap, Menu, X } from 'lucide-react';
import { useAuth, supabase } from '../lib/auth';
import { useState, useEffect } from 'react';

export default function NavBar() {
  const { user } = useAuth();
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCredits();
    }
  }, [user]);

  const fetchCredits = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('user_credits')
        .select('credits_minutes, credits_used')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCreditsRemaining(data.credits_minutes - data.credits_used);
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setIsAdmin(profile.is_admin);
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    }
  };

  return (
    <nav className="border-b border-zinc-800 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold">DubStudio</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/dashboard"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/quiz"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Language Quiz
            </Link>
            <Link
              to="/pricing"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            {isAdmin && (
              <>
                <Link
                  to="/admin"
                  className="text-sm bg-red-900/50 text-red-300 hover:bg-red-900 hover:text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  Admin
                </Link>
                <Link
                  to="/analytics2"
                  className="text-sm bg-blue-900/50 text-blue-300 hover:bg-blue-900 hover:text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  Analytics
                </Link>
              </>
            )}
            {user ? (
              <Link
                to="/account"
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
              >
                <Zap className="w-4 h-4 text-yellow-500" />
                <span>{creditsRemaining ?? '...'}</span>
              </Link>
            ) : (
              <Link
                to="/account"
                className="bg-white hover:bg-zinc-200 text-black font-semibold py-2 px-4 rounded-lg transition-all duration-300"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {user ? (
              <Link
                to="/account"
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2 px-3 rounded-lg transition-all duration-300"
              >
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">{creditsRemaining ?? '...'}</span>
              </Link>
            ) : (
              <Link
                to="/account"
                className="bg-white hover:bg-zinc-200 text-black font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
              >
                Sign In
              </Link>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 flex flex-col gap-3 border-t border-zinc-800 pt-4">
            <Link
              to="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm text-zinc-400 hover:text-white transition-colors py-2"
            >
              Dashboard
            </Link>
            <Link
              to="/quiz"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm text-zinc-400 hover:text-white transition-colors py-2"
            >
              Language Quiz
            </Link>
            <Link
              to="/pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm text-zinc-400 hover:text-white transition-colors py-2"
            >
              Pricing
            </Link>
            {isAdmin && (
              <>
                <Link
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm bg-red-900/50 text-red-300 hover:bg-red-900 hover:text-white px-3 py-2 rounded-lg transition-colors font-medium inline-block"
                >
                  Admin
                </Link>
                <Link
                  to="/analytics2"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm bg-blue-900/50 text-blue-300 hover:bg-blue-900 hover:text-white px-3 py-2 rounded-lg transition-colors font-medium inline-block"
                >
                  Analytics
                </Link>
              </>
            )}
            <Link
              to="/account"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm text-zinc-400 hover:text-white transition-colors py-2"
            >
              Account
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
