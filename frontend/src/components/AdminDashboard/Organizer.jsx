import React, { useState } from "react";
import tournamentApi from "../../api/tournamentApi1";
import { btn, card, field, label } from "../ui/classes";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";

const EMPTY_FORM = { id: null, name: "", banner: null, venue: "", mode: "create" };

export default function OrganizerDashboard({ tournaments, onViewTeams, onRefresh, onTournamentCreated }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: "error" | "success", text }

  // Setup / Edit handlers
  const handleSetup = (t) => {
    setFormData({ ...EMPTY_FORM, id: t.schedule_id });
    setMessage(null);
    setShowForm(true);
  };

  const handleEdit = (t) => {
    setFormData({ id: t.tournament_id, name: t.name || "", banner: null, venue: t.venue || "", mode: "edit" });
    setMessage(null);
    setShowForm(true);
  };

  // Create / update tournament
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const payload = new FormData();

    if (formData.mode === "create") {
      payload.append("tentative_id", formData.id);
    } else {
      payload.append("tournament_id", formData.id);
    }
    payload.append("name", formData.name);
    payload.append("venue", formData.venue);
    if (formData.banner) payload.append("banner_image", formData.banner);

    setSaving(true);
    try {
      if (formData.mode === "create") {
        const result = await tournamentApi.createTournamentFromSchedule(payload);
        const tournamentId = result?.tournamentId;
        setShowForm(false);
        onRefresh();
        if (tournamentId && typeof onTournamentCreated === "function") {
          onTournamentCreated(tournamentId);
        } else {
          setMessage({ type: "error", text: "The tournament was created, but we could not open it. Please refresh the page." });
        }
      } else {
        await tournamentApi.updateTournament(formData.id, { name: formData.name, venue: formData.venue });
        setShowForm(false);
        onRefresh();
        setMessage({ type: "success", text: "Tournament updated." });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Could not save the tournament. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (!tournaments || tournaments.length === 0) {
    return (
      <div className={`${card} p-10 text-center`}>
        <p className="font-semibold text-slate-900">No tournaments assigned yet</p>
        <p className="mt-1 text-sm text-slate-500">When the association reserves dates for your team, they appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-slate-900">Your tournaments</h2>

      {message && !showForm && (
        <p className={`mb-4 rounded-lg p-3 text-sm ${message.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`} role={message.type === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      )}

      <ul className="space-y-3">
        {tournaments.map((t) => {
          const pending = t.schedule_status === "pending";
          return (
            <li key={t.schedule_id} className={`${card} flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{t.name || "Dates reserved for you"}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pending ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                    {pending ? "Waiting for you to set up" : "Set up"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {formatDate(t.start_date)} → {formatDate(t.end_date)}
                </p>
                {t.venue && <p className="text-sm text-slate-500">{t.venue}</p>}
              </div>
              <div className="flex gap-2">
                {pending ? (
                  <button type="button" onClick={() => handleSetup(t)} className={btn.primary}>
                    Set up tournament
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => handleEdit(t)} className={btn.secondary}>
                      Edit details
                    </button>
                    <button type="button" onClick={() => onViewTeams(t.tournament_id)} className={btn.primary}>
                      Manage
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Tournament form */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="tournament-form-title">
          <form onSubmit={handleFormSubmit} className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h3 id="tournament-form-title" className="text-lg font-bold text-slate-900">
              {formData.mode === "create" ? "Set up your tournament" : "Tournament details"}
            </h3>
            {message && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                {message.text}
              </p>
            )}
            <div>
              <label className={label} htmlFor="t-name">
                Tournament name
              </label>
              <input id="t-name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className={field} />
            </div>
            <div>
              <label className={label} htmlFor="t-venue">
                Ground / venue
              </label>
              <input id="t-venue" type="text" value={formData.venue} onChange={(e) => setFormData({ ...formData, venue: e.target.value })} required className={field} />
            </div>
            {formData.mode === "create" && (
            <div>
              <label className={label} htmlFor="t-banner">
                Banner image (optional)
              </label>
              <input id="t-banner" type="file" accept="image/*" onChange={(e) => setFormData({ ...formData, banner: e.target.files[0] })} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200" />
            </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className={btn.secondary}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={btn.primary}>
                {saving ? "Saving…" : formData.mode === "create" ? "Save and open" : "Update"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
