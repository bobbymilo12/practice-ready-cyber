import { useState } from "react";

/** Draft text is local to this editor; only Add/Save changes confirmed practice data. */
export function ConfirmedItems({
  label,
  items,
  onChange,
  single = false,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  single?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const save = () => {
    const text = draft.trim();
    if (!text) return;
    const next = [...items];
    if (editing !== null) next[editing] = text;
    else if (!items.includes(text)) next.push(text);
    onChange(next);
    setDraft("");
    setEditing(null);
  };
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{label}</legend>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="rounded-lg border border-border p-3 text-sm">
            <p className="whitespace-pre-line">{item}</p>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                className="text-primary underline"
                onClick={() => {
                  setEditing(i);
                  setDraft(item);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="text-primary underline"
                onClick={() => {
                  onChange(items.filter((_, n) => n !== i));
                  setEditing(null);
                  setDraft("");
                }}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {(!single || !items.length || editing !== null) && (
        <>
          <label className="block text-sm">
            {editing === null ? "New item" : "Edit item"}
            <textarea
              aria-label={label}
              className="mt-1 w-full rounded-xl border border-border bg-background p-3"
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={!draft.trim()}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
            onClick={save}
          >
            {editing === null ? "Add" : "Save changes"}
          </button>
          {editing !== null && (
            <button
              type="button"
              className="ml-3 text-sm underline"
              onClick={() => {
                setEditing(null);
                setDraft("");
              }}
            >
              Cancel
            </button>
          )}
          <p className="text-xs text-muted-foreground">Only added items are used in training.</p>
        </>
      )}
    </fieldset>
  );
}
