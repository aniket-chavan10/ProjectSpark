import React, { useRef, useState } from "react";
import { LuImagePlus } from "react-icons/lu";
import adminApi from "../../api/adminApi";
import { Alert, Button, Card, CardHeader, PageHeader, Spinner, TeamLogo } from "../ui/kit";

// The team's logo: it is on the scorecards, the rankings and the broadcast overlay.
const Profile = ({ team, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [preview, setPreview] = useState(null);
  const input = useRef(null);

  if (!team) return <Spinner />;

  const upload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) return setError("Choose a picture (PNG or JPG).");
    setError("");
    setDone("");
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const res = await adminApi.updateTeamLogo(file, localStorage.getItem("authToken"));
      if (res.status !== 200) throw new Error("Failed to update the team logo.");
      setDone("Logo saved. It now shows on scorecards and the broadcast.");
      if (onChanged) onChanged();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not save the logo.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Team profile" subtitle="How your team looks on scorecards, rankings and the live broadcast." />
      <Card>
        <CardHeader title="Team logo" subtitle="A square picture works best. It is shown round." />
        <div className="mt-5 flex flex-wrap items-center gap-6">
          {preview ? <img src={preview} alt="New logo" className="h-24 w-24 rounded-full object-cover ring-1 ring-slate-200" /> : <TeamLogo team={team} size={96} />}
          <div>
            <p className="text-lg font-semibold text-slate-900">{team.name}</p>
            <div className="mt-3">
              <input ref={input} type="file" accept="image/*" className="sr-only" id="team-logo" onChange={upload} />
              <Button variant="secondary" icon={LuImagePlus} busy={busy} onClick={() => input.current && input.current.click()}>
                {team.logo ? "Change logo" : "Upload logo"}
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {error && <Alert tone="error">{error}</Alert>}
          {done && <Alert tone="success">{done}</Alert>}
        </div>
      </Card>
    </div>
  );
};

export default Profile;
