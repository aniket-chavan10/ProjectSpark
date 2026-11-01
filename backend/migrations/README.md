# Old migrations (history only)

These four files were the original "run once" upgrades. Running them by hand on a restored dump is what produced
"Duplicate column", "constraint failed" and "column not found" messages, because the dump already contained some
of their changes and was missing others.

**Do not run them.** Use `npm run db:setup` (new machine) or `npm run db:upgrade` (existing database).
See `../database/README.md`.
