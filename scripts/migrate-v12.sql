-- v12: multiple SE review notes with author + timestamp
ALTER TABLE sizing_requests
  ADD COLUMN IF NOT EXISTS review_notes jsonb DEFAULT '[]'::jsonb;

-- Lift legacy single review_note into review_notes when the array is empty.
UPDATE sizing_requests
SET review_notes = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'body', review_note,
    'authorId', COALESCE(reviewed_by_id::text, 'legacy'),
    'authorName', 'Sales Engineer',
    'authorEmail', null,
    'createdAt', COALESCE(reviewed_at, created_at, now())
  )
)
WHERE review_note IS NOT NULL
  AND btrim(review_note) <> ''
  AND (
    review_notes IS NULL
    OR review_notes = '[]'::jsonb
    OR jsonb_typeof(review_notes) <> 'array'
  );
