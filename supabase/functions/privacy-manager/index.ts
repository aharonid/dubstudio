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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    switch (action) {
      case "export": {
        const { data, error } = await supabase.rpc("export_user_data", {
          target_user_id: user.id,
        });

        if (error) throw error;

        await supabase.from("security_audit_logs").insert({
          user_id: user.id,
          event_type: "data_export",
          ip_address: clientIp,
          user_agent: userAgent,
          metadata: { timestamp: new Date().toISOString() },
        });

        return new Response(
          JSON.stringify({
            success: true,
            data: data,
            exported_at: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Content-Disposition": `attachment; filename="dubstudio-data-export-${user.id}.json"`,
            },
          }
        );
      }

      case "request-deletion": {
        const { data, error } = await supabase.rpc("request_account_deletion");

        if (error) throw error;

        await supabase.from("security_audit_logs").insert({
          user_id: user.id,
          event_type: "deletion_requested",
          ip_address: clientIp,
          user_agent: userAgent,
          metadata: { scheduled_deletion: data.scheduled_deletion_at },
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Account deletion scheduled",
            scheduled_deletion_at: data.scheduled_deletion_at,
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      case "cancel-deletion": {
        const { error } = await supabase.rpc("cancel_account_deletion");

        if (error) throw error;

        await supabase.from("security_audit_logs").insert({
          user_id: user.id,
          event_type: "deletion_cancelled",
          ip_address: clientIp,
          user_agent: userAgent,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Account deletion cancelled",
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      case "check-deletion-status": {
        const { data, error } = await supabase
          .from("data_deletion_requests")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            deletion_request: data,
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      default:
        throw new Error("Invalid action");
    }
  } catch (error) {
    console.error("Privacy manager error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
