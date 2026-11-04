// The overlay desk's score-bar settings and the new scenes: what is stored, what a scene change leaves alone,
// what is refused. The match_overlay table is replaced by a small in-memory stand-in.

const mockTable = { row: null };
jest.mock("../dbconfigure", () => ({
  query: async (sql, params = []) => {
    const s = sql.replace(/\s+/g, " ").trim();
    if (s.startsWith("SELECT match_id, tournament_id, team1_id, team2_id, status")) return [[{ match_id: Number(params[0]), tournament_id: 1, team1_id: 1, team2_id: 2, status: "live", winner_team_id: null, player_of_match_id: null }]];
    if (s.startsWith("SELECT scene, payload, auto_hide, shown_at, updated_at FROM match_overlay")) return [mockTable.row ? [{ ...mockTable.row }] : []];
    if (s.startsWith("INSERT INTO match_overlay") && s.includes("VALUES (?, 'none'")) {
      const [, payload] = [params[0], params[1]];
      mockTable.row = mockTable.row ? { ...mockTable.row, payload } : { scene: "none", payload, auto_hide: null, shown_at: null, updated_at: new Date() };
      return [{ affectedRows: 1 }];
    }
    if (s.startsWith("INSERT INTO match_overlay")) {
      const [, scene, payload, autoHide] = params;
      mockTable.row = { scene, payload, auto_hide: autoHide, shown_at: new Date(), updated_at: new Date() };
      return [{ affectedRows: 1 }];
    }
    throw new Error(`unexpected query: ${s}`);
  },
}));

const overlay = require("../services/overlayService");

beforeEach(() => {
  mockTable.row = null;
});

describe("the score bar settings", () => {
  test("every part shows until the operator switches it off", async () => {
    const state = await overlay.getState(7);
    expect(state.scene).toBe("none");
    expect(state.bar).toEqual({ visible: true, batters: "both", bowler: true, thisOver: true, info: true, photos: true, corner: true, events: true, eventStyle: "bar" });
  });

  test("only the keys sent change, and the choice is kept", async () => {
    const a = await overlay.setBar(7, { batters: "striker" });
    expect(a.bar.batters).toBe("striker");
    expect(a.bar.bowler).toBe(true);
    const b = await overlay.setBar(7, { bowler: false, photos: false });
    expect(b.bar).toMatchObject({ batters: "striker", bowler: false, photos: false, thisOver: true });
    expect((await overlay.getState(7)).bar).toEqual(b.bar);
  });

  test("four / six / wicket can play in the bar or above it, nothing else", async () => {
    expect((await overlay.setBar(7, { eventStyle: "banner" })).bar.eventStyle).toBe("banner");
    expect((await overlay.setBar(7, { events: false })).bar).toMatchObject({ events: false, eventStyle: "banner" });
    await expect(overlay.setBar(7, { eventStyle: "popup" })).rejects.toThrow(/choose bar or banner/);
  });

  test("an unknown batters mode is refused and nothing is stored", async () => {
    await expect(overlay.setBar(7, { batters: "everyone" })).rejects.toThrow(/Batters/);
    expect(mockTable.row).toBeNull();
  });

  test("a scene change keeps the bar, and a bar change keeps the scene on air", async () => {
    await overlay.setBar(7, { batters: "nonStriker", corner: false });
    const on = await overlay.setState(7, { scene: "scorecard", payload: { innings: 2 }, autoHide: 10 });
    expect(on).toMatchObject({ scene: "scorecard", payload: { innings: 2 }, autoHide: 10 });
    expect(on.bar).toMatchObject({ batters: "nonStriker", corner: false });

    const after = await overlay.setBar(7, { events: false });
    expect(after).toMatchObject({ scene: "scorecard", payload: { innings: 2 }, autoHide: 10 });
    expect(after.bar).toMatchObject({ batters: "nonStriker", corner: false, events: false });

    const off = await overlay.setState(7, { scene: "none" });
    expect(off.scene).toBe("none");
    expect(off.bar.events).toBe(false);
  });

  test("the bar never leaks into a scene's payload", async () => {
    await overlay.setBar(7, { visible: false });
    const s = await overlay.setState(7, { scene: "squads", payload: { teamId: 2 } });
    expect(s.payload).toEqual({ teamId: 2 });
  });
});

describe("the new scenes", () => {
  test("batters: both by default, one of them when asked, junk becomes both", () => {
    expect(overlay.cleanPayload("batters", {})).toEqual({ which: "both" });
    expect(overlay.cleanPayload("batters", { which: "striker" })).toEqual({ which: "striker" });
    expect(overlay.cleanPayload("batters", { which: "nobody" })).toEqual({ which: "both" });
  });

  test("player card: a fixed player, or whoever is batting / bowling now; one of them is needed", () => {
    expect(overlay.cleanPayload("player", { playerId: "12" })).toEqual({ role: null, playerId: 12 });
    expect(overlay.cleanPayload("player", { role: "bowler" })).toEqual({ role: "bowler", playerId: null });
    expect(() => overlay.cleanPayload("player", {})).toThrow(/Choose the player/);
    expect(() => overlay.cleanPayload("player", { role: "umpire" })).toThrow(/Choose the player/);
  });

  test("the scene list has the player card", async () => {
    expect(overlay.SCENES).toContain("player");
    const s = await overlay.setState(7, { scene: "player", payload: { role: "striker" } });
    expect(s).toMatchObject({ scene: "player", payload: { role: "striker", playerId: null } });
  });
});
