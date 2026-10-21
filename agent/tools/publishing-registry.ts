export type PublishingChannelMode = "api" | "browser" | "manual";
export type PublishingChannelStatus =
  | "ready"
  | "authorized_test_required"
  | "candidate"
  | "paused"
  | "blocked"
  | "skip"
  | "manual_review_required"
  | "not_recommended_for_autonomous_posting";

export type PublishingChannel = {
  key: string;
  label: string;
  url: string;
  mode: PublishingChannelMode;
  status: PublishingChannelStatus;
  useProfile: boolean;
  liveEnabled: boolean;
};

/**
 * Runtime registry. Discovery/inventory is deliberately separate from execution.
 * A channel can be researched or authorized for testing without being executable.
 * Only liveEnabled channels may be used by the production publisher.
 */
export const PUBLISHING_CHANNELS: Record<string, PublishingChannel> = {
  kenyaclassified: { key: "kenyaclassified", label: "KenyaClassified", url: "https://kenyaclassified.co.ke/index.php?page=item&action=item_add", mode: "browser", status: "ready", useProfile: false, liveEnabled: true },
  kobstore: { key: "kobstore", label: "KobStore", url: "https://www.kobstore.co.ke/register", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false },
  postadz: { key: "postadz", label: "Post Adz", url: "https://postadz.com/post", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false },
  listitglobal: { key: "listitglobal", label: "List It Global", url: "https://listitglobal.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false },
  bizilisting: { key: "bizilisting", label: "Bizilisting", url: "https://bizilisting.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false },
  foxyads: { key: "foxyads", label: "Foxy Ads", url: "https://foxyads.app/en", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false },
  adhubkenya: { key: "adhubkenya", label: "AdHub Kenya", url: "https://adhubkenya.co.ke/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false },
  fungadeal: { key: "fungadeal", label: "FungaDeal", url: "https://fungadeal.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false },
  esencial: { key: "esencial", label: "Esencial", url: "https://esencialmarketplace.com/ke", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false },
  sokoads: { key: "sokoads", label: "Soko Ads", url: "https://sokoads.co.ke/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false },
  freeadstime: { key: "freeadstime", label: "FreeAdsTime", url: "https://freeadstime.org/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false },
  worldfreeads: { key: "worldfreeads", label: "World Free Ads", url: "https://worldfreeads.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false },
  connectingdeals: { key: "connectingdeals", label: "Connecting Deals", url: "https://connectingdeals.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false },
  adukoo: { key: "adukoo", label: "Adukoo", url: "https://adukoo.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false },
  classified4free: { key: "classified4free", label: "Classified4Free", url: "https://free-classified-sites.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false },
  nopayclassifieds: { key: "nopayclassifieds", label: "No Pay Classifieds", url: "https://nopayclassifieds.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false },
};

export const publishingChannelKeys = Object.keys(PUBLISHING_CHANNELS) as [string, ...string[]];

export function getPublishingChannel(key: string) {
  return PUBLISHING_CHANNELS[key];
}
