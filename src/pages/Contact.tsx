import { Code, MessageSquare, Send, AlertCircle, Mail, MapPin, Clock } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: submitError } = await supabase
        .from('contact_submissions')
        .insert([{
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message
        }]);

      if (submitError) throw submitError;

      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });

      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Failed to send message. Please try again or email us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80"></div>

      <div className="relative">
        <NavBar />

        <div className="container mx-auto px-6 py-20 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
              Get in Touch
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Questions about dubbing, pricing, or account support? Send a note and we will get back to you.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Contact & Support Information</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center mb-3">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-lg">Email</h3>
                <a href="mailto:INFO@DUBSTUDIO.COM" className="text-zinc-400 hover:text-white transition-colors block">
                  INFO@DUBSTUDIO.COM
                </a>
              </div>

              <div className="space-y-2">
                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center mb-3">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-lg">Location</h3>
                <div className="text-zinc-400 text-sm leading-relaxed">
                  <div>New York, NY</div>
                  <div>Business contact details available on request.</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-lg">Response Time</h3>
                <p className="text-zinc-400 text-sm">
                  We typically respond within 24 hours during business days.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <div className="mb-8">
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-4">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Custom API Integration</h2>
                <p className="text-zinc-400">
                  Need to integrate dubbing into your application? We offer custom API solutions tailored to your specific needs with enterprise-grade reliability and scalability.
                </p>
              </div>

              <div>
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">General Inquiries</h2>
                <p className="text-zinc-400">
                  For partnerships, press inquiries, or general questions, reach out anytime.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <h2 className="text-2xl font-bold mb-6">Send a Message</h2>

              {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                    <Send className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-lg font-semibold mb-2">Message Sent!</p>
                  <p className="text-zinc-400 text-center">
                    Thank you for reaching out. We'll get back to you soon.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 transition-colors"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 transition-colors"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 transition-colors"
                      placeholder="How can we help?"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-600 transition-colors resize-none"
                      placeholder="Tell us more..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-white text-black font-semibold py-4 px-6 rounded-xl hover:bg-zinc-200 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

export default Contact;
