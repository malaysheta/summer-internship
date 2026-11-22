"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { User } from "@trionic/shared";
import { ProfileSection } from "@/components/settings/profile-section";
import { PreferencesSection } from "@/components/settings/preferences-section";
import { SessionsSection } from "@/components/settings/sessions-section";
import { DangerZoneSection } from "@/components/settings/danger-zone-section";
import { RefreshCw } from "lucide-react";
import { BracketLabel } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    let isRedirecting = false;
    try {
      const res = await fetch("/api/users/me");
      if (res.status === 401) {
        isRedirecting = true;
        // Redirect unauthenticated user to login route
        window.location.href = "/auth/sign-in";
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load your system settings. Please try again.");
      }
      const data = (await res.json()) as User;
      setUser(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      if (!isRedirecting) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleUpdateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ...updatedFields,
      };
    });
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl animate-in space-y-10 duration-300 fade-in">
        {/* Loading skeletons */}
        {[0, 1].map((i) => (
          <div key={i} className="space-y-6 border-t border-border pt-6" aria-busy>
            <div className="h-3 w-24 animate-pulse bg-muted" />
            <div className="h-8 w-1/3 animate-pulse bg-muted" />
            <div className="space-y-3">
              <div className="h-10 animate-pulse bg-muted" />
              <div className="h-10 animate-pulse bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex animate-in flex-col items-start gap-4 border-t border-border border-l-[3px] border-l-destructive py-8 pl-6 duration-300 fade-in">
        <BracketLabel>Error</BracketLabel>
        <h3 className="text-[28px] leading-tight">Failed to load settings</h3>
        <p className="max-w-md text-[14px] leading-relaxed text-muted-foreground">
          {error || "An error occurred while loading your profile data."}
        </p>
        <Button variant="outline" onClick={fetchUser}>
          <RefreshCw strokeWidth={1.25} />
          Retry loading
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl animate-in space-y-14 duration-300 fade-in slide-in-from-bottom-2">
      {/* Profile Section */}
      <div id="profile">
        <ProfileSection initialUser={user} onUpdateUser={handleUpdateUser} />
      </div>

      {/* Preferences Section */}
      <div id="preferences">
        <PreferencesSection initialUser={user} onUpdateUser={handleUpdateUser} />
      </div>

      {/* Sessions Section */}
      <div id="sessions">
        <SessionsSection />
      </div>

      {/* Danger Zone Section */}
      <div id="danger-zone">
        <DangerZoneSection />
      </div>
    </div>
  );
}
