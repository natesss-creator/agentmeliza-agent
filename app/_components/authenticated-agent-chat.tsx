import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AgentChat } from "./agent-chat";
import { AccountControl, SignIn } from "./web-chat-auth";

export async function AuthenticatedAgentChat({
  sessionId,
  sessionless,
  allowAnonymous = false,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
  readonly allowAnonymous?: boolean;
}) {
  if (process.env.NODE_ENV === "development") {
    return <AgentChat sessionId={sessionId} sessionless={sessionless} userId="meliza-development-user" />;
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return allowAnonymous ? <AgentChat sessionId={sessionId} sessionless={sessionless} publicMode /> : <SignIn />;
  }

  return (
    <>
      <AgentChat sessionId={sessionId} sessionless={sessionless} userId={session.user.id} />
      <AccountControl
        email={session.user.email}
        image={session.user.image}
        name={session.user.name}
      />
    </>
  );
}
