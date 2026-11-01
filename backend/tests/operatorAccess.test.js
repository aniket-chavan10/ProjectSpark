// The overlay operator's key: it may run the overlay of ONE match and nothing else.

process.env.JWT_SECRET = "test-secret";
const jwt = require("jsonwebtoken");
const operatorAuth = require("../middlewares/overlayOperatorAuth");
const verifyToken = require("../middlewares/authMiddleware");
const dateOnly = require("../utils/dateOnly");

const call = (mw, token, params = { matchId: "7" }) => {
  const req = { params, header: (h) => (h === "Authorization" && token ? `Bearer ${token}` : undefined) };
  const res = { statusCode: null, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  let passed = false;
  mw(req, res, () => { passed = true; });
  return { req, res, passed };
};

const key = (matchId, opts = {}) => jwt.sign({ scope: "overlay-operator", matchId }, process.env.JWT_SECRET, { expiresIn: "1h", ...opts });
const adminToken = () => jwt.sign({ id: 1, role: "admin", team_id: 1 }, process.env.JWT_SECRET, { expiresIn: "1h" });

describe("overlay operator key", () => {
  test("opens the overlay of its own match", () => {
    const r = call(operatorAuth, key(7));
    expect(r.passed).toBe(true);
    expect(r.req.operator.matchId).toBe(7);
  });

  test("is refused for another match", () => {
    const r = call(operatorAuth, key(8));
    expect(r.passed).toBe(false);
    expect(r.res.statusCode).toBe(403);
  });

  test("a logged-in admin still passes", () => {
    expect(call(operatorAuth, adminToken()).passed).toBe(true);
  });

  test("no key, a forged key and an expired key are refused", () => {
    expect(call(operatorAuth, null).res.statusCode).toBe(401);
    expect(call(operatorAuth, jwt.sign({ scope: "overlay-operator", matchId: 7 }, "other-secret")).res.statusCode).toBe(401);
    expect(call(operatorAuth, key(7, { expiresIn: -10 })).res.statusCode).toBe(401);
  });

  test("cannot be used as a login anywhere else", () => {
    const r = call(verifyToken, key(7));
    expect(r.passed).toBe(false);
    expect(r.res.statusCode).toBe(403);
    expect(call(verifyToken, adminToken()).passed).toBe(true);
  });
});

describe("dateOnly", () => {
  test("turns a DATE from the driver into YYYY-MM-DD with its year", () => {
    expect(dateOnly(new Date(2026, 10, 1))).toBe("2026-11-01");
    expect(dateOnly("2026-11-03T00:00:00.000Z")).toBe("2026-11-03");
    expect(dateOnly(null)).toBeNull();
  });
});
