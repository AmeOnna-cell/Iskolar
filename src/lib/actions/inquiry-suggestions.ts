"use server";

import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { getScholarshipDetail } from "@/lib/data/scholarships";
import { listingAnswers } from "@/lib/inquiry-suggestions";

export async function suggestListingAnswers(id: string, query: string) {
  if (!z.uuid().safeParse(id).success || query.length > 2000) return [];
  const { data } = await createPublicClient().from("scholarships").select("slug").eq("id", id).eq("listing_status", "published").maybeSingle();
  if (!data) return [];
  const scholarship = await getScholarshipDetail(data.slug);
  return scholarship ? listingAnswers(scholarship, query) : [];
}
