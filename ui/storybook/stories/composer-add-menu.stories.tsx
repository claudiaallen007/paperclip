import { useState, type CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ChevronLeft, Ellipsis } from "lucide-react";
import type { IssueAttachment, IssueWorkMode, RunnerGoalCapability } from "@paperclipai/shared";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { TaskChatComposer } from "@/components/task-chat/TaskChatComposer";
import { TaskChatComposerDock } from "@/components/task-chat/TaskChatComposerDock";

const goalCapability: RunnerGoalCapability = {
  availability: "available",
  verified: true,
  actions: ["set", "pause", "resume", "clear"],
  autonomousUpdates: true,
  persistentAcrossResume: true,
  maxObjectiveChars: 4_000,
  tokenBudgetControl: true,
  usageReporting: true,
};

interface ComposerAddStoryProps {
  initialMode: IssueWorkMode;
  goalAvailable: boolean;
  mobile: boolean;
  mobileContext: boolean;
}

function ComposerAddStory({ initialMode, goalAvailable, mobile, mobileContext }: ComposerAddStoryProps) {
  const [workMode, setWorkMode] = useState(initialMode);
  const [sent, setSent] = useState<string[]>([]);
  const [goal, setGoal] = useState<string | null>(null);

  async function attachFile(file: File): Promise<IssueAttachment> {
    return {
      id: crypto.randomUUID(), companyId: "storybook", issueId: "composer-story",
      issueCommentId: null, assetId: crypto.randomUUID(), provider: "storybook",
      objectKey: file.name, contentType: file.type, byteSize: file.size, sha256: "storybook",
      originalFilename: file.name, createdByAgentId: null, createdByUserId: "storybook",
      createdAt: new Date(), updatedAt: new Date(), contentPath: URL.createObjectURL(file),
    };
  }

  const composer = <TaskChatComposer
    onAdd={async (body) => setSent((messages) => [...messages, body])}
    workMode={workMode}
    onWorkModeChange={setWorkMode}
    onAttachImage={attachFile}
    runnerGoalCapability={goalAvailable ? goalCapability : { ...goalCapability, availability: "unsupported", actions: [] }}
    onRunnerGoalCommand={goalAvailable ? async (command) => {
      if (command.action === "create") setGoal(command.objective);
    } : undefined}
    mobile={mobile}
  />;

  if (mobileContext) return <div className="flex min-h-dvh flex-col bg-background text-foreground">
    <header className="flex h-12 shrink-0 items-center gap-3 px-4 text-sm">
      <ChevronLeft className="size-4 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-medium">PAP-1074 · Composer on mobile</span>
      <Ellipsis className="size-4 text-muted-foreground" aria-hidden />
    </header>
    <main className="flex flex-1 flex-col p-4 pb-(--tc-composer-visible-nav-offset)"
      style={{ "--tc-composer-bottom": "var(--tc-composer-visible-nav-offset)" } as CSSProperties}>
      <div className="space-y-4 text-sm">
        <div className="rounded-lg bg-muted px-3 py-2">Tune the composer spacing for a phone screen.</div>
        <div className="ml-8 rounded-lg bg-secondary px-3 py-2">The bottom navigation stays visible while writing.</div>
        {goal ? <div className="rounded-lg bg-card px-3 py-2">Goal: {goal}</div> : null}
        {sent.map((body, index) => <div key={index} className="ml-8 rounded-lg bg-secondary px-3 py-2">{body}</div>)}
      </div>
      <div className="min-h-4 flex-1" />
      <TaskChatComposerDock mobile streamlined>{composer}</TaskChatComposerDock>
    </main>
    <MobileBottomNav visible />
  </div>;

  return <div className="flex min-h-screen flex-col bg-background p-4 text-foreground sm:p-8">
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <header className="border-b border-border pb-4">
        <h1 className="text-base font-semibold">Composer actions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Open the plus menu to attach a file, start a goal, or choose Plan or Ask mode.</p>
      </header>
      <div className="flex flex-1 flex-col justify-end gap-3 py-6">
        {goal ? <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">Goal: {goal}</div> : null}
        {sent.map((body, index) => <div key={index} className="ml-auto rounded-lg bg-secondary px-4 py-3 text-sm">{body}</div>)}
      </div>
      {composer}
    </div>
  </div>;
}

const meta = {
  title: "Tasks/Composer/Add menu (implemented)",
  component: ComposerAddStory,
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
    docs: { description: { component: "The production task composer. The plus menu opens upward for files, supported goals, Plan mode, and Ask mode. Plan and Ask are exclusive; selecting a mode shows a removable chip. Cmd+. cycles standard, Plan, and Ask." } },
  },
  args: { initialMode: "standard", goalAvailable: true, mobile: false, mobileContext: false },
} satisfies Meta<typeof ComposerAddStory>;

