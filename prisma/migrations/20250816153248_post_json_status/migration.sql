-- 1) Ensure enum exists
DO $$ BEGIN
  CREATE TYPE "PostStatus" AS ENUM ('DRAFT','SUBMITTED','PUBLISHED','ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Add status/version (keep old cols for now)
ALTER TABLE "Post"
  ADD COLUMN IF NOT EXISTS "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- 3) Map legacy isSubmitted -> status
UPDATE "Post"
SET "status" = 'SUBMITTED'::"PostStatus"
WHERE "isSubmitted" IS TRUE;

-- 4) Convert content TEXT -> JSONB IN PLACE (no drop/recreate)
-- Wrap legacy text into a minimal Lexical serialized state.
ALTER TABLE "Post"
  ALTER COLUMN "content" TYPE JSONB
  USING
    COALESCE(
      jsonb_build_object(
        'root', jsonb_build_object(
          'type','root','version',1,'indent',0,'format','','direction','ltr',
          'children', jsonb_build_array(
            jsonb_build_object(
              'type','paragraph','version',1,'indent',0,'format','','direction','ltr',
              'children', CASE
                WHEN "content" IS NULL OR "content" = ''
                  THEN jsonb_build_array()
                ELSE jsonb_build_array(
                  jsonb_build_object(
                    'type','text','version',1,'text',"content",
                    'detail',0,'format',0,'mode','normal','style',''
                  )
                )
              END
            )
          )
        )
      ),
      -- fallback empty state
      jsonb_build_object(
        'root', jsonb_build_object(
          'type','root','version',1,'indent',0,'format','','direction','ltr',
          'children', jsonb_build_array(
            jsonb_build_object(
              'type','paragraph','version',1,'indent',0,'format','','direction','ltr',
              'children', jsonb_build_array()
            )
          )
        )
      )
    );

-- 5) Make content NOT NULL (now every row has JSON)
ALTER TABLE "Post"
  ALTER COLUMN "content" SET NOT NULL;

-- 6) Drop legacy isSubmitted (data has been mapped)
ALTER TABLE "Post" DROP COLUMN IF EXISTS "isSubmitted";
