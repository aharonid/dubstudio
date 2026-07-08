import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("[JOB MONITOR] Starting job status check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const elevenlabsApiKey = Deno.env.get("ELEVENLABS_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all processing jobs older than 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: processingJobs, error: fetchError } = await supabase
      .from("dubbing_jobs")
      .select("*")
      .eq("status", "processing")
      .lt("submitted_at", twoMinutesAgo);

    if (fetchError) {
      console.error("[ERROR] Failed to fetch processing jobs:", fetchError);
      throw fetchError;
    }

    if (!processingJobs || processingJobs.length === 0) {
      console.log("[JOB MONITOR] No processing jobs found");
      return new Response(
        JSON.stringify({ message: "No jobs to process", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[JOB MONITOR] Found ${processingJobs.length} processing jobs`);

    let completedCount = 0;
    let failedCount = 0;
    let timeoutCount = 0;
    let stillProcessingCount = 0;

    for (const job of processingJobs) {
      try {
        console.log(`[JOB MONITOR] Checking job ${job.id} (dubbing_id: ${job.dubbing_id})`);

        // Check if job is too old (15+ minutes) - mark as timeout
        if (job.submitted_at && new Date(job.submitted_at) < new Date(fifteenMinutesAgo)) {
          console.log(`[JOB MONITOR] Job ${job.id} timed out (older than 15 minutes)`);

          const processingTime = (Date.now() - new Date(job.submitted_at).getTime()) / 1000;

          await supabase
            .from("dubbing_jobs")
            .update({
              status: "failed",
              error_message: "Job timeout - processing took longer than 15 minutes",
              processing_time_seconds: processingTime,
            })
            .eq("id", job.id);

          timeoutCount++;
          continue;
        }

        // Check status with ElevenLabs
        const statusResponse = await fetch(
          `https://api.elevenlabs.io/v1/dubbing/${job.dubbing_id}`,
          {
            headers: {
              "xi-api-key": elevenlabsApiKey,
            },
          }
        );

        if (!statusResponse.ok) {
          console.error(`[ERROR] ElevenLabs API error for job ${job.id}: ${statusResponse.status}`);
          continue;
        }

        const statusData = await statusResponse.json();
        console.log(`[JOB MONITOR] ElevenLabs status for ${job.dubbing_id}:`, statusData.status);

        if (statusData.status === "dubbed" || statusData.status === "completed") {
          // Job completed
          const completedAt = new Date();
          const processingTime = job.submitted_at
            ? (completedAt.getTime() - new Date(job.submitted_at).getTime()) / 1000
            : null;

          const updateData: any = {
            status: "completed",
            audio_url: `https://api.elevenlabs.io/v1/dubbing/${job.dubbing_id}/audio/${job.target_language}`,
            processing_time_seconds: processingTime,
          };

          if (statusData.duration_seconds) {
            updateData.duration_seconds = statusData.duration_seconds;
          }
          if (statusData.num_speakers) {
            updateData.num_speakers = statusData.num_speakers;
          }
          if (statusData.source_language) {
            updateData.source_language = statusData.source_language;
          }

          // Calculate and deduct credits
          const durationMinutes = job.duration_minutes || 1;
          console.log(`[CREDITS] Using stored duration: ${durationMinutes} minutes for job ${job.id}`);

          updateData.credits_used = durationMinutes;

          if (job.user_id) {
            console.log(`[CREDITS] Deducting ${durationMinutes} credits from user ${job.user_id}`);

            const { data: currentCredits, error: fetchError } = await supabase
              .from("user_credits")
              .select("credits_used")
              .eq("user_id", job.user_id)
              .maybeSingle();

            if (!fetchError && currentCredits) {
              const newCreditsUsed = (currentCredits.credits_used || 0) + durationMinutes;

              const { error: creditError } = await supabase
                .from("user_credits")
                .update({
                  credits_used: newCreditsUsed
                })
                .eq("user_id", job.user_id);

              if (creditError) {
                console.error("[ERROR] Failed to deduct credits:", creditError);
              } else {
                console.log(`[CREDITS] Successfully deducted ${durationMinutes} credits. New total: ${newCreditsUsed}`);
              }
            }
          }

          await supabase
            .from("dubbing_jobs")
            .update(updateData)
            .eq("id", job.id);

          console.log(`[JOB MONITOR] Job ${job.id} marked as completed`);
          completedCount++;

        } else if (statusData.status === "failed" || statusData.status === "error") {
          // Job failed
          const errorMessage = statusData.error || statusData.message || "Dubbing job failed";
          const completedAt = new Date();
          const processingTime = job.submitted_at
            ? (completedAt.getTime() - new Date(job.submitted_at).getTime()) / 1000
            : null;

          await supabase
            .from("dubbing_jobs")
            .update({
              status: "failed",
              error_message: errorMessage,
              error_details: statusData,
              processing_time_seconds: processingTime,
            })
            .eq("id", job.id);

          console.log(`[JOB MONITOR] Job ${job.id} marked as failed: ${errorMessage}`);
          failedCount++;

        } else {
          // Still processing
          console.log(`[JOB MONITOR] Job ${job.id} still processing (${statusData.status})`);
          stillProcessingCount++;
        }

      } catch (error) {
        console.error(`[ERROR] Failed to check job ${job.id}:`, error);
      }
    }

    const summary = {
      message: "Job monitor completed",
      total_checked: processingJobs.length,
      completed: completedCount,
      failed: failedCount,
      timeout: timeoutCount,
      still_processing: stillProcessingCount,
    };

    console.log("[JOB MONITOR] Summary:", summary);

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("[ERROR] Job monitor failed:", error);
    return new Response(
      JSON.stringify({
        error: "Job monitor failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
