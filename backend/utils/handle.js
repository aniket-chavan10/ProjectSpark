const { sendScoringError } = require("./errors");

/** Run a service call for a request and answer with its result (or the reason it was refused). */
const handle = (fallback, status, fn) => async (req, res) => {
  try {
    res.status(status).json(await fn(req, res));
  } catch (err) {
    if (!err.status) console.error(fallback, err);
    sendScoringError(res, err, fallback);
  }
};

const intParam = (req, key) => parseInt(req.params[key], 10);

module.exports = { handle, intParam };
