import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignIn } from "@/app/_components/web-chat-auth";
import { SettingsTabs } from "../settings-tabs";
import { ApiKeySettings } from "./api-key-settings";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <SignIn callbackURL="/settings/api-keys" />;
  return (
    <>
      <SettingsTabs active="/settings/api-keys" />
      <ApiKeySettings />
    </>
  );
}
