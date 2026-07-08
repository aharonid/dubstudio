import { Shield } from 'lucide-react';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

function Privacy() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80"></div>

      <div className="relative">
        <NavBar />

        <div className="container mx-auto px-6 py-20 max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-sm text-zinc-500 max-w-2xl mx-auto">
              Last updated: December 1, 2025
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12 space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
              <p className="text-zinc-400 leading-relaxed">
                DubStudio is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered dubbing service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
              <div className="text-zinc-400 leading-relaxed space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Account Information</h3>
                  <p>
                    When you create an account, we collect your email address and authentication credentials. We use Supabase for secure authentication and user management.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Content You Upload</h3>
                  <p>
                    We collect the audio and video files you upload to our service for processing. This includes the content itself, metadata, and any settings you select (such as target language).
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Payment Information</h3>
                  <p>
                    When you purchase credits, payment information is processed securely through Stripe. We do not store your full credit card details on our servers.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Usage Information</h3>
                  <p>
                    We collect information about how you interact with our service, including processing times, job completion status, download activity, feature usage, and credit consumption.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Technical Information</h3>
                  <p>
                    We automatically collect certain technical information including your IP address, browser type, device information, browser fingerprints, and session identifiers for service delivery, fraud prevention, and security purposes.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
              <div className="text-zinc-400 leading-relaxed space-y-3">
                <p>We use the collected information to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Process your audio and video files for dubbing</li>
                  <li>Deliver the dubbed content to you</li>
                  <li>Improve our AI models and service quality</li>
                  <li>Monitor and analyze usage patterns</li>
                  <li>Prevent fraud and ensure service security</li>
                  <li>Communicate with you about service updates</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. AI Processing and Third-Party Services</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                DubStudio uses third-party AI services, including ElevenLabs, to process your content. When you use our service, your files may be transmitted to and processed by these third-party providers. These providers operate under their own privacy policies and security measures.
              </p>
              <p className="text-zinc-400 leading-relaxed">
                We carefully select partners who maintain high standards of data protection. However, you should review their privacy policies independently.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Data Storage and Retention</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                Uploaded files and processed outputs are stored temporarily on our servers and those of our service providers. We retain this data only as long as necessary to deliver the service and comply with legal obligations.
              </p>
              <p className="text-zinc-400 leading-relaxed">
                We implement industry-standard security measures to protect your data, but no method of transmission or storage is 100% secure. We cannot guarantee absolute security of your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Data Sharing and Disclosure</h2>
              <div className="text-zinc-400 leading-relaxed space-y-3">
                <p>We may share your information in the following circumstances:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>With service providers who assist in operating our platform (e.g., ElevenLabs for AI processing)</li>
                  <li>When required by law or to respond to legal process</li>
                  <li>To protect our rights, privacy, safety, or property</li>
                  <li>In connection with a business transfer or merger</li>
                  <li>With your explicit consent</li>
                </ul>
                <p className="mt-4">
                  We do not sell your personal information to third parties for marketing purposes.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Your Rights and Choices</h2>
              <div className="text-zinc-400 leading-relaxed space-y-3">
                <p>Depending on your jurisdiction, you may have the following rights:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access the personal information we hold about you</li>
                  <li>Request correction of inaccurate information</li>
                  <li>Request deletion of your information</li>
                  <li>Object to processing of your information</li>
                  <li>Request data portability</li>
                  <li>Withdraw consent where processing is based on consent</li>
                </ul>
                <p className="mt-4">
                  To exercise these rights, please contact us at INFO@DUBSTUDIO.COM. We use Supabase privacy functions to help manage data access and deletion requests.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Cookies and Tracking</h2>
              <p className="text-zinc-400 leading-relaxed">
                We use local storage and session identifiers to maintain service functionality and track your processing jobs. We do not use cookies for advertising or extensive user tracking. You can manage browser storage settings, though this may affect service functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. International Data Transfers</h2>
              <p className="text-zinc-400 leading-relaxed">
                Your information may be transferred to and processed in countries other than your own. These countries may have different data protection laws. We take appropriate measures to ensure your information receives adequate protection wherever it is processed.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Children's Privacy</h2>
              <p className="text-zinc-400 leading-relaxed">
                DubStudio is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. Changes to This Policy</h2>
              <p className="text-zinc-400 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on our service or sending you an email. Your continued use of the service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">12. GDPR Compliance</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                For users in the European Union, we provide additional rights under the General Data Protection Regulation (GDPR):
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-400">
                <li>Right to access all personal data we hold about you</li>
                <li>Right to rectification of inaccurate data</li>
                <li>Right to erasure ("right to be forgotten")</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
                <li>Rights related to automated decision-making</li>
              </ul>
              <p className="text-zinc-400 leading-relaxed mt-4">
                We have implemented privacy management functions to facilitate these rights. Contact us to exercise any GDPR rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">13. Business Entity</h2>
              <p className="text-zinc-400 leading-relaxed">
                DubStudio is a New York-based software project. Business contact details are available on request.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">14. Contact Us</h2>
              <p className="text-zinc-400 leading-relaxed">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-zinc-400">
                  Email:{' '}
                  <a href="mailto:INFO@DUBSTUDIO.COM" className="text-white hover:text-zinc-300 transition-colors">
                    INFO@DUBSTUDIO.COM
                  </a>
                </p>
                <p className="text-zinc-400">
                  Business contact details are available on request.
                </p>
              </div>
            </section>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

export default Privacy;
