import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionData } from "@/lib/document-templates";

interface DraftSectionProps {
  section: SectionData;
  onChange: (id: string, newContent: string) => void;
  onRemove?: (id: string) => void;
  isActive?: boolean;
}

export function DraftSection({
  section,
  onChange,
  onRemove,
  isActive = false,
}: DraftSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col border border-l-[3px] border-border border-l-transparent bg-background transition-colors duration-[180ms] focus-within:border-l-brand",
        isDragging && "z-50 border-l-brand opacity-70 shadow-[0_20px_60px_rgba(0,0,0,0.15)]",
        isActive && !isDragging && "border-l-brand"
      )}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-hairline-soft px-3 py-2">
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          <button
            type="button"
            className="cursor-grab p-1 text-subtle-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical strokeWidth={1.25} className="size-4" />
          </button>
          
          <h3 className="label-caps font-sans text-[10px] text-muted-foreground">
            {section.title}
            {section.required && <span className="ml-1 text-brand">*</span>}
          </h3>
        </div>

        {/* Actions */}
        <div className="flex items-center opacity-0 transition-opacity duration-[180ms] group-hover:opacity-100 group-focus-within:opacity-100">
          {!section.required && onRemove && (
            <button
              onClick={() => onRemove(section.id)}
              className="p-1.5 text-subtle-foreground transition-colors duration-[180ms] hover:text-destructive"
              title="Remove section"
            >
              <Trash2 strokeWidth={1.25} className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Section Content */}
      <div className="px-4 py-3">
        <textarea
          value={section.content}
          onChange={(e) => onChange(section.id, e.target.value)}
          placeholder={`Enter content for ${section.title}...`}
          className="min-h-[100px] w-full resize-y bg-transparent font-mono text-[13px] leading-relaxed text-foreground outline-none placeholder:text-subtle-foreground focus-visible:outline-none"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
