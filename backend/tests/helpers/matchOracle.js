// An independent model of one limited-overs innings, written straight from the Laws of Cricket.
// It does not use any code from the scoring engine, so the two can be compared ball by ball.

const BOWLER_WICKETS = ["bowled", "caught", "lbw", "stumped", "hit wicket"];
// Out on a dead ball: no runs can follow, not even byes (a wide still adds its one-run penalty)
const DEAD_BALL_WICKETS = ["bowled", "caught", "lbw", "stumped", "hit wicket"];
// Dismissals that can still happen off a no-ball / on a free hit
const FREE_HIT_WICKETS = ["run out", "obstructing the field", "hit the ball twice"];
const NO_BALL_WICKETS = ["run out", "obstructing the field", "hit the ball twice"];
const WIDE_WICKETS = ["stumped", "run out", "hit wicket", "obstructing the field"];

class InningsOracle {
  constructor({ maxOvers, maxWickets = 10, striker, nonStriker, bowler, target = null }) {
    this.maxOvers = maxOvers;
    this.maxWickets = maxWickets;
    this.target = target;
    this.score = 0;
    this.wickets = 0;
    this.legalBalls = 0;
    this.striker = striker;
    this.nonStriker = nonStriker;
    this.bowler = bowler;
    this.partnership = 0;
    this.extras = { wide: 0, "no-ball": 0, bye: 0, "leg-bye": 0 };
    this.bat = {};
    this.bowl = {};
    this.overCharge = 0; // runs charged to the bowler in the current over
    this.overDeliveries = 0;
    this.lastDelivery = null; // { kind, freeHit }
    this.outs = []; // { id, runsAtFall }
    this.lastWicket = null;
    this.over = false;
    this.winner = undefined; // "chasing" | "defending" | "tie" once decided
    this.freeHit = false;
    this.deliveries = 0;
  }

  b(id) {
    return (this.bat[id] ||= { runs: 0, balls: 0, fours: 0, sixes: 0 });
  }

  w(id) {
    return (this.bowl[id] ||= { legal: 0, conceded: 0, wkts: 0, maidens: 0 });
  }

  /** Can this delivery end in this dismissal? Returns an error string or null. */
  checkWicket(kind, wicketType) {
    if (this.freeHit && !FREE_HIT_WICKETS.includes(wicketType)) return `${wicketType} on a free hit`;
    if (DEAD_BALL_WICKETS.includes(wicketType) && kind !== "normal" && kind !== "wide") return `${wicketType} on a ${kind}`;
    if (kind === "wide" && !WIDE_WICKETS.includes(wicketType)) return `${wicketType} off a wide`;
    if (kind === "no-ball" && !NO_BALL_WICKETS.includes(wicketType)) return `${wicketType} off a no-ball`;
    return null;
  }

  /**
   * @param e { kind: "normal"|"wide"|"no-ball"|"bye"|"leg-bye", bat, extras, wicket: {type, dismissed}|null }
   * `extras` is the total extras of the delivery (a wide with one run run has extras 2).
   */
  apply(e) {
    const kind = e.kind;
    const legal = kind !== "wide" && kind !== "no-ball";
    const bat = e.bat || 0;
    const extras = kind === "wide" || kind === "no-ball" ? Math.max(e.extras || 1, 1) : e.extras || 0;
    const total = bat + extras;
    const striker = this.striker;
    const bowler = this.bowler;
    const wasFreeHit = this.freeHit;

    // ----- runs -----
    this.score += total;
    if (kind === "wide" || kind === "no-ball" || kind === "bye" || kind === "leg-bye") this.extras[kind] += extras;
    const bs = this.b(striker);
    bs.runs += bat;
    if (kind !== "wide") bs.balls += 1; // a wide is not a ball faced
    if (bat === 4) bs.fours += 1;
    if (bat === 6) bs.sixes += 1;

    const bw = this.w(bowler);
    const charge = bat + (kind === "wide" || kind === "no-ball" ? extras : 0); // byes and leg-byes are not the bowler's
    bw.conceded += charge;
    this.overCharge += charge;
    this.overDeliveries += 1;
    this.deliveries += 1;
    if (legal) {
      this.legalBalls += 1;
      bw.legal += 1;
    }

    // ----- who ran how many -----
    let run;
    if (kind === "wide") run = extras - 1;
    else if (kind === "bye" || kind === "leg-bye") run = extras;
    else run = bat;

    // ----- wicket -----
    const out = e.wicket || null;
    let partnership = this.partnership + total;
    if (out) {
      this.wickets += 1;
      const dismissed = out.dismissed;
      if (BOWLER_WICKETS.includes(out.type)) bw.wkts += 1;
      this.outs.push({ id: dismissed, runs: this.b(dismissed).runs });
      this.lastWicket = { id: dismissed, type: out.type };
      // a run out after an odd number of completed runs happened after the batters crossed
      if (out.type === "run out" && run % 2 === 1) [this.striker, this.nonStriker] = [this.nonStriker, this.striker];
      if (this.striker === dismissed) this.striker = null;
      else if (this.nonStriker === dismissed) this.nonStriker = null;
      partnership = 0;
    } else if (run % 2 === 1) {
      [this.striker, this.nonStriker] = [this.nonStriker, this.striker];
    }
    this.partnership = partnership;

    // ----- end of over -----
    let overEnded = false;
    if (legal && this.legalBalls % 6 === 0) {
      overEnded = true;
      if (this.overCharge === 0) bw.maidens += 1;
      this.overCharge = 0;
      this.overDeliveries = 0;
      [this.striker, this.nonStriker] = [this.nonStriker, this.striker];
      this.lastBowler = bowler;
      this.bowler = null;
    }

    // ----- free hit for the next delivery -----
    this.freeHit = kind === "no-ball" || (kind === "wide" && wasFreeHit);

    // ----- result -----
    const inningsDone = this.wickets >= this.maxWickets || this.legalBalls >= this.maxOvers * 6;
    if (this.target !== null) {
      if (this.score >= this.target) {
        this.winner = "chasing";
        this.over = true;
      } else if (inningsDone) {
        this.winner = this.score === this.target - 1 ? "tie" : "defending";
        this.over = true;
      }
    } else if (inningsDone) {
      this.over = true;
    }
    return { wicket: !!out, overEnded };
  }

  /** A batter retires between deliveries: no ball is used, the partnership ends. Out = "retired out" (a wicket). */
  retire(id, out) {
    if (this.striker === id) this.striker = null;
    else if (this.nonStriker === id) this.nonStriker = null;
    this.partnership = 0;
    if (out) {
      this.wickets += 1;
      this.outs.push({ id, runs: this.b(id).runs, retired: true });
      this.lastWicket = { id, type: "retired out" };
    }
    if (this.wickets >= this.maxWickets) this.over = true;
    if (this.target !== null && this.over) this.winner = this.score === this.target - 1 ? "tie" : "defending";
  }

  /** Put a new batsman at the empty end. */
  addBatsman(id) {
    if (this.striker === null) this.striker = id;
    else this.nonStriker = id;
  }

  get overs() {
    return `${Math.floor(this.legalBalls / 6)}.${this.legalBalls % 6}`;
  }

  get extrasTotal() {
    return Object.values(this.extras).reduce((a, b) => a + b, 0);
  }
}

module.exports = { InningsOracle, BOWLER_WICKETS, FREE_HIT_WICKETS, NO_BALL_WICKETS, WIDE_WICKETS };
