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

const SCRIPT_MAX = 5000;

const videoCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  script: z
    .string()
    .min(1, "Script is required")
    .max(SCRIPT_MAX, `Script must be ${SCRIPT_MAX} characters or fewer`),
});

export type VideoCreateFormValues = z.infer<typeof videoCreateSchema>;

interface VideoCreateFormProps {
  scrollable?: boolean;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  footer?: (submit: React.ReactNode) => React.ReactNode;
}

export function VideoCreateForm({
  scrollable,
  onSuccess,
  onError,
  footer,
}: VideoCreateFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<VideoCreateFormValues>({
    resolver: zodResolver(videoCreateSchema),
    defaultValues: { title: "", script: "" },
  });

  const scriptValue = watch("script");
  const scriptLength = scriptValue?.length ?? 0;

  const { mutateAsync } = useMutation(
    trpc.videos.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.videos.getAll.queryOptions({}));
      },
    }),
  );

  const onSubmit = useCallback(
    (values: VideoCreateFormValues) => {
      startTransition(async () => {
        try {
          await mutateAsync(values);
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
      {isPending ? "Generating..." : "Generate video"}
    </Button>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className={cn("space-y-4 p-4", scrollable && "overflow-y-auto")}>
        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="video-title">Video title</Label>
          <Input
            id="video-title"
            placeholder="e.g. How to set up a React project"
            {...register("title")}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        {/* Script */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="video-script">Script / prompt</Label>
            <span
              className={cn(
                "text-xs tabular-nums text-muted-foreground",
                scriptLength > SCRIPT_MAX && "text-destructive",
              )}
            >
              {scriptLength} / {SCRIPT_MAX}
            </span>
          </div>
          <Textarea
            id="video-script"
            placeholder="Write a full script or a high-level prompt describing what the video should cover..."
            rows={6}
            {...register("script")}
          />
          {errors.script && (
            <p className="text-xs text-destructive">{errors.script.message}</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          The AI will narrate your script and generate a tutorial video.
          Generation typically takes a few minutes.
        </p>

        {!footer && submitButton}
      </div>

      {footer?.(submitButton)}
    </form>
  );
}
