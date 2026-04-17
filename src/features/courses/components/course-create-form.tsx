"use client";

import { useCallback, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const DESCRIPTION_MAX = 5000;

const courseCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),

  description: z
    .string()
    .min(1, "Description is required")
    .max(
      DESCRIPTION_MAX,
      `Description must be ${DESCRIPTION_MAX} characters or fewer`
    ),

tutorialCount: z.coerce
  .number()
  .int()
  .min(1, "At least 1 tutorial")
  .max(20, "Maximum 20 tutorials"),

tutorialLengthMinutes: z.coerce
  .number()
  .int()
  .min(1, "At least 1 minute")
  .max(60, "Maximum 60 minutes per tutorial"),
});

// useForm generic must match the raw input shape (strings from HTML inputs),
// not the parsed output shape — this resolves the Resolver type mismatch.
type CourseCreateFormInput = {
  title: string;
  description: string;
  tutorialCount: number | string;
  tutorialLengthMinutes: number | string;
};

export type CourseCreateFormValues = z.infer<typeof courseCreateSchema>;

interface CourseCreateFormProps {
  scrollable?: boolean;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  footer?: (submit: React.ReactNode) => React.ReactNode;
}

export function CourseCreateForm({
  scrollable,
  onSuccess,
  onError,
  footer,
}: CourseCreateFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CourseCreateFormInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(courseCreateSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      tutorialCount: 5,
      tutorialLengthMinutes: 10,
    },
  });

  const descriptionValue = watch("description");
  const descriptionLength = descriptionValue?.length ?? 0;

  const { mutateAsync } = useMutation(
    trpc.courses.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.courses.getAll.queryOptions({}));
      },
    }),
  );

  const onSubmit = useCallback(
    (values: CourseCreateFormInput) => {
      startTransition(async () => {
        try {
          const script = JSON.stringify({
            description: values.description,
            tutorialCount: Number(values.tutorialCount),
            tutorialLengthMinutes: Number(values.tutorialLengthMinutes),
          });
          await mutateAsync({ title: values.title, script });
          onSuccess?.();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Something went wrong";
          onError?.(message);
        }
      });
    },
    [mutateAsync, onSuccess, onError],
  );

  const submitButton = (
    <Button type="submit" size="sm" className="w-full" disabled={isPending}>
      {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
      {isPending ? "Generating..." : "Generate course"}
    </Button>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])}>
      <div className={cn("space-y-4 p-4", scrollable && "overflow-y-auto")}>
        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="course-title">Course title</Label>
          <Input
            id="course-title"
            placeholder="e.g. Introduction to Machine Learning"
            {...register("title")}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="course-description">Description</Label>
            <span
              className={cn(
                "text-xs tabular-nums text-muted-foreground",
                descriptionLength > DESCRIPTION_MAX && "text-destructive",
              )}
            >
              {descriptionLength} / {DESCRIPTION_MAX}
            </span>
          </div>
          <Textarea
            id="course-description"
            placeholder="Describe what this course should cover, the target audience, learning outcomes..."
            rows={5}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-xs text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Tutorial count + length — side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="tutorial-count">Number of tutorials</Label>
            <Input
              id="tutorial-count"
              type="number"
              min={1}
              max={20}
              {...register("tutorialCount")}
            />
            {errors.tutorialCount && (
              <p className="text-xs text-destructive">
                {errors.tutorialCount.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tutorial-length">Length per tutorial (min)</Label>
            <Input
              id="tutorial-length"
              type="number"
              min={1}
              max={60}
              {...register("tutorialLengthMinutes")}
            />
            {errors.tutorialLengthMinutes && (
              <p className="text-xs text-destructive">
                {errors.tutorialLengthMinutes.message}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Instaskul supports tutorials up to 500 MB. Longer tutorials may take
          more time to generate.
        </p>

        {!footer && submitButton}
      </div>

      {footer?.(submitButton)}
    </form>
  );
}
