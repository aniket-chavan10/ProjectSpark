# 🗓️ 1-Month Live Scoring Backend Roadmap (Node.js + MySQL + Socket.IO)

🛍 Goal: Build a scalable backend for live cricket scoring with ball-by-ball tracking and real-time updates using Socket.IO. Match/team/player data comes from your existing Management project.

---

## 📉 WEEK 1: Project Setup + Folder Structure + Base Routes

📊 GOALS:

* Setup base Node.js project
* Build MVC structure
* Add MySQL DB connection
* Seed sample data

📆 TASK LIST:
\[ ] Create project folder `/backend`
\[ ] Run `npm init -y`
\[ ] Install base packages:
`npm install express mysql2 dotenv cors`
\[ ] Install dev tools:
`npm install --save-dev nodemon`

\[ ] Create folder structure:

```
/backend
├── controllers/        # Route logic (ex: ballController.js)
├── routes/             # All route definitions (ex: ballRoutes.js)
├── models/             # DB access queries (ex: ballModel.js)
├── services/           # Business logic (ex: ballService.js)
├── sockets/            # Real-time Socket.IO logic (ex: matchSocket.js)
├── config/             # DB connection, server config
├── utils/              # Helper functions (ex: logger.js)
├── app.js              # Main express app config
├── server.js           # App + Socket.IO listener
├── .env
```

\[ ] Setup MySQL connection pool in `config/db.js`
\[ ] Add `.env` and configure DB credentials
\[ ] Create `GET` routes in `/routes/matchRoutes.js`, `/routes/playerRoutes.js`
\[ ] Controller: `matchController.getMatchById`
\[ ] Test sample GET APIs: `/matches/:id`, `/players?team_id=...`

\[ ] Seed sample match, teams, players in DB for testing

---

## 📉 WEEK 2: Ball-by-Ball Engine + Scorecard Logic

📊 GOALS:

* Add core API to submit ball
* Update innings and scorecard
* Handle wicket, extras, striker switch

📆 TASK LIST:

\[ ] Create `models/ballModel.js` for DB insert of new ball
\[ ] Create `controllers/ballController.js`
\- `addBall(req, res)` -> uses service layer
\[ ] Create `routes/ballRoutes.js` -> POST `/balls`
\[ ] In `services/ballService.js`, add `addBallAndUpdateScore(data)`
\- Insert ball
\- Update scorecard (runs, wickets, over count)
\- Update striker/non-striker
\- Update partnership runs

\[ ] Handle edge cases:
\- Extras (wide, no-ball, bye)
\- Wicket types
\- Retired hurt
\- Ball progression (e.g., over ends after 6 legal balls)

\[ ] Create `GET /scorecard/:match_id` API
\- Use `scorecardModel.js` + `scorecardController.js`

\[ ] Test adding balls using Postman (with sample match/innings)

---

## 📉 WEEK 3: Real-Time Updates (Socket.IO Integration)

📊 GOALS:

* Emit live events when ball is added
* Client subscribes to match

📆 TASK LIST:

\[ ] Install Socket.IO:
`npm install socket.io`

\[ ] In `server.js`, setup Socket.IO and attach to express server
\[ ] Create `sockets/matchSocket.js`
\- `on('join_match')` to join match room
\- `io.to(matchId).emit('ball_update', { ... })`

\[ ] Update `ballService.js` to emit event after every ball
\[ ] Events to emit:
\- `ball_update`
\- `wicket_fall`
\- `over_end`

\[ ] Sample Emit Structure:

```js
io.to(matchId).emit("ball_update", {
  matchId,
  over: "4.3",
  striker: { id: 12, name: "Rohit" },
  bowler: { id: 9, name: "Bumrah" },
  score: 55,
  runsThisBall: 1
});
```

\[ ] Test Socket.IO connection with dummy client

---

## 📉 WEEK 4: Player Performance + Match Summary APIs

📊 GOALS:

* Track per-player performance
* Provide match summary
* Finalize backend

📆 TASK LIST:

\[ ] In `playerPerformanceModel.js`, create `updatePerformanceFromBall(ball)`
\[ ] Hook into `ballService.js` to update player stats on every ball
\[ ] Generate milestone updates (50s, 100s, best bowling, etc.)

\[ ] API:
\- `GET /player/:id/performance`
\- `GET /match/:id/summary`

\[ ] Create `matchService.js`:
\- Handle startMatch, endMatch
\- Handle lineup selection (if needed)

\[ ] Test all APIs with Postman and Socket.IO client

---

## 🔐 Optional Week 5 (Buffer)

* Add JWT Auth for admin/scorer
* Add Swagger API docs
* Deploy to Render/Railway/AWS EC2
* Push code to GitHub

---

## 📌 Final Note

* You do NOT need Sequelize unless you want auto-relations & migrations
* Raw MySQL2 is great for performance and control
* Focus on writing clean services and centralizing match logic in `services/ballService.js`

Ready to build! 🚀 Tick off tasks as you go!

```
```
