import { prisma } from "@/lib/db";

export default async function TestPage() {
  const voices = await prisma.voice.findMany();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Available Voices ({voices.length})
      </h1>
      {voices.map((v) => (
        <li key={v.id}>
          {v.name} = {v.variant}
        </li>
      ))}
    </div>
  );
}
