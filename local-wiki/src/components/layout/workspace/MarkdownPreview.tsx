
import ReactMarkdown, {
  defaultUrlTransform,
} from "react-markdown";

import remarkGfm from "remark-gfm";

import { remarkWikiLinks } from "@/components/editors/extensions/wiki-links/remarkWikiLinks";

interface MarkdownPreviewProps {
  content: string;
  onNavigate: (target: string) => void;
}

export function MarkdownPreview({
  content,
  onNavigate,
}: MarkdownPreviewProps) {
  return (
    <div className="h-full overflow-auto bg-gray-950 p-6 text-gray-100">
      <article className="wiki-markdown mx-auto max-w-3xl">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkWikiLinks]}
          urlTransform={(url) =>
                        url.startsWith("wiki:") || url.startsWith("def:")
                          ? url
                          : defaultUrlTransform(url)
                      }
          components={{
            a: ({ href, children, className }) => {
              // Definitions have their own appearance.
              // Navigation and hover cards will come later.
              if (href?.startsWith("def:")) {
                return (
                  <span className={className}>
                    {children}
                  </span>
                );
              }

              // Keep your existing wiki navigation.
              if (href?.startsWith("wiki:")) {
                const target = decodeURIComponent(href.slice(5));

                return (
                  <a
                    href="#"
                    className={className}
                    onClick={(event) => {
                      event.preventDefault();
                      void onNavigate(target);
                    }}
                  >
                    {children}
                  </a>
                );
              }

              return (
                <a href={href} className={className}>
                  {children}
                </a>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