export default meta;
type Story = StoryObj<typeof meta>;

async function openAdd(canvasElement: HTMLElement) {
  const page = within(canvasElement.ownerDocument.body);
  await userEvent.click(page.getByRole("button", { name: "Add to composer" }));
  return page;
}

export const AddMenu: Story = {
  name: "01 · Plus menu with goal",
  play: async ({ canvasElement }) => {
    const page = await openAdd(canvasElement);
    await expect(page.getByRole("menuitem", { name: /Files and images/ })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Goal/ })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Plan mode/ })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Ask mode/ })).toBeVisible();
  },
};

export const PlanChip: Story = {
  name: "02 · Plan mode chip",
  args: { initialMode: "planning" },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await expect(page.getByRole("button", { name: "Remove Plan mode" })).toBeVisible();
  },
};

export const AskChip: Story = {
  name: "03 · Ask mode chip",
  args: { initialMode: "ask" },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await expect(page.getByRole("button", { name: "Remove Ask mode" })).toBeVisible();
  },
};

export const SwitchModes: Story = {
  name: "04 · Choose and remove a mode",
  play: async ({ canvasElement }) => {
    const page = await openAdd(canvasElement);
    await userEvent.click(page.getByRole("menuitem", { name: /Plan mode/ }));
    await expect(page.getByRole("button", { name: "Remove Plan mode" })).toBeVisible();
    await userEvent.click(page.getByRole("button", { name: "Add to composer" }));
    await userEvent.click(page.getByRole("menuitem", { name: /Ask mode/ }));
    await expect(page.queryByRole("button", { name: "Remove Plan mode" })).not.toBeInTheDocument();
    await userEvent.click(page.getByRole("button", { name: "Remove Ask mode" }));
    await expect(page.queryByRole("button", { name: /Remove .* mode/ })).not.toBeInTheDocument();
  },
};

export const FileUpload: Story = {
  name: "05 · Attached file",
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;
    await userEvent.upload(input, new File(["Storybook attachment"], "launch-plan.txt", { type: "text/plain" }));
    await expect(page.getByText("launch-plan.txt")).toBeVisible();
  },
};

export const GoalUnavailable: Story = {
  name: "06 · Agent without goals",
  args: { goalAvailable: false },
  play: async ({ canvasElement }) => {
    const page = await openAdd(canvasElement);
    await expect(page.queryByRole("menuitem", { name: /Goal/ })).not.toBeInTheDocument();
  },
};

export const Mobile: Story = {
  name: "07 · Mobile composer",
  args: { mobile: true },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvasElement }) => {
    const page = await openAdd(canvasElement);
    await expect(page.getByRole("menuitem", { name: /Plan mode/ })).toBeVisible();
  },
};

export const GoalDraft: Story = {
  name: "08 · Start a supported goal",
  play: async ({ canvasElement }) => {
    const page = await openAdd(canvasElement);
    await userEvent.click(page.getByRole("menuitem", { name: /Goal/ }));
    await expect(page.getByRole("textbox", { name: "editable markdown" })).toHaveTextContent("/goal");
  },
};

export const MobileWithBottomBar: Story = {
  name: "09 · Mobile with bottom bar",
  args: { mobile: true, mobileContext: true },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await expect(page.getByTestId("task-chat-composer-dock")).toBeVisible();
  },
};

export const MobilePlanWithBottomBar: Story = {
  name: "10 · Mobile plan and attachment with bottom bar",
  args: { initialMode: "planning", mobile: true, mobileContext: true },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!;
    await userEvent.upload(input, new File(["Mobile layout"], "notes.txt", { type: "text/plain" }));
    await expect(page.getByText("notes.txt")).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove Plan mode" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  },
};
