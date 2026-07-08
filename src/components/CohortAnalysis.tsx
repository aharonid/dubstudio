import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface CohortRow {
  cohort: string;
  size: number;
  week0: number;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
}

export default function CohortAnalysis() {
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCohortData();
  }, []);

  const loadCohortData = async () => {
    try {
      const [usersRes, jobsRes] = await Promise.all([
        supabase.from('user_profiles').select('id, created_at'),
        supabase.from('dubbing_jobs').select('user_id, created_at, status')
      ]);

      if (usersRes.error) throw usersRes.error;
      if (jobsRes.error) throw jobsRes.error;

      const users = usersRes.data || [];
      const jobs = (jobsRes.data || []).filter(j => j.status === 'completed');

      const cohortMap = new Map<string, CohortRow>();

      users.forEach(user => {
        const signupDate = new Date(user.created_at);
        const cohortWeek = getWeekKey(signupDate);

        if (!cohortMap.has(cohortWeek)) {
          cohortMap.set(cohortWeek, {
            cohort: cohortWeek,
            size: 0,
            week0: 0,
            week1: 0,
            week2: 0,
            week3: 0,
            week4: 0
          });
        }

        const cohort = cohortMap.get(cohortWeek)!;
        cohort.size++;

        const userJobs = jobs.filter(j => j.user_id === user.id);

        userJobs.forEach(job => {
          const jobDate = new Date(job.created_at);
          const weekDiff = getWeekDifference(signupDate, jobDate);

          if (weekDiff === 0) cohort.week0++;
          else if (weekDiff === 1) cohort.week1++;
          else if (weekDiff === 2) cohort.week2++;
          else if (weekDiff === 3) cohort.week3++;
          else if (weekDiff >= 4) cohort.week4++;
        });
      });

      const cohortArray = Array.from(cohortMap.values())
        .sort((a, b) => b.cohort.localeCompare(a.cohort))
        .slice(0, 8);

      setCohorts(cohortArray);
    } catch (err) {
      console.error('Error loading cohort data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getWeekKey = (date: Date): string => {
    const year = date.getFullYear();
    const weekNum = getWeekNumber(date);
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
  };

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const getWeekDifference = (start: Date, end: Date): number => {
    const diff = end.getTime() - start.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return Math.floor(days / 7);
  };

  const getRetentionPercent = (active: number, size: number): number => {
    return size > 0 ? (active / size) * 100 : 0;
  };

  const getColorClass = (percent: number): string => {
    if (percent >= 50) return 'bg-green-900/50 text-green-300';
    if (percent >= 25) return 'bg-yellow-900/50 text-yellow-300';
    if (percent >= 10) return 'bg-orange-900/50 text-orange-300';
    return 'bg-red-900/50 text-red-300';
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-zinc-400">Loading cohort data...</p>
      </div>
    );
  }

  if (cohorts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">No cohort data available</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Cohort Analysis</h2>
      <p className="text-zinc-400 mb-8">User retention by signup week (shows users who created completed jobs)</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left p-3 text-sm font-medium text-zinc-400">Cohort</th>
              <th className="text-right p-3 text-sm font-medium text-zinc-400">Size</th>
              <th className="text-right p-3 text-sm font-medium text-zinc-400">Week 0</th>
              <th className="text-right p-3 text-sm font-medium text-zinc-400">Week 1</th>
              <th className="text-right p-3 text-sm font-medium text-zinc-400">Week 2</th>
              <th className="text-right p-3 text-sm font-medium text-zinc-400">Week 3</th>
              <th className="text-right p-3 text-sm font-medium text-zinc-400">Week 4+</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((cohort) => (
              <tr key={cohort.cohort} className="border-b border-zinc-800 hover:bg-zinc-900/30">
                <td className="p-3 text-sm font-medium">{cohort.cohort}</td>
                <td className="p-3 text-right text-sm font-bold">{cohort.size}</td>
                <td className="p-3 text-right">
                  <div className={`inline-block px-3 py-1 rounded text-sm font-medium ${getColorClass(getRetentionPercent(cohort.week0, cohort.size))}`}>
                    {getRetentionPercent(cohort.week0, cohort.size).toFixed(0)}%
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className={`inline-block px-3 py-1 rounded text-sm font-medium ${getColorClass(getRetentionPercent(cohort.week1, cohort.size))}`}>
                    {getRetentionPercent(cohort.week1, cohort.size).toFixed(0)}%
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className={`inline-block px-3 py-1 rounded text-sm font-medium ${getColorClass(getRetentionPercent(cohort.week2, cohort.size))}`}>
                    {getRetentionPercent(cohort.week2, cohort.size).toFixed(0)}%
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className={`inline-block px-3 py-1 rounded text-sm font-medium ${getColorClass(getRetentionPercent(cohort.week3, cohort.size))}`}>
                    {getRetentionPercent(cohort.week3, cohort.size).toFixed(0)}%
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className={`inline-block px-3 py-1 rounded text-sm font-medium ${getColorClass(getRetentionPercent(cohort.week4, cohort.size))}`}>
                    {getRetentionPercent(cohort.week4, cohort.size).toFixed(0)}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
        <h3 className="text-sm font-medium mb-2">Understanding Cohort Analysis</h3>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li>• Each row represents users who signed up in the same week</li>
          <li>• Percentages show how many users created completed jobs in each week after signup</li>
          <li>• Green indicates strong retention, yellow moderate, orange low, red very low</li>
          <li>• Week 0 is the signup week, Week 1 is the following week, etc.</li>
        </ul>
      </div>
    </div>
  );
}
