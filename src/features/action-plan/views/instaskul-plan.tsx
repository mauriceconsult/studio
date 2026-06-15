"use client";

import { ActionPlanShell } from "../components/action-plan-shell";
import { CheckSection, type CheckItem } from "../components/check-list";

const SCHOOL: CheckItem[] = [
  {
    id: "s1",
    label: "School title is set and punchy",
    priority: "required",
    hint: "3–6 words. 'Kampala UX Academy' outperforms 'My School'. Avoid filler like 'Welcome to…'",
  },
  {
    id: "s2",
    label: "Description answers 'why join?'",
    priority: "required",
    hint: "1–2 sentences. Lead with outcomes — 'Learn to pitch clients in 4 weeks' beats 'A platform for business skills.'",
  },
  {
    id: "s3",
    label: "Cover image is set and high resolution",
    priority: "required",
    hint: "Avoid stock images with watermarks. Minimum 1200×630px.",
  },
  {
    id: "s4",
    label: "Profile reviewed as a learner would see it",
    priority: "recommended",
    hint: "Open a private window. Does it immediately tell you who this is for and what you'll gain?",
  },
];

const COMMS: CheckItem[] = [
  {
    id: "c1",
    label: "School-wide noticeboard has a welcome post",
    priority: "required",
    hint: "Introduce yourself, state what the school offers, and what learners can expect in week 1.",
  },
  {
    id: "c2",
    label: "Each course has its own noticeboard post",
    priority: "recommended",
    hint: "Course noticeboards are course-specific. Don't duplicate school-wide posts here.",
  },
  {
    id: "c3",
    label: "Noticeboard titles are specific, not generic",
    priority: "recommended",
    hint: "'Module 2 submissions now open' is actionable. 'Update' is not.",
  },
];

const COURSES: CheckItem[] = [
  {
    id: "cr1",
    label: "Course title is outcome-led, under 8 words",
    priority: "required",
    hint: "'Financial Modelling for Ugandan SMEs' tells you who it's for. 'Finance Course' tells you nothing.",
  },
  {
    id: "cr2",
    label: "Description states prerequisites and outcomes",
    priority: "required",
    hint: "3–5 sentences. Who is it for? What will they do after? What prior knowledge is needed?",
  },
  {
    id: "cr3",
    label: "Cover image matches the subject",
    priority: "required",
    hint: "Use Studio image generation to create a relevant illustration — not a generic gradient.",
  },
  {
    id: "cr4",
    label: "Pricing is set between 10,000–50,000 UGX",
    priority: "required",
    hint: "Short courses: 10,000–20,000 UGX. Deep multi-tutorial courses: 30,000–50,000 UGX.",
  },
  {
    id: "cr5",
    label: "Each tutorial has a clear, action-verb objective",
    priority: "required",
    hint: "Use 'identify', 'apply', 'create' — not 'learn about X'.",
  },
  {
    id: "cr6",
    label: "Tutorial descriptions guide, not just describe",
    priority: "recommended",
    hint: "'You'll analyse two real case studies' beats 'Case studies covered.'",
  },
  {
    id: "cr7",
    label: "Coursework title is concept-level, not task-level",
    priority: "recommended",
    hint: "It becomes the published project title. 'Designing for low-bandwidth users in East Africa' is a concept.",
  },
];

const EVAL: CheckItem[] = [
  {
    id: "e1",
    label: "Each course has exactly one coursework set",
    priority: "required",
    hint: "Coursework evaluates the entire course. One course = one coursework, always.",
  },
  {
    id: "e2",
    label: "Each tutorial has an assignment",
    priority: "required",
    hint: "The sum of all assignments should cover the coursework's full scope.",
  },
  {
    id: "e3",
    label: "Assignments ask learners to produce or exhibit",
    priority: "required",
    hint: "Avoid recall-only tasks. Ask learners to create, compare, critique, or apply.",
  },
  {
    id: "e4",
    label: "Publishing benchmark is defined",
    priority: "recommended",
    hint: "Set the grade threshold above which courseworks qualify for publishing.",
  },
];

const PUB: CheckItem[] = [
  {
    id: "p1",
    label: "Coursework title is publication-ready",
    priority: "recommended",
    hint: "Ask: would this hold up as a portfolio or research title? It should convey contribution, not just topic.",
  },
  {
    id: "p2",
    label: "Coursework description works as a problem statement",
    priority: "recommended",
    hint: "It maps to the publish model's 'statement' field. Answer: what problem is the learner solving, and why does it matter?",
  },
];

export function InskakulPlan() {
  return (
    <ActionPlanShell
      emoji="🎓"
      title="Instaskul Action Plan"
      description="Work through each section to optimise your school, courses, evaluation pipeline, and publishing readiness."
    >
      <CheckSection
        title="School profile"
        items={SCHOOL}
        tip="Use Studio text generation to draft and compare 3 school descriptions. Prompt: 'Write three 2-sentence school descriptions for educators offering [topic] to [audience].'"
      />
      <CheckSection
        title="Communication"
        items={COMMS}
        tip="Noticeboard titles perform best when they lead with a verb or a date. Try: 'Write 5 noticeboard post titles for a course starting next Monday in [subject].'"
      />
      <CheckSection
        title="Courses"
        items={COURSES}
        tip="Studio can generate a full tutorial structure. Try: 'Give me 4 tutorial titles, objectives, and 2-sentence descriptions for a course on [topic] for [audience].'"
      />
      <CheckSection
        title="Evaluation"
        items={EVAL}
        tip="For a course with 3 tutorials: each assignment covers one tutorial's scope; the coursework should synthesise all three — the whole should exceed its parts."
      />
      <CheckSection
        title="Publishing"
        items={PUB}
        tip="Design coursework titles and descriptions with the publish pipeline in mind from day one: title → project title, description → problem statement."
      />
    </ActionPlanShell>
  );
}
