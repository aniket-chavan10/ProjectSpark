// Errors the scorer can fix themselves (bad input, wrong state). Carry an HTTP status
// so controllers can show the real reason instead of a generic 500.
class ScoringError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ScoringError";
    this.status = status;
  }
}

/**
 * Send a scoring error with its own status/message, anything else as a generic 500.
 */
const sendScoringError = (res, err, fallbackMessage) => {
  if (err instanceof ScoringError) {
    return res.status(err.status).json({ success: false, message: err.message, error: err.message });
  }
  return res.status(500).json({ success: false, message: fallbackMessage, error: fallbackMessage });
};

module.exports = { ScoringError, sendScoringError };
