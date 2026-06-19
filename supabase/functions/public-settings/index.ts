import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const publicSettingKeys = [
  "hero_headline",
  "hero_subheadline",
  "cta_text",
  "popup_enabled",
  "popup_delay_seconds",
  "popup_title",
  "popup_description",
  "success_message",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Public settings are not configured." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.from("site_settings").select("key,value").in("key", publicSettingKeys);

  if (error) {
    return jsonResponse({ error: "Could not load public settings." }, 500);
  }

  const settings = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
  return jsonResponse({ settings });
});
