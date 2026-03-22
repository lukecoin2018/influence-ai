// ─────────────────────────────────────────────────────────────
// app/discover/_components/EducationalContent.tsx
// ─────────────────────────────────────────────────────────────

interface EducationalContentProps {
  heading: string;
  paragraphs: string[];
}

export default function EducationalContent({
  heading,
  paragraphs,
}: EducationalContentProps) {
  return (
    <section className="mt-16 bg-gray-50 rounded-2xl px-8 py-10 border border-gray-100">
      <h2 className="text-2xl font-bold text-[#3A3A3A] mb-6">{heading}</h2>
      <div className="space-y-4 max-w-3xl">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-gray-600 leading-relaxed text-[15px]">
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}
