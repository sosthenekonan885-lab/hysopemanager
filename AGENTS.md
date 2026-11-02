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

- Allocate new receipt numbers only in the database order guard, never in a column sequence default as well; dual allocation skips every other number. Preserve issued numbers and legacy paper receipt handling.
- Test database numbering migrations with an isolated PGlite database using the actual migration SQL and guard function, so regression checks do not create fake receipts in production.
