"use client";

import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
  Children,
  isValidElement,
} from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Lock, RotateCcw, Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type SortableDashboardItem = {
  id: string;
  node: ReactNode;
  /** Accessible label for the drag handle (defaults to the item id). */
  label?: string;
};

export type SortableDashboardProps = {
  storageKey: string;
  items: SortableDashboardItem[];
  /** Tailwind grid class. Defaults to a responsive 1-col / 3-col grid. */
  gridClassName?: string;
  className?: string;
  /** Render a built-in "Edit layout" / "Done" toggle. Defaults to true. */
  showToggle?: boolean;
};

export function SortableDashboard({
  storageKey,
  items,
  gridClassName = "grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5",
  className,
  showToggle = true,
}: SortableDashboardProps) {
  const defaultIds = useMemo(() => items.map((i) => i.id), [items]);
  const [order, setOrder] = useState<string[]>(defaultIds);
  const [hydrated, setHydrated] = useState(false);
  const [editing, setEditing] = useState(false);

  // Hydrate stored order. Drop unknown ids and append any newly-added ids so
  // the list stays consistent even after we add or remove widgets.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const stored = JSON.parse(raw) as string[];
        const known = new Set(defaultIds);
        const filtered = stored.filter((id) => known.has(id));
        const missing = defaultIds.filter((id) => !filtered.includes(id));
        setOrder([...filtered, ...missing]);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, [storageKey, defaultIds]);

  const itemsById = useMemo(() => {
    const map = new Map<string, SortableDashboardItem>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persist = (next: string[]) => {
    setOrder(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    persist(arrayMove(order, oldIndex, newIndex));
  };

  const reset = () => persist(defaultIds);

  // Pre-hydration render uses the default order so SSR matches.
  const effectiveOrder = hydrated ? order : defaultIds;

  return (
    <div className={className}>
      {showToggle && (
        <div className="flex items-center justify-end gap-2 mb-3">
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={2.5} />
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all",
              editing
                ? "bg-accent text-white shadow-sm"
                : "border border-border bg-surface text-text-muted hover:text-text hover:bg-surface-muted",
            )}
          >
            {editing ? (
              <>
                <Lock className="h-3 w-3" strokeWidth={2.5} />
                Done
              </>
            ) : (
              <>
                <Settings className="h-3 w-3" strokeWidth={2.5} />
                Edit layout
              </>
            )}
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={effectiveOrder} strategy={rectSortingStrategy}>
          <div className={gridClassName}>
            {effectiveOrder.map((id) => {
              const item = itemsById.get(id);
              if (!item) return null;
              return (
                <SortableSlot
                  key={id}
                  id={id}
                  label={item.label ?? id}
                  editing={editing}
                >
                  {item.node}
                </SortableSlot>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableSlot({
  id,
  label,
  editing,
  children,
}: {
  id: string;
  label: string;
  editing: boolean;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editing });

  // When the consumer's child is a single Card with grid-spanning utility
  // classes (e.g. "md:col-span-3"), we forward those onto the sortable
  // wrapper so the layout stays intact during drag.
  const childSpan = extractColSpan(children);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        childSpan,
        editing && "ring-1 ring-dashed ring-accent/30 rounded-2xl",
        isDragging && "opacity-90 shadow-2xl scale-[1.02]",
      )}
    >
      {editing && (
        <button
          type="button"
          aria-label={`Drag to reorder ${label}`}
          className={cn(
            "absolute top-2 right-2 z-10 inline-flex h-7 w-7 items-center justify-center",
            "rounded-full bg-surface-raised/90 backdrop-blur border border-border shadow-sm",
            "text-text-muted hover:text-text",
            "cursor-grab active:cursor-grabbing touch-none",
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      )}
      {children}
    </div>
  );
}

// Small helper: when a consumer hands us a top-level element with a
// "md:col-span-*" class we pass through to the wrapper so we don't break
// asymmetric grids.
function extractColSpan(node: ReactNode): string {
  let span = "";
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;
    const cls = (child.props as { className?: string }).className;
    if (typeof cls !== "string") return;
    const match = cls.match(/(?:^|\s)(md:col-span-\d+|lg:col-span-\d+|col-span-\d+)/);
    if (match) span = match[1];
  });
  return span;
}
