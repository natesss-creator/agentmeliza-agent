"use client";

import {
  signInEnding,
  type Interaction,
  type EveMessage,
  type EveMessagePart,
  type EveToolPart,
} from "eve/react";
import { useState } from "react";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ExternalLinkIcon,
  FileIcon,
  ImageIcon,
  KeyRoundIcon,
  XCircleIcon,
} from "lucide-react";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  Question,
  QuestionInput,
  QuestionOption,
  QuestionOptions,
  QuestionPrompt,
  type QuestionResponse,
  QuestionSubmit,
  type QuestionValue,
} from "@/components/ai-elements/question";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import {
  BashToolContent,
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolPart as DisplayToolPart,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AgentInputResponse = {
  readonly interactionId: string;
  readonly optionId?: string;
  readonly text?: string;
};

type EveFilePart = Extract<EveMessagePart, { type: "file" }>;

export function AgentMessage({
  canRespond,
  isStreaming,
  message,
  onInputResponses,
}: {
  readonly canRespond: boolean;
  readonly isStreaming: boolean;
  readonly message: EveMessage;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
}) {
  const lastTextIndex = message.parts.reduce(
    (last, part, index) => (part.type === "text" ? index : last),
    -1,
  );
  const hasAssistantText =
    message.role === "assistant" &&
    message.parts.some((part) => part.type === "text" && part.text.length > 0);

  return (
    <Message
      data-optimistic={message.metadata?.optimistic ? "true" : undefined}
      from={message.role}
    >
      <MessageContent>
        {message.parts.map((part, index) =>
          hasAssistantText && part.type === "reasoning" ? null : (
            <AgentMessagePart
              canRespond={canRespond}
              key={partKey(part, index)}
              onInputResponses={onInputResponses}
              part={part}
              showCaret={isStreaming && message.role === "assistant" && index === lastTextIndex}
            />
          ),
        )}
      </MessageContent>
    </Message>
  );
}

function AgentMessagePart({
  canRespond,
  onInputResponses,
  part,
  showCaret,
}: {
  readonly canRespond: boolean;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly part: EveMessagePart;
  readonly showCaret: boolean;
}) {
  switch (part.type) {
    case "text":
      return (
        <MessageResponse caret="block" isAnimating={showCaret}>
          {part.text}
        </MessageResponse>
      );
    case "reasoning":
      return (
        <Reasoning defaultOpen isStreaming={part.state === "streaming"}>
          <ReasoningTrigger />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      );
    case "file":
      return <AttachmentPart part={part} />;
    case "interaction":
      return (
        <InteractionPart
          canRespond={canRespond}
          onInputResponses={onInputResponses}
          part={part}
        />
      );
    case "tool": {
      const errorText = part.error === undefined ? undefined : JSON.stringify(part.error);
      const input = part.state === "streaming" ? part.inputText : part.input;
      return (
        <Tool defaultOpen={part.state === "approval" || part.state === "blocked"}>
          <ToolHeader
            state={displayToolState(part.state)}
            title={part.label}
            toolName={part.name}
            type="dynamic-tool"
          />
          <ToolContent>
            {part.name === "bash" ? (
              <BashToolContent errorText={errorText} input={input} output={part.output} />
            ) : (
              <ToolInput input={input} />
            )}
            <InputRequestActions
              canRespond={canRespond}
              part={part}
              onInputResponses={onInputResponses}
            />
            {part.name === "bash" ? null : (
              <ToolOutput errorText={errorText} output={part.output} />
            )}
          </ToolContent>
        </Tool>
      );
    }
  }
}

function QuestionRequest({
  canRespond,
  interaction,
  inputResponse,
  onInputResponses,
}: {
  readonly canRespond: boolean;
  readonly interaction: Interaction;
  readonly inputResponse?: AgentInputResponse;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
}) {
  const { request } = interaction;
  const hasOptions = (request.options?.length ?? 0) > 0;
  const acceptsFreeform = request.allowFreeform === true || !hasOptions;
  const [questionValue, setQuestionValue] = useState<QuestionValue>({
    selectedValues: inputResponse?.optionId ? [inputResponse.optionId] : [],
    text: inputResponse?.text ?? "",
  });

  const submitOption = (optionId: string) => {
    setQuestionValue((value) => ({ ...value, selectedValues: [optionId] }));
    return onInputResponses([
      {
        optionId,
        interactionId: interaction.interactionId,
      },
    ]);
  };

  const submitResponse = ({ selectedValues, text }: QuestionResponse) =>
    onInputResponses([
      {
        optionId: selectedValues[0],
        interactionId: interaction.interactionId,
        text,
      },
    ]);

  return (
    <Question
      disabled={!canRespond || interaction.status === "settled" || inputResponse !== undefined}
      onSubmit={submitResponse}
      onValueChange={setQuestionValue}
      value={questionValue}
    >
      <QuestionPrompt>{request.prompt}</QuestionPrompt>
      {hasOptions ? (
        <QuestionOptions className="flex-col items-stretch" aria-label={request.prompt}>
          {request.options?.map((option, index) => (
            <QuestionOption
              className="justify-start px-3 py-2 text-left"
              key={option.id}
              onClick={() => void submitOption(option.id)}
              value={option.id}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-foreground text-sm leading-tight">{option.label}</span>
                {option.description ? (
                  <span className="block text-sm text-muted-foreground leading-tight">
                    {option.description}
                  </span>
                ) : null}
              </span>
              {inputResponse === undefined ? (
                <span aria-hidden="true" className="relative size-6 shrink-0">
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/8 text-xs text-muted-foreground transition-opacity group-hover/option:opacity-0 group-focus-visible/option:opacity-0">
                    {index + 1}
                  </span>
                  <ArrowRightIcon className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-muted-foreground opacity-0 transition-[color,opacity] group-hover/option:text-foreground group-hover/option:opacity-100 group-focus-visible/option:opacity-100" />
                </span>
              ) : (
                <CheckIcon className="size-4 shrink-0 opacity-0 transition-opacity group-data-[state=checked]/option:opacity-100" />
              )}
            </QuestionOption>
          ))}
        </QuestionOptions>
      ) : null}
      {acceptsFreeform ? (
        <div className="relative">
          <QuestionInput
            aria-label="Answer"
            className={inputResponse === undefined ? "pr-12 pb-12" : undefined}
            placeholder="Type your answer…"
          />
          {inputResponse === undefined && questionValue.text.trim().length > 0 ? (
            <QuestionSubmit
              aria-label="Answer"
              className="absolute right-2 bottom-2"
              size="icon-sm"
            >
              <ArrowRightIcon />
            </QuestionSubmit>
          ) : null}
        </div>
      ) : null}
    </Question>
  );
}

function AttachmentPart({ part }: { readonly part: EveFilePart }) {
  const label = part.filename ?? "Attachment";
  const detail = [part.mediaType, formatBytes(part.size)].filter(Boolean).join(" - ");
  const isImage = part.mediaType.startsWith("image/") && part.url !== undefined;
  const Icon = isImage ? ImageIcon : FileIcon;
  const body = (
    <span className="flex max-w-sm items-center gap-3 rounded-md border bg-background/60 p-2 text-sm">
      {isImage ? (
        <img alt={label} className="size-12 shrink-0 rounded-sm object-cover" src={part.url} />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {detail ? <span className="block truncate text-muted-foreground">{detail}</span> : null}
      </span>
      {part.url ? <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" /> : null}
    </span>
  );

  return part.url ? (
    <a href={part.url} rel="noreferrer" target="_blank">
      {body}
    </a>
  ) : (
    body
  );
}

function InteractionPart({
  canRespond,
  onInputResponses,
  part,
}: {
  readonly canRespond: boolean;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly part: Interaction;
}) {
  if (part.request.kind === "sign-in") {
    return <SignInPrompt part={part} />;
  }
  if (part.request.kind === "question") {
    return (
      <QuestionRequest
        canRespond={canRespond}
        interaction={part}
        inputResponse={part.answer}
        onInputResponses={onInputResponses}
      />
    );
  }
  return (
    <InteractionActions
      canRespond={canRespond}
      interaction={part}
      onInputResponses={onInputResponses}
    />
  );
}

function SignInPrompt({ part }: { readonly part: Interaction }) {
  const signIn = part.request.signIn;
  const displayName = signIn?.displayName ?? signIn?.name ?? part.request.title ?? "account";
  const isSettled = part.status === "settled" && part.outcome !== undefined;
  const isAuthorized = part.outcome === "accepted";
  const Icon = isAuthorized ? CheckCircleIcon : isSettled ? XCircleIcon : KeyRoundIcon;
  const instructions = signIn?.instructions;
  const shouldShowInstructions = instructions !== undefined && instructions !== part.request.prompt;

  return (
    <div
      className={cn(
        "space-y-3 rounded-md border p-3",
        isAuthorized
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isSettled
            ? "border-destructive/30 bg-destructive/5"
            : "border-blue-500/30 bg-blue-500/5",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
            isAuthorized
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : isSettled
                ? "bg-destructive/10 text-destructive"
                : "bg-blue-500/10 text-blue-700 dark:text-blue-300",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium text-sm">
            {isAuthorized ? `${displayName} connected` : isSettled ? `${displayName}: ${signInEnding(part.outcome!)}` : `Connect ${displayName}`}
          </p>
          <p className="text-muted-foreground text-sm">{part.request.prompt}</p>
          {shouldShowInstructions ? (
            <p className="text-muted-foreground text-sm">{instructions}</p>
          ) : null}
          {signIn?.userCode ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Code</span>
              <code className="rounded-md bg-background px-2 py-1 font-mono">
                {signIn.userCode}
              </code>
            </div>
          ) : null}
          {signIn?.url && !isSettled ? (
            <Button asChild size="sm">
              <a href={signIn.url} rel="noreferrer" target="_blank">
                <ExternalLinkIcon className="size-4" />
                Sign in with {displayName}
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InteractionActions({
  canRespond,
  interaction,
  onInputResponses,
}: {
  readonly canRespond: boolean;
  readonly interaction: Interaction;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
}) {
  const { request, answer } = interaction;
  const selectedOption = request.options?.find((option) => option.id === answer?.optionId);

  return (
    <div className="space-y-3 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3">
      <p className="text-muted-foreground text-sm">{request.prompt}</p>
      {answer ? (
        <p className="font-medium text-sm">
          Responded: {selectedOption?.label ?? answer.text ?? answer.optionId}
        </p>
      ) : interaction.status === "settled" ? (
        <p className="font-medium text-sm">Request {interaction.outcome ?? "settled"}.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {request.options?.map((option) => (
            <Button
              disabled={!canRespond}
              key={option.id}
              onClick={() => {
                void onInputResponses([
                  { interactionId: interaction.interactionId, optionId: option.id },
                ]);
              }}
              size="sm"
              type="button"
              variant={option.style === "danger" ? "destructive" : "default"}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatBytes(size: number | undefined): string | undefined {
  if (size === undefined) {
    return undefined;
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function InputRequestActions({
  canRespond,
  onInputResponses,
  part,
}: {
  readonly canRespond: boolean;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly part: EveToolPart;
}) {
  const interaction = part.interaction;
  if (!interaction) {
    return null;
  }
  return (
    <InteractionPart
      canRespond={canRespond}
      onInputResponses={onInputResponses}
      part={interaction}
    />
  );
}

function partKey(part: EveMessagePart, index: number): string {
  switch (part.type) {
    case "interaction":
      return `interaction:${part.interactionId}`;
    case "tool":
      return `tool:${part.callId}`;
    default:
      return "id" in part && typeof part.id === "string" ? part.id : `${part.type}:${index}`;
  }
}

type DisplayToolState = Extract<DisplayToolPart, { type: "dynamic-tool" }>["state"];

function displayToolState(state: EveToolPart["state"]): DisplayToolState {
  switch (state) {
    case "streaming":
      return "input-streaming";
    case "requested":
    case "running":
      return "input-available";
    case "approval":
    case "blocked":
      return "approval-requested";
    case "completed":
      return "output-available";
    case "rejected":
      return "output-denied";
    case "failed":
    case "cancelled":
      return "output-error";
  }
}
