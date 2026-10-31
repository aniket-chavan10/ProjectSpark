import { apiOrigin } from "../../api/matchSocket";
import { teamCode, teamColor } from "./scoreUtils";

/** A team's logo, or its code on a coloured disc when it has no logo. */
export default function TeamBadge({ team, size = 56, className = "" }) {
  const name = team.team_name || team.name;
  const logo = team.logo ? (/^https?:/.test(team.logo) ? team.logo : `${apiOrigin()}/${String(team.logo).replace(/\\/g, "/").replace(/^\/+/, "")}`) : null;
  const style = { width: size, height: size, fontSize: Math.round(size * 0.34), background: teamColor(team.id) };
  return logo ? (
    <img src={logo} alt={name} style={{ width: size, height: size }} className={`rounded-full bg-white object-cover ${className}`} />
  ) : (
    <div style={style} className={`flex shrink-0 items-center justify-center rounded-full font-extrabold text-white ${className}`} aria-label={name}>
      {teamCode(name)}
    </div>
  );
}
