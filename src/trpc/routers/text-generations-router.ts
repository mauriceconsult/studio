import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { polar } from "@/lib/polar";
import { env } from "@/lib/env";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/db";
import { createTRPCRouter, orgProcedure } from "../init";

// ─── Constants ────────────────────────────────────────────────────────────────

const GENERATION_TYPES = [
  "description",  // beat or article standfirst
  "headline",     // article headline suggestions
  "script",       // video/podcast script
  "captions",     // gallery image captions
  "body",         // full article body copy
] as const;

type TextGenerationType = (typeof GENERATION_TYPES)[number];

// Max input prompt length per type — prevents abuse, keeps costs predictable
const PROMPT_MAX: Record<TextGenerationType, number> = {
  description: 500,
  headline:    300,
  script:      2000,
  captions:    800,
  body:        1000,
};

// ─── Input schema ─────────────────────────────────────────────────────────────

const createTextSchema = z.object({
  type:           z.enum(GENERATION_TYPES),
  prompt:         z.string().min(10).max(2000),
  // Source context
  sourceApp:      z.string().default("zuriah"),
  sourceEntityId: z.string().optional(),
  platformUserId: z.string().optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const textGenerationsRouter = createTRPCRouter({
  getAll: orgProcedure.query(async ({ ctx }) => {
    return prisma.textGeneration.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const record = await prisma.textGeneration.findUnique({
        where: { id: input.id, orgId: ctx.orgId },
        omit: { orgId: true },
      });
      if (!record) throw new TRPCError({ code: "NOT_FOUND" });
      return record;
    }),

  // Fetch recent completed generations for a source entity
  // Used by Zuriah to show "previously generated" suggestions
  getBySourceEntity: orgProcedure
    .input(
      z.object({
        sourceEntityId: z.string(),
        type: z.enum(GENERATION_TYPES).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return prisma.textGeneration.findMany({
        where: {
          orgId: ctx.orgId,
          sourceEntityId: input.sourceEntityId,
          status: "COMPLETED",
          ...(input.type ? { type: input.type } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, type: true, output: true, createdAt: true },
      });
    }),

  create: orgProcedure
    .input(createTextSchema)
    .mutation(async ({ input, ctx }) => {
      // Enforce per-type prompt length
      const maxLength = PROMPT_MAX[input.type];
      if (input.prompt.length > maxLength) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Prompt too long for type "${input.type}" (max ${maxLength} chars)`,
        });
      }

      // ── 1. Subscription gate ─────────────────────────────────────────────────
      try {
        const customerState = await polar.customers.getStateExternal({
          externalId: ctx.orgId,
        });
        if ((customerState.activeSubscriptions ?? []).length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "SUBSCRIPTION_REQUIRED",
          });
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "SUBSCRIPTION_REQUIRED",
        });
      }

      // ── 2. Create record (PENDING) ───────────────────────────────────────────
      const record = await prisma.textGeneration.create({
        data: {
          orgId: ctx.orgId,
          platformUserId: input.platformUserId ?? null,
          type: input.type,
          prompt: input.prompt,
          status: "PENDING",
          sourceApp: input.sourceApp,
          sourceEntityId: input.sourceEntityId ?? null,
        },
        select: { id: true },
      });

      Sentry.logger.info("Text generation started", {
        orgId: ctx.orgId,
        recordId: record.id,
        type: input.type,
      });

      // ── 3. Call LLM ──────────────────────────────────────────────────────────
      let output: string | null = null;
      let tokensUsed: number | null = null;

      try {
        await prisma.textGeneration.update({
          where: { id: record.id },
          data: { status: "PROCESSING" },
        });

        // ── Placeholder: call your LLM here (Anthropic, OpenAI, etc.) ─────────
        // const response = await anthropic.messages.create({
        //   model:      "claude-opus-4-6",
        //   max_tokens: maxOutputTokens(input.type),
        //   system:     systemPrompt(input.type),
        //   messages:   [{ role: "user", content: input.prompt }],
        // });
        // output     = response.content[0].type === "text" ? response.content[0].text : null;
        // tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
        // ── End placeholder ───────────────────────────────────────────────────

        await prisma.textGeneration.update({
          where: { id: record.id },
          data: {
            status: "COMPLETED",
            output,
            tokensUsed: tokensUsed ?? null,
          },
        });

        // ── 4. UsageRecord (polymorphic — textGenerationId FK) ────────────────
        await prisma.usageRecord.create({
          data: {
            orgId: ctx.orgId,
            textGenerationId: record.id,
            tokensUsed: tokensUsed ?? 0,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
          },
        });

        Sentry.logger.info("Text generation completed", {
          orgId: ctx.orgId,
          recordId: record.id,
          tokens: tokensUsed,
        });
      } catch (err) {
        await prisma.textGeneration
          .update({
            where: { id: record.id },
            data: {
              status: "FAILED",
              errorMessage:
                err instanceof Error ? err.message : "Unknown error",
            },
          })
          .catch(() => {});

        Sentry.logger.error("Text generation failed", {
          orgId: ctx.orgId,
          recordId: record.id,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate text",
        });
      }

      // ── 5. Meter via Polar ───────────────────────────────────────────────────
      polar.events
        .ingest({
          events: [
            {
              name: env.POLAR_METER_TEXT_GENERATION,
              externalCustomerId: ctx.orgId,
              metadata: {
                textGenerationId: record.id,
                type: input.type,
                tokensUsed: String(tokensUsed ?? 0),
              },
              timestamp: new Date(),
            },
          ],
        })
        .catch(() => {});

      return { id: record.id, output };
    }),
});

// ─── LLM helpers ─────────────────────────────────────────────────────────────

/** System prompts per generation type — editorial journalism voice throughout */
export function systemPrompt(type: TextGenerationType): string {
  const base =
    "You are an editorial AI assistant for Zuriah, a professional journalism platform. " +
    "Write with the authoritative, precise voice of The Economist or The New York Times. " +
    "Never add preamble, meta-commentary, or sign-offs — output only the requested content.";

  const typeInstructions: Record<TextGenerationType, string> = {
    description:
      `${base} Write a standfirst: 2–3 sentences that hook the reader, summarise the story's significance, and signal the editorial angle.`,
    headline:
      `${base} Write 3 headline options. Each must be under 12 words, specific, and avoid clickbait. Return as a numbered list.`,
    script:
      `${base} Write a broadcast-quality script. Include natural pauses, clear transitions, and a strong opening hook. Aim for the specified duration.`,
    captions:
      `${base} Write concise, informative captions. Each caption should identify what is shown and add editorial context not visible in the image itself.`,
    body:
      `${base} Write a long-form article body. Use inverted pyramid structure. Include subheadings. Cite context and significance. 600–900 words.`,
  };

  return typeInstructions[type];
}

/** Max output tokens per generation type */
export function maxOutputTokens(type: TextGenerationType): number {
  const limits: Record<TextGenerationType, number> = {
    description: 200,
    headline:    150,
    script:      2000,
    captions:    400,
    body:        1200,
  };
  return limits[type];
}
