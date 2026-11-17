
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { wikiLinkCommands } from "./extensions/wiki-links/wikiLinkCommands";
import { wikiLinkNavigation } from "./extensions/wiki-links/wikiLinkNavigation";
import { wikiLinkDecorations } from "@/components/editors/extensions/wiki-links/wikiLinkDecorations";
import { implicitWikiLinks } from "./extensions/wiki-links/implicitWikiLinks";
import { definitionCommands } from "./extensions/definitions/definitionCommand";
import { definitionDecorations } from "./extensions/definitions/definitionDecorations";
import { useMemo } from "react";

interface TextEditorProps {
  content: string;
  onChange: (value: string) => void;
  onNavigate?: (target: string) => void;
}

export function TextEditor({
  content,
  onChange,
  onNavigate,
}: TextEditorProps) {

  const extensions = useMemo(
  () => [
    markdown(),
    wikiLinkCommands,
    definitionCommands,
    ...wikiLinkDecorations,
    ...definitionDecorations,
    ...(onNavigate ? [
      wikiLinkNavigation(onNavigate),
    ...implicitWikiLinks(onNavigate),
    ] 
    : []),
  ],
  [onNavigate]
);


  return (
    <div className="h-full min-h-0 overflow-auto">
      <CodeMirror
        value={content}
        height="100%"
        extensions={extensions}
        onChange={onChange}
        theme="dark"
      />
    </div>
  );
}
