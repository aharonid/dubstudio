import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ClaimRequest {
  type: 'achievement' | 'language_milestone';
  achievementId?: string;
  languageCode?: string;
  milestoneType?: 'first_dub' | 'thousandth_dub';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ClaimRequest = await req.json();

    if (body.type === 'achievement') {
      return await claimAchievement(supabase, user.id, body.achievementId!);
    } else if (body.type === 'language_milestone') {
      return await claimLanguageMilestone(supabase, user.id, body.languageCode!, body.milestoneType!);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid claim type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Claim error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function claimAchievement(supabase: any, userId: string, achievementId: string) {
  const { data: achievement, error: achError } = await supabase
    .from('achievements')
    .select('milestone_count, reward_credits, name')
    .eq('id', achievementId)
    .maybeSingle();

  if (achError || !achievement) {
    return new Response(
      JSON.stringify({ error: 'Achievement not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if this is a language diversity achievement (negative milestone_count)
  if (achievement.milestone_count < 0) {
    const requiredLanguages = Math.abs(achievement.milestone_count);

    const { data: jobData, error: jobError } = await supabase
      .from('dubbing_jobs')
      .select('target_language')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (jobError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch jobs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uniqueLanguages = new Set(jobData?.map((j: any) => j.target_language) || []);
    const languageCount = uniqueLanguages.size;

    if (languageCount < requiredLanguages) {
      return new Response(
        JSON.stringify({ error: 'Not enough unique languages', required: requiredLanguages, current: languageCount }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } else {
    // Regular video count achievement
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('completed_jobs_count')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.completed_jobs_count < achievement.milestone_count) {
      return new Response(
        JSON.stringify({ error: 'Not enough completed jobs', required: achievement.milestone_count, current: profile.completed_jobs_count }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .maybeSingle();

  if (existing) {
    return new Response(
      JSON.stringify({ error: 'Already claimed' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { error: insertError } = await supabase
    .from('user_achievements')
    .insert({
      user_id: userId,
      achievement_id: achievementId,
      credits_awarded: achievement.reward_credits
    });

  if (insertError) {
    return new Response(
      JSON.stringify({ error: 'Failed to claim achievement' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: currentCredits } = await supabase
    .from('user_credits')
    .select('credits_minutes')
    .eq('user_id', userId)
    .maybeSingle();

  const { error: updateError } = await supabase
    .from('user_credits')
    .update({
      credits_minutes: (currentCredits?.credits_minutes || 0) + achievement.reward_credits,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (updateError) {
    return new Response(
      JSON.stringify({ error: 'Failed to update credits' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      credits_awarded: achievement.reward_credits,
      achievement_name: achievement.name
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function claimLanguageMilestone(supabase: any, userId: string, languageCode: string, milestoneType: string) {
  const { data: jobs, error: jobsError } = await supabase
    .from('dubbing_jobs')
    .select('id')
    .eq('user_id', userId)
    .eq('target_language', languageCode)
    .eq('status', 'completed');

  if (jobsError) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch jobs' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const jobCount = jobs?.length || 0;
  const requiredCount = milestoneType === 'first_dub' ? 1 : 1000;
  const creditsToAward = milestoneType === 'first_dub' ? 1 : 50;

  if (jobCount < requiredCount) {
    return new Response(
      JSON.stringify({ error: 'Not enough completed jobs', required: requiredCount, current: jobCount }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from('language_milestones')
    .select('id')
    .eq('user_id', userId)
    .eq('language_code', languageCode)
    .eq('milestone_type', milestoneType)
    .maybeSingle();

  if (existing) {
    return new Response(
      JSON.stringify({ error: 'Already claimed' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { error: insertError } = await supabase
    .from('language_milestones')
    .insert({
      user_id: userId,
      language_code: languageCode,
      milestone_type: milestoneType,
      credits_awarded: creditsToAward
    });

  if (insertError) {
    return new Response(
      JSON.stringify({ error: 'Failed to claim milestone' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: currentCredits } = await supabase
    .from('user_credits')
    .select('credits_minutes')
    .eq('user_id', userId)
    .maybeSingle();

  const { error: updateError } = await supabase
    .from('user_credits')
    .update({
      credits_minutes: (currentCredits?.credits_minutes || 0) + creditsToAward,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (updateError) {
    return new Response(
      JSON.stringify({ error: 'Failed to update credits' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      credits_awarded: creditsToAward,
      language: languageCode,
      milestone: milestoneType
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}