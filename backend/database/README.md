# Project Spark database

`schema.sql` is the one source of truth. The old `migrations/` folder is history: **you do not run it any more.**

| You have | Run |
|---|---|
| A new machine, no database | `npm run db:setup` |
| A restored dump, or an older Spark database | `npm run db:upgrade` (try `-- --dry-run` first) |
| Any database, to see what is wrong | `npm run db:check` |

All three read `backend/.env` (`DB_HOST`, `DB_PORT` optional, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).

## New machine

```
cd backend
npm install
npm run db:setup          # creates the database and all 31 tables
npm run db:check          # should say OK
npm run seed:test         # optional: 16 test teams and a ready schedule
```

## Restoring a dump (for example `project_spark_dump_31102026.sql`)

```
mysql -u root -p -e "CREATE DATABASE project_spark"
mysql -u root -p project_spark < project_spark_dump_31102026.sql
cd backend
npm run db:upgrade -- --dry-run      # read what it will do
npm run db:upgrade                   # asks before changing anything
npm run db:check
```

`db:upgrade` is safe to run twice. Take a backup first. It removes leftover rows of matches that were deleted
while foreign-key checks were off (it lists them and the cascade first, and asks, or use `--clean-orphans`).

## What was wrong with the dump of 31-Oct-2026

Each of these failed against MySQL with the dump as it was, and is fixed by `db:upgrade` (and by `schema.sql`):

| Symptom | Cause | Fix |
|---|---|---|
| **Every ball fails**: `The value specified for generated column 'run_rate' in table 'innings' is not allowed` | `innings.run_rate` was a *calculated* column, but the scorer writes it (with a correct run rate; the old formula divided by overs written as 3.4) | now a normal column, existing values kept |
| Retiring a batter (hurt or out): `Data truncated for column 'ball_outcome'` | the code stores `retired`, the enum did not allow it | value added to the enum |
| Scoring: `Unknown column 'over_id'` | the scorer finds the balls of an over by `balls.over_id`; the column was missing | column added, old balls linked to their over |
| A no-ball or leg-bye: `Data truncated for column 'extra_type'` | the column was `ENUM('no ball','leg bye')`, the code writes `no-ball`, `leg-bye` | text column + check, old rows renamed |
| Retiring a batter out: `Check constraint 'balls_chk_4' is violated` | the allowed dismissals did not include `retired out`, `handled ball`, `hit the ball twice` | check replaced |
| Adding a player without an email: `Column 'email' cannot be null` | `players_core.email` was `NOT NULL` | now optional (`UNIQUE` still holds for real emails) |
| Editing a tournament: `Unknown column 'updated_at'` | `tournaments.updated_at` missing | column added |
| A super-over innings refused | `innings_chk_5` allowed only 1 and 2 | 1 to 4 |
| Constraint errors when deleting / editing | 26 innings, 202 overs, 26 live scorecards pointed at matches / innings that no longer exist; 24 relationships had no foreign key at all | orphans cleaned (optional), foreign keys added |
| Confusing duplicates | two foreign keys on `tournaments.tentative_id`, two unique keys on `tournament_participants`, a misspelled view `tentative_tournmanetschedules` | duplicates dropped, code uses the real table |

`db:check` also scans the SQL written in the backend and fails if the code asks for a column the schema does not
have, so this cannot drift apart silently again.

## Tables the app does not use

`notifications` (the old one; the app uses `team_notifications`), `penalties`, `team_stats`, `balls_archive`,
`innings_state`, `player_career_stats`, `player_innings_stats`, `ball_event_audit_log`. A fresh install does not
create them; an upgraded database keeps them untouched.

## Values the code writes (keep schema and code in step)

* `balls.extra_type`: `wide`, `no-ball`, `bye`, `leg-bye`
* `balls.wicket_type`: `bowled`, `caught`, `lbw`, `stumped`, `run out`, `hit wicket`, `handled ball`, `timed out`,
  `obstructing the field`, `hit the ball twice`, `retired out`, `retired hurt`
* `matches.status`: `upcoming`, `live`, `first_innings_ended`, `completed`, `abandoned`
* `tournament_matches.stage`: `group`, `semi`, `third_place`, `final`
