import { stepCountIs, streamText, type ModelMessage } from "ai";
import { melizaModel } from "@/lib/model-routing";
import { auth } from "@/lib/auth";
import { createSocialSessionTools } from "@/lib/composio-session-tools";
import { isUserMediaReference } from "@/lib/user-media";
import { getUserPackageAssignment } from "@/lib/user-packages";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Meliza, the user's automation and operations agent.
Be truthful about actions: never claim an action succeeded unless the connected service returned verifiable success. Use only tools available in this request, which are scoped to the currently signed-in user. Do not claim access to an account that is not connected. Ask the user before consequential external actions, and do not claim that a pending or failed tool call completed.

The user may provide image or video assets. Treat them as user-provided creative and do not claim ownership or rights; remind the user to upload only material they are authorized to share. Use attached images as visual context when drafting.

Support platform-specific organic social posts and native scheduling only when the connected platform exposes a supported tool. Scheduling requires an exact date, time, and time zone and the user's request to schedule. Report the platform's response accurately; a returned schedule request is not proof that the post later published.

When asked to review social interactions, use available read tools to identify likely customer interest and draft a response. Do not send replies or DMs; approved auto-reply rules and templates are not configured. Potential-customer email alerts are not yet dispatched, so never claim that a lead alert or daily email was sent.

Paid advertising: you may draft campaign copy, creative suggestions, and plans only. Never create, activate, boost, schedule, or spend on a paid ad campaign. No advertising budget has been authorized.

First Income Clarity: publishing and promotion are paused. Never publish, distribute, or schedule First Income Clarity content on any channel. You may answer questions or prepare private drafts only when the user explicitly asks.`;

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
  media?: unknown[];
};

function normalizeAnonymousUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^anon-[A-Za-z0-9_-]+$/.test(trimmed) || trimmed.length > 128) return null;
  return trimmed;
}

export async function POST(request: Request) {
  const session = process.env.NODE_ENV === "development"
    ? await auth.api.getSession({ headers: request.headers }).catch(() => null)
    : await auth.api.getSession({ headers: request.headers });

  let body: { messages?: unknown; userId?: unknown };
  try {
    body = (await request.json()) as { messages?: unknown };
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }
  const userId =
    session?.user.id ??
    normalizeAnonymousUserId(body.userId) ??
    (process.env.NODE_ENV === "development" ? "meliza-development-user" : null);

  if (!userId) {
    return new Response("Anonymous chat sessions require a valid user identifier.", { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length > 100) {
    return new Response("Invalid messages payload", { status: 400 });
  }
  const incomingMessages: IncomingMessage[] = [];
  for (const candidate of body.messages) {
    if (
      !candidate ||
      typeof candidate !== "object" ||
      !("role" in candidate) ||
      (candidate.role !== "user" && candidate.role !== "assistant") ||
      !("content" in candidate) ||
      typeof candidate.content !== "string" ||
      candidate.content.length > 100_000
    ) {
      return new Response("Invalid message entry", { status: 400 });
    }

    const media = "media" in candidate ? candidate.media : undefined;
    if (
      media !== undefined &&
      (!Array.isArray(media) ||
        media.length > 4 ||
        candidate.role !== "user" ||
        !media.every((item) => isUserMediaReference(item, userId)))
    ) {
      return new Response("Invalid or unauthorized media attachment", { status: 400 });
    }

    incomingMessages.push({
      role: candidate.role,
      content: candidate.content,
      ...(Array.isArray(media) ? { media } : {}),
    });
  }

  const messages: ModelMessage[] = incomingMessages.map(({ role, content, media = [] }) => {
    const attachments = media.filter(isUserMedia);
    if (role !== "user" || attachments.length === 0) return { role, content };

    const text = [
      content,
      ...attachments
        .filter((item) => item.contentType === "video/mp4")
        .map((item) => `Attached video asset for possible publishing: ${item.url}`),
    ].join("\n\n");
    return {
      role: "user",
      content: [
        { type: "text", text },
        ...attachments
          .filter((item) => item.contentType.startsWith("image/"))
          .map((item) => ({ type: "image" as const, image: item.url })),
      ],
    };
  });

  let social: Awaited<ReturnType<typeof createSocialSessionTools>>;
  let packageInstructions: string;
  try {
    const assignment = session ? await getUserPackageAssignment(userId) : null;
    social = await createSocialSessionTools(userId, assignment?.packageId ?? null);
    packageInstructions = !session
      ? "This is a public anonymous session. Provide answers and private drafts only. No social accounts, publishing tools, or media uploads are available. Never imply that an external action occurred or that account-specific information is accessible."
      : assignment
        ? "The user is assigned the Starter package: at most 20 social posts per UTC publishing day across connected supported accounts. Replies and DMs may be drafted, but never sent automatically. Paid campaigns are disabled."
        : "The user has no seller-assigned package. Do not claim access to social publishing or engagement tools; offer private drafts only.";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not initialize social integrations.";
    return new Response(message, { status: 502 });
  }

  function isUserMedia(value: unknown): value is {
    url: string;
    contentType: string;
    name: string;
  } {
    return Boolean(value && typeof value === "object" && "url" in value && "contentType" in value && "name" in value);
  }

  try {
    const result = streamText({
      model: melizaModel(),
      system: `${SYSTEM_PROMPT}\n\nPackage permissions: ${packageInstructions}`,
      messages,
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
