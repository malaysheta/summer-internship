"use client";

import React, { useState } from "react";
import type { User } from "@trionic/shared";
import { toast } from "@/hooks/use-toast";
import { Mail, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionFrame, fieldLabel, fieldHint } from "./section-frame";

interface ProfileSectionProps {
  initialUser: User;
  onUpdateUser: (updatedUser: Partial<User>) => void;
}

export function ProfileSection({ initialUser, onUpdateUser }: ProfileSectionProps) {
  const [displayName, setDisplayName] = useState(initialUser.display_name || "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation check
    if (!displayName.trim()) {
      setError("Display Name cannot be empty");
      return;
    }
    if (displayName.trim().length < 2) {
      setError("Display Name must be at least 2 characters");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ display_name: displayName }),
      });

      if (!res.ok) {
        throw new Error("Failed to save display name");
      }

      const updatedUser = (await res.json()) as User;
      onUpdateUser(updatedUser);
      
      toast({
        title: "Profile Updated",
        description: "Your profile details have been saved successfully.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Save Failed",
        description: "Something went wrong while updating your profile.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const initial = (initialUser.display_name || initialUser.email || "?").trim().charAt(0).toUpperCase();

  return (
    <SectionFrame index="01" title="Profile" description="Update your public identity and profile credentials.">
      {/* Identity */}
      <div className="mb-8 flex items-center gap-5 border-b border-hairline-soft pb-8">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border bg-[radial-gradient(circle_at_30%_30%,rgba(5,95,89,0.6),transparent_70%)] font-serif text-[26px]">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate font-serif text-[30px] leading-tight">{initialUser.display_name || "—"}</p>
          <p className="truncate text-[13px] text-muted-foreground">{initialUser.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-7">
        <div className="space-y-2">
          <label htmlFor="displayName" className={fieldLabel}>Display name</label>
          <Input
            id="displayName"
            type="text"
            placeholder="Enter your display name"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSaving}
            aria-invalid={!!error}
            aria-describedby={error ? "displayName-error" : undefined}
          />
          {error && (
            <p id="displayName-error" className="animate-in text-[12px] text-destructive duration-150 fade-in slide-in-from-top-1">
              {error}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className={fieldLabel}>Email address</label>
          <div className="relative">
            <Input id="email" type="email" value={initialUser.email} readOnly disabled className="pr-10" />
            <Mail strokeWidth={1.25} className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle-foreground" />
          </div>
          <p className={fieldHint}>Your email is managed by account security settings and cannot be changed here.</p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Save strokeWidth={1.25} />}
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </SectionFrame>
  );
}
