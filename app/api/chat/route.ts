import { streamText } from "ai";
import { melizaModel } from "@/lib/model-routing";
import { auth } from "@/lib/auth";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Meliza, the user's automation and operations agent.
Be accurate about execution status. Never claim an action succeeded unless the underlying tool or service returned verifiable success. Prefer authorized integrations and read-only verification before destructive or public actions. Preserve existing project constraints and avoid inventing credentials, listings, URLs, or publication records.`;

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as { messages?: unknown };
  if (!Array.isArray(body.messages)) {
    return new Response("Invalid messages payload", { status: 400 });
  }

  const result = streamText({
    model: melizaModel(),
    system: SYSTEM_PROMPT,
    messages: body.messages as Parameters<typeof streamText>[0]["messages"],
  });

  return result.toTextStreamResponse();
}
