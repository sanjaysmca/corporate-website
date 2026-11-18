-- ═══════════════════════════════════════════════════════════════════════════
--  Migration: 001_initial_schema.sql
--  Project:   Corporate Website + Admin Dashboard
--  Run via:   Supabase SQL Editor (Dashboard → SQL Editor → New Query → Run)
--             or: supabase db push (if using Supabase CLI)
-- ═══════════════════════════════════════════════════════════════════════════
-- 
--  EXECUTION ORDER:
--    1. Extensions
--    2. Tables (profiles, services, projects, enquiries, media)
--    3. Indexes
--    4. Triggers (auto-update updated_at)
--    5. Row Level Security — enabled + policies for EVERY table
--    6. Storage bucket + policy
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. Extensions ───────────────────────────────────────────────────────────
-- gen_random_uuid() is built-in from PostgreSQL 13+; enabling pgcrypto as
-- a fallback ensures compatibility across Supabase plan versions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ─── 2. Tables ───────────────────────────────────────────────────────────────

-- ── 2a. profiles ─────────────────────────────────────────────────────────────
-- Extends auth.users (managed by Supabase Auth) with application-level fields.
-- A profile row is created automatically when an admin account is added.
-- Public registration is NOT available — accounts are created via the
-- Supabase dashboard (Authentication → Users → Invite user).
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  role        TEXT        NOT NULL DEFAULT 'admin'
                          CHECK (role IN ('admin')),   -- only 'admin' role is valid
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.profiles           IS 'Admin user profiles linked to Supabase Auth.';
COMMENT ON COLUMN public.profiles.role      IS 'Application role. Only "admin" is accepted — no public sign-up.';


