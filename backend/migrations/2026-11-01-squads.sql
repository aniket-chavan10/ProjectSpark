-- Run ONCE on the Spark database before deploying the squad feature.
-- Two new tables only: nothing in players_core / teams_squad is altered.
--
--   tournament_squads : the squad a team declares for a tournament (playing XI + up to 4 reserves)
--   match_squads      : the squad for one match. Rows exist when the team changed the XI for that match,
--                       and are always written for both teams at the toss (the squad is then locked).
--
-- role: 'playing' (batting order = batting_order) or 'reserve'.

CREATE TABLE IF NOT EXISTS tournament_squads (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT NOT NULL,
  team_id       INT NOT NULL,
  player_id     INT NOT NULL,
  role          ENUM('playing', 'reserve') NOT NULL,
  batting_order TINYINT UNSIGNED NULL,
  jersey_number SMALLINT UNSIGNED NULL,
  is_captain    TINYINT(1) NOT NULL DEFAULT 0,
  is_keeper     TINYINT(1) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tournament_squad (tournament_id, team_id, player_id),
  KEY ix_tournament_squad_team (tournament_id, team_id)
);

CREATE TABLE IF NOT EXISTS match_squads (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  tournament_match_id INT NOT NULL,
  team_id             INT NOT NULL,
  player_id           INT NOT NULL,
  role                ENUM('playing', 'reserve') NOT NULL,
  batting_order       TINYINT UNSIGNED NULL,
  jersey_number       SMALLINT UNSIGNED NULL,
  is_captain          TINYINT(1) NOT NULL DEFAULT 0,
  is_keeper           TINYINT(1) NOT NULL DEFAULT 0,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_match_squad (tournament_match_id, team_id, player_id),
  KEY ix_match_squad_team (tournament_match_id, team_id)
);
