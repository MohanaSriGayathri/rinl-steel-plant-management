// Supabase Edge Function: chat
// Secure server-side proxy for Groq API to avoid exposing secrets in frontend client builds.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a knowledgeable AI assistant for RINL (Rashtriya Ispat Nigam Limited - Visakhapatnam Steel Plant).
You help plant managers, supervisors, engineers, and vendors with:
- Steel production processes (Blast Furnace, Steel Melt Shop, Wire Rod Mill, Light & Medium Merchant Mill)
- Inventory of raw materials (Iron Ore, Coal, Limestone, Dolomite) and finished products (Coils, Wire Rods, Billets, Rebars)
- Material procurement requests and supply chain tracking
- Shift planning, equipment uptime, efficiency benchmarks, and safety standards
Be professional, accurate, concise, and helpful.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({
          error: "GROQ_API_KEY secret is not set in Supabase Edge Function secrets. Run: supabase secrets set GROQ_API_KEY=your_key"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid request payload. Expected { messages: [] }." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m: { isBot?: boolean; role?: string; text?: string; content?: string }) => ({
        role: m.role || (m.isBot ? "assistant" : "user"),
        content: m.content || m.text || ""
      }))
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      return new Response(
        JSON.stringify({ error: `Groq upstream error (${response.status}): ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No reply generated.";

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Chat edge function exception:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
