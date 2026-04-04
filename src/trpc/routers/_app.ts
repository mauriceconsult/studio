import { createTRPCRouter } from "../init";
import { billingRouter } from "./billing";
import { generationsRouter } from "./generations";
import { voicesRouter } from "./voices";
import { coursesRouter } from "@/features/courses/courses-router";
import { videosRouter } from "@/features/videos/videos-router";

export const appRouter = createTRPCRouter({
  voices: voicesRouter,
  generations: generationsRouter,
  billing: billingRouter,
  courses: coursesRouter, 
  videos: videosRouter, 
});
// export type definition of API
export type AppRouter = typeof appRouter;
