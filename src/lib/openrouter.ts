// Cliente OpenRouter — selección automática de modelo gratuito con soporte de tools

let _cached: { ids: string[]; ts: number } | null = null;

// Modelos gratuitos confiables con soporte de tools, en orden de preferencia
const FALLBACKS = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3.5-lightning:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-26b-a4b-it:free",
  "openrouter/free",
];

type ORModel = {
  id: string;
  pricing: { prompt: string | number; completion: string | number };
  supported_parameters?: string[];
  context_length?: number;
};

export async function getFreeLLMModels(): Promise<string[]> {
  return FALLBACKS;
}

export type ORMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "assistant"; content: null; tool_calls: ORToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

type ORToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ORTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

type ORResponse = {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: ORToolCall[];
    };
  }>;
};

export async function orChat(
  model: string,
  messages: ORMessage[],
  tools: ORTool[],
): Promise<ORResponse> {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://enminutas.com.ar",
      "X-Title": "En Minutas Admin",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`OpenRouter error ${resp.status}: ${txt}`);
  }

  return resp.json() as Promise<ORResponse>;
}
