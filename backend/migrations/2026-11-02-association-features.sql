-- Run ONCE on the Spark database before deploying the overlay desk / points / public site / notifications / bans.
-- New tables only, plus one column on `matches`. Nothing existing is renamed or removed.
-- Re-running the CREATE TABLE / INSERT IGNORE parts is harmless; the ALTER at the top fails the second time
-- ("Duplicate column") - that is fine, skip it.

ALTER TABLE matches ADD COLUMN player_of_match_id INT NULL;

-- ---------------------------------------------------------------------------------------------------------
-- Points: what a team earns for clearing each round. Edited by the association; history in team_points.
-- ---------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS points_rules (
  rule_key   VARCHAR(30) PRIMARY KEY,
  label      VARCHAR(80) NOT NULL,
  points     INT NOT NULL DEFAULT 0,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0
);

INSERT IGNORE INTO points_rules (rule_key, label, points, sort_order) VALUES
  ('participation', 'Playing in a tournament',        5, 1),
  ('round1',        'Winning round 1',               10, 2),
  ('round2',        'Winning round 2',               15, 3),
  ('round3',        'Winning round 3',               20, 4),
  ('group_final',   'Winning the group final',       25, 5),
  ('semi',          'Winning a semi-final',          40, 6),
  ('final',         'Winning the final',             60, 7),
  ('third_place',   'Winning the third-place match', 20, 8);

-- One row per point earned. tournament_match_id = 0 for tournament-level points (participation).
CREATE TABLE IF NOT EXISTS team_points (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id       INT NOT NULL,
  team_id             INT NOT NULL,
  tournament_match_id INT NOT NULL DEFAULT 0,
  rule_key            VARCHAR(30) NOT NULL,
  points              INT NOT NULL,
  season_year         SMALLINT NOT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_team_points (tournament_id, team_id, tournament_match_id, rule_key),
  KEY ix_team_points_team (team_id),
  KEY ix_team_points_season (season_year)
);

-- 1st..4th of a finished tournament
CREATE TABLE IF NOT EXISTS tournament_results (
  tournament_id INT NOT NULL,
  position      TINYINT UNSIGNED NOT NULL,
  team_id       INT NOT NULL,
  decided_by    VARCHAR(30) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tournament_id, position),
  KEY ix_tournament_results_team (team_id)
);

-- ---------------------------------------------------------------------------------------------------------
-- One row per player per completed match, written when the match ends (rebuilt if the last ball is undone).
-- ---------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_match_stats (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  match_id       INT NOT NULL,
  tournament_id  INT NOT NULL,
  season_year    SMALLINT NOT NULL,
  team_id        INT NOT NULL,
  player_id      INT NOT NULL,
  in_xi          TINYINT(1) NOT NULL DEFAULT 0,
  is_keeper      TINYINT(1) NOT NULL DEFAULT 0,
  batted         TINYINT(1) NOT NULL DEFAULT 0,
  runs           SMALLINT NOT NULL DEFAULT 0,
  balls          SMALLINT NOT NULL DEFAULT 0,
  fours          SMALLINT NOT NULL DEFAULT 0,
  sixes          SMALLINT NOT NULL DEFAULT 0,
  not_out        TINYINT(1) NOT NULL DEFAULT 0,
  dismissal      VARCHAR(120) NULL,
  bowled_balls   SMALLINT NOT NULL DEFAULT 0,   -- legal balls
  runs_conceded  SMALLINT NOT NULL DEFAULT 0,
  wickets        SMALLINT NOT NULL DEFAULT 0,
  maidens        SMALLINT NOT NULL DEFAULT 0,
  wides          SMALLINT NOT NULL DEFAULT 0,
  no_balls       SMALLINT NOT NULL DEFAULT 0,
  catches        SMALLINT NOT NULL DEFAULT 0,
  stumpings      SMALLINT NOT NULL DEFAULT 0,
  run_outs       SMALLINT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_pms (match_id, player_id),
  KEY ix_pms_player (player_id),
  KEY ix_pms_tournament (tournament_id),
  KEY ix_pms_season (season_year),
  KEY ix_pms_team (team_id)
);

-- ---------------------------------------------------------------------------------------------------------
-- Overlay desk: what the operator wants on the broadcast screen for a match right now.
-- ---------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_overlay (
  match_id     INT PRIMARY KEY,
  scene        VARCHAR(30) NOT NULL DEFAULT 'none',
  payload      TEXT NULL,                       -- JSON: { teamId, innings, text, playerId ... }
  auto_hide    SMALLINT UNSIGNED NULL,          -- seconds; NULL = stays until the operator hides it
  shown_at     DATETIME NULL,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------------------------------------
-- Notifications to a team (team_notifications: the old `notifications` table is a different, older thing), and announcements.
-- ---------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  team_id    INT NOT NULL,
  type       VARCHAR(30) NOT NULL,   -- match_scheduled | season_plan | match_result | tournament_winner | announcement | ban | ban_revoked
  title      VARCHAR(150) NOT NULL,
  body       VARCHAR(500) NULL,
  link       VARCHAR(200) NULL,
  dedupe_key VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at    DATETIME NULL,
  UNIQUE KEY uq_team_notification_dedupe (team_id, dedupe_key),
  KEY ix_team_notifications_team (team_id, created_at)
);

CREATE TABLE IF NOT EXISTS announcements (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(150) NOT NULL,
  body       TEXT NOT NULL,
  pinned     TINYINT(1) NOT NULL DEFAULT 0,
  expires_on DATE NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
);

-- ---------------------------------------------------------------------------------------------------------
-- Bans (player or team). players_core.is_banned / banned_until stay in step so the squad code keeps working.
-- ---------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bans (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  subject_type  ENUM('player', 'team') NOT NULL,
  subject_id    INT NOT NULL,
  reason        VARCHAR(300) NOT NULL,
  starts_on     DATE NOT NULL,
  ends_on       DATE NULL,              -- last banned day; NULL = until revoked
  created_by    INT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at    DATETIME NULL,
  revoked_by    INT NULL,
  revoke_reason VARCHAR(300) NULL,
  KEY ix_bans_subject (subject_type, subject_id)
);
