import { useCallback, useEffect, useRef, useState } from "react";
import katex from "katex";

/**
 * Hook to render text containing $...$ and $$...$$ as KaTeX
 */
export function useKaTeX() {
  const renderText = useCallback((text: string): string => {
    if (!text) return "";

    // Process display math $$...$$ first, then inline $...$
    let result = text;

    // Handle $$...$$ (display math)
    result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_match, latex) => {
      try {
        return katex.renderToString(latex.trim(), {
          displayMode: true,
          throwOnError: false,
          trust: true,
        });
      } catch {
        return `<code>${latex}</code>`;
      }
    });

    // Handle $...$ (inline math) — but avoid matching $$
    result = result.replace(/(?<!\$)\$(?![\$])([^$]+?)\$(?!\$)/g, (_match, latex) => {
      try {
        return katex.renderToString(latex.trim(), {
          displayMode: false,
          throwOnError: false,
          trust: true,
        });
      } catch {
        return `<code>${latex}</code>`;
      }
    });

    return result;
  }, []);

  const renderFormula = useCallback((formula: string): string => {
    if (!formula) return "";
    try {
      return katex.renderToString(formula, {
        displayMode: true,
        throwOnError: false,
        trust: true,
      });
    } catch {
      return `<code>${formula}</code>`;
    }
  }, []);

  return { renderText, renderFormula };
}
