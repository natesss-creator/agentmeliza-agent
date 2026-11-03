import { stepCountIs, streamText } from "ai";
import { melizaModel } from "@/lib/model-routing";
import { auth } from "@/lib/auth";
import { createSocialSessionTools } from "@/lib/composio-session-tools";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Meliza, the user's automation and operations agent.
Be truthful about actions: never claim an action succeeded unless the connected service returned verifiable success. Use only tools available in this request, which are scoped to the currently signed-in user. Do not claim access to an account that is not connected. Ask the user before consequential external actions, and do not claim that a pending or failed tool call completed.`;

export async function POST(request: Request) {
  const session = process.env.NODE_ENV === "development"
    ? await auth.api.getSession({ headers: request.headers }).catch(() => null)
    : await auth.api.getSession({ headers: request.headers });
  const userId = session?.user.id ?? (process.env.NODE_ENV === "development" ? "meliza-development-user" : null);
  if (!userId) return new Response("Unauthorized", { status: 401 });

  let body: { messages?: unknown };
  try {
    body = (await request.json()) as { messages?: unknown };
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length > 100) {
    return new Response("Invalid messages payload", { status: 400 });
  }

  let social: Awaited<ReturnType<typeof createSocialSessionTools>>;
  try {
    social = await createSocialSessionTools(userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not initialize social integrations.";
    return new Response(message, { status: 502 });
  }

  try {
    const result = streamText({
      model: melizaModel(),
      system: SYSTEM_PROMPT,
      messages: body.messages as Parameters<typeof streamText>[0]["messages"],
      tools: social.tools,
      stopWhen: stepCountIs(6),
      onFinish: social.close,
      onError: social.close,
      onAbort: social.close,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    await social.close();
    throw error;
  }
}
