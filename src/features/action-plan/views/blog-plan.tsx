"use client";

import { ActionPlanShell } from "../components/action-plan-shell";
import { CheckSection, type CheckItem } from "../components/check-list";

const BEAT: CheckItem[] = [
  {
    id: "b1",
    label: "Beat has a clear, narrow focus",
    priority: "required",
    hint: "'East African fintech regulation' is a beat. 'Business news' is not. Narrow beats build loyal audiences.",
  },
  {
    id: "b2",
    label: "Beat description explains the editorial angle",
    priority: "required",
    hint: "What perspective does this beat hold? What stories will it never cover? Defining the edges is as important as the centre.",
  },
  {
    id: "b3",
    label: "At least one writer is assigned to the beat",
    priority: "required",
    hint: "A beat without a writer produces nothing. Assign before publishing.",
  },
];

const WRITER: CheckItem[] = [
  {
    id: "w1",
    label: "Writer profile has a distinct voice statement",
    priority: "required",
    hint: "Each writer presents a unique voice within the beat. What makes this writer's take different from the next?",
  },
  {
    id: "w2",
    label: "Writer's first article is published",
    priority: "required",
    hint: "An empty writer profile signals an unstarted beat. Publish the first piece before promoting the beat.",
  },
  {
    id: "w3",
    label: "Writer is assigned to the correct beat",
    priority: "required",
    hint: "Writers should stay within their beat's scope. Cross-beat publishing dilutes editorial identity.",
  },
];

const ARTICLE: CheckItem[] = [
  {
    id: "a1",
    label: "Title is brief and descriptive — under 10 words",
    priority: "required",
    hint: "Titles should inform, not tease. Readers decide in 2 seconds. Be specific.",
  },
  {
    id: "a2",
    label: "Hook references a current or trending event",
    priority: "required",
    hint: "A validating hook — a trending social media story, a recent policy change — gives the reader a reason to care now.",
  },
  {
    id: "a3",
    label: "Lede is written to grab in the first sentence",
    priority: "required",
    hint: "The lede sets the stakes. Don't bury the news. Don't start with background. Start with the thing that matters.",
  },
  {
    id: "a4",
    label: "Article has a cover image",
    priority: "recommended",
    hint: "Use Studio image generation to produce an editorial image that matches the story's tone.",
  },
  {
    id: "a5",
    label: "Article is assigned to a category",
    priority: "recommended",
    hint: "Categories drive discovery. An uncategorised article is harder to find and recommend.",
  },
];

export function BlogPlan() {
  return (
    <ActionPlanShell
      emoji="✍️"
      title="Blog Action Plan"
      description="Build your editorial structure from beat to byline. Each section below covers one layer of the publishing pipeline."
    >
      <CheckSection
        title="Beat setup"
        items={BEAT}
        tip="Use Studio text generation to define your beat: 'Write an editorial scope statement for a beat covering [topic] from the perspective of [region/audience].'"
      />
      <CheckSection
        title="Writer setup"
        items={WRITER}
        tip="Give each writer a one-sentence voice brief before they write their first piece. Studio can help: 'Write a writer voice statement for a journalist covering [topic] with [adjective] tone.'"
      />
      <CheckSection
        title="Articles"
        items={ARTICLE}
        tip="Draft titles, hooks, and ledes in Studio before writing the full piece. A strong lede in Studio often becomes your first paragraph verbatim."
      />
    </ActionPlanShell>
  );
}
