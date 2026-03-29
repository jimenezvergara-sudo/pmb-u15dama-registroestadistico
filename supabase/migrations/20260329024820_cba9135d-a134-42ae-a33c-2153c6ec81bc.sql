
-- One-time data migration: remap old short player IDs to current UUIDs in all game JSONB fields
-- This fixes duplicate player entries in box score caused by ID mismatch between old and new games

-- Step 1: Create a temp table with the ID mappings
CREATE TEMP TABLE id_remap (old_id TEXT, new_id TEXT);
INSERT INTO id_remap VALUES
  ('ksq5ww64', '4a12ee3a-082f-47d3-ae27-bb3abcc16646'),  -- Christiany Polanco #19
  ('0iwym647', '76b5d043-2f15-4559-8f3d-b9430f7a0423'),  -- Tamara Ruiz #4
  ('5qy1xvvo', 'dcaa0d0d-7406-43ea-9966-5ff267454adc'),  -- Mía Hernández #5
  ('n4jn5hfe', '05d121f3-d791-4b4e-983e-5d00fa83c17b'),  -- Martina #6
  ('7poyyse0', 'f4f659c0-ea0c-4ecd-b3c9-b9ca5ec5c25f'),  -- Kamila Bahamonde #7
  ('acemw2n0', '2a6b4c7b-4903-49c2-b0b8-6726b2f10311'),  -- Laura Jiménez #8
  ('fce90o7p', 'ec3843a6-dca9-4adc-bb59-58dc02538d4a'),  -- Ana Larrea → #11
  ('pnrl5vjk', 'ec3843a6-dca9-4adc-bb59-58dc02538d4a'),  -- Ana Larrea → #11
  ('uta429v9', '08b3341c-c425-4641-bbdb-ce6dc329a426'),  -- Jacinta Elliot #9
  ('rc7hlm2w', 'a68caab0-3955-4398-b1c7-6110b1a7acd2'),  -- Emilia Espinoza #10
  ('6aipbrxn', 'b80bdc91-9fc6-4f19-b88c-c29a198e498c'),  -- Claudia Maldonado #17
  ('frcqlei9', 'f87760ef-c240-445d-abb1-ef4f76e94092'),  -- Sakura Castro #14
  ('stztoy3i', 'b2876a04-7398-4784-aebb-18952a706bbf');  -- Josefa Arnouil #2

-- Step 2: For each mapping, do text replacement across all JSONB columns
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT old_id, new_id FROM id_remap LOOP
    -- Replace in shots (playerId field)
    UPDATE club_games 
    SET shots = (replace(shots::text, r.old_id, r.new_id))::jsonb
    WHERE shots::text LIKE '%' || r.old_id || '%';
    
    -- Replace in actions (playerId field)
    UPDATE club_games 
    SET actions = (replace(actions::text, r.old_id, r.new_id))::jsonb
    WHERE actions::text LIKE '%' || r.old_id || '%';
    
    -- Replace in substitutions (playerIn/playerOut fields)
    UPDATE club_games 
    SET substitutions = (replace(substitutions::text, r.old_id, r.new_id))::jsonb
    WHERE substitutions::text LIKE '%' || r.old_id || '%';
    
    -- Replace in roster (id field)
    UPDATE club_games 
    SET roster = (replace(roster::text, r.old_id, r.new_id))::jsonb
    WHERE roster::text LIKE '%' || r.old_id || '%';
    
    -- Replace in on_court_player_ids
    UPDATE club_games 
    SET on_court_player_ids = (replace(on_court_player_ids::text, r.old_id, r.new_id))::jsonb
    WHERE on_court_player_ids::text LIKE '%' || r.old_id || '%';
    
    -- Replace in court_time_ms (key names)
    UPDATE club_games 
    SET court_time_ms = (replace(court_time_ms::text, r.old_id, r.new_id))::jsonb
    WHERE court_time_ms::text LIKE '%' || r.old_id || '%';
  END LOOP;
END $$;

-- Step 3: Deduplicate roster arrays - remove duplicate player entries (same id) keeping latest name/number
-- For each game, rebuild roster keeping only unique IDs
UPDATE club_games
SET roster = (
  SELECT jsonb_agg(DISTINCT ON_id.val)
  FROM (
    SELECT DISTINCT ON ((elem->>'id')) elem AS val
    FROM jsonb_array_elements(roster) elem
    ORDER BY (elem->>'id'), (elem->>'name') DESC
  ) ON_id
)
WHERE EXISTS (
  SELECT 1
  FROM (
    SELECT (elem->>'id') AS pid, COUNT(*) as cnt
    FROM jsonb_array_elements(roster) elem
    GROUP BY (elem->>'id')
    HAVING COUNT(*) > 1
  ) dups
);

-- Step 4: Delete the duplicate Polanco #20 from club_players
DELETE FROM club_players WHERE id = 'fa1c8827-60a2-4a84-a909-f8d056be76d7';

DROP TABLE IF EXISTS id_remap;
