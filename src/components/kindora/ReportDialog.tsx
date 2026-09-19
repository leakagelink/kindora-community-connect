import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/kindora/FormBits";
import { useAuth } from "@/lib/auth";
import { REPORT_REASONS } from "@/lib/kindora";
import { submitReport } from "@/lib/actions";

export function ReportDialog({
  targetType,
  targetId,
  label = "Report",
}: {
  targetType: "user" | "request" | "listing" | "message" | "review" | "offer";
  targetId: string;
  label?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].value);
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this {targetType}</DialogTitle>
          <DialogDescription>
            Our moderators review every report. Nothing is shared with the person you are reporting.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field id="report-reason" label="Reason" required>
            <NativeSelect id="report-reason" value={reason} onChange={setReason}>
              {REPORT_REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="report-details" label="What happened?" hint="Optional, up to 2000 characters.">
            <Textarea
              id="report-details"
              rows={4}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={2000}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button
            className="rounded-full"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await submitReport({ reporterId: user.id, targetType, targetId, reason, details });
                toast.success("Report sent to moderators");
                setOpen(false);
                setDetails("");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not send the report");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Sending…" : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
