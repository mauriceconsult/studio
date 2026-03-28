import { NextResponse } from "next/server";
import {getAllJobs} from "@/lib/job";

export async function GET() {
  const jobs = getAllJobs();
  return NextResponse.json(jobs);
}
