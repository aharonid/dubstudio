import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Globe, Target, Users, TrendingUp, MapPin, Languages } from 'lucide-react';
import { supabase } from '../lib/auth';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';

interface QuizAnswers {
  contentType: string;
  channelSize: string;
  primaryAudienceLocation: string;
  goals: string;
  contentTopic: string;
  currentLanguage: string;
}

interface LanguageRecommendation {
  language: string;
  code: string;
  reason: string;
  marketSize: string;
}

const QUESTIONS = [
  {
    id: 'contentType',
    question: 'What type of content do you create?',
    icon: Globe,
    options: [
      { value: 'tutorials', label: 'Tutorials & How-To' },
      { value: 'entertainment', label: 'Entertainment & Comedy' },
      { value: 'education', label: 'Educational Content' },
      { value: 'business', label: 'Business & Finance' },
      { value: 'gaming', label: 'Gaming' },
      { value: 'lifestyle', label: 'Lifestyle & Vlogs' },
      { value: 'tech', label: 'Technology & Reviews' },
      { value: 'cooking', label: 'Cooking & Food' },
    ],
  },
  {
    id: 'channelSize',
    question: 'What is your current channel size?',
    icon: Users,
    options: [
      { value: 'starting', label: 'Just Starting (0-1K)' },
      { value: 'small', label: 'Growing (1K-10K)' },
      { value: 'medium', label: 'Established (10K-100K)' },
      { value: 'large', label: 'Large (100K+)' },
    ],
  },
  {
    id: 'primaryAudienceLocation',
    question: 'Where is your primary audience located?',
    icon: MapPin,
    options: [
      { value: 'us', label: 'United States' },
      { value: 'uk', label: 'United Kingdom' },
      { value: 'canada', label: 'Canada' },
      { value: 'australia', label: 'Australia' },
      { value: 'europe', label: 'Europe' },
      { value: 'asia', label: 'Asia' },
      { value: 'latam', label: 'Latin America' },
      { value: 'global', label: 'Global / Mixed' },
    ],
  },
  {
    id: 'goals',
    question: 'What is your primary goal?',
    icon: Target,
    options: [
      { value: 'grow', label: 'Grow my audience' },
      { value: 'monetize', label: 'Increase monetization' },
      { value: 'reach', label: 'Reach specific regions' },
      { value: 'accessibility', label: 'Improve accessibility' },
      { value: 'global', label: 'Build global presence' },
    ],
  },
  {
    id: 'contentTopic',
    question: 'What topic best describes your content?',
    icon: TrendingUp,
    options: [
      { value: 'tech', label: 'Technology & Software' },
      { value: 'finance', label: 'Finance & Investing' },
      { value: 'health', label: 'Health & Fitness' },
      { value: 'creative', label: 'Creative & Arts' },
      { value: 'news', label: 'News & Commentary' },
      { value: 'entertainment', label: 'Entertainment' },
      { value: 'education', label: 'Education & Learning' },
      { value: 'sports', label: 'Sports' },
    ],
  },
  {
    id: 'currentLanguage',
    question: 'What language is your content currently in?',
    icon: Languages,
    options: [
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Spanish' },
      { value: 'fr', label: 'French' },
      { value: 'de', label: 'German' },
      { value: 'pt', label: 'Portuguese' },
      { value: 'it', label: 'Italian' },
      { value: 'ja', label: 'Japanese' },
      { value: 'ko', label: 'Korean' },
      { value: 'zh', label: 'Chinese' },
      { value: 'hi', label: 'Hindi' },
      { value: 'ar', label: 'Arabic' },
    ],
  },
];

