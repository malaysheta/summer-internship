"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionFrame, fieldHint } from "./section-frame";
import { DeleteAccountDialog } from "./delete-account-dialog";

export function DangerZoneSection() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <SectionFrame index="04" title="Danger zone" description="Critical actions that can result in irreversible data loss." danger>
      <div className="flex flex-col gap-4 border-l-[3px] border-destructive py-1 pl-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-serif text-[20px] leading-tight">Delete my account</p>
          <p className={`${fieldHint} max-w-md`}>
            Permanently erase all your document records, generation history, settings, and billing metadata. This action cannot be undone.
          </p>
        </div>
        <Button variant="destructive" onClick={() => setIsDialogOpen(true)} className="shrink-0">
          <Trash2 strokeWidth={1.25} />
          Delete my account
        </Button>
      </div>

      <DeleteAccountDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
    </SectionFrame>
  );
}
