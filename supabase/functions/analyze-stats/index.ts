import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Rama = "femenino" | "masculino" | "mixto";

const ramaInstruction = (rama: Rama): string => {
  switch (rama) {
    case "masculino":
      return 'IMPORTANTE: Este es un equipo MASCULINO. Usa siempre "jugador/jugadores", masculino genérico. Nunca uses "jugadora" ni femenino.';
    case "mixto":
      return 'IMPORTANTE: Este es un equipo MIXTO. Usa lenguaje neutral: "deportistas", "el equipo". Evita marcar género específico.';
    case "femenino":
    default:
      return 'IMPORTANTE: Este es un equipo FEMENINO. Usa siempre "jugadora/jugadoras", femenino genérico. Nunca uses "jugador" ni masculino.';
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json();
    const statsPayload: string | undefined = body?.statsPayload;
    const ramaInput = (body?.rama as string | undefined)?.toLowerCase();
    const rama: Rama =
      ramaInput === "masculino" || ramaInput === "mixto" ? (ramaInput as Rama) : "femenino";

    if (!statsPayload) {
      return new Response(JSON.stringify({ error: "statsPayload is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Eres un analista de baloncesto profesional y asistente táctico para entrenadores de categorías formativas.
Analiza los datos estadísticos proporcionados y genera un informe breve pero accionable para el entrenador.

${ramaInstruction(rama)}

Tu análisis debe incluir:
1. **Resumen general** — Desempeño global del equipo en 2-3 oraciones.
2. **Fortalezas** — Qué está funcionando bien (zonas calientes, eficiencia, integrantes destacadas/destacados según corresponda).
3. **Áreas de mejora** — Debilidades en tiro, patrones preocupantes, desequilibrios.
4. **Recomendaciones tácticas** — 2-3 acciones concretas que el técnico puede implementar en el próximo entrenamiento.
5. **Integrantes destacadas/destacados** — Quién merece atención especial (positiva o por desarrollo).

Usa lenguaje directo y profesional. No seas genérico: basa cada punto en los datos concretos.
Usa emojis con moderación para hacer el informe más visual (🏀 🔥 ⚠️ 📊 💪 🎯).
Responde siempre en español, respetando estrictamente la instrucción de género indicada arriba.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Aquí están las estadísticas del equipo:\n\n${statsPayload}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido, intenta de nuevo en unos minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Contacta al administrador." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "No se pudo generar el análisis.";

    return new Response(JSON.stringify({ analysis: content }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-stats error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
