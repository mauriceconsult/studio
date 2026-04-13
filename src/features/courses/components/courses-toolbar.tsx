"use client";

import { useState } from "react";
import { useQueryState } from "nuqs";
import { useDebouncedCallback } from "use-debounce";
import { Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/ui/input-group";
import { coursesSearchParams } from "@/features/courses/lib/params";

export function CoursesToolbar() {
  const router = useRouter();
  const [query, setQuery] = useQueryState("query", coursesSearchParams.query);
  const [localQuery, setLocalQuery] = useState(query);
  const debouncedSetQuery = useDebouncedCallback((v: string) => setQuery(v), 300);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl lg:text-2xl font-semibold tracking-tight">Your Courses</h2>
        <p className="text-sm text-muted-foreground">Generate and manage your AI course modules</p>
      </div>
      <div className="flex items-center gap-3">
        <InputGroup className="lg:max-w-sm">
          <InputGroupAddon><Search className="size-4" /></InputGroupAddon>
          <InputGroupInput
            placeholder="Search courses..."
            value={localQuery}
            onChange={(e) => { setLocalQuery(e.target.value); debouncedSetQuery(e.target.value); }}
          />
        </InputGroup>
        <div className="ml-auto">
          <Button size="sm" onClick={() => router.push("/")}>
            <Sparkles />New course
          </Button>
        </div>
      </div>
    </div>
  );
}
