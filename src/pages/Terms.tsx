import { FileText } from 'lucide-react';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

function Terms() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80"></div>

      <div className="relative">
        <NavBar />

        <div className="container mx-auto px-6 py-20 max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
              Terms and Conditions
            </h1>
            <p className="text-sm text-zinc-500 max-w-2xl mx-auto">
              Last updated: December 1, 2025
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12 space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p className="text-zinc-400 leading-relaxed">
                By accessing and using DubStudio, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Service Description</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                DubStudio provides AI-powered audio and video dubbing services. We use artificial intelligence to translate and dub your content into multiple languages while preserving voice characteristics.
              </p>
              <p className="text-zinc-400 leading-relaxed">
                Our service supports files up to 3 minutes in length and offers multiple output formats suitable for various platforms including YouTube, TikTok, Instagram, and Facebook.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. User Responsibilities</h2>
              <div className="text-zinc-400 leading-relaxed space-y-3">
                <p>As a user of DubStudio, you agree to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Only upload content that you own or have rights to use</li>
                  <li>Not upload content that infringes on others' intellectual property rights</li>
                  <li>Not use the service for illegal or unauthorized purposes</li>
                  <li>Not upload content containing hate speech, violence, or adult material</li>
                  <li>Comply with all applicable local, state, national, and international laws</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Intellectual Property</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                You retain all rights to the content you upload to DubStudio. By using our service, you grant us a limited license to process your content for the purpose of providing dubbing services.
              </p>
              <p className="text-zinc-400 leading-relaxed">
                All DubStudio branding, logos, and service marks are the property of DubStudio and may not be used without express written permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Service Limitations</h2>
              <div className="text-zinc-400 leading-relaxed space-y-3">
                <p>DubStudio operates under the following limitations:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Maximum file length of 3 minutes per upload</li>
                  <li>Processing times may vary based on file size and server load</li>
                  <li>We reserve the right to refuse service to anyone for any reason</li>
                  <li>Service availability is not guaranteed and may be interrupted for maintenance</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Disclaimer of Warranties</h2>
              <p className="text-zinc-400 leading-relaxed">
                DubStudio is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted, timely, secure, or error-free. AI-generated dubbing results may vary in quality and accuracy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Limitation of Liability</h2>
              <p className="text-zinc-400 leading-relaxed">
                DubStudio shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service. This includes damages for loss of profits, goodwill, data, or other intangible losses.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Content Retention and Deletion</h2>
              <p className="text-zinc-400 leading-relaxed">
                Uploaded files and processed outputs may be stored temporarily on our servers for service delivery purposes. We reserve the right to delete files at any time without notice. Users are responsible for maintaining their own backups.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Modifications to Terms</h2>
              <p className="text-zinc-400 leading-relaxed">
                We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms. We will notify users of significant changes via email or service notification.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Termination</h2>
              <p className="text-zinc-400 leading-relaxed">
                We may terminate or suspend access to our service immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. Payment and Credits</h2>
              <div className="text-zinc-400 leading-relaxed space-y-3">
                <p>DubStudio operates on a credit-based system:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>New users receive 3 minutes of free credits upon signup</li>
                  <li>Credits can be purchased through our secure payment system</li>
                  <li>Credits are consumed based on the duration of content processed</li>
                  <li>Credits do not expire but are non-refundable once purchased</li>
                  <li>Payment processing is handled securely through Stripe</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">12. Refund Policy</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                We want you to be satisfied with our service. We offer refunds under the following conditions:
              </p>

              <h3 className="text-lg font-semibold mb-3 text-white">Eligible for Full Refund:</h3>
              <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-400 mb-4">
                <li>Request made within 7 days of purchase</li>
                <li>Credits have not been used (0% usage)</li>
                <li>Technical issues on our end prevented service functionality</li>
                <li>Service did not perform as described on our website</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3 text-white">Eligible for Partial Refund:</h3>
              <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-400 mb-4">
                <li>Request made within 7 days of purchase</li>
                <li>Less than 25% of purchased credits have been used</li>
                <li>Refund amount will be prorated based on unused credits</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3 text-white">Not Eligible for Refund:</h3>
              <ul className="list-disc list-inside space-y-2 ml-4 text-zinc-400 mb-4">
                <li>More than 25% of credits have been used</li>
                <li>Request made more than 7 days after purchase</li>
                <li>User error or dissatisfaction with AI translation quality (our AI has 95%+ accuracy but variations may occur)</li>
                <li>Change of mind after successfully using the service</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3 text-white">How to Request a Refund:</h3>
              <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-zinc-400">
                <p className="mb-2">Email us at <a href="mailto:INFO@DUBSTUDIO.COM" className="text-white hover:text-zinc-300 transition-colors">INFO@DUBSTUDIO.COM</a> with:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>Your account email address</li>
                  <li>Transaction date and amount</li>
                  <li>Reason for refund request</li>
                  <li>Any relevant screenshots or details</li>
                </ul>
                <p className="mt-3 text-sm">We typically process refund requests within 3-5 business days. Approved refunds will be issued to your original payment method within 5-10 business days.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">13. Governing Law</h2>
              <p className="text-zinc-400 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the State of New York, without regard to conflict of law provisions. Any disputes shall be subject to the exclusive jurisdiction of the courts located in New York, NY.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">14. Business Entity</h2>
              <p className="text-zinc-400 leading-relaxed">
                DubStudio is a New York-based software project. Business contact details are available on request.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">15. Contact Information</h2>
              <p className="text-zinc-400 leading-relaxed">
                For questions about these Terms and Conditions, please contact us at{' '}
                <a href="mailto:INFO@DUBSTUDIO.COM" className="text-white hover:text-zinc-300 transition-colors">
                  INFO@DUBSTUDIO.COM
                </a>
              </p>
            </section>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

export default Terms;
