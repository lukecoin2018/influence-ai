// ─────────────────────────────────────────────────────────────
// app/discover/_components/EducationalContent.tsx
// Supports both simple (heading + paragraphs) and rich
// (sections with H2/H3/tables/bullets) content modes.
// All existing pages continue to work unchanged.
// ─────────────────────────────────────────────────────────────

export interface ContentSection {
  type: 'h2' | 'h3' | 'paragraph' | 'table' | 'bullets';
  content?: string;
  headers?: string[];
  rows?: string[][];
  items?: string[];
}

interface EducationalContentProps {
  heading: string;
  paragraphs?: string[];
  sections?: ContentSection[];
}

export default function EducationalContent({
  heading,
  paragraphs,
  sections,
}: EducationalContentProps) {

  // ── Rich content mode (sections provided) ─────────────────
  if (sections && sections.length > 0) {
    return (
      <section className="mt-16 bg-gray-50 rounded-2xl px-8 py-10 border border-gray-100">
        <div className="max-w-3xl">
          {sections.map((section, i) => {

            if (section.type === 'h2') {
              return (
                <h2
                  key={i}
                  className="text-2xl font-bold text-[#3A3A3A] mt-10 mb-4 first:mt-0"
                >
                  {section.content}
                </h2>
              );
            }

            if (section.type === 'h3') {
              return (
                <h3
                  key={i}
                  className="text-lg font-semibold text-[#3A3A3A] mt-7 mb-3"
                >
                  {section.content}
                </h3>
              );
            }

            if (section.type === 'paragraph') {
              return (
                <p
                  key={i}
                  className="text-gray-600 leading-relaxed text-[15px] mb-4"
                >
                  {section.content}
                </p>
              );
            }

            if (section.type === 'table' && section.headers && section.rows) {
              return (
                <div key={i} className="overflow-x-auto my-6">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        {section.headers.map((h, j) => (
                          <th
                            key={j}
                            className="text-left px-4 py-3 font-semibold text-[#3A3A3A] border border-gray-200"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, j) => (
                        <tr
                          key={j}
                          className={j % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          {row.map((cell, k) => (
                            <td
                              key={k}
                              className="px-4 py-3 text-gray-600 border border-gray-200"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            if (section.type === 'bullets' && section.items) {
              return (
                <ul
                  key={i}
                  className="list-disc list-inside space-y-2 my-4 text-gray-600 text-[15px]"
                >
                  {section.items.map((item, j) => (
                    <li key={j} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              );
            }

            return null;
          })}
        </div>
      </section>
    );
  }

  // ── Simple content mode (backward compatible) ──────────────
  return (
    <section className="mt-16 bg-gray-50 rounded-2xl px-8 py-10 border border-gray-100">
      <h2 className="text-2xl font-bold text-[#3A3A3A] mb-6">{heading}</h2>
      <div className="space-y-4 max-w-3xl">
        {(paragraphs ?? []).map((p, i) => (
          <p key={i} className="text-gray-600 leading-relaxed text-[15px]">
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}
