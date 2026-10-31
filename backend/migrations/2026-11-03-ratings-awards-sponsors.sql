-- Run ONCE, AFTER 2026-11-02-association-features.sql. Additive only.
-- Adds: tie rules and tie-break records, per-match rating points, awards, sponsors.
-- Each ALTER fails with "Duplicate column" if run twice; skip it then.

-- ---------------------------------------------------------------------------------------------------------
-- Tied matches. A tournament decides how a tie is settled, separately for group matches and knock-outs:
--   super_over   the scorer enters the super-over scores (the winner follows from them)
--   batted_first the team that batted first wins, automatically
--   manual       the host / association picks the winner
-- ---------------------------------------------------------------------------------------------------------
ALTER TABLE tournaments
  ADD COLUMN tie_rule_group    VARCHAR(20) NOT NULL DEFAULT 'super_over',
  ADD COLUMN tie_rule_knockout VARCHAR(20) NOT NULL DEFAULT 'super_over';

-- how the result was reached: NULL (normal), tie_super_over, tie_batted_first, tie_manual
ALTER TABLE matches ADD COLUMN decided_by VARCHAR(20) NULL;

CREATE TABLE IF NOT EXISTS match_tiebreaks (
  match_id       INT PRIMARY KEY,
  method         VARCHAR(20) NOT NULL,   -- super_over | batted_first | manual
  team1_runs     SMALLINT NULL,          -- super over only
  team1_wickets  TINYINT NULL,
  team2_runs     SMALLINT NULL,
  team2_wickets  TINYINT NULL,
  winner_team_id INT NOT NULL,
  note           VARCHAR(300) NULL,
  decided_by     INT NULL,
  decided_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------------------------------------
-- Rating points of one player in one match (written with the rest of player_match_stats).
-- ---------------------------------------------------------------------------------------------------------
ALTER TABLE player_match_stats
  ADD COLUMN dots          SMALLINT NOT NULL DEFAULT 0,       -- dot balls bowled
  ADD COLUMN won           TINYINT(1) NOT NULL DEFAULT 0,     -- the player's team won
  ADD COLUMN bat_points    DECIMAL(7,2) NOT NULL DEFAULT 0,
  ADD COLUMN bowl_points   DECIMAL(7,2) NOT NULL DEFAULT 0,
  ADD COLUMN field_points  DECIMAL(7,2) NOT NULL DEFAULT 0,
  ADD COLUMN bonus_points  DECIMAL(7,2) NOT NULL DEFAULT 0;   -- win and player-of-the-match bonus

-- ---------------------------------------------------------------------------------------------------------
-- Awards. Rows are suggested by the system (status 'suggested'), confirmed or changed by the association
-- ('confirmed'), then published to the public site ('published'). rank 1 = winner, 2 and 3 = nominees.
-- For the XI of the season, rank is the slot (1..11).
-- ---------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS awards (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  season_year   SMALLINT NOT NULL,
  award_key     VARCHAR(40) NOT NULL,
  tournament_id INT NOT NULL DEFAULT 0,      -- 0 = whole season
  subject_type  ENUM('player', 'team') NOT NULL,
  subject_id    INT NOT NULL,
  rank_no       TINYINT UNSIGNED NOT NULL DEFAULT 1,
  value_text    VARCHAR(120) NULL,           -- "412 runs", "17 wickets" ...
  status        ENUM('suggested', 'confirmed', 'published') NOT NULL DEFAULT 'suggested',
  is_manual     TINYINT(1) NOT NULL DEFAULT 0,
  note          VARCHAR(300) NULL,
  decided_by    INT NULL,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_award (season_year, award_key, tournament_id, rank_no),
  KEY ix_awards_season (season_year, status)
);

-- ---------------------------------------------------------------------------------------------------------
-- Sponsors shown on the public pages.
-- ---------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sponsors (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  logo       VARCHAR(255) NULL,
  link_url   VARCHAR(255) NULL,
  tagline    VARCHAR(160) NULL,
  tier       VARCHAR(12) NOT NULL DEFAULT 'partner',   -- title | gold | silver | partner
  placements VARCHAR(60) NOT NULL DEFAULT 'home,footer',  -- comma list of: home, footer, results, awards
  starts_on  DATE NULL,
  ends_on    DATE NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
);
