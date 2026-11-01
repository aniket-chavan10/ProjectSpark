import React, { useState } from "react";
import { LuCalendarDays, LuImagePlus, LuMapPin, LuPencil, LuSettings2, LuTrophy } from "react-icons/lu";
import tournamentApi from "../../../api/tournamentApi1";
import { fileUrl } from "../../../api/sparkApi";
import { Alert, Badge, Button, Card, Dialog, EmptyState, Spinner } from "../../ui/kit";
import { field, label } from "../../ui/classes";

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

const EMPTY_FORM = { id: null, name: "", banner: null, venue: "", mode: "create" };

// Step 1: the tournaments the association has reserved for this team, and setting one up.
export default function TournamentList({ loaded = true, tournaments, onViewTeams, onRefresh, onTournamentCreated }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: "error" | "success", text }

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

  const submit = async (e) => {
    e.preventDefault();
    const payload = new FormData();
    payload.append(formData.mode === "create" ? "tentative_id" : "tournament_id", formData.id);
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
        if (tournamentId && typeof onTournamentCreated === "function") onTournamentCreated(tournamentId);
        else setMessage({ type: "error", text: "The tournament was created, but we could not open it. Please refresh the page." });
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

  if (!loaded) return <Spinner label="Loading your tournaments…" />;

  if (!tournaments || tournaments.length === 0) {
    return (
      <EmptyState icon={LuTrophy} title="No tournaments assigned yet">
        When the association reserves dates for your team, they appear here and you can set the tournament up.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {message && !showForm && (
        <Alert tone={message.type === "error" ? "error" : "success"} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <ul className="grid gap-4 lg:grid-cols-2">
        {tournaments.map((t) => {
          const pending = t.schedule_status === "pending";
          const banner = fileUrl(t.banner_image);
          return (
            <li key={t.schedule_id}>
              <Card padded={false} className="overflow-hidden">
                <div className="relative h-24 bg-ink-900">
                  {banner && <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
                    <h3 className="truncate text-lg font-bold text-white">{t.name || "Dates reserved for you"}</h3>
                    <Badge tone={pending ? "amber" : "green"}>{pending ? "Needs set-up" : "Set up"}</Badge>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <div className="space-y-1.5 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <LuCalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      {formatDate(t.start_date)} – {formatDate(t.end_date)}
                    </p>
                    {t.venue && (
                      <p className="flex items-center gap-2">
                        <LuMapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        {t.venue}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {pending ? (
                      <Button icon={LuSettings2} onClick={() => handleSetup(t)}>
                        Set up tournament
                      </Button>
                    ) : (
                      <>
                        <Button onClick={() => onViewTeams(t.tournament_id)}>Manage</Button>
                        <Button variant="secondary" icon={LuPencil} onClick={() => handleEdit(t)}>
                          Edit details
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {showForm && (
        <Dialog
          title={formData.mode === "create" ? "Set up your tournament" : "Tournament details"}
          subtitle={formData.mode === "create" ? "Teams can then apply to it." : undefined}
          onClose={() => setShowForm(false)}
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" form="tournament-form" busy={saving}>
                {formData.mode === "create" ? "Save and open" : "Update"}
              </Button>
            </div>
          }
        >
          <form id="tournament-form" onSubmit={submit} className="space-y-4">
            {message && <Alert tone="error">{message.text}</Alert>}
            <div>
              <label className={label} htmlFor="t-name">
                Tournament name
              </label>
              <input id="t-name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className={field} placeholder="e.g. Diwali Cup 2026" />
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
                <label htmlFor="t-banner" className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:border-emerald-500 hover:bg-emerald-50/40">
                  <LuImagePlus className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  {formData.banner ? formData.banner.name : "Choose a picture"}
                </label>
                <input id="t-banner" type="file" accept="image/*" className="sr-only" onChange={(e) => setFormData({ ...formData, banner: e.target.files[0] })} />
              </div>
            )}
          </form>
        </Dialog>
      )}
    </div>
  );
}
