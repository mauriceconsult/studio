"use client";

import { ActionPlanShell } from "../components/action-plan-shell";
import { CheckSection, type CheckItem } from "../components/check-list";

const PROFILE: CheckItem[] = [
  {
    id: "dp1",
    label: "Full name is set correctly",
    priority: "required",
    hint: "Your name is shown to shop owners when you accept a job. Use your real name.",
  },
  {
    id: "dp2",
    label: "Phone number is a valid MoMo number",
    priority: "required",
    hint: "Earnings are paid directly to this number. Verify it before your first delivery.",
  },
  {
    id: "dp3",
    label: "Vehicle type is correctly selected",
    priority: "required",
    hint: "Pricing and job matching depend on vehicle type. Bicycles, motorcycles, and cars have different rate structures.",
  },
  {
    id: "dp4",
    label: "Application has been submitted and approved",
    priority: "required",
    hint: "You cannot accept jobs until a shop owner approves your application. Check your status in the pending screen.",
  },
];

const RATES: CheckItem[] = [
  {
    id: "dr1",
    label: "Bicycle delivery rate is understood",
    priority: "required",
    hint: "Bicycles are suited to short distances. Confirm the rate for your operating area before accepting jobs.",
  },
  {
    id: "dr2",
    label: "Motorcycle delivery rate is understood",
    priority: "required",
    hint: "Motorcycles (boda) are the primary vehicle on the network. Rates reflect speed and range.",
  },
  {
    id: "dr3",
    label: "Car delivery rate is understood",
    priority: "required",
    hint: "Cars handle large or fragile items. Rates are higher — confirm with the shop before accepting.",
  },
];

const OPERATIONS: CheckItem[] = [
  {
    id: "do1",
    label: "App is open when you are available",
    priority: "required",
    hint: "Jobs are only offered when you are marked active. Toggle your status before starting your shift.",
  },
  {
    id: "do2",
    label: "Pickup and dropoff addresses are confirmed before accepting",
    priority: "required",
    hint: "Review the job details fully before accepting. Distance and location determine whether the job is profitable for your vehicle type.",
  },
  {
    id: "do3",
    label: "Job status is updated at each stage",
    priority: "required",
    hint: "Update to 'picked up' when you collect the order and 'delivered' when you complete it. Accurate status protects your rating.",
  },
  {
    id: "do4",
    label: "Rating is maintained above threshold",
    priority: "recommended",
    hint: "A low rating reduces the jobs offered to you. Communicate with the shop if there are delays.",
  },
];

export function DukabodaPlan() {
  return (
    <ActionPlanShell
      emoji="🛵"
      title="Dukaboda Action Plan"
      description="Get approved, understand your rates, and operate your delivery business professionally from day one."
    >
      <CheckSection
        title="Rider profile"
        items={PROFILE}
        tip="Your profile is your first impression to shop owners. A complete, accurate profile gets approved faster and earns better job offers."
      />
      <CheckSection
        title="Delivery rates"
        items={RATES}
        tip="Rates vary by vehicle and distance. Confirm the current rate table in the app before committing to jobs — fuel and time costs must be covered by the delivery fee."
      />
      <CheckSection
        title="Operations"
        items={OPERATIONS}
        tip="Consistent status updates build your rating. Riders with high ratings are offered jobs first when multiple riders are available in the same area."
      />
    </ActionPlanShell>
  );
}
