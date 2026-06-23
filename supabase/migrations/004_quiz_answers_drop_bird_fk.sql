-- Fix silent answer-tracking data loss (#37).
--
-- quiz_answers.bird_id / chosen_bird_id are FKs to birds(id). The app's canonical
-- bird ids are uuidv5(scientific_name) from birds-static.ts and do NOT match the
-- birds table's random uuids, so every quiz_answers insert failed the FK and was
-- swallowed by the action's try/catch — quiz_answers has always been empty.
--
-- The analytics layer already resolves bird_id via the static uuidv5 map, so the
-- columns should just store those ids without a FK to the (out-of-sync) table.
-- Drop any FK from quiz_answers -> birds by definition (name-independent).

DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.quiz_answers'::regclass
      AND contype = 'f'
      AND confrelid = 'public.birds'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.quiz_answers DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
