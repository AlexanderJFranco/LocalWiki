
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

interface DefinitionPopoverProps {
  initialTerm: string;
   mode?: "full" | "quick",
  onCreate: (
    term: string,
    definition: string
  ) => Promise<void>;
  onCancel: () => void;
}

export function DefinitionPopover({
  initialTerm,
  mode="full",
  onCreate,
  onCancel,
  
}: DefinitionPopoverProps) {
  const [term, setTerm] = useState(initialTerm);
  const [definition, setDefinition] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const termInputRef = useRef<HTMLInputElement>(null);
  const definitionInputRef = useRef<HTMLTextAreaElement>(null);

  // Focus the appropriate input when the popover opens.
  useEffect(() => {
    if (initialTerm.trim()) {
      definitionInputRef.current?.focus();
    } else {
      termInputRef.current?.focus();
    }
  }, [initialTerm]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) return;

    const cleanTerm = term.trim();
    const cleanDefinition = definition.trim();

    if (!cleanTerm) {
      setError("Please provide a term.");
      termInputRef.current?.focus();
      return;
    }

    if (mode === "full" && !cleanDefinition) {
      setError("Please provide a definition.");
      definitionInputRef.current?.focus();
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onCreate(cleanTerm, cleanDefinition);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : String(err)
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLFormElement>
  ) {
    if (event.key === "Escape" && !isSaving) {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    }
  }

  return (
    <form
      autoComplete="off"
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="
        w-80 max-w-[calc(100vw-1rem)]
        rounded-lg border border-gray-700
        bg-gray-900 p-4 text-gray-100
        shadow-2xl
      "
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-green-400">
          Create Definition
        </h3>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          aria-label="Close definition editor"
          className="
            rounded px-2 py-1 text-gray-400
            hover:bg-gray-800 hover:text-white
            disabled:opacity-50
          "
        >
          ×
        </button>
      </div>

      {/* Term */}
      <div className="mb-3">
        <label
          htmlFor="definition-term"
          className="mb-1 block text-xs text-gray-400"
        >
          Term
        </label>

        <input
          id="definition-term"
          ref={termInputRef}
          type="text"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setError(null);
          }}
          disabled={isSaving}
          placeholder="e.g. Ownership"
          className="
            w-full rounded-md border border-gray-700
            bg-gray-800 px-3 py-2 text-sm
            outline-none focus:border-green-500
            disabled:opacity-50
          "
        />
      </div>

      {/* Definition */}
      {mode === "full" && (
        
      <div className="mb-3">
        <label
          htmlFor="definition-content"
          className="mb-1 block text-xs text-gray-400"
        >
          Definition
        </label>

        <textarea
          id="definition-content"
          ref={definitionInputRef}
          value={definition}
          onChange={(event) => {
            setDefinition(event.target.value);
            setError(null);
          }}
          disabled={isSaving}
          rows={5}
          placeholder="Enter a definition..."
          className="
            w-full resize-y rounded-md
            border border-gray-700 bg-gray-800
            px-3 py-2 text-sm
            outline-none focus:border-green-500
            disabled:opacity-50
          "
        />
      </div>
      )}

      {/* Validation and filesystem errors */}
      {error && (
        <p
          role="alert"
          className="mb-3 text-xs text-red-400"
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="
            rounded-md px-3 py-2 text-xs
            text-gray-300 hover:bg-gray-800
            disabled:opacity-50
          "
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={
            isSaving ||
            !term.trim() ||
            !definition.trim() ||
            (mode === "full" && !definition.trim())
          }
          className="
            rounded-md bg-green-700 px-3 py-2
            text-xs font-medium text-white
            hover:bg-green-600
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          { isSaving 
          ? "Creating..." 
          : mode === "quick"
          ? "Create Placeholder"
          : "Create Definition"

          }
        </button>
      </div>
    </form>
  );
}