function getLanguageRecommendations(answers: QuizAnswers): LanguageRecommendation[] {
  const recommendations: LanguageRecommendation[] = [];

  if (answers.currentLanguage === 'en') {
    if (answers.contentTopic === 'tech' || answers.contentTopic === 'finance') {
      recommendations.push(
        { language: 'Spanish', code: 'es', reason: 'Huge untapped market in Latin America for tech/finance content', marketSize: '500M+ speakers' },
        { language: 'Hindi', code: 'hi', reason: 'Rapidly growing tech-savvy audience in India', marketSize: '600M+ speakers' },
        { language: 'Portuguese', code: 'pt', reason: 'Brazil has massive demand for business content', marketSize: '260M+ speakers' }
      );
    } else if (answers.contentTopic === 'entertainment' || answers.contentTopic === 'creative') {
      recommendations.push(
        { language: 'Spanish', code: 'es', reason: 'Spanish-speaking audiences love entertainment content', marketSize: '500M+ speakers' },
        { language: 'Portuguese', code: 'pt', reason: 'Brazil is a top consumer of entertainment media', marketSize: '260M+ speakers' },
        { language: 'French', code: 'fr', reason: 'Strong creative community in French-speaking regions', marketSize: '280M+ speakers' }
      );
    } else if (answers.contentType === 'gaming') {
      recommendations.push(
        { language: 'Spanish', code: 'es', reason: 'Gaming is exploding in Latin America', marketSize: '500M+ speakers' },
        { language: 'Japanese', code: 'ja', reason: 'Core gaming culture and massive market', marketSize: '125M+ speakers' },
        { language: 'Portuguese', code: 'pt', reason: 'Brazil has one of the largest gaming communities', marketSize: '260M+ speakers' }
      );
    } else if (answers.contentTopic === 'education') {
      recommendations.push(
        { language: 'Spanish', code: 'es', reason: 'High demand for educational content in Spanish', marketSize: '500M+ speakers' },
        { language: 'Hindi', code: 'hi', reason: 'India has massive demand for learning content', marketSize: '600M+ speakers' },
        { language: 'Arabic', code: 'ar', reason: 'Underserved market with growing education focus', marketSize: '420M+ speakers' }
      );
    } else {
      recommendations.push(
        { language: 'Spanish', code: 'es', reason: 'Largest growth market for all content types', marketSize: '500M+ speakers' },
        { language: 'Hindi', code: 'hi', reason: 'Fastest growing internet population', marketSize: '600M+ speakers' },
        { language: 'Portuguese', code: 'pt', reason: 'Brazil is highly engaged with online content', marketSize: '260M+ speakers' }
      );
    }
  } else {
    recommendations.push(
      { language: 'English', code: 'en', reason: 'Largest global audience and monetization potential', marketSize: '1.5B+ speakers' },
      { language: 'Spanish', code: 'es', reason: 'Second most spoken language with high engagement', marketSize: '500M+ speakers' },
      { language: 'Portuguese', code: 'pt', reason: 'Fast-growing market with high content consumption', marketSize: '260M+ speakers' }
    );
  }

  return recommendations.slice(0, 3);
}

export default function Quiz() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [showResults, setShowResults] = useState(false);
  const [recommendations, setRecommendations] = useState<LanguageRecommendation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;
  const CurrentIcon = QUESTIONS[currentQuestion].icon;

  const handleAnswer = (value: string) => {
    const questionId = QUESTIONS[currentQuestion].id as keyof QuizAnswers;
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      submitQuiz(newAnswers as QuizAnswers);
    }
  };

  const submitQuiz = async (finalAnswers: QuizAnswers) => {
    setIsSubmitting(true);
    const recs = getLanguageRecommendations(finalAnswers);
    setRecommendations(recs);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('quiz_responses').insert({
          user_id: user.id,
          content_type: finalAnswers.contentType,
          channel_size: finalAnswers.channelSize,
          primary_audience_location: finalAnswers.primaryAudienceLocation,
          goals: finalAnswers.goals,
          content_topic: finalAnswers.contentTopic,
          current_language: finalAnswers.currentLanguage,
          recommended_languages: recs,
        });
      }
    } catch (error) {
      console.error('Error saving quiz response:', error);
    }

    setIsSubmitting(false);
    setShowResults(true);
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setRecommendations([]);
  };

  if (showResults) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80"></div>

        <div className="relative">
          <NavBar />

          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h1 className="text-4xl font-bold mb-4">Your Language Recommendations</h1>
                <p className="text-zinc-400 text-lg">Based on your content and goals, here are the top 3 languages to translate to:</p>
              </div>

              <div className="space-y-6">
                {recommendations.map((rec, index) => (
                  <div
                    key={rec.code}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold">{rec.language}</h3>
                          <span className="px-3 py-1 bg-zinc-800 rounded-full text-sm text-zinc-400">{rec.code}</span>
                        </div>
                        <p className="text-zinc-300 mb-3">{rec.reason}</p>
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                          <Users className="w-4 h-4" />
                          <span>{rec.marketSize}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 flex gap-4 justify-center">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-8 py-3 bg-white text-black rounded-xl font-medium hover:bg-zinc-200 transition-colors"
                >
                  Start Dubbing
                </button>
                <button
                  onClick={handleRestart}
                  className="px-8 py-3 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors"
                >
                  Retake Quiz
                </button>
              </div>
            </div>
          </div>

          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-80"></div>

      <div className="relative">
        <NavBar />

        <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Find Your Audience</h1>
            <span className="text-sm text-zinc-400">
              Question {currentQuestion + 1} of {QUESTIONS.length}
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center">
              <CurrentIcon className="w-6 h-6 text-zinc-400" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">{QUESTIONS[currentQuestion].question}</h2>
          </div>

          <div className="grid gap-3">
            {QUESTIONS[currentQuestion].options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(option.value)}
                disabled={isSubmitting}
                className="w-full text-left px-6 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-lg">{option.label}</span>
              </button>
            ))}
          </div>

          {currentQuestion > 0 && (
            <button
              onClick={handleBack}
              className="mt-6 px-6 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
          )}
        </div>
      </div>

      <Footer />
        </div>
      </div>
    </div>
  );
}
