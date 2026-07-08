import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Users, Activity, DollarSign, TrendingUp, CreditCard } from 'lucide-react';

interface FunnelData {
  totalSignups: number;
  activeUsers: number;
  payingUsers: number;
  totalRevenue: number;
  conversionToActive: number;
  conversionToPaying: number;
  arpu: number;
  arppu: number;
  totalPurchases: number;
  avgPurchaseValue: number;
}

export default function ConversionFunnel() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFunnelData();
  }, []);

  const loadFunnelData = async () => {
    try {
      const [usersRes, jobsRes, purchasesRes] = await Promise.all([
        supabase.from('user_profiles').select('id'),
        supabase.from('dubbing_jobs').select('user_id, status'),
        supabase.from('credit_purchases').select('user_id, amount_usd, discount_amount_usd, status')
      ]);

      if (usersRes.error) throw usersRes.error;
      if (jobsRes.error) throw jobsRes.error;
      if (purchasesRes.error) throw purchasesRes.error;

      const totalSignups = usersRes.data?.length || 0;

      const activeUserIds = new Set(
        jobsRes.data?.filter(j => j.status === 'completed').map(j => j.user_id)
      );
      const activeUsers = activeUserIds.size;

      const completedPurchases = purchasesRes.data?.filter(p => p.status === 'completed') || [];
      const payingUserIds = new Set(completedPurchases.map(p => p.user_id));
      const payingUsers = payingUserIds.size;

      const totalRevenue = completedPurchases.reduce((sum, p) =>
        sum + (Number(p.amount_usd) - Number(p.discount_amount_usd || 0)), 0
      );

      const totalPurchases = completedPurchases.length;
      const avgPurchaseValue = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

      setData({
        totalSignups,
        activeUsers,
        payingUsers,
        totalRevenue,
        conversionToActive: totalSignups > 0 ? (activeUsers / totalSignups) * 100 : 0,
        conversionToPaying: totalSignups > 0 ? (payingUsers / totalSignups) * 100 : 0,
        arpu: totalSignups > 0 ? totalRevenue / totalSignups : 0,
        arppu: payingUsers > 0 ? totalRevenue / payingUsers : 0,
        totalPurchases,
        avgPurchaseValue
      });
    } catch (err) {
      console.error('Error loading funnel data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-zinc-400">Loading funnel data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">No data available</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Conversion Funnel</h2>
      <p className="text-zinc-400 mb-8">Track user journey from signup to conversion</p>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-black border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-medium text-zinc-400">Total Signups</h3>
            </div>
            <p className="text-4xl font-bold">{data.totalSignups}</p>
            <p className="text-sm text-zinc-500 mt-1">All registered users</p>
          </div>

          <div className="bg-black border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-green-400" />
              <h3 className="text-sm font-medium text-zinc-400">Active Users</h3>
            </div>
            <p className="text-4xl font-bold">{data.activeUsers}</p>
            <p className="text-sm text-green-400 mt-1">{data.conversionToActive.toFixed(1)}% conversion</p>
          </div>

          <div className="bg-black border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-yellow-400" />
              <h3 className="text-sm font-medium text-zinc-400">Paying Users</h3>
            </div>
            <p className="text-4xl font-bold">{data.payingUsers}</p>
            <p className="text-sm text-yellow-400 mt-1">{data.conversionToPaying.toFixed(1)}% conversion</p>
          </div>

          <div className="bg-black border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-medium text-zinc-400">Total Revenue</h3>
            </div>
            <p className="text-4xl font-bold">${data.totalRevenue.toFixed(2)}</p>
            <p className="text-sm text-zinc-500 mt-1">All-time earnings</p>
          </div>
        </div>

        <div className="bg-black border border-zinc-800 rounded-xl p-8">
          <h3 className="text-xl font-bold mb-6">Funnel Visualization</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-32 text-sm text-zinc-400">Signups</div>
              <div className="flex-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-8 flex items-center justify-end pr-4 text-sm font-bold"
                  style={{ width: '100%' }}
                >
                  {data.totalSignups}
                </div>
              </div>
              <div className="w-20 text-sm text-zinc-500 text-right">100%</div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-32 text-sm text-zinc-400">Active</div>
              <div className="flex-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="bg-green-500 h-8 flex items-center justify-end pr-4 text-sm font-bold"
                  style={{ width: `${data.conversionToActive}%` }}
                >
                  {data.activeUsers}
                </div>
              </div>
              <div className="w-20 text-sm text-green-400 text-right">{data.conversionToActive.toFixed(1)}%</div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-32 text-sm text-zinc-400">Paying</div>
              <div className="flex-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="bg-yellow-500 h-8 flex items-center justify-end pr-4 text-sm font-bold"
                  style={{ width: `${data.conversionToPaying}%` }}
                >
                  {data.payingUsers}
                </div>
              </div>
              <div className="w-20 text-sm text-yellow-400 text-right">{data.conversionToPaying.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        <div className="bg-black border border-zinc-800 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4">Monetization Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <p className="text-sm text-zinc-400">ARPU</p>
              </div>
              <p className="text-2xl font-bold text-blue-400">${data.arpu.toFixed(2)}</p>
              <p className="text-xs text-zinc-500 mt-1">Avg Revenue Per User</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <p className="text-sm text-zinc-400">ARPPU</p>
              </div>
              <p className="text-2xl font-bold text-green-400">${data.arppu.toFixed(2)}</p>
              <p className="text-xs text-zinc-500 mt-1">Avg Revenue Per Paying User</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-yellow-400" />
                <p className="text-sm text-zinc-400">Total Purchases</p>
              </div>
              <p className="text-2xl font-bold text-yellow-400">{data.totalPurchases}</p>
              <p className="text-xs text-zinc-500 mt-1">Completed transactions</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-cyan-400" />
                <p className="text-sm text-zinc-400">Avg Purchase</p>
              </div>
              <p className="text-2xl font-bold text-cyan-400">${data.avgPurchaseValue.toFixed(2)}</p>
              <p className="text-xs text-zinc-500 mt-1">Per transaction</p>
            </div>
          </div>
        </div>

        <div className="bg-black border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Key Insights for Monetization</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
              <div>
                <p className="text-white font-medium">Conversion Rate to Active: {data.conversionToActive.toFixed(1)}%</p>
                <p className="text-zinc-400">Focus on onboarding if this is below 30%</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5"></div>
              <div>
                <p className="text-white font-medium">Conversion Rate to Paying: {data.conversionToPaying.toFixed(1)}%</p>
                <p className="text-zinc-400">Typical SaaS conversion is 2-5%. Consider pricing, value proposition, or free tier limits</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
              <div>
                <p className="text-white font-medium">ARPPU: ${data.arppu.toFixed(2)}</p>
                <p className="text-zinc-400">Increase this by upselling, cross-selling, or introducing premium tiers</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-cyan-500 rounded-full mt-1.5"></div>
              <div>
                <p className="text-white font-medium">Repeat Purchase Rate: {data.payingUsers > 0 ? (data.totalPurchases / data.payingUsers).toFixed(2) : '0'}x</p>
                <p className="text-zinc-400">Average purchases per paying user. Higher is better for retention</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
