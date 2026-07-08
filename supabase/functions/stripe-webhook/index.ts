import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          webhookSecret
        );
      } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    console.log("Webhook event:", event.type);

    if (event.type === "checkout.session.completed") {
      // Expand the session to get full discount details
      let session = event.data.object as Stripe.Checkout.Session;

      // If we don't have total_details, fetch the full session
      if (!session.total_details) {
        session = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['total_details.breakdown']
        });
      }
      const userId = session.metadata?.user_id;
      const creditsMinutes = parseInt(session.metadata?.credits_minutes || "0");
      const packageName = session.metadata?.package_name || "unknown";
      const originalAmountUsd = parseFloat(session.metadata?.amount_usd || "0");

      if (!userId || !creditsMinutes) {
        console.error("Missing metadata in session");
        return new Response(
          JSON.stringify({ error: "Missing metadata" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get actual amount paid (after discount) in dollars
      const amountPaid = (session.amount_total || 0) / 100;
      const discountAmount = originalAmountUsd - amountPaid;

      // Extract coupon code if used
      let couponCode = null;
      if (session.total_details?.breakdown?.discounts && session.total_details.breakdown.discounts.length > 0) {
        const discount = session.total_details.breakdown.discounts[0];
        couponCode = discount.discount?.coupon?.id || null;
      }

      const { error: purchaseError } = await supabase
        .from("credit_purchases")
        .insert({
          user_id: userId,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          amount_usd: amountPaid,
          original_amount_usd: originalAmountUsd,
          discount_amount_usd: discountAmount,
          coupon_code: couponCode,
          credits_minutes: creditsMinutes,
          package_name: packageName,
          status: "completed",
        });

      if (purchaseError) {
        console.error("Purchase insert error:", purchaseError);
      }

      const { data: currentCredits } = await supabase
        .from("user_credits")
        .select("credits_minutes")
        .eq("user_id", userId)
        .maybeSingle();

      const newTotal = (currentCredits?.credits_minutes || 0) + creditsMinutes;

      const { error: creditsError } = await supabase
        .from("user_credits")
        .upsert({
          user_id: userId,
          credits_minutes: newTotal,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (creditsError) {
        console.error("Credits update error:", creditsError);
      }

      console.log(`Added ${creditsMinutes} credits to user ${userId}. New total: ${newTotal}`);
    }


    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
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