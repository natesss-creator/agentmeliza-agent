import Link from "next/link";
import {
  ArrowUpRightIcon,
  BadgeCheckIcon,
  BookOpenIcon,
  Building2Icon,
  ClipboardListIcon,
  FileCheck2Icon,
  HandCoinsIcon,
  MegaphoneIcon,
  SearchCheckIcon,
  Share2Icon,
  VideoIcon,
  CalendarClockIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Feature = {
  title: string;
  description: string;
  prompt: string;
  icon: LucideIcon;
};

const FEATURES: Feature[] = [
  {
    title: "First Income Clarity",
    description: "Get product information, campaign research, or draft reviews. Publishing is currently paused.",
    prompt: "Research campaign ideas and draft copy for First Income Clarity for review only. Do not publish; its promotion is currently paused.",
    icon: BookOpenIcon,
  },
  {
    title: "Uhiko property marketing",
    description: "Check verified property details and prepare accurate listing copy.",
    prompt: "Find the verified Uhiko property listings and draft a clear post for an eligible listing.",
    icon: Building2Icon,
  },
  {
    title: "Social content & publishing",
    description: "Provide approved media, create platform-specific organic posts, and publish or schedule them on connected accounts.",
    prompt: "Create platform-specific organic posts for Uhiko Properties using my attached media. Use only my connected accounts, follow each platform's rules and posting limits, and schedule for the time I specify: [date, time, and time zone].",
    icon: Share2Icon,
  },
  {
    title: "Paid campaign drafts",
    description: "Draft ad copy and campaign plans for paid promotion. Meliza does not activate or spend campaign budget.",
    prompt: "Draft paid-ad copy and a campaign plan for [platform] using my attached media. Do not create, activate, boost, schedule, or spend on an ad campaign.",
    icon: HandCoinsIcon,
  },
  {
    title: "Post scheduling",
    description: "Schedule eligible organic posts through a connected platform when its tools support it.",
    prompt: "Prepare organic posts for my connected accounts and schedule them for [date, time, and time zone]. Confirm the exact content and destinations before submitting any schedule.",
    icon: CalendarClockIcon,
  },
  {
    title: "Marketing research & copy",
    description: "Explore campaign angles and write audience-appropriate copy.",
    prompt: "Research campaign angles and draft platform-native marketing copy for Uhiko Properties.",
    icon: MegaphoneIcon,
  },
  {
    title: "Short-form property videos",
    description: "Create a listing video with narration and captions, then follow the approved review and publishing workflow.",
    prompt: "Prepare a short video for an eligible Uhiko property listing. Verify the listing, follow the QA steps, and check authorization before publishing.",
    icon: VideoIcon,
  },
  {
    title: "Listing channels",
    description: "Research candidate platforms, test supported routes, and review channel requirements.",
    prompt: "Review the next batch of candidate listing channels for terms, supported routes, and human-verification requirements. Do not publish.",
    icon: ClipboardListIcon,
  },
  {
    title: "SEO & search visibility",
    description: "Get technical and content SEO recommendations for Uhiko and First Income Clarity.",
    prompt: "Audit technical and content SEO opportunities for uhiko.com and groketer.com/firstincome.",
    icon: SearchCheckIcon,
  },
  {
    title: "Content QA & compliance",
    description: "Review factual, brand, data-handling, and platform risks. Compliance reviews are not legal advice.",
    prompt: "Review this draft for factual accuracy, brand fit, and compliance risks. Do not publish it: [paste draft]",
    icon: FileCheck2Icon,
  },
  {
    title: "YouTube support",
    description: "Get help with the authorized channel's upload workflow and policy checks.",
    prompt: "Help me prepare an upload to the authorized YouTube channel. Check the current upload policy and available route before taking action.",
    icon: VideoIcon,
  },
  {
    title: "Reports & system health",
    description: "Summarize verified publishing activity or request a read-only system audit.",
    prompt: "Summarize today's verified publishing activity from the publishing log and flag any system health issues.",
    icon: BadgeCheckIcon,
  },
];

export function AccessGuide() {
  return (
    <section aria-labelledby="access-guide-title" className="rounded-2xl border bg-card p-4 text-left sm:p-5">
      <h2 className="font-medium" id="access-guide-title">Getting started</h2>
      <ol className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
        <li><span className="font-medium text-foreground">1. Sign in.</span> Continue with Google to start a private chat.</li>
        <li><span className="font-medium text-foreground">2. Choose a feature.</span> Select an example below or type your own request. Examples are added to the message box without replacing existing text.</li>
        <li><span className="font-medium text-foreground">3. Review and send.</span> Check the prompt and Meliza’s response before approving any next step.</li>
      </ol>
      <p className="mt-3 text-sm text-muted-foreground">
        Social workflows need an authorized connection and remain subject to platform rules and Meliza’s safety checks. First Income Clarity publishing is currently paused.
      </p>
      <Link
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
        href="/settings/connections"
      >
        Manage social accounts <ArrowUpRightIcon aria-hidden="true" className="size-4" />
      </Link>
    </section>
  );
}

export function FeatureCards({
  onSelectPrompt,
  disabled = false,
}: {
  readonly onSelectPrompt?: (prompt: string) => void;
  readonly disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FEATURES.map(({ title, description, prompt, icon: Icon }) => {
        const content = (
          <>
            <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-800 ring-1 ring-emerald-600/10 dark:text-emerald-300">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="block font-medium tracking-tight">{title}</span>
            <span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span>
            {onSelectPrompt ? (
              <span className="mt-4 flex items-center justify-between border-t pt-3 text-xs font-medium text-foreground">
                Use example prompt
                <ArrowUpRightIcon aria-hidden="true" className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            ) : null}
          </>
        );

        return onSelectPrompt ? (
          <button
            aria-label={`Use an example prompt for ${title}`}
            className="group rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-600/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            disabled={disabled}
            key={title}
            onClick={() => onSelectPrompt(prompt)}
            type="button"
          >
            {content}
          </button>
        ) : (
          <article className="rounded-2xl border bg-card p-4 text-left shadow-sm" key={title}>
            {content}
          </article>
        );
      })}
    </div>
  );
}
