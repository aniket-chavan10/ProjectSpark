-- Run ONCE on the Spark database before deploying the new scheduler / scoring code.
-- Adds what a match needs for time-slot scheduling, the optional third-place match and
-- "loser of" slots in the bracket. Existing rows keep working (they become stage 'group',
-- slots that take the winner).

ALTER TABLE tournament_matches
  ADD COLUMN stage VARCHAR(20) NOT NULL DEFAULT 'group' AFTER match_no,              -- group | semi | third_place | final
  ADD COLUMN overs TINYINT UNSIGNED NULL,                                            -- overs this match is played over
  ADD COLUMN duration_minutes SMALLINT UNSIGNED NULL,                                -- slot length, so the schedule can be checked
  ADD COLUMN dependent_match1_type ENUM('winner', 'loser') NOT NULL DEFAULT 'winner', -- slot 1 takes the winner or the loser of dependent_match1_id
  ADD COLUMN dependent_match2_type ENUM('winner', 'loser') NOT NULL DEFAULT 'winner';

-- Old schedules stored the semi-finals and the final in rounds 4 and 5 without a stage.
UPDATE tournament_matches
SET stage = CASE
  WHEN group_name IS NOT NULL THEN 'group'
  WHEN round_number = 4 THEN 'semi'
  WHEN round_number = 5 THEN 'final'
  ELSE 'group'
END
WHERE stage = 'group' AND group_name IS NULL;
