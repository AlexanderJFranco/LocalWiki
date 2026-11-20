
import ReactMarkdown, {
  defaultUrlTransform,
} from "react-markdown";

import remarkGfm from "remark-gfm";

import { remarkWikiLinks } from "@/components/editors/extensions/wiki-links/remarkWikiLinks";
import { useLibraryIndex } from "@/contexts/LibraryIndexContext";
import type { LibraryEntryKind } from "@/types/libraryIndex";

  interface MarkdownPreviewProps {
    content: string;
    onNavigate: (target: string) => void;
    onNavigateDefinition: (target: string) => void;
    onOpenIndexedLink: (
      relativePath: string,
      kind: LibraryEntryKind
    ) => void;
  }
  function stripFrontmatter(markdown: string): string {
    return markdown.replace(
      /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/,
      ""
    );
  }
  export function MarkdownPreview({
    content,
    onNavigate,
    onNavigateDefinition,
    onOpenIndexedLink,
  }: MarkdownPreviewProps) {
    const { index } = useLibraryIndex();

    return (
      <div className="h-full overflow-auto bg-[#e6ecf5] p-6 text-black-100">
        <article className="wiki-markdown mx-auto max-w-3xl">
          <ReactMarkdown
            remarkPlugins={[
              remarkGfm,
              [remarkWikiLinks, index.entries],
            ]}
            urlTransform={(url) =>
              url.startsWith("wiki:") ||
              url.startsWith("def:") ||
              url.startsWith("indexed:")
                ? url
                : defaultUrlTransform(url)
            }
            components={{
              a: ({ href, children, className }) => {
                // Implicit links already have an exact path.
                if (href?.startsWith("indexed:")) {
                  const relativePath = decodeURIComponent(
                    href.slice("indexed:".length)
                  );

                  const isDefinition =
                    className?.includes("definition-link");

                  const kind: LibraryEntryKind =
                    isDefinition ? "definition" : "document";

                  return (
                    <a
                      href="#"
                      className={className}
                      onClick={(event) => {
                        event.preventDefault();
                        void onOpenIndexedLink(
                          relativePath,
                          kind
                        );
                      }}
                    >
                      {children}
                    </a>
                  );
                }

                // Explicit definition links.
                if (href?.startsWith("def:")) {
                  const target = decodeURIComponent(
                    href.slice(4)
                  );

                  return (
                    <a
                      href="#"
                      className={className}
                      onClick={(event) => {
                        event.preventDefault();
                        void onNavigateDefinition(target);
                      }}
                    >
                      {children}
                    </a>
                  );
                }

                // Explicit document links.
                if (href?.startsWith("wiki:")) {
                  const target = decodeURIComponent(
                    href.slice(5)
                  );

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

                // Ordinary Markdown links.
                return (
                  <a href={href} className={className}>
                    {children}
                  </a>
                );
              },
            }}
          >
            {stripFrontmatter(content)}
          </ReactMarkdown>
        </article>
      </div>
    );
  }
