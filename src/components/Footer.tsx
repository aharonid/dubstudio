import { Link } from 'react-router-dom';
import { Volume2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 mt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-black" />
              </div>
              <span>© 2026 DubStudio. All rights reserved.</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm">
            <Link
              to="/feedback"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Feature Request
            </Link>
            <Link
              to="/contact"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Contact
            </Link>
            <Link
              to="/terms"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Terms and Conditions
            </Link>
            <Link
              to="/privacy"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
