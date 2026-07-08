import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Zap, Shield, Clock, Crown, Volume2 } from 'lucide-react';
import { CREDIT_PACKAGES } from '../lib/stripe';
import { useAuth, supabase } from '../lib/auth';
import NavBar from '../components/NavBar';

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<{ credits_minutes: number; credits_used: number } | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserCredits();
    }
  }, [user]);

  const fetchUserCredits = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_credits')
      .select('credits_minutes, credits_used')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setUserCredits(data);
    }
  };

  const getTierFromCredits = (totalCredits: number): string | null => {
    if (totalCredits >= 480) return 'business';
    if (totalCredits >= 240) return 'pro';
    if (totalCredits >= 120) return 'creator';
    if (totalCredits >= 60) return 'starter';
    return null;
  };

  const currentTier = userCredits ? getTierFromCredits(userCredits.credits_minutes) : null;

  const handlePurchase = async (packageId: string) => {
    if (!user) {
      navigate('/login?redirect=/pricing');
      return;
    }

    setLoading(packageId);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80"></div>

      <div className="relative">
        <NavBar />

        <div className="container mx-auto px-6 py-20 max-w-7xl">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Buy credits once, use them anytime. No subscriptions, no recurring charges, no surprises.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Credits never expire</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-500" />
                <span>No monthly fees</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-500" />
                <span>Use at your own pace</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16 auto-rows-fr">
            {CREDIT_PACKAGES.map((pkg) => {
              const isCurrentTier = currentTier === pkg.id;
              const isFree = pkg.id === 'free';
              return (
              <div
                key={pkg.id}
                className={`relative bg-zinc-900 border ${
                  isCurrentTier ? 'border-green-500' : pkg.popular ? 'border-white' : 'border-zinc-800'
                } rounded-2xl p-8 hover:border-zinc-600 transition-all duration-300 ${
                  pkg.popular ? 'lg:scale-105 shadow-2xl' : ''
                } flex flex-col h-full`}
              >
                {isCurrentTier && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-green-500 text-white text-xs font-bold py-1 px-4 rounded-full flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      YOUR TIER
                    </div>
                  </div>
                )}
                {pkg.popular && !isCurrentTier && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-white text-black text-xs font-bold py-1 px-4 rounded-full">
                      MOST POPULAR
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                  <p className="text-sm text-zinc-400 mb-4">{pkg.description}</p>
                  <div className="flex items-baseline gap-2">
                    {isFree ? (
                      <span className="text-5xl font-bold">$0</span>
                    ) : (
                      <>
                        <span className="text-5xl font-bold">${pkg.price}</span>
                        <span className="text-zinc-400">one-time</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 mt-2">
                    {isFree ? 'No credit card required' : `$${pkg.pricePerMinute.toFixed(2)}/minute`}
                  </p>
                </div>

                <ul className="space-y-3 mb-6 flex-grow">
                  {pkg.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => !isFree && handlePurchase(pkg.id)}
                  disabled={loading === pkg.id || isFree}
                  className={`w-full ${
                    isFree
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-white cursor-default'
                      : pkg.popular
                      ? 'bg-white hover:bg-zinc-200 text-black'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  } font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-auto`}
                >
                  {loading === pkg.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : user ? (
                    'Buy Credits'
                  ) : (
                    'Sign In to Buy'
                  )}
                </button>
              </div>
            );
            })}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">How Credits Work</h2>
              <p className="text-zinc-400 text-lg mb-8">
                Simple and transparent. No hidden fees or expiration dates.
              </p>
              <div className="grid md:grid-cols-3 gap-6 text-left">
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
                  <div className="w-12 h-12 bg-white text-black rounded-xl flex items-center justify-center mb-4 font-bold text-xl">
                    1
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Buy Credits</h3>
                  <p className="text-sm text-zinc-400">
                    Choose a package and pay once. Your credits are added instantly.
                  </p>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
                  <div className="w-12 h-12 bg-white text-black rounded-xl flex items-center justify-center mb-4 font-bold text-xl">
                    2
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Dub Your Videos</h3>
                  <p className="text-sm text-zinc-400">
                    Upload videos anytime. Credits are deducted based on video length.
                  </p>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
                  <div className="w-12 h-12 bg-white text-black rounded-xl flex items-center justify-center mb-4 font-bold text-xl">
                    3
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Never Expire</h3>
                  <p className="text-sm text-zinc-400">
                    Use your credits whenever you want. They never expire.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 space-y-12">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12">
              <div className="text-center max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold mb-6">Supported Languages</h2>
                <p className="text-zinc-400 text-lg mb-8">
                  We support 15+ languages with more coming soon
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                  {['Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Polish', 'Turkish', 'Russian', 'Dutch', 'Czech', 'Arabic', 'Chinese', 'Japanese', 'Korean', 'Hindi'].map((lang) => (
                    <div key={lang} className="bg-zinc-800 border border-zinc-700 rounded-lg py-3 px-4 text-sm font-medium">
                      {lang}
                    </div>
                  ))}
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-left">
                  <p className="text-sm text-zinc-300 mb-3">
                    <span className="font-semibold text-white">AI Translation Accuracy:</span> Our translations are powered by advanced machine learning with a 95%+ accuracy rate.
                  </p>
                  <p className="text-sm text-zinc-400">
                    While we strive for the highest quality, we cannot guarantee 100% accuracy. If you encounter any issues with your generations, please <Link to="/contact" className="text-white hover:text-zinc-300 underline">contact support</Link>.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-zinc-400 mb-4">
                Need more than 480 minutes per pack? Contact us for custom enterprise pricing.
              </p>
              <Link
                to="/contact"
                className="text-white hover:text-zinc-300 transition-colors underline"
              >
                Get in touch →
              </Link>
            </div>
          </div>
        </div>

        <footer className="border-t border-zinc-800 mt-20">
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-black" />
                </div>
                <span>© 2025 DubStudio. All rights reserved.</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <Link to="/contact" className="text-zinc-400 hover:text-white transition-colors">
                  Contact
                </Link>
                <Link to="/terms" className="text-zinc-400 hover:text-white transition-colors">
                  Terms and Conditions
                </Link>
                <Link to="/privacy" className="text-zinc-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
