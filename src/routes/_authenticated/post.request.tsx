import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell, PageHeading } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { categoriesQuery, REQUEST_TYPES } from "@/lib/kindora";

const schema = z.object({
  title: z.string().trim().min(8, "Give your request a clear title (at least 8 characters).").max(120),
  description: z.string().trim().min(40, "Describe what you need in at least 40 characters.").max(4000),
  request_type: z.enum(["digital_service", "skill_knowledge", "product"]),
  category_id: z.string().uuid("Choose a category."),
  is_remote: z.boolean(),
  location: z.string().trim().max(120).optional(),
  language: z.string().trim().max(60).optional(),
  needed_by: z.string().min(1, "Choose the date you need this by."),
  required_features: z.string().trim().max(2000).optional(),
  expected_deliverables: z.string().trim().max(2000).optional(),
  complexity: z.string().trim().max(60).optional(),
  hosting_expectations: z.string().trim().max(500).optional(),
  is_prototype: z.boolean(),
});

export const Route = createFileRoute("/_authenticated/post/request")({
  head: () => ({
    meta: [
      { title: "Request free help — Kindora" },
      { name: "description", content: "Describe what you need. Receiving help on Kindora is always free." },
      { property: "og:title", content: "Request free help — Kindora" },
      { property: "og:description", content: "Describe what you need. Receiving help on Kindora is always free." },
    ],
  }),
  component: PostRequest;
});

function PostRequest() {
  return null;
}
