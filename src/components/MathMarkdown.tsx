"use client";

import React, { useMemo } from "react";
import katex from "katex";

function renderKatexSafe(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true,
    });
  } catch {
    return `<code>${latex}</code>`;
  }
}

export function LatexFormula({
  latex,
  displayMode = true,
  className = "",
}: {
  latex: string;
  displayMode?: boolean;
  className?: string;
}) {
  const html = useMemo(() => {
    const cleaned = latex
      .replace(/^\$\$\s*/, "")
      .replace(/\s*\$\$$/, "")
      .replace(/^\$\s*/, "")
      .replace(/\s*\$$/, "");
    return renderKatexSafe(cleaned, displayMode);
  }, [latex, displayMode]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Tokenizes LaTeX ($...$, $$...$$, \[...\], \(...\)) and code blocks BEFORE applying
 * Markdown rules so physics subscripts/superscripts like q_1, \varepsilon_0 never break!
 */
function convertMathMarkdownToHtml(source: string): string {
  if (!source) return "";

  const tokens: string[] = [];
  const pushToken = (html: string) => {
    const id = `@@MATHMDTOKEN_${tokens.length}@@`;
    tokens.push(html);
    return id;
  };

  // 1. Fenced code blocks ```lang ... ```
  let text = source.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, _lang, code) =>
    pushToken(
      `<pre class="my-2.5 overflow-x-auto rounded-lg border border-zinc-800 bg-black/80 p-3 font-mono text-xs text-zinc-200"><code>${escapeHtml(
        code.trim()
      )}</code></pre>`
    )
  );

  // 2. Display math $$...$$ and \[...\]
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) =>
    pushToken(
      `<div class="my-2.5 overflow-x-auto rounded-lg border border-zinc-800/80 bg-zinc-950/90 px-3.5 py-2 text-center">${renderKatexSafe(
        math,
        true
      )}</div>`
    )
  );
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, math) =>
    pushToken(
      `<div class="my-2.5 overflow-x-auto rounded-lg border border-zinc-800/80 bg-zinc-950/90 px-3.5 py-2 text-center">${renderKatexSafe(
        math,
        true
      )}</div>`
    )
  );

  // 3. Inline code `...`
  text = text.replace(/`([^`\n]+)`/g, (_, code) =>
    pushToken(
      `<code class="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-amber-300 border border-zinc-800">${escapeHtml(
        code
      )}</code>`
    )
  );

  // 4. Inline math $...$ and \(...\)
  text = text.replace(/\$([^\$\n]+?)\$/g, (_, math) =>
    pushToken(renderKatexSafe(math, false))
  );
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, math) =>
    pushToken(renderKatexSafe(math, false))
  );

  // 5. Escape remaining raw HTML safely
  text = escapeHtml(text);

  // 6. Markdown headings, bold, italic, links, lists
  const lines = text.split("\n");
  const formattedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("### ")) {
      return `<h4 class="mt-3 mb-1.5 text-sm font-semibold text-zinc-100">${trimmed.slice(4)}</h4>`;
    }
    if (trimmed.startsWith("## ")) {
      return `<h3 class="mt-3.5 mb-1.5 text-base font-semibold text-white">${trimmed.slice(3)}</h3>`;
    }
    if (trimmed.startsWith("# ")) {
      return `<h2 class="mt-4 mb-2 text-lg font-bold text-white">${trimmed.slice(2)}</h2>`;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return `<div class="ml-3 flex items-start gap-2 my-0.5"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/80"></span><span>${trimmed.slice(2)}</span></div>`;
    }
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      return `<div class="ml-2 flex items-start gap-2 my-0.5"><span class="font-mono text-xs text-amber-400/90 mt-0.5">${numMatch[1]}.</span><span>${numMatch[2]}</span></div>`;
    }
    if (trimmed === "") {
      return `<div class="h-2"></div>`;
    }
    return `<p class="leading-relaxed">${line}</p>`;
  });

  let html = formattedLines.join("");

  // Bold, italic, markdown links
  html = html.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong class="font-semibold text-zinc-100">$1</strong>'
  );
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-zinc-300">$1</em>');
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-amber-400 underline underline-offset-2 hover:text-amber-300">$1</a>'
  );

  // 7. Restore math & code tokens
  tokens.forEach((tok, idx) => {
    html = html.split(`@@MATHMDTOKEN_${idx}@@`).join(tok);
  });

  return html;
}

export function MathMarkdown({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  const html = useMemo(() => convertMathMarkdownToHtml(content), [content]);

  return (
    <div
      className={`text-sm text-zinc-300 space-y-0.5 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
