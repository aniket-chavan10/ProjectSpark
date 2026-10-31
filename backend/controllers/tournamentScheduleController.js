const scheduleService = require("../services/tournamentScheduleService");
const { ScoringError } = require("../utils/errors");

const fail = (res, err, fallback) => {
  if (err instanceof ScoringError) {
    return res.status(err.status).json({ success: false, error: err.message, message: err.message, ...(err.details || {}) });
  }
  console.error(fallback, err);
  return res.status(500).json({ success: false, error: fallback, message: fallback });
};

const idOf = (req) => parseInt(req.params.tournamentId, 10);

// GET /tournaments/:tournamentId/schedule-plan
exports.getSchedulePlan = async (req, res) => {
  try {
    res.json(await scheduleService.getSchedulePlan(idOf(req), req.user.id));
  } catch (err) {
    fail(res, err, "Could not load the schedule");
  }
};

// POST /tournaments/:tournamentId/schedule/preview   (auto-fill)
exports.previewSchedule = async (req, res) => {
  try {
    res.json(await scheduleService.previewSchedule(idOf(req), req.user.id, req.body));
  } catch (err) {
    fail(res, err, "Could not build the schedule");
  }
};

// POST /tournaments/:tournamentId/schedule/check      (live check while the host edits)
exports.checkSchedule = async (req, res) => {
  try {
    res.json(await scheduleService.checkSchedule(idOf(req), req.user.id, req.body));
  } catch (err) {
    fail(res, err, "Could not check the schedule");
  }
};

// POST /tournaments/:tournamentId/schedule             (save)
exports.saveSchedule = async (req, res) => {
  try {
    const result = await scheduleService.saveSchedule(idOf(req), req.user.id, req.body);
    res.status(201).json({ message: "Schedule saved", ...result });
  } catch (err) {
    fail(res, err, "Could not save the schedule");
  }
};

// GET /tournaments/:tournamentId/standings              (public)
exports.getStandings = async (req, res) => {
  try {
    res.json(await scheduleService.getStandings(idOf(req)));
  } catch (err) {
    fail(res, err, "Could not load the standings");
  }
};
