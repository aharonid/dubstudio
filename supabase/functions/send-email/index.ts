import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  campaignId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { to, subject, html, campaignId }: SendEmailRequest = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          error: "RESEND_API_KEY environment variable not set",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const toArray = Array.isArray(to) ? to : [to];
    const results = [];

    for (const email of toArray) {
      try {
        // Send via Resend
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "DubStudio <noreply@dubstudio.com>",
            to: email,
            subject: subject,
            html: html,
          }),
        });

        const resendResponse = await response.json();

        if (!response.ok) {
          results.push({
            email,
            status: "failed",
            error: resendResponse.message || "Failed to send",
          });

          // Log failed email
          if (campaignId && supabaseUrl && supabaseServiceKey) {
            await fetch(`${supabaseUrl}/rest/v1/email_logs`, {
              method: "POST",
              headers: {
                "apikey": supabaseServiceKey,
                "Authorization": `Bearer ${supabaseServiceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                campaign_id: campaignId,
                recipient_email: email,
                subject: subject,
                status: "failed",
                error_message: resendResponse.message || "Failed to send",
              }),
            });
          }
        } else {
          results.push({
            email,
            status: "sent",
            messageId: resendResponse.id,
          });

          // Log successful email
          if (campaignId && supabaseUrl && supabaseServiceKey) {
            await fetch(`${supabaseUrl}/rest/v1/email_logs`, {
              method: "POST",
              headers: {
                "apikey": supabaseServiceKey,
                "Authorization": `Bearer ${supabaseServiceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                campaign_id: campaignId,
                recipient_email: email,
                subject: subject,
                status: "sent",
                sent_at: new Date().toISOString(),
              }),
            });
          }
        }
      } catch (emailError) {
        results.push({
          email,
          status: "failed",
          error: String(emailError),
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Send email error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
