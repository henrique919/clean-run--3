import { createServerFn } from "@tanstack/react-start";

interface VoiceInput {
  audioBase64: string;
  mimeType: string;
  projects: string[];
  trades: string[];
  subcontractors: string[];
}

interface ExtractedFields {
  building?: string;
  level?: string;
  unit?: string;
  room?: string;
  trade?: string;
  subcontractor?: string;
  priority?: "high" | "urgent";
  description?: string;
  project?: string;
}

interface VoiceResult {
  transcript: string;
  fields: ExtractedFields;
}

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function extFromMime(mime: string): string {
  const base = mime.split(";")[0].trim().toLowerCase();
  return (
    {
      "audio/webm": "webm",
      "audio/mp4": "mp4",
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
      "audio/wav": "wav",
      "audio/wave": "wav",
      "audio/ogg": "ogg",
      "audio/m4a": "m4a",
      "audio/aac": "aac",
      "audio/flac": "flac",
    }[base] ?? "webm"
  );
}

export const transcribeAndExtract = createServerFn({ method: "POST" })
  .inputValidator((data: VoiceInput) => {
    if (!data || typeof data.audioBase64 !== "string" || !data.audioBase64) {
      throw new Error("Missing audio");
    }
    return data;
  })
  .handler(async ({ data }): Promise<VoiceResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured (LOVABLE_API_KEY missing)");

    // Decode base64 -> bytes
    const bytes = Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0));
    if (bytes.byteLength < 800) {
      throw new Error("Recording too short — please try again.");
    }
    const ext = extFromMime(data.mimeType);
    const blob = new Blob([bytes], { type: data.mimeType || "audio/webm" });

    // 1) Transcribe
    const form = new FormData();
    form.append("file", blob, `note.${ext}`);
    form.append("model", "openai/gpt-4o-mini-transcribe");

    const sttRes = await fetch(`${GATEWAY}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Lovable-API-Key": key,
      },
      body: form,
    });

    if (!sttRes.ok) {
      const txt = await sttRes.text().catch(() => "");
      throw new Error(`Transcription failed (${sttRes.status}): ${txt.slice(0, 200)}`);
    }
    const sttJson = (await sttRes.json()) as { text?: string };
    const transcript = (sttJson.text ?? "").trim();
    if (!transcript) return { transcript: "", fields: {} };

    // 2) Extract structured fields
    const system = `You extract construction defect details from a site engineer's voice note.
Return ONLY a JSON object with this shape:
{
  "building": string,    // e.g. "Building 3" -> "3" or "B3"; keep speaker's form, strip the word "building"
  "level": string,       // floor/level only, e.g. "L2" or "2"
  "unit": string,        // unit/apartment number only, e.g. "301"
  "room": string,        // room/location, e.g. "Laundry", "Master ensuite"
  "trade": string,       // MUST be one of the provided trade options, exact match, or ""
  "subcontractor": string, // MUST be one of the provided subcontractor options, exact match, or ""
  "priority": "high"|"urgent",
  "description": string  // short, specific defect description in proper sentence case
}
Rules:
- Use "" for any field not clearly stated.
- Match trade and subcontractor by fuzzy intent against the provided lists (e.g. "ASTW Tiling" -> closest sub containing "ASTW" or "Tiling").
- Default priority to "high". Only use "urgent" if speaker uses words like urgent, critical, immediate, safety, or stop-work.
- Description should be the rectification action, not the meta location.`;

    const user = `Trades available: ${JSON.stringify(data.trades)}
Subcontractors available: ${JSON.stringify(data.subcontractors)}

Voice note transcript:
"""${transcript}"""`;

    const chatRes = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!chatRes.ok) {
      const txt = await chatRes.text().catch(() => "");
      return {
        transcript,
        fields: { description: transcript },
      } as VoiceResult & { _warn?: string };
    }

    const chatJson = (await chatRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = chatJson.choices?.[0]?.message?.content ?? "{}";
    let fields: ExtractedFields = {};
    try {
      fields = JSON.parse(content);
    } catch {
      fields = { description: transcript };
    }

    // Soft-validate trade/subcontractor against lists
    if (fields.trade && !data.trades.includes(fields.trade)) {
      const match = data.trades.find((t) => t.toLowerCase() === fields.trade!.toLowerCase());
      fields.trade = match ?? "";
    }
    if (fields.subcontractor && !data.subcontractors.includes(fields.subcontractor)) {
      const match = data.subcontractors.find(
        (s) => s.toLowerCase() === fields.subcontractor!.toLowerCase(),
      );
      fields.subcontractor = match ?? "";
    }

    return { transcript, fields };
  });
