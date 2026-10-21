export type PublishingChannelMode = "api" | "browser" | "email" | "webhook" | "manual";
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
  regions?: string[];
  categories?: string[];
  notes?: string;
};

/** Runtime registry. Discovery/testing is separate from live execution. */
export const PUBLISHING_CHANNELS: Record<string, PublishingChannel> = {
  kenyaclassified: { key: "kenyaclassified", label: "KenyaClassified", url: "https://kenyaclassified.co.ke/index.php?page=item&action=item_add", mode: "browser", status: "ready", useProfile: false, liveEnabled: true, regions: ["KE", "EA"], categories: ["services", "education", "classifieds"] },
  kobstore: { key: "kobstore", label: "KobStore", url: "https://www.kobstore.co.ke/register", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false, regions: ["KE", "EA"], categories: ["services", "education", "marketplace"] },
  postadz: { key: "postadz", label: "Post Adz", url: "https://postadz.com/post", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["services", "education", "gigs", "classifieds"] },
  listitglobal: { key: "listitglobal", label: "List It Global", url: "https://listitglobal.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["services", "classifieds"] },
  bizilisting: { key: "bizilisting", label: "Bizilisting", url: "https://bizilisting.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["services", "digital-products", "classifieds"] },
  foxyads: { key: "foxyads", label: "Foxy Ads", url: "https://foxyads.app/en", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["services", "education", "jobs"] },
  adhubkenya: { key: "adhubkenya", label: "AdHub Kenya", url: "https://adhubkenya.co.ke/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false, regions: ["KE"], categories: ["services", "classifieds"] },
  fungadeal: { key: "fungadeal", label: "FungaDeal", url: "https://fungadeal.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false, regions: ["KE", "EA"], categories: ["services", "marketplace"] },
  esencial: { key: "esencial", label: "Esencial", url: "https://esencialmarketplace.com/ke", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false, regions: ["KE", "EA"], categories: ["education", "courses", "services"] },
  sokoads: { key: "sokoads", label: "Soko Ads", url: "https://sokoads.co.ke/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false, regions: ["KE"], categories: ["services", "classifieds"] },
  freeadstime: { key: "freeadstime", label: "FreeAdsTime", url: "https://freeadstime.org/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["services", "education", "classifieds"] },
  worldfreeads: { key: "worldfreeads", label: "World Free Ads", url: "https://worldfreeads.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["services", "classifieds"] },
  connectingdeals: { key: "connectingdeals", label: "Connecting Deals", url: "https://connectingdeals.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["services", "classifieds"] },
  adukoo: { key: "adukoo", label: "Adukoo", url: "https://adukoo.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["services", "classifieds"] },
  classified4free: { key: "classified4free", label: "Classified4Free", url: "https://free-classified-sites.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["services", "education", "classifieds"] },
  nopayclassifieds: { key: "nopayclassifieds", label: "No Pay Classifieds", url: "https://nopayclassifieds.com/", mode: "browser", status: "authorized_test_required", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["services", "education", "classifieds"] },
  freeadspostingsite: { key: "freeadspostingsite", label: "Free Ads Posting Site", url: "https://freeadspostingsite.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["services", "education", "classes", "jobs", "classifieds"] },
  vaultmart: { key: "vaultmart", label: "VaultMart", url: "https://www.vaultmart.net/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["digital-products", "services", "classifieds"] },
  teppek: { key: "teppek", label: "Teppek", url: "https://www.teppek.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["services", "jobs"] },
  classifiedsfree: { key: "classifiedsfree", label: "ClassifiedsFree", url: "https://web.classifiedsfree.co/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["GLOBAL", "UK", "IE", "US", "CA", "AU", "NZ", "IN", "SG", "ZA", "PH", "MY"], categories: ["classifieds", "services"] },
  mezad: { key: "mezad", label: "Mezad.net Global", url: "https://mezad.net/markets/en/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["GLOBAL", "EA", "MENA", "ASIA", "AMERICAS"], categories: ["services", "classifieds"] },
  nomolink: { key: "nomolink", label: "Nomolink", url: "https://www.nomolink.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["GLOBAL", "MENA", "ASIA"], categories: ["services", "learning", "jobs", "classifieds"] },
  adolx: { key: "adolx", label: "Adolx", url: "https://www.adolx.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["IN", "US", "UK", "CA", "AU", "GLOBAL"], categories: ["services", "education", "classes", "jobs", "classifieds"] },
  worldfreeadscom: { key: "worldfreeadscom", label: "WorldFreeAds.com", url: "https://www.worldfreeads.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["services", "classifieds"] },
  globalfreeclassifieds: { key: "globalfreeclassifieds", label: "Global Free Classifieds", url: "https://www.free-classified-sites.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["services", "education", "classifieds"] },
  snapsellgo: { key: "snapsellgo", label: "SnapSellGo", url: "https://www.snapsellgo.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["classifieds", "services"] },
  kenyabizlist: { key: "kenyabizlist", label: "KenyaBizList", url: "https://www.kenyabizlist.com/classifieds/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["KE", "EA"], categories: ["services", "business", "classifieds"] },
  sokify: { key: "sokify", label: "Sokify", url: "https://sokify.co.ke/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["KE", "EA"], categories: ["services", "marketplace"] },
  marketplacekenya: { key: "marketplacekenya", label: "Marketplace Kenya", url: "https://marketplaceke.co.ke/user/post-ad", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["KE"], categories: ["services", "education", "classifieds"] },
  kenyaadvert: { key: "kenyaadvert", label: "KenyaAdvert", url: "https://kenyaadvert.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["KE", "EA"], categories: ["services", "classifieds"] },

  // Additional worldwide candidates. All remain candidate until terms, access,
  // category fit, and an authorized non-bypass publishing route are verified.
  hoobly: { key: "hoobly", label: "Hoobly", url: "https://www.hoobly.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["US", "CA", "GLOBAL"], categories: ["classifieds", "services"] },
  oodle: { key: "oodle", label: "Oodle", url: "https://www.oodle.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["US", "CA", "GLOBAL"], categories: ["services", "classifieds"] },
  usfreeads: { key: "usfreeads", label: "USFreeAds", url: "https://www.usfreeads.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["US", "CA"], categories: ["services", "classifieds"] },
  adsme: { key: "adsme", label: "AdsMe", url: "https://www.adsme.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["US", "CA", "GLOBAL"], categories: ["services", "classifieds"] },
  yakaz: { key: "yakaz", label: "Yakaz", url: "https://www.yakaz.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["GLOBAL", "EU", "US"], categories: ["classifieds", "services"] },
  gumtreeuk: { key: "gumtreeuk", label: "Gumtree UK", url: "https://www.gumtree.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["UK", "IE"], categories: ["services", "jobs", "classifieds"] },
  gumtreeau: { key: "gumtreeau", label: "Gumtree Australia", url: "https://www.gumtree.com.au/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["AU", "NZ"], categories: ["services", "jobs", "classifieds"] },
  fridayad: { key: "fridayad", label: "Friday-Ad", url: "https://www.friday-ad.co.uk/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["UK", "IE"], categories: ["services", "classifieds"] },
  preloved: { key: "preloved", label: "Preloved", url: "https://www.preloved.co.uk/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["UK", "IE"], categories: ["services", "classifieds"] },
  kijiji: { key: "kijiji", label: "Kijiji", url: "https://www.kijiji.ca/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["CA"], categories: ["services", "jobs", "classifieds"] },
  locanto: { key: "locanto", label: "Locanto", url: "https://www.locanto.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["GLOBAL", "EU", "US", "CA", "AU", "IN", "ZA"], categories: ["services", "education", "classifieds"] },
  recycler: { key: "recycler", label: "Recycler", url: "https://www.recycler.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["US"], categories: ["services", "classifieds"] },
  bookoo: { key: "bookoo", label: "Bookoo", url: "https://www.bookoo.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["US"], categories: ["services", "classifieds"] },
  freeclassifieds4u: { key: "freeclassifieds4u", label: "FreeClassifieds4u", url: "https://www.freeclassifieds4u.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["US", "CA", "GLOBAL"], categories: ["services", "classifieds"] },
  adsnearme: { key: "adsnearme", label: "Ads Near Me", url: "https://www.adsnearme.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["US", "GLOBAL"], categories: ["services", "classifieds"] },
  globalclassified: { key: "globalclassified", label: "Global Classified", url: "https://www.globalclassified.net/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["GLOBAL"], categories: ["services", "education", "classifieds"] },
  africaads: { key: "africaads", label: "Africa Ads", url: "https://africaads.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["AF", "EA", "ZA", "NG", "GH"], categories: ["services", "classifieds"] },
  nigeriaads: { key: "nigeriaads", label: "Nigeria Ads", url: "https://nigeriaads.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["NG", "AF"], categories: ["services", "education", "classifieds"] },
  ghanaads: { key: "ghanaads", label: "Ghana Ads", url: "https://ghanaads.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["GH", "AF"], categories: ["services", "education", "classifieds"] },
  southafricaads: { key: "southafricaads", label: "South Africa Ads", url: "https://southafricaads.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["ZA", "AF"], categories: ["services", "education", "classifieds"] },
  indiafreeads: { key: "indiafreeads", label: "India Free Ads", url: "https://indiafreeads.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["IN", "ASIA"], categories: ["services", "education", "classifieds"] },
  clickindia: { key: "clickindia", label: "ClickIndia", url: "https://www.clickindia.com/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["IN", "ASIA"], categories: ["services", "education", "classifieds"] },
  australiaads: { key: "australiaads", label: "Australia Ads", url: "https://www.australiaads.com.au/", mode: "browser", status: "candidate", useProfile: true, liveEnabled: false, regions: ["AU", "NZ"], categories: ["services", "classifieds"] },
};

export const publishingChannelKeys = Object.keys(PUBLISHING_CHANNELS) as [string, ...string[]];
export function getPublishingChannel(key: string) { return PUBLISHING_CHANNELS[key]; }
