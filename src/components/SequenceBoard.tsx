import { useRef, useState } from "react";
import { moveSequence } from "@/lib/sequence";

/** Presentation only: never receives the correct order or source approval. */
export function SequenceBoard({
  steps,
  value,
  disabled,
  onChange,
}: {
  steps: { id: string; label: string }[];
  value: string[];
  disabled: boolean;
  onChange: (value: string[]) => void;
}) {
  const [dragged, setDragged] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const cards = useRef<Record<string, HTMLLIElement | null>>({});
  const move = (from: number, to: number) => {
    if (disabled || from === to) return;
    const next = moveSequence(value, from, to);
    onChange(next); // The training screen keeps rearrangements as drafts until Check answer.
    cards.current[value[from]]?.focus();
    setAnnouncement(`Step moved to position ${to + 1}.`);
    setDragged(undefined);
  };
  return (
    <div className="mt-4">
      <p className="text-sm text-muted-foreground">
        Drag the steps into order, or use the arrow controls. You can change your answer before
        checking.
      </p>
      <ol className="mt-4 space-y-2">
        {value.map((id, index) => (
          <li
            key={id}
            tabIndex={-1}
            ref={(node) => {
              cards.current[id] = node;
            }}
            draggable={!disabled}
            onDragStart={(event) => {
              setDragged(id);
              event.dataTransfer.setData("text/plain", id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => setDragged(undefined)}
            onDragOver={(event) => {
              if (!disabled && dragged) event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragged && value.includes(dragged)) move(value.indexOf(dragged), index);
            }}
            className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="text-muted-foreground">{index + 1}.</span>
            <span className="min-w-0 flex-1">{steps.find((s) => s.id === id)?.label}</span>
            <button
              type="button"
              disabled={disabled || index === 0}
              aria-label={`Move step ${index + 1} up`}
              onClick={() => move(index, index - 1)}
              className="rounded border px-3 py-2 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={disabled || index === value.length - 1}
              aria-label={`Move step ${index + 1} down`}
              onClick={() => move(index, index + 1)}
              className="rounded border px-3 py-2 disabled:opacity-30"
            >
              ↓
            </button>
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
