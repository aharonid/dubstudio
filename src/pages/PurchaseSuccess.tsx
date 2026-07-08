import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CreditCard, Zap, ArrowRight } from 'lucide-react';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function PurchaseSuccess() {
  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'conversion', {'send_to': 'AW-16909037121/SHciCIOBkLUbEMHc7f4-'});
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80"></div>

      <div className="relative">
        <NavBar />

        <div className="container mx-auto px-6 py-20 max-w-3xl">
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Payment Successful!
            </h1>

            <p className="text-xl text-zinc-400 mb-8">
              Your credits have been added to your account
            </p>

            <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Zap className="w-6 h-6 text-yellow-500" />
                <p className="text-2xl font-bold">Credits Added!</p>
              </div>
              <p className="text-zinc-400">
                Your new credits are ready to use. Start dubbing your videos now.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-left">
                <CreditCard className="w-8 h-8 text-zinc-400 mb-3" />
                <h3 className="font-semibold mb-2">View Your Credits</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  Check your balance and transaction history
                </p>
                <Link
                  to="/account"
                  className="text-sm text-white hover:text-zinc-300 transition-colors flex items-center gap-2"
                >
                  Go to Account <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-left">
                <Zap className="w-8 h-8 text-zinc-400 mb-3" />
                <h3 className="font-semibold mb-2">Start Dubbing</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  Upload your first video and reach global audiences
                </p>
                <Link
                  to="/"
                  className="text-sm text-white hover:text-zinc-300 transition-colors flex items-center gap-2"
                >
                  Start Dubbing <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <Link
              to="/account"
              className="inline-flex items-center gap-2 bg-white hover:bg-zinc-200 text-black font-semibold py-4 px-8 rounded-xl transition-all duration-300"
            >
              View Your Account
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
