<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Extension rules
- Keep community tasks and appeals in dedicated authenticated modules; neither can gate product claims or human help.
- Enforce task validation, AI reservations and marketplace transitions in database functions/triggers; browser controls are not authorization.
- Store unapplied additive SQL under `.lovable/pending/` and expose setup errors until it is applied; never simulate persistence.
- Keep new database types in an app-owned extension rather than editing generated integration files.
- Campaign submissions and reviews use authenticated server functions and database RPCs with applicant-only reads, idempotent submission, approval caps and audit writes; direct client writes are not authorized.
- Keep advertising centralized in the ad controller, native-app only after UMP consent, with interstitials only after completed submissions under frequency caps; navigation and submission never wait on ad delivery.
- Keep public Socilet campaign service scopes in a shared catalog module and community inventory in existing public queries; campaign applications are private records, not product inventory.
- Keep additional Socilet offers separate from the development campaign; enforce per-offer application and lifetime-award caps in locked database RPCs to preserve independent limits and private records.
- Protect immutable identities and moderation fields in database triggers; trusted RPCs handle product transitions, AI reservations and account withdrawal so browser updates cannot authorize them.
- Emit routine community/message notifications from database events; clients cannot create arbitrary recipient notices.
- Account withdrawal is not authentication-account deletion; label it truthfully until a verified full-erasure workflow exists.
- One-to-one conversation creation and membership are RPC-only; creator-wide locks and trusted timestamps enforce rate limits without browser authority.
- Moderation report resolution, enforcement and audit commit through one staff-authorized database RPC so a failed action cannot appear resolved.
- Listing uploads go through authenticated server decoding/reencoding; public photos use a no-store visibility-checked endpoint rather than durable signed links.
- Account deletion requests require verified email ownership and remain explicitly pending until shared-record-safe erasure and retention are operational.
