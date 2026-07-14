"use client";

import { useKaTeX } from "@/hooks/use-katex";

interface KaTeXTextProps {
  text: string;
  className?: string;
}

export function KaTeXText({ text, className = "" }: KaTeXTextProps) {
  const { renderText } = useKaTeX();
  const html = renderText(text);

  if (!html) return null;

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

interface KaTeXFormulaProps {
  formula: string;
  className?: string;
}

export function KaTeXFormula({ formula, className = "" }: KaTeXFormulaProps) {
  const { renderFormula } = useKaTeX();
  const html = renderFormula(formula);

  if (!html) return null;

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
