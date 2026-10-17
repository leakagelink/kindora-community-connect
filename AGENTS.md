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
- Keep advertising centralized and disabled without a verified platform adapter; navigation and verified submission must always proceed without ad delivery.
- Keep public Socilet campaign service scopes in a shared catalog module and community inventory in existing public queries; campaign applications are private records, not product inventory.
