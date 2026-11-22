"use client";

import React, { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionFrame, fieldLabel, fieldHint } from "./section-frame";
import { createClient } from "@/lib/supabase/client";

export function SessionsSection() {
  const [isRevoking, setIsRevoking] = useState(false);
  const [otherDevicesCleared, setOtherDevicesCleared] = useState(false);

  const handleSignOutOtherDevices = async () => {
    setIsRevoking(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut({ scope: "others" });

      if (error) {
        throw error;
      }

      setOtherDevicesCleared(true);
      toast({
        title: "Sessions Revoked",
        description: "Successfully signed out from all other devices.",
        variant: "success",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not revoke other sessions. Please try again.";
      console.error("Failed to revoke other sessions:", message);
      toast({
        title: "Action Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <SectionFrame index="03" title="Security" description="Track and manage your current signed-in devices.">
      <div className="space-y-8">
        <div>
          <p className={`${fieldLabel} mb-3`}>Current session</p>
          <div className="grid grid-cols-[1fr_auto] items-start gap-4 border-y border-l-[3px] border-y-border border-l-success py-4 pl-4">
            <div className="space-y-1">
              <p className="font-serif text-[19px] leading-tight">Chrome on macOS</p>
              <p className={fieldHint}>IP 103.88.22.41 · Mumbai, Maharashtra, India</p>
            </div>
            <span className="label-caps border border-success/50 px-2 py-0.5 text-[9px] text-success">Active now</span>
          </div>
        </div>

        {!otherDevicesCleared && (
          <div>
            <p className={`${fieldLabel} mb-3`}>Other active devices</p>
            <div className="grid grid-cols-[1fr_auto] items-start gap-4 border-y border-l-[3px] border-y-border border-l-transparent py-4 pl-4 opacity-75">
              <div className="space-y-1">
                <p className="font-serif text-[19px] leading-tight">Safari on iPhone 15</p>
                <p className={fieldHint}>IP 192.168.1.104 · New Delhi, India</p>
              </div>
              <span className="text-[12px] text-subtle-foreground">2 hours ago</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className={`${fieldHint} max-w-md`}>
            If you notice any unfamiliar activity, revoke all other active sessions immediately to keep your account secure.
          </p>
          <Button variant="outline" onClick={handleSignOutOtherDevices} disabled={isRevoking || otherDevicesCleared}>
            {isRevoking ? <Loader2 className="animate-spin" /> : <LogOut strokeWidth={1.25} />}
            {isRevoking ? "Revoking…" : "Sign out other devices"}
          </Button>
        </div>
      </div>
    </SectionFrame>
  );
}
