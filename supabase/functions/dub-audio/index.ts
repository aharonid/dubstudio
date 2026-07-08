import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

interface ValidationError {
  field: string;
  message: string;
}

function validateUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function validateLanguageCode(code: string): boolean {
  const validLanguages = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'tr', 'ru', 'nl', 'cs', 'ar',
    'zh', 'ja', 'ko', 'hi', 'id', 'ms', 'tl', 'vi', 'th', 'uk', 'el', 'bg',
    'ro', 'hr', 'da', 'fi', 'no', 'sk', 'sv', 'ta', 'auto'
  ];
  return validLanguages.includes(code.toLowerCase());
}

function validateFileSize(size: number, maxSizeMB: number = 500): boolean {
  return size > 0 && size <= maxSizeMB * 1024 * 1024;
}

function validateFileType(type: string): boolean {
  const validTypes = [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/aac'
  ];
  return validTypes.includes(type.toLowerCase());
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  console.log("[START] Request received at:", new Date().toISOString());
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (pathname.includes("/webhook")) {
    return handleWebhook(req, supabase);
  }

  if (pathname.includes("/status/")) {
    const jobId = pathname.split("/status/")[1];
    return handleStatusCheck(jobId, supabase);
  }

  if (pathname.includes("/download/")) {
    const jobId = pathname.split("/download/")[1];
    const audioOnly = url.searchParams.get("audio_only") === "true";
    return handleDownload(jobId, supabase, audioOnly);
  }

  try {
    console.log("[STEP 1] Parsing form data...");
    const formData = await req.formData();
    const mediaFile = formData.get("file") as File | null;
    const videoUrl = formData.get("videoUrl") as string | null;
    const targetLanguage = formData.get("targetLanguage") as string || "es";
    const userId = formData.get("userId") as string | null;
    const sessionId = formData.get("sessionId") as string | null;
    const durationMinutes = formData.get("durationMinutes") as string | null;

    // Get client IP for logging
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] ||
                     req.headers.get("x-real-ip") ||
                     "unknown";

    const validationErrors: ValidationError[] = [];

    if (!mediaFile && !videoUrl) {
      validationErrors.push({ field: 'file', message: 'Either media file or video URL is required' });
    }

    let finalMediaFile: File;
    let fileSize = 0;
    let fileType = 'unknown';
    let sourceFilename = 'unnamed';

    if (videoUrl) {
      console.log("[STEP 1.1] Downloading video from URL:", videoUrl);
      try {
        const ytDlpCommand = new Deno.Command("yt-dlp", {
          args: [
            "--no-playlist",
            "--format", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format", "mp4",
            "--output", "/tmp/%(title)s.%(ext)s",
            "--max-filesize", "500M",
            "--print", "after_move:filepath",
            videoUrl,
          ],
          stdout: "piped",
          stderr: "piped",
        });

        const process = ytDlpCommand.spawn();
        const { code, stdout, stderr } = await process.output();

        if (code !== 0) {
          const errorText = new TextDecoder().decode(stderr);
          console.error("[ERROR] yt-dlp failed:", errorText);
          throw new Error(`Failed to download video: ${errorText.substring(0, 200)}`);
        }

        const outputPath = new TextDecoder().decode(stdout).trim();
        console.log("[STEP 1.2] Downloaded to:", outputPath);

        const fileData = await Deno.readFile(outputPath);
        fileSize = fileData.length;
        fileType = "video/mp4";
        sourceFilename = outputPath.split("/").pop() || "video.mp4";

        finalMediaFile = new File([fileData], sourceFilename, { type: fileType });

        await Deno.remove(outputPath).catch(() => {});
      } catch (error) {
        console.error("[ERROR] Video download failed:", error);
        validationErrors.push({ field: 'videoUrl', message: `Failed to download video: ${error.message}` });
      }
    } else {
      finalMediaFile = mediaFile!;
      fileSize = mediaFile?.size || 0;
      fileType = mediaFile?.type || 'unknown';
      sourceFilename = mediaFile?.name || 'unnamed';
    }

    if (!validateFileSize(fileSize, 500)) {
      validationErrors.push({ field: 'file', message: 'File size must be between 0 and 500MB' });
    }

    if (!validateFileType(fileType)) {
      validationErrors.push({ field: 'file', message: 'Invalid file type. Must be video or audio file' });
    }

    if (!validateLanguageCode(targetLanguage)) {
      validationErrors.push({ field: 'targetLanguage', message: 'Invalid target language code' });
    }

    if (userId && !validateUUID(userId)) {
      validationErrors.push({ field: 'userId', message: 'Invalid user ID format' });
    }

    if (sessionId && sessionId.length > 100) {
      validationErrors.push({ field: 'sessionId', message: 'Session ID too long' });
    }

    if (validationErrors.length > 0) {
      console.error("[VALIDATION ERROR]", validationErrors);
      return new Response(
        JSON.stringify({ error: "Validation failed", details: validationErrors }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[STEP 2] Validation passed. File: ${sourceFilename}, size: ${fileSize} bytes, type: ${fileType}, target: ${targetLanguage}`);

    if (!durationMinutes || isNaN(parseInt(durationMinutes))) {
      return new Response(
        JSON.stringify({ error: "Video duration is required. Please refresh and try again." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const estimatedMinutes = parseInt(durationMinutes);
    console.log(`[STEP 2.5] Video duration: ${estimatedMinutes} minutes`);

    if (userId) {
      console.log(`[STEP 2.6] Checking credits for user ${userId}...`);
      const { data: userCredits, error: creditsError } = await supabase
        .from("user_credits")
        .select("credits_minutes, credits_used")
        .eq("user_id", userId)
        .maybeSingle();

      if (creditsError) {
        console.error("[ERROR] Failed to fetch user credits:", creditsError);
        return new Response(
          JSON.stringify({ error: "Failed to check user credits" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!userCredits) {
        console.error("[ERROR] User credits record not found");
        return new Response(
          JSON.stringify({ error: "User credits not found. Please contact support." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const availableCredits = userCredits.credits_minutes - userCredits.credits_used;
      console.log(`[CREDITS] User has ${availableCredits} credits available, needs ${estimatedMinutes}`);

      if (availableCredits < estimatedMinutes) {
        return new Response(
          JSON.stringify({
            error: "Insufficient credits",
            details: `You need ${estimatedMinutes} credits but only have ${availableCredits} available. Please purchase more credits.`,
            required: estimatedMinutes,
            available: availableCredits,
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("[CREDITS] User has sufficient credits, proceeding...");
    }

    const elevenlabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");

    if (!elevenlabsApiKey) {
      console.error("[ERROR] ElevenLabs API key not configured");
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[STEP 3] Submitting dubbing job to ElevenLabs...");
    const submittedAt = new Date();

    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append("file", finalMediaFile);
    elevenLabsFormData.append("target_lang", targetLanguage);
    elevenLabsFormData.append("mode", "automatic");
    elevenLabsFormData.append("source_lang", "auto");
    elevenLabsFormData.append("num_speakers", "1");
    elevenLabsFormData.append("watermark", "false");

    const dubbingResponse = await fetch(
      "https://api.elevenlabs.io/v1/dubbing",
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenlabsApiKey,
        },
        body: elevenLabsFormData,
      }
    );

    console.log(`[STEP 4] ElevenLabs response status: ${dubbingResponse.status}`);

    if (!dubbingResponse.ok) {
      const errorText = await dubbingResponse.text();
      console.error(`[ERROR] ElevenLabs API error (${dubbingResponse.status}):`, errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to submit dubbing job",
          details: errorText,
          statusCode: dubbingResponse.status,
        }),
        {
          status: dubbingResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const dubbingData = await dubbingResponse.json();
    const dubbingId = dubbingData.dubbing_id;
    console.log(`[STEP 5] Dubbing job submitted with ID: ${dubbingId}`);

    const jobData: any = {
      dubbing_id: dubbingId,
      elevenlabs_job_id: dubbingId,
      status: "processing",
      target_language: targetLanguage,
      source_language: "auto",
      source_filename: sourceFilename,
      file_size_bytes: fileSize,
      file_type: fileType,
      submitted_at: submittedAt.toISOString(),
      api_version: "v1",
      duration_minutes: estimatedMinutes,
      request_ip: clientIP,
    };

    if (userId) {
      jobData.user_id = userId;
    } else if (sessionId) {
      jobData.session_id = sessionId;
    }

    const { data: job, error: dbError } = await supabase
      .from("dubbing_jobs")
      .insert(jobData)
      .select()
      .single();

    if (dbError) {
      console.error("[ERROR] Failed to store job in database:", dbError);
      return new Response(
        JSON.stringify({
          error: "Failed to store job",
          details: dbError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[SUCCESS] Job created in database with ID: ${job.id}`);

    return new Response(
      JSON.stringify({
        message: "Dubbing job submitted successfully",
        jobId: job.id,
        dubbingId: dubbingId,
        status: "processing",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[ERROR] Unhandled exception:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleStatusCheck(jobId: string, supabase: any) {
  try {
    if (!validateUUID(jobId)) {
      return new Response(
        JSON.stringify({ error: "Invalid job ID format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: job, error } = await supabase
      .from("dubbing_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (job.status === "processing") {
      const elevenlabsApiKey = Deno.env.get("ELEVENLABS_API_KEY")!;

      const statusResponse = await fetch(
        `https://api.elevenlabs.io/v1/dubbing/${job.dubbing_id}`,
        {
          headers: {
            "xi-api-key": elevenlabsApiKey,
          },
        }
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log(`[STATUS CHECK] ElevenLabs status for ${job.dubbing_id}:`, JSON.stringify(statusData));

        if (statusData.status === "dubbed") {
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

          const durationMinutes = job.duration_minutes || 1;
          console.log(`[CREDITS] Using stored duration: ${durationMinutes} minutes`);

          updateData.credits_used = durationMinutes;

          if (job.user_id) {
            console.log(`[CREDITS] Deducting ${durationMinutes} credits from user ${job.user_id}`);

            const { data: currentCredits, error: fetchError } = await supabase
              .from("user_credits")
              .select("credits_used")
              .eq("user_id", job.user_id)
              .maybeSingle();

            if (fetchError) {
              console.error("[ERROR] Failed to fetch current credits:", fetchError);
            } else if (currentCredits) {
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
            .eq("id", jobId);

          return new Response(
            JSON.stringify({
              ...job,
              status: "completed",
              audio_url: `https://api.elevenlabs.io/v1/dubbing/${job.dubbing_id}/audio/${job.target_language}`,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        } else if (statusData.status === "failed" || statusData.status === "error") {
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
            .eq("id", jobId);

          return new Response(
            JSON.stringify({
              ...job,
              status: "failed",
              error_message: errorMessage,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    return new Response(JSON.stringify(job), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ERROR] Status check failed:", error);
    return new Response(
      JSON.stringify({
        error: "Status check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleDownload(jobId: string, supabase: any, audioOnly: boolean) {
  try {
    console.log(`[DOWNLOAD DEBUG] Starting download for jobId: ${jobId}, audioOnly: ${audioOnly}`);

    if (!validateUUID(jobId)) {
      console.error("[DOWNLOAD DEBUG] Invalid UUID format");
      return new Response(
        JSON.stringify({ error: "Invalid job ID format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[DOWNLOAD DEBUG] Fetching job from database...");
    const { data: job, error } = await supabase
      .from("dubbing_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error || !job) {
      console.error("[DOWNLOAD DEBUG] Job not found:", error);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[DOWNLOAD DEBUG] Job found - status: ${job.status}, has audio_url: ${!!job.audio_url}`);

    if (job.status !== "completed" || !job.audio_url) {
      console.error(`[DOWNLOAD DEBUG] Job not ready - status: ${job.status}, audio_url: ${job.audio_url}`);
      return new Response(
        JSON.stringify({ error: "Job not completed or audio not available" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const elevenlabsApiKey = Deno.env.get("ELEVENLABS_API_KEY")!;
    const audioUrl = job.audio_url;

    console.log(`[DOWNLOAD DEBUG] Fetching from ElevenLabs: ${audioUrl}`);
    const audioResponse = await fetch(audioUrl, {
      headers: {
        "xi-api-key": elevenlabsApiKey,
      },
    });

    console.log(`[DOWNLOAD DEBUG] ElevenLabs response - status: ${audioResponse.status}, ok: ${audioResponse.ok}`);
    console.log(`[DOWNLOAD DEBUG] Content-Type: ${audioResponse.headers.get("content-type")}`);
    console.log(`[DOWNLOAD DEBUG] Content-Length: ${audioResponse.headers.get("content-length")}`);

    if (!audioResponse.ok) {
      const errorText = await audioResponse.text();
      console.error(`[DOWNLOAD DEBUG] ElevenLabs error response: ${errorText}`);
      return new Response(
        JSON.stringify({ error: "Failed to fetch audio from ElevenLabs", details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const audioBlob = await audioResponse.blob();
    console.log(`[DOWNLOAD DEBUG] Blob created - size: ${audioBlob.size}, type: ${audioBlob.type}`);

    const contentType = audioResponse.headers.get("content-type") || "video/mp4";

    console.log("[DOWNLOAD DEBUG] Sending response to client");
    return new Response(audioBlob, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename=\"dubbed_${job.target_language}.mp4\"`,
      },
    });
  } catch (error) {
    console.error("[DOWNLOAD DEBUG] Exception:", error);
    return new Response(
      JSON.stringify({
        error: "Download failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

async function handleWebhook(req: Request, supabase: any) {
  try {
    const payload = await req.json();
    console.log("[WEBHOOK] Received:", JSON.stringify(payload));

    const dubbingId = payload.dubbing_id || payload.id;
    const status = payload.status;

    if (!dubbingId) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const updateData: any = {};

    if (status === "dubbed" || status === "completed") {
      updateData.status = "completed";
      updateData.audio_url = payload.audio_url || `https://api.elevenlabs.io/v1/dubbing/${dubbingId}/audio`;
    } else if (status === "failed") {
      updateData.status = "failed";
      updateData.error_message = JSON.stringify(payload);
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from("dubbing_jobs")
        .update(updateData)
        .eq("dubbing_id", dubbingId);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[ERROR] Webhook processing failed:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
