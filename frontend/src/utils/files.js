// Uploaded pictures (team logos, player photos, tournament banners, sponsor logos) live on the backend,
// in backend/uploads, and are served at <backend>/uploads/<file>. The database stores "uploads/<file>".
// This is the one place that turns a stored path into something an <img> can load.

const apiBase = () => import.meta.env.VITE_API_URL || "http://localhost:3000/api";

/** "uploads/1700-123.jpg" (or an old "uploads\\1700-123.jpg") -> "http://localhost:3000/uploads/1700-123.jpg"; a full URL is left alone. */
export const fileUrl = (path) => {
  if (!path) return null;
  const p = String(path).trim();
  if (!p) return null;
  if (/^(https?:|data:|blob:)/i.test(p)) return p;
  const origin = apiBase().replace(/\/api\/?$/, "");
  return `${origin}/${p.replace(/\\/g, "/").replace(/^\/+/, "")}`;
};
