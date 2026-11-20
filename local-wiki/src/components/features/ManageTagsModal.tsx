
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { createTag, getTags } from "@/lib/tags";
import { getDocumentTags } from "@/lib/documentTags";
import { deleteEntry } from "@/lib/tauri";
import { ask } from "@tauri-apps/plugin-dialog";
import type { WikiTag } from "@/types/tag";
import { IoCloseCircleOutline } from "react-icons/io5";

interface ManageTagsModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Null when no document is open.
  documentId: string | null;
  documentContent: string;

  onApply: (tags: string[]) => void;
}

export function ManageTagsModal({
  isOpen,
  onClose,
  documentId,
  documentContent,
  onApply,
}: ManageTagsModalProps) {
  const [tags, setTags] = useState<WikiTag[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#A855F7");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Initialize the modal whenever it opens.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    setSelected(
      documentId ? getDocumentTags(documentContent) : []
    );

    setName("");
    setColor("#A855F7");
    setError("");
    setLoading(true);

    async function loadTags() {
      try {
        const result = await getTags();

        if (!cancelled) {
          setTags(result);
        }
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTags();

    return () => {
      cancelled = true;
    };

    // Read current document tags when the modal opens.
  }, [isOpen, documentId]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen || saving) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, saving, onClose]);

  function toggleTag(tagName: string) {
    setSelected((current) =>
      current.includes(tagName)
        ? current.filter((tag) => tag !== tagName)
        : [...current, tagName]
    );
    }
    
    async function handleDeleteTag(tag: WikiTag) {
    if (saving) return;

    const confirmed = await ask(
        `Are you sure you want to delete "${tag.name}"?\n\n` +
        "Documents using this tag will not be modified.",
        {
        title: "Delete Tag",
        kind: "warning",
        okLabel: "Delete",
        cancelLabel: "Cancel",
        }
    );

    // Do not delete unless the user explicitly confirms.
    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
        await deleteEntry(tag.relativePath);

        setTags(await getTags());
    } catch (err) {
        setError(`Failed to delete tag: ${String(err)}`);
    } finally {
        setSaving(false);
    }
    }

    async function handleCreateTag(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (saving) return;

        setSaving(true);
        setError("");

        try {
        const created = await createTag(name, color);

        // Reload from disk.
        setTags(await getTags());

        // Automatically assign the new tag if a
        // document is active.
        if (documentId) {
            setSelected((current) =>
            current.includes(created.name)
                ? current
                : [...current, created.name]
            );
        }

        setName("");
        setColor("#303640");
        } catch (err) {
        setError(String(err));
        } finally {
        setSaving(false);
        }
    }

    function handleApply() {
        if (!documentId) return;

        try {
        onApply(selected);
        onClose();
        } catch (err) {
        setError(String(err));
        }
    }

    if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-tags-title"
        className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-5 text-gray-100 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="manage-tags-title"
            className="text-lg font-semibold"
          >
            Manage Tags
          </h2>

          <button
            onClick={onClose}
            disabled={saving}
            aria-label="Close tag manager"
            className="rounded px-2 !text-white hover:text-white !bg-transparent transition: border-color 0.25s;
  box-shadow: 0 2px 2px #24d824;"
          >
            ×
          </button>
        </div>

        {/* Existing tags */}
        <h3 className="mb-2 text-sm font-medium">
          {documentId
            ? "Assign Tags to Document"
            : "Available Tags"}
        </h3>

        <div className="mb-5 max-h-48 space-y-2 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-400">
              Loading tags...
            </p>
          ) : tags.length === 0 ? (
            <p className="text-sm text-gray-400">
              No tags created yet.
            </p>
          ) : (
            tags.map((tag) => (
              <label
                key={tag.relativePath}
                className="flex items-center gap-3 rounded-md bg-gray-800 px-3 py-2"
              >
                {documentId && (
                  <input
                    type="checkbox"
                    checked={selected.includes(tag.name)}
                    onChange={() => toggleTag(tag.name)}
                    disabled={saving}
                    className="accent-blue-600"
                  />
                )}

                <span
                  className="h-4 w-4 rounded-sm"
                  style={{ backgroundColor: tag.color }}
                />

                <span className="flex-1 text-sm">
                  #{tag.name}
                </span>

                <span className="font-mono text-xs text-gray-400">
                  {tag.color}
                </span>
                <button
                type="button"
                onClick={() => void handleDeleteTag(tag)}
                disabled={saving}
                className="group rounded
                          !border-0 !bg-transparent
                          px-2 py-1
                          focus:!outline-none
                          focus:!ring-0
                          hover:!bg-transparent
                          disabled:opacity-50
                        "
                >
                <IoCloseCircleOutline className="
                                                  text-white
                                                  transition-colors duration-150
                                                  group-hover:text-red-500
                                                  group-focus-visible:text-red-500
                                                "/>
                </button>
              </label>
            ))
          )}
        </div>

        
{/* Create tag */}
<form
  autoComplete="off"
  onSubmit={handleCreateTag}
  className="space-y-4 border-t border-gray-700 pt-4"
