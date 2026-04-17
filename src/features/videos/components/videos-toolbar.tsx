"use client";

import { useState } from "react";
import { useQueryState } from "nuqs";
import { useDebouncedCallback } from "use-debounce";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { videosSearchParams } from "@/features/videos/lib/params";
import { VideoCreateDialog } from "./video-create-dialog";

export function VideosToolbar() {
  const [query, setQuery] = useQueryState("query", videosSearchParams.query);
  const [localQuery, setLocalQuery] = useState(query);
  const debouncedSetQuery = useDebouncedCallback(
    (v: string) => setQuery(v),
    300,
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl lg:text-2xl font-semibold tracking-tight">
          Your Videos
        </h2>
        <p className="text-sm text-muted-foreground">
          Generate and manage your AI tutorial videos
        </p>
      </div>

      <div className="flex items-center gap-3">
        <InputGroup className="lg:max-w-sm">
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search videos..."
            value={localQuery}
            onChange={(e) => {
              setLocalQuery(e.target.value);
              debouncedSetQuery(e.target.value);
            }}
          />
        </InputGroup>

        <div className="ml-auto hidden lg:block">
          <VideoCreateDialog>
            <Button size="sm">
              <Sparkles />
              New video
            </Button>
          </VideoCreateDialog>
        </div>

        <div className="ml-auto lg:hidden">
          <VideoCreateDialog>
            <Button size="sm">
              <Sparkles />
              New video
            </Button>
          </VideoCreateDialog>
        </div>
      </div>
    </div>
  );
}
