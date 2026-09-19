import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Field } from "@/components/kindora/FormBits";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { notify } from "@/lib/actions";

export function ReviewDialog({
  revieweeId,
  requestId = null,
  listingId = null,
  label = "Leave feedback",
}: {
  revieweeId: string;
  requestId?: string | null;
  listingId?: string | null;
  label?: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user || user.id === revieweeId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share your experience</DialogTitle>
          <DialogDescription>
            Feedback is only possible after a completed engagement, and each engagement can be reviewed once.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field id="rating" label="Rating" required>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} star${value > 1 ? "s" : ""}`}
                  onClick={() => setRating(value)}
                  className={`h-10 w-10 rounded-full border text-sm font-bold ${
                    value <= rating ? "border-accent bg-accent text-accent-foreground" : "border-input"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </Field>
          <Field id="comment" label="Comment" hint="Optional. Keep it factual and respectful.">
            <Textarea
              id="comment"
              rows={4}
              maxLength={1500}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
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
                const { error } = await supabase.from("reviews").insert({
                  reviewer_id: user.id,
                  reviewee_id: revieweeId,
                  request_id: requestId,
                  listing_id: listingId,
                  rating,
                  comment: comment.trim() || null,
                });
                if (error) {
                  throw new Error(
                    error.code === "23505" ? "You have already reviewed this engagement." : error.message,
                  );
                }
                await notify({
                  userId: revieweeId,
                  type: "review",
                  title: "You received new feedback",
                  link: `/u/${revieweeId}`,
                });
                void queryClient.invalidateQueries({ queryKey: ["reviews", revieweeId] });
                toast.success("Thanks for the feedback");
                setOpen(false);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save the review");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving…" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
