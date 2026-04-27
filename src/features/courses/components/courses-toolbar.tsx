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
import { coursesSearchParams } from "@/features/courses/lib/params";
import { CourseCreateDialog } from "./course-create-dialog";

export function CoursesToolbar() {
  const [query, setQuery] = useQueryState("query", coursesSearchParams.query);
  const [localQuery, setLocalQuery] = useState(query);
  const debouncedSetQuery = useDebouncedCallback(
    (v: string) => setQuery(v),
    300,
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl lg:text-2xl font-semibold tracking-tight">
          Your Courses
        </h2>
        <p className="text-sm text-muted-foreground">
          Generate and manage your AI course modules
        </p>
      </div>

      <div className="flex items-center gap-3">
        <InputGroup className="lg:max-w-sm">
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search courses..."
            value={localQuery}
            onChange={(e) => {
              setLocalQuery(e.target.value);
              debouncedSetQuery(e.target.value);
            }}
          />
        </InputGroup>

        <div className="ml-auto hidden lg:block">
          <CourseCreateDialog>
            <Button size="sm">
              <Sparkles />
              New course
            </Button>
          </CourseCreateDialog>
        </div>

        <div className="ml-auto lg:hidden">
          <CourseCreateDialog>
            <Button size="sm">
              <Sparkles />
              New course
            </Button>
          </CourseCreateDialog>
        </div>
      </div>
    </div>
  );
}
