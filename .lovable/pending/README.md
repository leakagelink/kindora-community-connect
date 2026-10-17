# Goodivo extension: deployment blocked

Cloud repeatedly reported that it was still starting, and schema inspection failed with a pooler timeout. No migration or seed was applied. Existing records were not changed.

`community-safety.sql` is staged additive SQL, not an applied migration. Before applying: inspect the live schema and policy names, re-check Cloud health, review triggers against existing flows, then submit this exact SQL through the migration tool. Seed genuine task definitions and disabled `rewarded_ads` / `sponsor_surveys` feature flags through the data tool after migration; do not seed on page load. Regenerate integration types.

Tasks, reviews, appeals, budget controls and atomic AI reservations require that migration. Missing-table/function errors deliberately show setup failures, never fake completion. AI generation now fails closed rather than using the bypassable history-count quota.

Advertising: no provider, approved unit configuration, signed verification or policy review exists. No ad SDK, reward-grant endpoint, provider callback or success simulation has been added. `reward_events` only reserves an auditable structure with unique provider event IDs; reward credits are not spendable. Future work must verify signatures, event ownership, expiry, replay protection and atomic credit grants against the chosen provider's policies.

Shipping: existing free pickup and donor-paid local delivery are retained. Paid shipping remains unsupported; no invented rates or payment collection.

Remaining validation: live grants/RLS, restricted-user actions, cross-user isolation, task duplicates and moderation, concurrent AI reservations, actual AI provider response, atomic product flow integration, upload bucket MIME/size enforcement, automatic expiry, authenticated mobile task/admin flows. No auth users were available for a managed test session. A signed-out redirect rendered login but reported a hydration warning; investigate separately after the package update.

Cost defaults in staged SQL are provisional conservative operational estimates, not provider billing rates. Administrators must set verified estimates/budgets before enabling production AI.