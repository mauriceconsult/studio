"use client";

import { ActionPlanShell } from "../components/action-plan-shell";
import { CheckSection, type CheckItem } from "../components/check-list";

const SHOP: CheckItem[] = [
  {
    id: "sh1",
    label: "Shop name is clear and brand-appropriate",
    priority: "required",
    hint: "Avoid generic names like 'My Shop'. Use your actual business or product name.",
  },
  {
    id: "sh2",
    label: "Address and phone number are set",
    priority: "required",
    hint: "Customers and delivery riders need accurate contact and location details.",
  },
  {
    id: "sh3",
    label: "MoMo number is set for payouts",
    priority: "required",
    hint: "Payments route to this number. Verify it before accepting orders.",
  },
  {
    id: "sh4",
    label: "Currency and country are correctly configured",
    priority: "required",
    hint: "Incorrect currency settings affect pricing display and payment processing.",
  },
];

const STOREFRONT: CheckItem[] = [
  {
    id: "sf1",
    label: "At least one billboard is set",
    priority: "required",
    hint: "Your storefront hero image is the first thing customers see. A missing billboard signals an incomplete store.",
  },
  {
    id: "sf2",
    label: "Billboard image is high resolution and on-brand",
    priority: "recommended",
    hint: "Use Studio image generation to create a clean promotional banner for your main product category.",
  },
];

const CATALOGUE: CheckItem[] = [
  {
    id: "ca1",
    label: "Products are organised into categories",
    priority: "required",
    hint: "Categories drive discovery. Create categories before listing products.",
  },
  {
    id: "ca2",
    label: "Each product has a name, price, and image",
    priority: "required",
    hint: "Incomplete product listings are not shown to customers. All three fields are required for visibility.",
  },
  {
    id: "ca3",
    label: "Featured products are set",
    priority: "recommended",
    hint: "Featured products appear prominently on your storefront. Choose your best sellers or newest arrivals.",
  },
  {
    id: "ca4",
    label: "Sizes and colours are configured where applicable",
    priority: "recommended",
    hint: "If your products come in variants, set these up before listing to avoid customer confusion at checkout.",
  },
  {
    id: "ca5",
    label: "No products are accidentally archived",
    priority: "recommended",
    hint: "Archived products are hidden. Review your archive regularly to avoid missing sales.",
  },
];

const DELIVERY: CheckItem[] = [
  {
    id: "d1",
    label: "Delivery method is configured",
    priority: "required",
    hint: "Customers need to know how they'll receive their order before they can complete checkout.",
  },
  {
    id: "d2",
    label: "Delivery cost is set accurately",
    priority: "required",
    hint: "Undercharging for delivery erodes margins. Overcharging loses sales. Confirm cost with your rider or courier.",
  },
];

export function VendlyPlan() {
  return (
    <ActionPlanShell
      emoji="🛍️"
      title="Vendly Action Plan"
      description="Set up your store end-to-end — from shop settings to catalogue and delivery — so customers can find, buy, and receive your products."
    >
      <CheckSection
        title="Shop settings"
        items={SHOP}
        tip="Use Studio text generation to write a shop description: 'Write a 2-sentence shop description for a [type] store selling [products] in [location].'"
      />
      <CheckSection
        title="Storefront"
        items={STOREFRONT}
        tip="Studio image generation can produce a billboard banner. Try: 'Create a clean promotional banner for a [product type] store, minimal background, bold product in centre.'"
      />
      <CheckSection
        title="Catalogue"
        items={CATALOGUE}
        tip="Write product descriptions in Studio: 'Write a 2-sentence product description for [product name] that highlights its key benefit and who it's for.'"
      />
      <CheckSection
        title="Delivery"
        items={DELIVERY}
        tip="If you're using Dukaboda for delivery, connect your store to the rider network and confirm delivery cost ranges by vehicle type before going live."
      />
    </ActionPlanShell>
  );
}
