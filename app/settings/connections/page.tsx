import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignIn } from "@/app/_components/web-chat-auth";
import { SettingsTabs } from "../settings-tabs";
import { SocialConnections } from "./social-connections";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <SignIn callbackURL="/settings/connections" />;

  return (
    <>
      <SettingsTabs active="/settings/connections" />
      <SocialConnections />
    </>
  );
}
