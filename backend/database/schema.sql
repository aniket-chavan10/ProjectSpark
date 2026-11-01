-- =====================================================================================================
-- Project Spark - database schema (MySQL 8.0+ / 8.4 / 9.x)
--
-- ONE file builds the whole database on a clean machine:     npm run db:setup
-- It matches what the code in this repository actually reads and writes. It replaces the old
-- "dump + migrations" route: nothing else has to be run after it.
--
-- Rules this file follows (so a restore never fails half way):
--   * tables are created in dependency order, foreign keys that would be circular are added at the end
--   * no DEFINER, no views, no version-specific comments, no collation clauses
--   * every enum / CHECK allows exactly the values the code writes (see "Values the code writes" below)
--
-- Values the code writes (keep these in step with utils/cricketRules/cricketRules.js):
--   balls.extra_type   : wide | no-ball | bye | leg-bye
--   balls.wicket_type  : bowled caught lbw stumped "run out" "hit wicket" "handled ball" "timed out"
--                        "obstructing the field" "hit the ball twice" "retired out" "retired hurt"
-- =====================================================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------------------------------
-- People and teams
-- ---------------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admins (
  id            INT NOT NULL AUTO_INCREMENT,
  admin_name    VARCHAR(255) NOT NULL,
  team_name     VARCHAR(255) NULL,
  email         VARCHAR(255) NOT NULL,
  password      VARCHAR(255) NOT NULL,
  phone         VARCHAR(15) NULL,
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  role          VARCHAR(50) NULL DEFAULT 'admin',
  is_organizer  TINYINT(1) NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY team_name (team_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS master_admins (
  id            INT NOT NULL AUTO_INCREMENT,
  username      VARCHAR(255) NOT NULL,
  password      VARCHAR(255) NOT NULL,
  email_address VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  role          VARCHAR(50) NULL DEFAULT 'master-admin',
  PRIMARY KEY (id),
  UNIQUE KEY username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS villages (
  id            INT NOT NULL AUTO_INCREMENT,
  village_name  VARCHAR(255) NOT NULL,
  team_name     VARCHAR(255) NOT NULL,
  admin_name    VARCHAR(255) NOT NULL,
  email_address VARCHAR(255) NOT NULL,
  phone_number  VARCHAR(15) NOT NULL,
  status        ENUM('pending','approved','rejected') NULL DEFAULT 'pending',
  created_at    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS teams (
  id          INT NOT NULL AUTO_INCREMENT,
  team_name   VARCHAR(255) NOT NULL,
  admin_id    INT NOT NULL,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  logo        VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY admin_id (admin_id),
  CONSTRAINT teams_ibfk_1 FOREIGN KEY (admin_id) REFERENCES admins (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- email is optional (a village player often has none); MySQL allows many NULLs in a UNIQUE key.
CREATE TABLE IF NOT EXISTS players_core (
  player_id       INT NOT NULL AUTO_INCREMENT,
  team_id         INT NOT NULL,
  players_name    VARCHAR(255) NULL,
  mobile_number   VARCHAR(15) NOT NULL,
  email           VARCHAR(255) NULL,
  profile_picture VARCHAR(255) NULL,
  password        VARCHAR(255) NOT NULL,
  is_banned       TINYINT(1) NULL DEFAULT 0,
  banned_until    DATE NULL,
  PRIMARY KEY (player_id),
  UNIQUE KEY mobile_number (mobile_number),
  UNIQUE KEY email (email),
  KEY fk_team_id (team_id),
  CONSTRAINT fk_team_id FOREIGN KEY (team_id) REFERENCES teams (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- the older "current XI" of a team; still the fallback when a team has not declared a tournament squad
CREATE TABLE IF NOT EXISTS teams_squad (
  id          INT NOT NULL AUTO_INCREMENT,
  team_id     INT NOT NULL,
  player_id   INT NOT NULL,
  is_playing  TINYINT(1) NULL DEFAULT 0,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY team_id (team_id),
  KEY player_id (player_id),
  CONSTRAINT teams_squad_ibfk_1 FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT teams_squad_ibfk_2 FOREIGN KEY (player_id) REFERENCES players_core (player_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------------------------------
-- Tournaments
-- ---------------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tentative_tournament_schedules (
  id                 INT NOT NULL AUTO_INCREMENT,
  organizer_admin_id INT NOT NULL,
  start_date         DATE NOT NULL,
  end_date           DATE NOT NULL,
  reserved_days      INT NULL DEFAULT 3,
  created_at         TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status             VARCHAR(30) NULL DEFAULT 'pending',
  tournament_id      INT NULL,
  PRIMARY KEY (id),
  KEY organizer_admin_id (organizer_admin_id),
  KEY fk_tentative_tournament (tournament_id),
  CONSTRAINT tentative_tournament_schedules_ibfk_1 FOREIGN KEY (organizer_admin_id) REFERENCES admins (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tournaments (
  id                    INT NOT NULL AUTO_INCREMENT,
  tentative_id          INT NULL,
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  organizer_admin_id    INT NOT NULL,
  name                  VARCHAR(255) NULL,
  banner_image          VARCHAR(255) NULL,
  venue                 VARCHAR(255) NULL,
  status                VARCHAR(30) NULL DEFAULT 'pending',
  created_at            TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  organizing_team       VARCHAR(255) NOT NULL,
  total_slots           INT NULL DEFAULT 32,
  available_slots       INT NULL DEFAULT 32,
  application_deadline  DATETIME NULL,
  current_step          INT NULL DEFAULT 1,
  tie_rule_group        VARCHAR(20) NOT NULL DEFAULT 'super_over',   -- super_over | batted_first | manual
  tie_rule_knockout     VARCHAR(20) NOT NULL DEFAULT 'super_over',
  PRIMARY KEY (id),
  KEY organizer_admin_id (organizer_admin_id),
  KEY fk_tournament_tentative (tentative_id),
  CONSTRAINT tournaments_ibfk_1 FOREIGN KEY (organizer_admin_id) REFERENCES admins (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tournament_participants (
  id             INT NOT NULL AUTO_INCREMENT,
  tournament_id  INT NOT NULL,
  team_id        INT NOT NULL,
  group_name     ENUM('A','B','C','D') NULL,
  status         ENUM('payment_pending','confirmed','cancelled') NULL DEFAULT 'payment_pending',
  created_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_team_tournament (tournament_id, team_id),
  KEY ix_participants_team (team_id),
  CONSTRAINT tournament_participants_ibfk_1 FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
  CONSTRAINT fk_participants_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tournament_progress (
  progress_id           INT NOT NULL AUTO_INCREMENT,
  tournament_id         INT NOT NULL,
  teams_created         TINYINT(1) NULL DEFAULT 0,
  groups_created        TINYINT(1) NULL DEFAULT 0,
  schedule_created      TINYINT(1) NULL DEFAULT 0,
  matches_started       TINYINT(1) NULL DEFAULT 0,
  live_dashboard_active TINYINT(1) NULL DEFAULT 0,
  live_match_state      JSON NULL,
  last_updated          TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (progress_id),
  KEY fk_tournament (tournament_id),
  CONSTRAINT fk_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A fixture of the schedule. match_id is filled in at the toss, when the live match is created.
CREATE TABLE IF NOT EXISTS tournament_matches (
  id                    INT NOT NULL AUTO_INCREMENT,
  match_no              INT NOT NULL,
  stage                 VARCHAR(20) NOT NULL DEFAULT 'group',          -- group | semi | third_place | final
  tournament_id         INT NOT NULL,
  match_id              INT NULL,
  round_number          INT NOT NULL,
  group_name            ENUM('A','B','C','D') NULL,
  team1_id              INT NULL,
  team2_id              INT NULL,
  match_date            DATETIME NULL,
  match_time            DATETIME NULL,
  venue                 VARCHAR(255) NOT NULL,
  winner_team_id        INT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'scheduled',     -- scheduled | live | completed
  dependent_match1_id   INT NULL,
  dependent_match2_id   INT NULL,
  created_at            TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  overs                 TINYINT UNSIGNED NULL,
  duration_minutes      SMALLINT UNSIGNED NULL,
  dependent_match1_type ENUM('winner','loser') NOT NULL DEFAULT 'winner',
  dependent_match2_type ENUM('winner','loser') NOT NULL DEFAULT 'winner',
  PRIMARY KEY (id),
  KEY fk_tournament_id (tournament_id),
  KEY fk_team1_id (team1_id),
  KEY fk_team2_id (team2_id),
  KEY fk_winner_team_id (winner_team_id),
  KEY fk_dependent_match1 (dependent_match1_id),
  KEY fk_dependent_match2 (dependent_match2_id),
  KEY ix_tournament_matches_match_id (match_id),
  CONSTRAINT fk_dependent_match1 FOREIGN KEY (dependent_match1_id) REFERENCES tournament_matches (id) ON DELETE SET NULL,
  CONSTRAINT fk_dependent_match2 FOREIGN KEY (dependent_match2_id) REFERENCES tournament_matches (id) ON DELETE SET NULL,
  CONSTRAINT fk_team1_id FOREIGN KEY (team1_id) REFERENCES teams (id) ON DELETE SET NULL,
  CONSTRAINT fk_team2_id FOREIGN KEY (team2_id) REFERENCES teams (id) ON DELETE SET NULL,
  CONSTRAINT fk_tournament_id FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
  CONSTRAINT fk_winner_team_id FOREIGN KEY (winner_team_id) REFERENCES teams (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The squad a team declares for a tournament: playing XI + up to 4 reserves.
CREATE TABLE IF NOT EXISTS tournament_squads (
  id             INT NOT NULL AUTO_INCREMENT,
  tournament_id  INT NOT NULL,
  team_id        INT NOT NULL,
  player_id      INT NOT NULL,
  role           ENUM('playing','reserve') NOT NULL,
  batting_order  TINYINT UNSIGNED NULL,
  jersey_number  SMALLINT UNSIGNED NULL,
  is_captain     TINYINT(1) NOT NULL DEFAULT 0,
  is_keeper      TINYINT(1) NOT NULL DEFAULT 0,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tournament_squad (tournament_id, team_id, player_id),
  KEY ix_tournament_squad_team (tournament_id, team_id),
  CONSTRAINT fk_tsquad_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
  CONSTRAINT fk_tsquad_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_tsquad_player FOREIGN KEY (player_id) REFERENCES players_core (player_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------------------------------
-- A live / finished match and its scoring
-- ---------------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS matches (
  match_id             INT NOT NULL AUTO_INCREMENT,
  tournament_id        INT NOT NULL,
  tournament_match_id  INT NULL,
  match_no             INT NULL,
  team1_id             INT NOT NULL,
  team2_id             INT NOT NULL,
  date                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  venue                VARCHAR(255) NULL,
  toss_winner_id       INT NULL,
  toss_decision        VARCHAR(20) NULL,                              -- bat | bowl
  total_overs          INT NULL,
  target_score         INT UNSIGNED NULL,
  winner_team_id       INT NULL,
  result               VARCHAR(255) NULL,
  status               VARCHAR(50) NULL,
  is_super_over        TINYINT(1) NULL DEFAULT 0,
  victory_margin_type  ENUM('runs','wickets') NULL,
  victory_margin       INT NULL,
  player_of_match_id   INT NULL,
  decided_by           VARCHAR(20) NULL,                              -- NULL | tie_super_over | tie_batted_first | tie_manual
  PRIMARY KEY (match_id),
  KEY fk_matches_tournament (tournament_id),
  KEY fk_matches_team1 (team1_id),
  KEY fk_matches_team2 (team2_id),
  KEY fk_matches_toss_winner (toss_winner_id),
  KEY fk_matches_winner (winner_team_id),
  KEY fk_tournament_match (tournament_match_id),
  KEY ix_matches_potm (player_of_match_id),
  CONSTRAINT fk_matches_team1 FOREIGN KEY (team1_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_matches_team2 FOREIGN KEY (team2_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_matches_toss_winner FOREIGN KEY (toss_winner_id) REFERENCES teams (id) ON DELETE SET NULL,
  CONSTRAINT fk_matches_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
  CONSTRAINT fk_matches_winner FOREIGN KEY (winner_team_id) REFERENCES teams (id) ON DELETE SET NULL,
  CONSTRAINT fk_tournament_match FOREIGN KEY (tournament_match_id) REFERENCES tournament_matches (id),
  CONSTRAINT fk_matches_potm FOREIGN KEY (player_of_match_id) REFERENCES players_core (player_id) ON DELETE SET NULL,
  CONSTRAINT matches_chk_2 CHECK (total_overs > 0),
  CONSTRAINT matches_chk_3 CHECK (status IN ('completed','upcoming','live','abandoned','first_innings_ended'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The squad of one match, written for both teams at the toss (it is then locked).
CREATE TABLE IF NOT EXISTS match_squads (
  id                   INT NOT NULL AUTO_INCREMENT,
  tournament_match_id  INT NOT NULL,
  team_id              INT NOT NULL,
  player_id            INT NOT NULL,
  role                 ENUM('playing','reserve') NOT NULL,
  batting_order        TINYINT UNSIGNED NULL,
  jersey_number        SMALLINT UNSIGNED NULL,
  is_captain           TINYINT(1) NOT NULL DEFAULT 0,
  is_keeper            TINYINT(1) NOT NULL DEFAULT 0,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_match_squad (tournament_match_id, team_id, player_id),
  KEY ix_match_squad_team (tournament_match_id, team_id),
  CONSTRAINT fk_msquad_fixture FOREIGN KEY (tournament_match_id) REFERENCES tournament_matches (id) ON DELETE CASCADE,
  CONSTRAINT fk_msquad_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_msquad_player FOREIGN KEY (player_id) REFERENCES players_core (player_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS innings (
  inning_id          INT NOT NULL AUTO_INCREMENT,
  team_id            INT NOT NULL,
  total_runs         INT NULL DEFAULT 0,
  target_score       INT UNSIGNED NULL,
  required_run_rate  DECIMAL(5,2) NULL,
  wickets            INT NULL DEFAULT 0,
  overs              DECIMAL(4,1) NULL,
  extras             INT NULL DEFAULT 0,
  innings_number     INT NOT NULL,
  run_rate           DECIMAL(5,2) NOT NULL DEFAULT 0.00,                 -- written by the scorer (runs per real over); not a generated column
  match_id           INT NOT NULL,
  balls_bowled       INT UNSIGNED NOT NULL DEFAULT 0,
  status             VARCHAR(20) NULL DEFAULT 'in_progress',
  total_overs        INT NULL DEFAULT 5,
  PRIMARY KEY (inning_id),
  KEY fk_innings_team (team_id),
  KEY ix_innings_match (match_id),
  CONSTRAINT fk_innings_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_innings_match FOREIGN KEY (match_id) REFERENCES matches (match_id) ON DELETE CASCADE,
  CONSTRAINT innings_chk_1 CHECK (total_runs >= 0),
  CONSTRAINT innings_chk_2 CHECK (wickets >= 0 AND wickets <= 10),
  CONSTRAINT innings_chk_3 CHECK (overs >= 0),
  CONSTRAINT innings_chk_4 CHECK (extras >= 0),
  CONSTRAINT innings_chk_5 CHECK (innings_number BETWEEN 1 AND 4)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS overs (
  over_id          INT NOT NULL AUTO_INCREMENT,
  inning_id        INT NOT NULL,
  match_id         INT NOT NULL,
  over_number      INT NOT NULL,
  bowler_id        INT NOT NULL,
  start_timestamp  DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  end_timestamp    DATETIME NULL,
  is_complete      TINYINT(1) NULL DEFAULT 0,
  extras_count     INT NULL DEFAULT 0,
  notes            TEXT NULL,
  PRIMARY KEY (over_id),
  UNIQUE KEY unique_over (inning_id, over_number),
  KEY fk_overs_matches (match_id),
  KEY fk_overs_bowler (bowler_id),
  CONSTRAINT fk_overs_bowler FOREIGN KEY (bowler_id) REFERENCES players_core (player_id),
  CONSTRAINT fk_overs_innings FOREIGN KEY (inning_id) REFERENCES innings (inning_id),
  CONSTRAINT fk_overs_matches FOREIGN KEY (match_id) REFERENCES matches (match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per delivery (a wide / no-ball is a row too, with legal_delivery = 0).
-- over_id: the code finds the balls of an over by it.
CREATE TABLE IF NOT EXISTS balls (
  ball_id              INT NOT NULL AUTO_INCREMENT,
  inning_id            INT NOT NULL,
  over_id              INT NULL,
  over_number          INT NOT NULL,
  ball_number          INT NOT NULL,
  batsman_id           INT NOT NULL,
  bowler_id            INT NOT NULL,
  runs_scored          INT NULL DEFAULT 0,
  is_wicket            TINYINT(1) NULL DEFAULT 0,
  wicket_type          VARCHAR(40) NULL,
  dismissed_player_id  INT NULL,
  fielder_id           INT NULL,
  extras               INT NULL DEFAULT 0,
  extra_type           VARCHAR(10) NULL,
  legal_delivery       TINYINT(1) NULL DEFAULT 1,
  ball_timestamp       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  is_retired_hurt      TINYINT(1) NULL DEFAULT 0,
  shot_type            VARCHAR(50) NULL,
  ball_outcome         ENUM('dot','run','four','six','wicket','extra','retired') NULL,   -- 'retired': a batter leaving the crease, not a delivery
  wagon_wheel_region   VARCHAR(50) NULL,
  is_active            TINYINT(1) NOT NULL DEFAULT 1,
  nb_runs_type         VARCHAR(8) NULL,                                -- a no-ball whose runs were 'bye' / 'leg-bye' (NULL: bat runs)
  PRIMARY KEY (ball_id),
  KEY fk_ball_by_ball_batsman (batsman_id),
  KEY fk_ball_by_ball_bowler (bowler_id),
  KEY fk_ball_by_ball_dismissed_player (dismissed_player_id),
  KEY fielder_id (fielder_id),
  KEY ix_balls_over (over_id),
  KEY idx_ball_by_ball_inning_over_ball (inning_id, over_number, ball_number),
  CONSTRAINT balls_ibfk_1 FOREIGN KEY (fielder_id) REFERENCES players_core (player_id),
  CONSTRAINT fk_ball_by_ball_batsman FOREIGN KEY (batsman_id) REFERENCES players_core (player_id) ON DELETE CASCADE,
  CONSTRAINT fk_ball_by_ball_bowler FOREIGN KEY (bowler_id) REFERENCES players_core (player_id) ON DELETE CASCADE,
  CONSTRAINT fk_ball_by_ball_dismissed_player FOREIGN KEY (dismissed_player_id) REFERENCES players_core (player_id) ON DELETE SET NULL,
  CONSTRAINT fk_ball_by_ball_inning FOREIGN KEY (inning_id) REFERENCES innings (inning_id) ON DELETE CASCADE,
  CONSTRAINT fk_balls_over FOREIGN KEY (over_id) REFERENCES overs (over_id) ON DELETE CASCADE,
  CONSTRAINT balls_chk_1 CHECK (over_number >= 0),
  CONSTRAINT balls_chk_2 CHECK (ball_number > 0),
  CONSTRAINT balls_chk_3 CHECK (runs_scored >= 0),
  CONSTRAINT balls_chk_4 CHECK (wicket_type IS NULL OR wicket_type IN ('bowled','caught','lbw','stumped','run out','hit wicket','handled ball','timed out','obstructing the field','hit the ball twice','retired out','retired hurt')),
  CONSTRAINT balls_chk_5 CHECK (extras >= 0),
  CONSTRAINT balls_chk_7 CHECK (extra_type IS NULL OR extra_type IN ('wide','no-ball','bye','leg-bye')),
  CONSTRAINT balls_chk_8 CHECK (nb_runs_type IS NULL OR (extra_type = 'no-ball' AND nb_runs_type IN ('bye','leg-bye')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS live_scorecards (
  scorecard_id             INT NOT NULL AUTO_INCREMENT,
  team_id                  INT NOT NULL,
  current_score            INT NULL DEFAULT 0,
  current_wickets          INT NULL DEFAULT 0,
  legal_over_count         DECIMAL(4,1) NULL,
  legal_balls_in_over      INT NULL,
  batsman1_id              INT NULL,
  batsman2_id              INT NULL,
  bowler_id                INT NULL,
  partnership_runs         INT NULL DEFAULT 0,
  last_wicket_player_id    INT NULL,
  last_wicket_over         DECIMAL(5,2) NULL,
  last_wicket_description  VARCHAR(255) NULL,
  current_run_rate         DECIMAL(4,2) NULL DEFAULT 0.00,
  required_run_rate        DECIMAL(4,2) NULL,
  last_updated             TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  inning_id                INT NULL,
  total_overs              INT NULL,
  match_id                 INT NOT NULL,
  on_strike_batsman_id     INT NULL,
  current_overs            DECIMAL(4,1) NULL,
  target_score             INT NULL,
  non_striker_batsman_id   INT NULL,
  last_ball_id             INT NULL,
  last_event_time          TIMESTAMP NULL,
  is_bowler_over_complete  TINYINT(1) NOT NULL DEFAULT 0,
  awaiting_new_batsman     TINYINT(1) NOT NULL DEFAULT 0,
  awaiting_new_bowler      TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (scorecard_id),
  UNIQUE KEY unique_inning_match (inning_id, match_id),
  KEY fk_scorecard_batsman1 (batsman1_id),
  KEY fk_scorecard_batsman2 (batsman2_id),
  KEY fk_scorecard_bowler (bowler_id),
  KEY fk_scorecard_last_wicket (last_wicket_player_id),
  KEY ix_live_scorecards_match (match_id),
  CONSTRAINT fk_inning_id FOREIGN KEY (inning_id) REFERENCES innings (inning_id) ON DELETE CASCADE,
  CONSTRAINT fk_scorecard_batsman1 FOREIGN KEY (batsman1_id) REFERENCES players_core (player_id) ON DELETE CASCADE,
  CONSTRAINT fk_scorecard_batsman2 FOREIGN KEY (batsman2_id) REFERENCES players_core (player_id) ON DELETE CASCADE,
  CONSTRAINT fk_scorecard_bowler FOREIGN KEY (bowler_id) REFERENCES players_core (player_id) ON DELETE CASCADE,
  CONSTRAINT fk_scorecard_last_wicket FOREIGN KEY (last_wicket_player_id) REFERENCES players_core (player_id) ON DELETE SET NULL,
  CONSTRAINT fk_scorecard_match FOREIGN KEY (match_id) REFERENCES matches (match_id) ON DELETE CASCADE,
  CONSTRAINT live_scorecards_chk_1 CHECK (current_score >= 0),
  CONSTRAINT live_scorecards_chk_2 CHECK (current_wickets BETWEEN 0 AND 10),
  CONSTRAINT live_scorecards_chk_4 CHECK (partnership_runs >= 0),
  CONSTRAINT live_scorecards_chk_5 CHECK (last_wicket_over >= 0),
  CONSTRAINT live_scorecards_chk_7 CHECK (current_run_rate >= 0),
  CONSTRAINT live_scorecards_chk_8 CHECK (required_run_rate >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Per-match figures kept while scoring (the scorer's running totals).
CREATE TABLE IF NOT EXISTS player_performance (
  performance_id      INT NOT NULL AUTO_INCREMENT,
  player_id           INT NOT NULL,
  runs_scored         INT NULL DEFAULT 0,
  balls_faced         INT NULL DEFAULT 0,
  total_runs_conceded INT NULL DEFAULT 0,
  wickets_taken       INT NULL DEFAULT 0,
  overs_bowled        DECIMAL(5,2) NULL DEFAULT 0.00,
  maiden_overs        INT NULL DEFAULT 0,
  economy_rate        DECIMAL(5,2) GENERATED ALWAYS AS (CASE WHEN overs_bowled > 0 THEN total_runs_conceded / overs_bowled ELSE 0 END) STORED,
  catches             INT NULL DEFAULT 0,
  stumpings           INT NULL DEFAULT 0,
  run_outs            INT NULL DEFAULT 0,
  dismissal_type      VARCHAR(50) NULL,
  dismissed_by        INT NULL,
  bowler_id           INT NULL,
  strike_rate         DECIMAL(5,2) GENERATED ALWAYS AS (CASE WHEN balls_faced > 0 THEN (runs_scored / balls_faced) * 100 ELSE 0 END) STORED,
  fours               INT NULL DEFAULT 0,
  sixes               INT NULL DEFAULT 0,
  milestone_flags     JSON NULL,
  match_id            INT NOT NULL,
  PRIMARY KEY (performance_id),
  UNIQUE KEY unique_player_match (player_id, match_id),
  KEY fk_performance_dismissed_by (dismissed_by),
  KEY fk_bowler (bowler_id),
  KEY idx_player_performance_match_player (match_id, player_id),
  CONSTRAINT fk_perf_player FOREIGN KEY (player_id) REFERENCES players_core (player_id) ON DELETE CASCADE,
  CONSTRAINT fk_bowler FOREIGN KEY (bowler_id) REFERENCES players_core (player_id),
  CONSTRAINT fk_performance_dismissed_by FOREIGN KEY (dismissed_by) REFERENCES players_core (player_id) ON DELETE SET NULL,
  CONSTRAINT player_performance_chk_1 CHECK (runs_scored >= 0),
  CONSTRAINT player_performance_chk_2 CHECK (balls_faced >= 0),
  CONSTRAINT player_performance_chk_3 CHECK (wickets_taken >= 0),
  CONSTRAINT player_performance_chk_4 CHECK (overs_bowled >= 0),
  CONSTRAINT player_performance_chk_5 CHECK (maiden_overs >= 0),
  CONSTRAINT player_performance_chk_6 CHECK (catches >= 0),
  CONSTRAINT player_performance_chk_7 CHECK (stumpings >= 0),
  CONSTRAINT player_performance_chk_8 CHECK (run_outs >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Career totals kept while scoring.
CREATE TABLE IF NOT EXISTS players_stats (
  player_id            INT NOT NULL,
  total_matches_played INT NULL DEFAULT 0,
  total_runs           INT NULL DEFAULT 0,
  total_balls_faced    INT NULL DEFAULT 0,
  total_wickets        INT NULL DEFAULT 0,
  total_runs_conceded  INT NULL DEFAULT 0,
  total_overs_bowled   DECIMAL(6,1) NULL,
  total_catches        INT NULL DEFAULT 0,
  total_stumpings      INT NULL DEFAULT 0,
  total_run_outs       INT NULL DEFAULT 0,
  total_fifties        INT NULL DEFAULT 0,
  total_hundreds       INT NULL DEFAULT 0,
  best_bowling         VARCHAR(10) NULL,
  highest_score        INT NULL DEFAULT 0,
  total_sixes          INT NULL DEFAULT 0,
  total_fours          INT NULL DEFAULT 0,
  total_ducks          INT NULL DEFAULT 0,
  batting_average      DECIMAL(5,2) GENERATED ALWAYS AS (CASE WHEN total_matches_played > 0 THEN total_runs / total_matches_played ELSE 0 END) STORED,
  bowling_average      DECIMAL(5,2) GENERATED ALWAYS AS (CASE WHEN total_wickets > 0 THEN total_runs_conceded / total_wickets ELSE 0 END) STORED,
  bowling_strike_rate  DECIMAL(5,2) GENERATED ALWAYS AS (CASE WHEN total_wickets > 0 THEN (total_overs_bowled * 6) / total_wickets ELSE 0 END) STORED,
  last_updated         TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  batting_strike_rate  DECIMAL(6,2) GENERATED ALWAYS AS (CASE WHEN total_balls_faced > 0 THEN (total_runs / total_balls_faced) * 100 ELSE 0 END) STORED,
  PRIMARY KEY (player_id),
  CONSTRAINT fk_players_stats_player FOREIGN KEY (player_id) REFERENCES players_core (player_id) ON DELETE CASCADE,
  CONSTRAINT players_stats_chk_1 CHECK (total_matches_played >= 0),
  CONSTRAINT players_stats_chk_2 CHECK (total_runs >= 0),
  CONSTRAINT players_stats_chk_3 CHECK (total_balls_faced >= 0),
  CONSTRAINT players_stats_chk_4 CHECK (total_wickets >= 0),
  CONSTRAINT players_stats_chk_5 CHECK (total_overs_bowled >= 0),
  CONSTRAINT players_stats_chk_6 CHECK (total_catches >= 0),
  CONSTRAINT players_stats_chk_7 CHECK (total_stumpings >= 0),
  CONSTRAINT players_stats_chk_8 CHECK (total_run_outs >= 0),
  CONSTRAINT players_stats_chk_9 CHECK (total_fifties >= 0),
  CONSTRAINT players_stats_chk_10 CHECK (total_hundreds >= 0),
  CONSTRAINT players_stats_chk_11 CHECK (highest_score >= 0),
  CONSTRAINT players_stats_chk_12 CHECK (total_sixes >= 0),
  CONSTRAINT players_stats_chk_13 CHECK (total_fours >= 0),
  CONSTRAINT players_stats_chk_14 CHECK (total_ducks >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------------------------------
-- Overlay, tie-breaks, results, points, ratings
-- ---------------------------------------------------------------------------------------------------

-- What the operator has put on air for a match right now.
CREATE TABLE IF NOT EXISTS match_overlay (
  match_id    INT NOT NULL,
  scene       VARCHAR(30) NOT NULL DEFAULT 'none',
  payload     TEXT NULL,                                -- JSON: { teamId, innings, text ... }
  auto_hide   SMALLINT UNSIGNED NULL,                   -- seconds; NULL = stays until hidden
  shown_at    DATETIME NULL,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (match_id),
  CONSTRAINT fk_overlay_match FOREIGN KEY (match_id) REFERENCES matches (match_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS match_tiebreaks (
  match_id        INT NOT NULL,
  method          VARCHAR(20) NOT NULL,                 -- super_over | batted_first | manual
  team1_runs      SMALLINT NULL,
  team1_wickets   TINYINT NULL,
  team2_runs      SMALLINT NULL,
  team2_wickets   TINYINT NULL,
  winner_team_id  INT NOT NULL,
  note            VARCHAR(300) NULL,
  decided_by      INT NULL,
  decided_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (match_id),
  CONSTRAINT fk_tiebreak_match FOREIGN KEY (match_id) REFERENCES matches (match_id) ON DELETE CASCADE,
  CONSTRAINT fk_tiebreak_winner FOREIGN KEY (winner_team_id) REFERENCES teams (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per player per finished match (rebuilt if the last ball is undone).
CREATE TABLE IF NOT EXISTS player_match_stats (
  id             INT NOT NULL AUTO_INCREMENT,
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
  bowled_balls   SMALLINT NOT NULL DEFAULT 0,
  runs_conceded  SMALLINT NOT NULL DEFAULT 0,
  wickets        SMALLINT NOT NULL DEFAULT 0,
  maidens        SMALLINT NOT NULL DEFAULT 0,
  wides          SMALLINT NOT NULL DEFAULT 0,
  no_balls       SMALLINT NOT NULL DEFAULT 0,
  catches        SMALLINT NOT NULL DEFAULT 0,
  stumpings      SMALLINT NOT NULL DEFAULT 0,
  run_outs       SMALLINT NOT NULL DEFAULT 0,
  dots           SMALLINT NOT NULL DEFAULT 0,
  won            TINYINT(1) NOT NULL DEFAULT 0,
  bat_points     DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  bowl_points    DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  field_points   DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  bonus_points   DECIMAL(7,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pms (match_id, player_id),
  KEY ix_pms_player (player_id),
  KEY ix_pms_tournament (tournament_id),
  KEY ix_pms_season (season_year),
  KEY ix_pms_team (team_id),
  CONSTRAINT fk_pms_match FOREIGN KEY (match_id) REFERENCES matches (match_id) ON DELETE CASCADE,
  CONSTRAINT fk_pms_player FOREIGN KEY (player_id) REFERENCES players_core (player_id) ON DELETE CASCADE,
  CONSTRAINT fk_pms_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_pms_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS points_rules (
  rule_key    VARCHAR(30) NOT NULL,
  label       VARCHAR(80) NOT NULL,
  points      INT NOT NULL DEFAULT 0,
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (rule_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- tournament_match_id = 0 for tournament-level points (participation), so it is not a foreign key.
CREATE TABLE IF NOT EXISTS team_points (
  id                   INT NOT NULL AUTO_INCREMENT,
  tournament_id        INT NOT NULL,
  team_id              INT NOT NULL,
  tournament_match_id  INT NOT NULL DEFAULT 0,
  rule_key             VARCHAR(30) NOT NULL,
  points               INT NOT NULL,
  season_year          SMALLINT NOT NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_team_points (tournament_id, team_id, tournament_match_id, rule_key),
  KEY ix_team_points_team (team_id),
  KEY ix_team_points_season (season_year),
  CONSTRAINT fk_tpoints_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
  CONSTRAINT fk_tpoints_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tournament_results (
  tournament_id  INT NOT NULL,
  position       TINYINT UNSIGNED NOT NULL,
  team_id        INT NOT NULL,
  decided_by     VARCHAR(30) NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tournament_id, position),
  KEY ix_tournament_results_team (team_id),
  CONSTRAINT fk_tresults_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
  CONSTRAINT fk_tresults_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------------------------------
-- Association: news, notifications, bans, awards, sponsors
-- ---------------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS announcements (
  id          INT NOT NULL AUTO_INCREMENT,
  title       VARCHAR(150) NOT NULL,
  body        TEXT NOT NULL,
  pinned      TINYINT(1) NOT NULL DEFAULT 0,
  expires_on  DATE NULL,
  created_by  INT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS team_notifications (
  id          INT NOT NULL AUTO_INCREMENT,
  team_id     INT NOT NULL,
  type        VARCHAR(30) NOT NULL,
  title       VARCHAR(150) NOT NULL,
  body        VARCHAR(500) NULL,
  link        VARCHAR(200) NULL,
  dedupe_key  VARCHAR(80) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at     DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_team_notification_dedupe (team_id, dedupe_key),
  KEY ix_team_notifications_team (team_id, created_at),
  CONSTRAINT fk_tnotif_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- subject_id points at a player or a team depending on subject_type, so it cannot be a foreign key.
CREATE TABLE IF NOT EXISTS bans (
  id             INT NOT NULL AUTO_INCREMENT,
  subject_type   ENUM('player','team') NOT NULL,
  subject_id     INT NOT NULL,
  reason         VARCHAR(300) NOT NULL,
  starts_on      DATE NOT NULL,
  ends_on        DATE NULL,
  created_by     INT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at     DATETIME NULL,
  revoked_by     INT NULL,
  revoke_reason  VARCHAR(300) NULL,
  PRIMARY KEY (id),
  KEY ix_bans_subject (subject_type, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS awards (
  id             INT NOT NULL AUTO_INCREMENT,
  season_year    SMALLINT NOT NULL,
  award_key      VARCHAR(40) NOT NULL,
  tournament_id  INT NOT NULL DEFAULT 0,                -- 0 = the whole season
  subject_type   ENUM('player','team') NOT NULL,
  subject_id     INT NOT NULL,
  rank_no        TINYINT UNSIGNED NOT NULL DEFAULT 1,
  value_text     VARCHAR(120) NULL,
  status         ENUM('suggested','confirmed','published') NOT NULL DEFAULT 'suggested',
  is_manual      TINYINT(1) NOT NULL DEFAULT 0,
  note           VARCHAR(300) NULL,
  decided_by     INT NULL,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_award (season_year, award_key, tournament_id, rank_no),
  KEY ix_awards_season (season_year, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sponsors (
  id          INT NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120) NOT NULL,
  logo        VARCHAR(255) NULL,
  link_url    VARCHAR(255) NULL,
  tagline     VARCHAR(160) NULL,
  tier        VARCHAR(12) NOT NULL DEFAULT 'partner',
  placements  VARCHAR(60) NOT NULL DEFAULT 'home,footer',
  starts_on   DATE NULL,
  ends_on     DATE NULL,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------------------------------
-- Foreign keys that would have been circular above
-- ---------------------------------------------------------------------------------------------------

ALTER TABLE tournaments
  ADD CONSTRAINT fk_tournaments_tentative FOREIGN KEY (tentative_id) REFERENCES tentative_tournament_schedules (id) ON DELETE SET NULL;

ALTER TABLE tentative_tournament_schedules
  ADD CONSTRAINT fk_tentative_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE SET NULL;

ALTER TABLE tournament_matches
  ADD CONSTRAINT fk_tm_match FOREIGN KEY (match_id) REFERENCES matches (match_id) ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------------------------------

INSERT IGNORE INTO points_rules (rule_key, label, points, sort_order) VALUES
  ('participation', 'Playing in a tournament',        5, 1),
  ('round1',        'Winning round 1',               10, 2),
  ('round2',        'Winning round 2',               15, 3),
  ('round3',        'Winning round 3',               20, 4),
  ('group_final',   'Winning the group final',       25, 5),
  ('semi',          'Winning a semi-final',          40, 6),
  ('final',         'Winning the final',             60, 7),
  ('third_place',   'Winning the third-place match', 20, 8);
