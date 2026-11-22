"use client";

import React, { useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountDialog({ isOpen, onClose }: DeleteAccountDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close modal on escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch('/api/users/me', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Could not delete account. Please try again.')
      }

      toast({
        title: "Account Scheduled for Deletion",
        description: "Your account deletion request has been submitted successfully.",
        variant: "success",
      });
      onClose();
    } catch {
      toast({
        title: "Delete Failed",
        description: "Could not request account deletion. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 animate-in bg-black/80 backdrop-blur-sm duration-300 fade-in" onClick={onClose} />

      <div
        ref={overlayRef}
        className="relative z-10 w-full max-w-md animate-in border border-border border-t-[3px] border-t-destructive bg-popover shadow-[0_32px_64px_rgba(0,0,0,0.55)] duration-200 fade-in zoom-in-95"
      >
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-1.5 text-subtle-foreground transition-colors duration-[180ms] hover:text-foreground"
          aria-label="Close modal"
        >
          <X strokeWidth={1.25} className="size-4" />
        </button>

        <div className="space-y-3 px-7 pt-8 pb-6">
          <p className="label-caps text-[10px] text-destructive">Irreversible</p>
          <h3 id="modal-title" className="text-[30px] leading-tight">Delete account</h3>
          <p className="text-[13px] text-muted-foreground">Confirm your request to delete your Trionic Adalat account.</p>
        </div>

        <div className="mx-7 border-l-2 border-destructive py-1 pl-4 text-[13px] leading-relaxed text-foreground/85">
          <p className="mb-1 text-destructive">This action cannot be undone.</p>
          <p>
            Deleting your account will permanently purge all drafted documents, generation history, settings, and active sessions from our system.
          </p>
        </div>

        <div className="mt-8 flex justify-end gap-2 border-t border-border px-7 py-5">
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="animate-spin" />}
            {isDeleting ? "Deleting…" : "Delete account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