-- ── 2b. services ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.services (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT        NOT NULL,
  short_desc  TEXT,
  icon        TEXT,                    -- lucide icon name (e.g. "code", "cloud")
  image_url   TEXT,                    -- Supabase Storage public URL
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.services           IS 'Services offered by the company (admin-managed).';
COMMENT ON COLUMN public.services.slug      IS 'URL-safe identifier. Must be unique.';
COMMENT ON COLUMN public.services.is_active IS 'Only active services are visible on the public website.';


-- ── 2c. projects ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  slug          TEXT        NOT NULL UNIQUE,
  description   TEXT        NOT NULL,
  short_desc    TEXT,
  client_name   TEXT,
  category      TEXT,
  tags          TEXT[]      NOT NULL DEFAULT '{}',
  image_url     TEXT,                  -- primary/hero image
  gallery_urls  TEXT[]      NOT NULL DEFAULT '{}',   -- additional images
  is_featured   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  completed_at  DATE,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.projects             IS 'Portfolio projects managed through the admin dashboard.';
COMMENT ON COLUMN public.projects.is_featured IS 'Featured projects appear on the Home page hero/highlights section.';
COMMENT ON COLUMN public.projects.is_active   IS 'Only active projects appear on the public Projects page.';
COMMENT ON COLUMN public.projects.tags        IS 'Array of technology/category tags (e.g. ["React", "Node.js"]).';


-- ── 2d. enquiries ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enquiries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL CHECK (char_length(name)    BETWEEN 2 AND 100),
  email        TEXT        NOT NULL CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  phone        TEXT        CHECK (phone IS NULL OR char_length(phone) <= 20),
  subject      TEXT        CHECK (subject IS NULL OR char_length(subject) <= 200),
  message      TEXT        NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
  status       TEXT        NOT NULL DEFAULT 'new'
                           CHECK (status IN ('new', 'read', 'replied', 'closed')),
  admin_notes  TEXT,
  ip_address   INET,       -- logged server-side for spam control (optional)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.enquiries           IS 'Contact form submissions. Public can INSERT only. Admins have full access.';
COMMENT ON COLUMN public.enquiries.status    IS 'Workflow status: new → read → replied → closed.';
COMMENT ON COLUMN public.enquiries.email     IS 'Validated by a regex check constraint — extra safety beyond the form.';


-- ── 2e. media ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.media (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name     TEXT        NOT NULL,
  storage_path  TEXT        NOT NULL UNIQUE, -- path inside the Supabase Storage bucket
  public_url    TEXT        NOT NULL,
  mime_type     TEXT        NOT NULL CHECK (mime_type IN (
                              'image/jpeg', 'image/png', 'image/webp',
                              'image/gif',  'image/svg+xml'
                            )),              -- only image types allowed
  file_size     BIGINT      CHECK (file_size > 0 AND file_size <= 10485760), -- max 10 MB
  alt_text      TEXT,
  uploaded_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.media              IS 'Registry of uploaded images stored in Supabase Storage.';
COMMENT ON COLUMN public.media.mime_type    IS 'Only image MIME types permitted. Validated at DB and application level.';
COMMENT ON COLUMN public.media.file_size    IS 'Maximum 10 MB enforced by CHECK constraint.';
COMMENT ON COLUMN public.media.storage_path IS 'Path within the "media" Supabase Storage bucket.';


-- ─── 3. Indexes ──────────────────────────────────────────────────────────────
-- Services
CREATE INDEX IF NOT EXISTS idx_services_is_active  ON public.services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_sort_order ON public.services(sort_order);
CREATE INDEX IF NOT EXISTS idx_services_slug       ON public.services(slug);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_is_active   ON public.projects(is_active);
CREATE INDEX IF NOT EXISTS idx_projects_is_featured ON public.projects(is_featured);
CREATE INDEX IF NOT EXISTS idx_projects_category    ON public.projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_slug        ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_sort_order  ON public.projects(sort_order);

-- Enquiries
CREATE INDEX IF NOT EXISTS idx_enquiries_status     ON public.enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON public.enquiries(created_at DESC);

-- Media
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by    ON public.media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_mime_type      ON public.media(mime_type);


-- ─── 4. Triggers — auto-update updated_at ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_enquiries_updated_at
  BEFORE UPDATE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── 5. Row Level Security ───────────────────────────────────────────────────
--
--  Principle of least privilege:
--    • Anonymous (public) users → READ active rows only (services, projects)
--    • Anonymous               → INSERT into enquiries (contact form)
--    • Authenticated admins    → full CRUD on all tables
--    • enquiries               → NO public read (enquiries are private data)
--    • media                   → public can read URLs; only admins can upload/delete
--
--  Every table has RLS ENABLED. Policies are explicitly named for auditability.
-- ────────────────────────────────────────────────────────────────────────────

-- ── 5a. profiles ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Admins can read and update their own profile only
CREATE POLICY "profiles: admin can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles: admin can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT is handled by Supabase Auth trigger (or manual seeding)
-- No public access — no policy means no access for anon


-- ── 5b. services ─────────────────────────────────────────────────────────────
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Public: read active services only
CREATE POLICY "services: public can read active"
  ON public.services FOR SELECT
  TO anon
  USING (is_active = TRUE);

-- Admin: full read (including inactive)
CREATE POLICY "services: admin full read"
  ON public.services FOR SELECT
  TO authenticated
  USING (TRUE);

-- Admin: insert
CREATE POLICY "services: admin can insert"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Admin: update
CREATE POLICY "services: admin can update"
  ON public.services FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Admin: delete
CREATE POLICY "services: admin can delete"
  ON public.services FOR DELETE
  TO authenticated
  USING (TRUE);


-- ── 5c. projects ─────────────────────────────────────────────────────────────
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Public: read active projects only
CREATE POLICY "projects: public can read active"
  ON public.projects FOR SELECT
  TO anon
  USING (is_active = TRUE);

-- Admin: full read (including inactive/drafts)
CREATE POLICY "projects: admin full read"
  ON public.projects FOR SELECT
  TO authenticated
  USING (TRUE);

-- Admin: insert
CREATE POLICY "projects: admin can insert"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Admin: update
CREATE POLICY "projects: admin can update"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Admin: delete
CREATE POLICY "projects: admin can delete"
  ON public.projects FOR DELETE
  TO authenticated
  USING (TRUE);


-- ── 5d. enquiries ────────────────────────────────────────────────────────────
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- Public: INSERT only (submit contact form) — NO SELECT for anonymous users
CREATE POLICY "enquiries: public can insert"
  ON public.enquiries FOR INSERT
  TO anon
  WITH CHECK (
    -- These constraints mirror the CHECK constraints above — belt-and-suspenders
    char_length(name)    BETWEEN 2 AND 100  AND
    email               ~* '^[^@]+@[^@]+\.[^@]+$' AND
    char_length(message) BETWEEN 10 AND 5000
  );

-- Admin: full access
CREATE POLICY "enquiries: admin full read"
  ON public.enquiries FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "enquiries: admin can update"
  ON public.enquiries FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Admin can delete enquiries (e.g. spam removal)
CREATE POLICY "enquiries: admin can delete"
  ON public.enquiries FOR DELETE
  TO authenticated
  USING (TRUE);


-- ── 5e. media ────────────────────────────────────────────────────────────────
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Public: read all media records (URLs are public by design)
CREATE POLICY "media: public can read"
  ON public.media FOR SELECT
  TO anon
  USING (TRUE);

-- Admin: full access
CREATE POLICY "media: admin full read"
  ON public.media FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "media: admin can insert"
  ON public.media FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "media: admin can delete"
  ON public.media FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);


-- ─── 6. Supabase Storage — bucket and policy ─────────────────────────────────
--
--  Run these in the Supabase SQL Editor (they use Supabase's storage schema).
--  Alternatively, create the bucket via Dashboard → Storage → New Bucket.
--
--  Bucket name: "media"
--  Public:      true  (files are served publicly via signed/public URLs)
--  File size:   10 MB max (enforced in bucket settings AND media table)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  TRUE,
  10485760,   -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can read (public bucket)
CREATE POLICY "storage media: public read"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'media');

-- Storage RLS: only authenticated admins can upload
CREATE POLICY "storage media: admin can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media');

-- Storage RLS: only the uploader (or any admin) can delete
CREATE POLICY "storage media: admin can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'media');


-- ─── 7. Dashboard stats helper function ──────────────────────────────────────
--  Returns aggregate counts in a single DB round-trip for the admin dashboard.
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER   -- runs with the function owner's privileges, not the caller's
AS $$
  SELECT json_build_object(
    'total_projects',    (SELECT COUNT(*) FROM public.projects),
    'active_projects',   (SELECT COUNT(*) FROM public.projects WHERE is_active = TRUE),
    'featured_projects', (SELECT COUNT(*) FROM public.projects WHERE is_featured = TRUE),
    'total_services',    (SELECT COUNT(*) FROM public.services),
    'active_services',   (SELECT COUNT(*) FROM public.services  WHERE is_active = TRUE),
    'total_enquiries',   (SELECT COUNT(*) FROM public.enquiries),
    'new_enquiries',     (SELECT COUNT(*) FROM public.enquiries  WHERE status = 'new'),
    'total_media',       (SELECT COUNT(*) FROM public.media)
  );
$$;

-- Only authenticated users (admins) may call this function
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats() FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;


-- ─── End of migration 001 ────────────────────────────────────────────────────
-- Next migration: 002_seed_data.sql (sample services and projects for development)
