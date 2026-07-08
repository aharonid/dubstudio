import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error('Stripe publishable key not found');
      return null;
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

export const CREDIT_PACKAGES = [
  {
    id: 'free',
    name: 'Free Pack',
    price: 0,
    credits: 3,
    pricePerMinute: 0,
    popular: false,
    description: '3 credits free to try',
    features: [
      '3 minutes of dubbing',
      '~1-3 short videos',
      'All languages',
      'Credits never expire'
    ]
  },
  {
    id: 'starter',
    name: 'Starter Pack',
    price: 29,
    credits: 60,
    pricePerMinute: 0.50,
    popular: false,
    description: 'Perfect for testing',
    features: [
      '60 minutes of dubbing',
      '~20-40 short videos',
      'All languages',
      'Credits never expire'
    ]
  },
  {
    id: 'creator',
    name: 'Creator Pack',
    price: 59,
    credits: 120,
    pricePerMinute: 0.50,
    popular: true,
    description: 'Best for creators',
    features: [
      '120 minutes of dubbing',
      '~40-80 short videos',
      'All languages',
      'Credits never expire',
      'Priority processing'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    price: 109,
    credits: 240,
    pricePerMinute: 0.50,
    popular: false,
    description: 'For serious creators',
    features: [
      '240 minutes of dubbing',
      '~80-160 short videos',
      'All languages',
      'Credits never expire',
      'Priority processing',
      'Dedicated support'
    ]
  },
  {
    id: 'business',
    name: 'Business Pack',
    price: 199,
    credits: 480,
    pricePerMinute: 0.50,
    popular: false,
    description: 'Maximum value',
    features: [
      '480 minutes of dubbing',
      '~160-320 short videos',
      'All languages',
      'Credits never expire',
      'Priority processing',
      'Dedicated support'
    ]
  }
];
