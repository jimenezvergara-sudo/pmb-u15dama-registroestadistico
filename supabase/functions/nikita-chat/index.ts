// Nikita — Asistente táctico conversacional de BASQUEST+.
// Recibe el historial de mensajes + (opcional) statsPayload + rama del equipo
// y responde adaptando el género según la rama (femenino/masculino/mixto).
//
// Endpoint: POST /nikita-chat
// Body: {
//   messages: [{ role: 'user' | 'assistant', content: string }],
//   statsPayload?: string,           // contexto estadístico opcional
//   rama?: 'femenino' | 'masculino' | 'mixto',
//   teamName?: string,
//   category?: string,
// }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Rama = "femenino" | "masculino" | "mixto";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const ramaInstruction = (rama: Rama): string => {
  switch (rama) {
    case "masculino":
      return 'IMPORTANTE: El equipo es MASCULINO. Refiérete siempre como "jugador/jugadores", masculino genérico. Nunca uses "jugadora" ni femenino.';
    case "mixto":
      return 'IMPORTANTE: El equipo es MIXTO. Usa lenguaje neutral: "deportistas", "el equipo", "integrantes". Evita marcar género específico.';
    case "femenino":
    default:
      return 'IMPORTANTE: El equipo es FEMENINO. Refiérete siempre como "jugadora/jugadoras", femenino genérico. Nunca uses "jugador" ni masculino.';
  }
};

const buildSystemPrompt = (
  rama: Rama,
  teamName?: string,
  category?: string,
  statsPayload?: string,
): string => {
  const teamLine = teamName ? `Equipo: ${teamName}${category ? ` (${category})` : ""}.` : "";
  const statsBlock = statsPayload
    ? `\n\nContexto estadístico actual del equipo:\n${statsPayload}\n\nUsa estos datos cuando sean relevantes a la pregunta.`
    : "";

  return `Eres **Nikita**, la asistente táctica de baloncesto de BASQUEST+. Acompañás a entrenadores y staff de categorías formativas.

${ramaInstruction(rama)}

${teamLine}

Tu estilo:
- Cercana, directa, profesional. Hablás en español rioplatense neutro (vos / tu indistinto, sin modismos exagerados).
- Respuestas BREVES por defecto (3-6 oraciones). Solo te extiendes si te lo piden.
- Cuando hay datos, los citás concretamente ("anotaste 38% de TC en el 2C…"). No inventes números.
- Si te preguntan algo fuera de baloncesto/coaching/estadística, redirigís amablemente.
- Usás emojis con moderación: 🏀 📊 🎯 💪 ⚠️.
- No usás markdown pesado: como mucho **negrita** para 1-2 ideas clave.

Terminología obligatoria de BASQUEST+:
- "Triples" (no "tres puntos"), "Dobles" (no "dos puntos"), "Tiros Libres" (no "tiros de a uno").
- Tiros de Cancha (TC) = 2pt + 3pt (NO incluye tiros libres).
- eFG% = (FGM + 0.5 × 3PM) / FGA. TS% = PTS / (2 × (FGA + 0.44 × FTA)).${statsBlock}`;
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

    const body = await req.json().catch(() => ({}));
    const messages = body?.messages as ChatMessage[] | undefined;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate roles + content shape, cap last 20 messages.
    const safeMessages: ChatMessage[] = messages
      .filter((m) =>
        m && typeof m.content === "string" &&
        (m.role === "user" || m.role === "assistant")
      )
      .slice(-20);

    if (safeMessages.length === 0) {
      return new Response(JSON.stringify({ error: "no valid messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ramaInput = (body?.rama as string | undefined)?.toLowerCase();
    const rama: Rama =
      ramaInput === "masculino" || ramaInput === "mixto" ? (ramaInput as Rama) : "femenino";

    const teamName = typeof body?.teamName === "string" ? body.teamName : undefined;
    const category = typeof body?.category === "string" ? body.category : undefined;
    const statsPayload =
      typeof body?.statsPayload === "string" && body.statsPayload.length < 8000
        ? body.statsPayload
        : undefined;

    const systemPrompt = buildSystemPrompt(rama, teamName, category, statsPayload);

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
          ...safeMessages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas consultas, esperá unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA agotados. Contactá al administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const text = await response.text();
      console.error("Nikita gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply: string = data?.choices?.[0]?.message?.content ?? "Hmm, no pude responder eso. Probá de nuevo.";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nikita-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
