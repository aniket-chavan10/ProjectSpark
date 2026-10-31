# Scripts

Run these from the `backend` folder (they use the same `.env` as the server, so they act on that database).
Each one prints the database it will touch and asks before changing anything (`--yes` skips the question).

## Test data for checking scoring

```
npm run seed:test                      16 teams, 2-over matches
node scripts/seedTestData.js --teams 32 --overs 5
npm run seed:clean                     remove all test data
```

Creates teams with admin logins, 15 players each, a tournament (`[TEST] Diwali Cup`) starting today with every team
registered and grouped, squads named (playing XI + 4 reserves), and the full match schedule, ready for the toss.
Every login ends in `@spark.test` and the password is `Spark@123` (change it with `--password`):

| Who | Login |
|---|---|
| Association (master admin, `/ma-signin`) | username `testassociation` |
| Host team admin (`/sign-in`) | `team01@spark.test` |
| Other team admins | `team02@spark.test` ... |

Run the migrations in `migrations/` first. Running the seed again removes the earlier test data first. It only
ever matches test rows (`@spark.test` logins, `Test ` teams, `[TEST]` tournaments), never real data.

## Forgotten logins

```
npm run logins                                             list every login
node scripts/resetLogin.js --admin team@example.com --password NewPass1
node scripts/resetLogin.js --master myusername --password NewPass1
node scripts/resetLogin.js --master myusername --create --email me@example.com --password NewPass1
```

Passwords are stored hashed, so an old one cannot be read back. `--list` shows every login and tells you when a team
admin still has the default password that the approval screen generated (`admin_<village name>`); otherwise reset it.
