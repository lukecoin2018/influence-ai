// @ts-nocheck
"use client";

// Place at: components/tools/contract/ContractPreview.tsx
// Import changes: @/contexts/ContractContext → props, @/data/* → @/lib/*
// jsPDF loaded client-side on demand (same pattern as LMG-ICG)
// Note: run `npm install jspdf` in your project

import { ContractState } from "@/lib/contract";
import { CLAUSE_LIBRARY } from "@/lib/clause-library";

interface ContractPreviewProps {
  contract: ContractState;
  onBack: () => void;
}

export function ContractPreview({ contract, onBack }: ContractPreviewProps) {
  // Build sections with processed text
  const contractSections = contract.clauses.map((clause: { sectionId: string; variationId: string; variableValues: Record<string, any> }) => {
    const section = CLAUSE_LIBRARY.find(s => s.id === clause.sectionId);
    const variation = section?.variations.find(v => v.id === clause.variationId);
    if (!section || !variation) return null;

    let processedText = variation.legalText;
    variation.variables.forEach((variable: { id: string; type: string }) => {
      const value = clause.variableValues[variable.id];
      const placeholder = `{{${variable.id}}}`;
      let formatted = value;
      if (variable.type === 'number' && variable.id.toLowerCase().includes('amount')) {
        formatted = `$${Number(value).toLocaleString()}`;
      } else if (variable.type === 'date' && value) {
        formatted = new Date(value).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        });
      }
      processedText = processedText.replace(new RegExp(placeholder, 'g'), formatted ?? '');
    });

    return { section, variation, processedText };
  }).filter(Boolean);

  const partiesClause = contract.clauses.find(c => c.sectionId === 'parties');
  const creatorName = partiesClause?.variableValues?.creatorName || '[Creator Name]';
  const brandName = partiesClause?.variableValues?.brandName || '[Brand Name]';
  const creatorBusinessName = partiesClause?.variableValues?.creatorBusinessName;
  const brandContactName = partiesClause?.variableValues?.brandContactName;

  const handleDownloadPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    const addText = (text: string, fontSize = 11, bold = false, center = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        if (y > pageHeight - margin) { doc.addPage(); y = margin; }
        const x = center ? (pageWidth - doc.getTextWidth(line)) / 2 : margin;
        doc.text(line, x, y);
        y += fontSize * 0.5;
      });
      y += 3;
    };

    addText('INFLUENCER MARKETING AGREEMENT', 18, true, true);
    y += 5;
    addText(`Between: ${creatorName} ("Creator")`, 10, false, true);
    addText(`And: ${brandName} ("Brand")`, 10, false, true);
    addText(`Effective Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 10, false, true);
    y += 10;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    contractSections.forEach((item: any) => {
      if (!item) return;
      addText(`${item.section.order}. ${item.section.title.toUpperCase()}`, 14, true);
      y += 2;
      addText(item.processedText, 11);
      y += 5;
    });

    // General provisions
    addText(`${contractSections.length + 1}. GENERAL PROVISIONS`, 14, true);
    y += 2;
    addText('Governing Law: This Agreement shall be governed by and construed in accordance with the laws of [Jurisdiction].', 11);
    y += 3;
    addText('Entire Agreement: This Agreement constitutes the entire agreement between the parties.', 11);
    y += 3;
    addText('Amendments: This Agreement may only be amended by a written agreement signed by both parties.', 11);
    y += 3;
    addText('Severability: If any provision is held invalid, remaining provisions remain in full force.', 11);
    y += 10;

    // Signatures
    if (y > pageHeight - 80) { doc.addPage(); y = margin; }
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    const colWidth = (pageWidth - margin * 3) / 2;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('CREATOR:', margin, y);
    doc.text('BRAND:', margin + colWidth + margin, y);
    y += 15;
    doc.line(margin, y, margin + colWidth - 10, y);
    doc.line(margin + colWidth + margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    doc.text(creatorName, margin, y);
    doc.text(brandName, margin + colWidth + margin, y);
    if (creatorBusinessName) { y += 5; doc.setFontSize(9); doc.text(creatorBusinessName, margin, y); }
    if (brandContactName) { doc.setFontSize(9); doc.text(brandContactName, margin + colWidth + margin, y); }
    y += 10;
    doc.setFontSize(10);
    doc.text('Date: _________________', margin, y);
    doc.text('Date: _________________', margin + colWidth + margin, y);

    const fileName = `${brandName.replace(/[^a-z0-9]/gi, '_')}_${creatorName.replace(/[^a-z0-9]/gi, '_')}_Contract.pdf`;
    doc.save(fileName);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1" style={{ color: '#3A3A3A' }}>Preview Your Contract</h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Review before downloading. Make sure all details are correct.
        </p>
      </div>

      {/* Contract document */}
      <div className="bg-white rounded-2xl shadow-lg mb-6 p-10"
        style={{ border: '1px solid #E5E7EB' }}>
        {/* Contract header */}
        <div className="text-center mb-10 pb-8" style={{ borderBottom: '2px solid #E5E7EB' }}>
          <h1 className="text-2xl font-bold mb-4" style={{ color: '#111827' }}>
            INFLUENCER MARKETING AGREEMENT
          </h1>
          <div className="text-sm space-y-1" style={{ color: '#4B5563' }}>
            <p>Between: <span className="font-semibold">{creatorName}</span> ("Creator")</p>
            <p>And: <span className="font-semibold">{brandName}</span> ("Brand")</p>
            <p className="mt-3">
              Effective Date:{' '}
              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {contractSections.map((item: any, _idx: number) => {
            if (!item) return null;
            const { section, variation, processedText } = item;
            return (
              <div key={section.id}>
                <h2 className="text-lg font-bold mb-3" style={{ color: '#111827' }}>
                  {section.order}. {section.title}
                </h2>
                <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
                  {processedText}
                </div>
                {variation.redFlags && variation.redFlags.length > 0 && (
                  <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#FEF2F2', borderLeft: '4px solid #EF4444' }}>
                    <p className="font-semibold text-sm mb-2" style={{ color: '#991B1B' }}>⚠️ Important Notice:</p>
                    <ul className="text-sm space-y-1" style={{ color: '#B91C1C' }}>
                      {variation.redFlags.map((flag: { message: string }, idx: number) => (
                        <li key={idx}>• {flag.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}

          {/* General provisions */}
          <div>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#111827' }}>
              {contractSections.length + 1}. General Provisions
            </h2>
            <div className="text-sm leading-relaxed space-y-3" style={{ color: '#374151' }}>
              <p><strong>Governing Law:</strong> This Agreement shall be governed by and construed in accordance with the laws of [Jurisdiction], without regard to its conflict of law provisions.</p>
              <p><strong>Entire Agreement:</strong> This Agreement constitutes the entire agreement between the parties and supersedes all prior understandings and agreements.</p>
              <p><strong>Amendments:</strong> This Agreement may only be amended or modified by a written agreement signed by both parties.</p>
              <p><strong>Severability:</strong> If any provision is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</p>
              <p><strong>Counterparts:</strong> This Agreement may be executed in counterparts, each of which shall be deemed an original.</p>
            </div>
          </div>

          {/* Signature block */}
          <div className="mt-10 pt-8" style={{ borderTop: '2px solid #E5E7EB' }}>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="font-bold mb-8 text-sm" style={{ color: '#111827' }}>CREATOR:</p>
                <div className="pt-2" style={{ borderTop: '1px solid #9CA3AF' }}>
                  <p className="font-semibold text-sm" style={{ color: '#111827' }}>{creatorName}</p>
                  {creatorBusinessName && (
                    <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{creatorBusinessName}</p>
                  )}
                </div>
                <p className="text-xs mt-4" style={{ color: '#6B7280' }}>Date: _________________</p>
              </div>
              <div>
                <p className="font-bold mb-8 text-sm" style={{ color: '#111827' }}>BRAND:</p>
                <div className="pt-2" style={{ borderTop: '1px solid #9CA3AF' }}>
                  <p className="font-semibold text-sm" style={{ color: '#111827' }}>{brandName}</p>
                  {brandContactName && (
                    <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{brandContactName}</p>
                  )}
                </div>
                <p className="text-xs mt-4" style={{ color: '#6B7280' }}>Date: _________________</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}
        >
          ← Back to Customize
        </button>
        <button
          onClick={handleDownloadPDF}
          className="px-8 py-3 rounded-xl font-bold text-sm transition-all"
          style={{ backgroundColor: '#FFD700', color: '#3A3A3A' }}
        >
          📥 Download PDF
        </button>
      </div>

      {/* Disclaimer */}
      <div className="p-4 rounded-xl text-xs" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
        <strong style={{ color: '#92400E' }}>⚠️ Legal Disclaimer:</strong>{' '}
        <span style={{ color: '#78350F' }}>
          This contract template is provided for informational purposes only and does not constitute legal advice.
          We strongly recommend having this agreement reviewed by a qualified attorney before signing,
          especially for high-value partnerships or complex arrangements.
        </span>
      </div>
    </div>
  );
}
