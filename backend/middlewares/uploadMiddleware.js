// Uploaded pictures (player photos, team logos, tournament banners, sponsor logos) are kept on this machine,
// in backend/uploads, and served by index.js at  http://localhost:3000/uploads/<file>.
// (When you deploy, point UPLOAD_DIR at a persistent disk - or swap the storage for S3 / Cloudinary here.)
//
// The folder is resolved from this file, not from where `node` was started, so it is the same folder no
// matter which directory the server is launched from.
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
  },
});

const IMAGE = /jpeg|jpg|png|gif|webp/;

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const okName = IMAGE.test(path.extname(file.originalname).toLowerCase());
    const okType = IMAGE.test(file.mimetype);
    if (okName && okType) cb(null, true);
    else cb(new Error("Only image files are allowed (jpg, png, gif or webp)"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/** What goes into the database for an uploaded file: always forward slashes, relative to the server root. */
const storedPath = (file) => (file ? `uploads/${file.filename}` : null);

/** Remove a file we stored earlier (e.g. the old logo after a new one is saved). Never leaves the uploads folder. */
const removeStored = (stored) => {
  try {
    if (!stored || /^https?:/i.test(stored)) return;
    const name = path.basename(String(stored).replace(/\\/g, "/"));
    const full = path.join(UPLOAD_DIR, name);
    if (full.startsWith(UPLOAD_DIR + path.sep) && fs.existsSync(full)) fs.unlinkSync(full);
  } catch (err) {
    console.warn("Could not remove the old upload:", err.message);
  }
};

/**
 * A single-file upload whose mistakes (wrong type, too large) answer with a clear 400 instead of a server error:
 *   router.put("/logo", auth, upload.safe("logo"), handler)
 */
upload.safe = (field) => (req, res, next) =>
  upload.single(field)(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "The picture is too large (the limit is 5 MB)." : err.message;
    res.status(400).json({ success: false, error: message, message });
  });

upload.UPLOAD_DIR = UPLOAD_DIR;
upload.storedPath = storedPath;
upload.removeStored = removeStored;

module.exports = upload;