>
  <h3 className="text-sm font-medium text-gray-200">
    Create New Tag
  </h3>

  {/* Tag Name — Floating Label */}
  <div className="relative">
    <input
      id="tag-name"
      type="text"
      value={name}
      onChange={(event) => setName(event.target.value)}
      placeholder=" "
      disabled={saving}
      className="
      peer !block !h-14 !w-full
      !rounded-xl !border !border-gray-600
      !bg-[#303640]
      !px-4 !pb-2 !pt-6
      !text-sm !text-white
      !outline-none
      focus:!border-blue-400
      disabled:opacity-50
      "
    />

    <label
      htmlFor="tag-name"
      className="
      pointer-events-none absolute
      left-4 top-2
      text-xs text-gray-400
      transition-all duration-150
      peer-placeholder-shown:top-4
      peer-placeholder-shown:text-sm
      peer-focus:top-2
      peer-focus:text-xs
      peer-focus:text-blue-400
      "
    >
      Tag Name
    </label>
  </div>

  {/* Tag Color — Color Picker + Floating Label */}
  <div className="flex items-stretch gap-2">

    {/* Native color picker */}
    <input
      type="color"
      value={
        /^#[0-9A-Fa-f]{6}$/.test(color)
          ? color
          : "#A855F7"
      }
      onChange={(event) => setColor(event.target.value)}
      disabled={saving}
      aria-label="Choose tag color"
      className="
        h-14 w-14 shrink-0 cursor-pointer
        rounded-xl border border-gray-600
        bg-transparent p-1
        disabled:opacity-50
      "
    />

    {/* Hex Color — Floating Label */}
    <div className="relative min-w-0 flex-1">
      <input
        id="tag-color"
        type="text"
        value={color}
        onChange={(event) => setColor(event.target.value)}
        placeholder=" "
        maxLength={7}
        disabled={saving}
        className="
          peer !block !h-14 !w-full
          !rounded-xl !border !border-gray-600
          !bg-[#303640]
          !px-4 !pb-2 !pt-6
          !text-sm !text-white
          !outline-none
          focus:!border-blue-400
          disabled:opacity-50
        "
      />

      <label
        htmlFor="tag-color"
        className="
          pointer-events-none absolute
          left-4 top-2
          text-xs text-gray-400
          transition-all duration-150
          peer-placeholder-shown:top-4
          peer-placeholder-shown:text-sm
          peer-focus:top-2
          peer-focus:text-xs
          peer-focus:text-blue-400
        "
      >
        Hex Color
      </label>
    </div>
  </div>

  {/* Create Tag */}
  <button
    type="submit"
    disabled={
      saving ||
      !name.trim() ||
      !/^#[0-9A-Fa-f]{6}$/.test(color)
    }
    className="
      w-full rounded-xl
      !border-0 !bg-blue-600
      px-4 py-3
      text-sm font-semibold text-white
      transition-colors duration-150
      hover:!bg-blue-500
      focus-visible:!outline
      focus-visible:!outline-2
      focus-visible:!outline-blue-300
      disabled:cursor-not-allowed
      disabled:opacity-50
    "
  >
    {saving ? "Creating..." : "Create Tag"}
  </button>
</form>


        {error && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Footer */}
        <div className="mt-5 flex justify-end gap-2">
         

          {documentId && (
            <button
              type="button"
              onClick={handleApply}
              disabled={saving || loading}
              className="rounded-md !bg-blue-700 px-4 py-2 text-sm 
              hover:!bg-blue-500
              !button:hover:bg-blue-600 disabled:opacity-50"
            >
              Apply Tags
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
