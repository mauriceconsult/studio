import { TextGenerationsLayout } from "@/features/text-generations/views/text-generations-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <TextGenerationsLayout>{children}</TextGenerationsLayout>;
}
