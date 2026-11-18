# API Documentation
## Corporate Website with Admin Dashboard

> **Important notice — architecture clarification**
>
> This project has **no custom REST API server**. There is no Express.js, Node.js HTTP server, Fastify, or Next.js API-routes layer. All backend operations are performed directly from the React frontend using the **Supabase JavaScript client**, which communicates with:
>
> - **Supabase PostgREST** — auto-generated REST interface over PostgreSQL (used for all table reads and writes)
> - **Supabase Auth** — JWT-based authentication service
> - **Supabase Storage** — object storage for uploaded images
> - **Supabase RPC** — remote procedure calls that invoke PostgreSQL functions
>
> Row Level Security (RLS) policies on the database are the authoritative backend security layer. The anon key used in the browser does **not** bypass RLS.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Supabase Connection and Configuration](#2-supabase-connection-and-configuration)
3. [Authentication Operations](#3-authentication-operations)
4. [Dashboard Statistics RPC](#4-dashboard-statistics-rpc)
5. [Projects — CRUD Operations](#5-projects--crud-operations)
6. [Services — CRUD Operations](#6-services--crud-operations)
7. [Enquiry Submission and Management](#7-enquiry-submission-and-management)
8. [Media — Upload, Retrieval and Deletion](#8-media--upload-retrieval-and-deletion)
9. [Database Tables and Schema](#9-database-tables-and-schema)
10. [RLS Policies and Access Permissions](#10-rls-policies-and-access-permissions)
11. [Input Validation and Error Handling](#11-input-validation-and-error-handling)
12. [Database Functions and Triggers](#12-database-functions-and-triggers)
13. [Files Inspected and Documentation Limitations](#13-files-inspected-and-documentation-limitations)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Browser (React + Vite)                │
│                                                         │
│   Public Pages          Admin Dashboard                 │
│   /  /about             /admin/login                    │
│   /services             /admin                          │
│   /projects             /admin/projects                 │
│   /contact              /admin/services                 │
│                         /admin/enquiries                │
│                         /admin/media                    │
│                                                         │
│   supabase-js client  ──────────────────────────────┐   │
└──────────────────────────────────────────────────────│──┘
                                                       │
                              HTTPS (anon key / JWT)   │
                                                       ▼
┌─────────────────────────────────────────────────────────┐
│                      Supabase Platform                  │
│                                                         │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Supabase   │  │  PostgREST   │  │ Supabase Storage│ │
│  │    Auth    │  │  (Auto REST) │  │  bucket: media  │ │
│  └─────┬──────┘  └──────┬───────┘  └────────┬────────┘ │
│        │                │                   │           │
│        └────────────────┼───────────────────┘           │
│                         ▼                               │
│              ┌─────────────────────┐                    │
│              │   PostgreSQL DB      │                    │
│              │  public schema       │                    │
│              │  ─────────────────  │                    │
│              │  profiles            │                    │
│              │  services            │                    │
│              │  projects            │                    │
│              │  enquiries           │                    │
│              │  media               │                    │
│              │  storage.objects     │                    │
│              │  ─────────────────  │                    │
│              │  RLS on every table  │                    │
│              └─────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │       Vercel        │
              │  (static SPA host)  │
              └─────────────────────┘
```

### Request flow

| Caller | Supabase role | What they can do |
|--------|---------------|-----------------|
| Anonymous visitor | `anon` | SELECT active services/projects; INSERT enquiries |
| Authenticated admin (logged in) | `authenticated` | Full CRUD on all tables (enforced by `is_admin()`) |
| Any caller, `get_dashboard_stats()` | `authenticated` + `is_admin()` body guard | Aggregate counts |

---

## 2. Supabase Connection and Configuration

**File:** `src/lib/supabase.js`

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:    true,   // stores JWT in localStorage
    autoRefreshToken:  true,   // refreshes JWT before expiry
    detectSessionInUrl: true,  // handles OAuth / magic-link redirects
  },
})
```

### Environment variables

| Variable | Purpose | Exposed in browser |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ Safe — required by client |
| `VITE_SUPABASE_ANON_KEY` | Public anon key | ✅ Safe — RLS governs all access |

> **Never** include the `SUPABASE_SERVICE_ROLE_KEY` in any frontend file. That key bypasses RLS entirely and is not used in this project's frontend code.

### Deployment environment file

Copy `.env.example` to `.env` and populate:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## 3. Authentication Operations

**Files:** `src/context/AuthContext.jsx`, `src/pages/admin/LoginPage.jsx`, `src/router/ProtectedRoute.jsx`

There is **no custom login endpoint**. Authentication is handled exclusively by Supabase Auth via the JavaScript client.

### 3.1 Sign In

**Operation:** `supabase.auth.signInWithPassword()`  
**Called from:** `AuthContext.signIn()` → invoked by `LoginPage`

```js
// AuthContext.jsx
async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return { error }
}
```

**Request payload (implicit — sent to Supabase Auth):**

```json
{
  "email": "admin@example.com",
  "password": "••••••••"
}
```

**Success response — Supabase Session object (stored in localStorage):**

```json
{
  "access_token": "<JWT>",
  "refresh_token": "<opaque-token>",
  "expires_at": 1700000000,
  "user": {
    "id": "uuid-of-auth-user",
    "email": "admin@example.com",
    "role": "authenticated",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error responses mapped in `LoginPage`:**

| Supabase error message | Displayed message |
|---|---|
| `"Invalid login credentials"` | `"Incorrect email or password. Please try again."` |
| `"Email not confirmed"` | `"Please confirm your email address before logging in."` |
| Any other | Raw Supabase error message |

**Form validation (Zod schema — `LoginPage`):**

| Field | Rule |
|---|---|
| `email` | Valid email format |
| `password` | Minimum 6 characters |

---

### 3.2 Sign Out

**Operation:** `supabase.auth.signOut()`  
**Called from:** `AuthContext.signOut()` → invoked by `AdminLayout` topbar button

```js
// AuthContext.jsx
async function signOut() {
  await supabase.auth.signOut()
}
```

Clears the JWT from localStorage. `AuthContext.onAuthStateChange` fires, sets `session = null`, and `ProtectedRoute` redirects the user to `/admin/login`.

---

### 3.3 Session Persistence

```js
// AuthContext.jsx — runs once on mount
supabase.auth.getSession().then(({ data: { session } }) => {
  setSession(session)
  setUser(session?.user ?? null)
  setLoading(false)
})

supabase.auth.onAuthStateChange((_event, session) => {
  setSession(session)
  setUser(session?.user ?? null)
})
```

The session is restored from `localStorage` on every page load. The `loading` state prevents `ProtectedRoute` from redirecting before the session check completes, eliminating the authenticated-user-redirect flash.

---

### 3.4 Admin Role Verification

**Files:** `src/hooks/useAdminData.js` → `useAdminProfile()`, `supabase/migrations/003_security_hardening.sql` → `is_admin()`

After authentication, the admin's profile is fetched to display their name:

```js
// useAdminData.js → useAdminProfile()
const { data } = await supabase
  .from('profiles')
  .select('id, full_name, role, avatar_url')
  .eq('id', userId)
  .single()
```

**Example response:**

```json
{
  "id": "uuid-of-auth-user",
  "full_name": "Sanjay S",
  "role": "admin",
  "avatar_url": null
}
```

The authoritative role check happens **inside the database** via `public.is_admin()`. Every write policy on services, projects, enquiries, media, and storage calls this function. A user with a valid JWT but no `profiles` row with `role = 'admin'` will be rejected.

**Admin account creation:** Accounts must be created manually in Supabase Dashboard → Authentication → Users. No public registration endpoint exists or is exposed.

---

### 3.5 Route Protection

**File:** `src/router/ProtectedRoute.jsx`

```js
// If session loading: show spinner (prevents redirect flash)
// If !isAuthenticated: redirect to /admin/login (preserves intended URL in state)
// If authenticated: render <Outlet />
```

The `ProtectedRoute` is a client-side guard only. The database RLS policies are the authoritative server-side enforcement.

---

## 4. Dashboard Statistics RPC

**File:** `src/hooks/useAdminData.js` → `useDashboardStats()`  
**Route:** `/admin`  
**DB Function:** `public.get_dashboard_stats()`

### Operation

```js
// useAdminData.js
const { data, error } = await supabase.rpc('get_dashboard_stats')
```

This is a **Supabase RPC call** (not a table query). It invokes the PostgreSQL function `public.get_dashboard_stats()` via PostgREST's `/rpc/get_dashboard_stats` endpoint.

### Security

The function is `SECURITY DEFINER` (runs with owner privileges to bypass RLS for counts), but contains an explicit body guard:

```sql
IF NOT public.is_admin() THEN
  RAISE EXCEPTION 'Access denied: get_dashboard_stats() requires admin role'
  USING ERRCODE = 'insufficient_privilege';  -- SQLSTATE 42501
END IF;
```

Additionally: `REVOKE EXECUTE FROM PUBLIC`, `REVOKE EXECUTE FROM anon`, `GRANT EXECUTE TO authenticated`.

### Response

```json
{
  "total_projects":    6,
  "active_projects":   5,
  "featured_projects": 2,
  "total_services":    6,
  "active_services":   6,
  "total_enquiries":   12,
  "new_enquiries":     4,
  "total_media":       8
}
```

| Key | Description |
|---|---|
| `total_projects` | COUNT(*) from projects table |
| `active_projects` | COUNT where `is_active = TRUE` |
| `featured_projects` | COUNT where `is_featured = TRUE` |
| `total_services` | COUNT(*) from services table |
| `active_services` | COUNT where `is_active = TRUE` |
| `total_enquiries` | COUNT(*) from enquiries table |
| `new_enquiries` | COUNT where `status = 'new'` |
| `total_media` | COUNT(*) from media table |

**Error state:** Sets `error` string in the hook; displayed as an alert banner on the dashboard. No retry logic — user must refresh.

---

## 5. Projects — CRUD Operations

**Files:**
- Read (public): `src/hooks/useProjects.js`
- Read / Write (admin): `src/hooks/useAdminData.js`, `src/pages/admin/ProjectsPage.jsx`

---

### 5.1 Read — Public (active projects only)

**Hook:** `useProjects({ featuredOnly?: boolean })`  
**Used on:** Home page (featured only), Projects page (all active)

```js
// useProjects.js
const { data } = await supabase
  .from('projects')
  .select('id, title, slug, description, short_desc, client_name, category, tags, image_url, is_featured, completed_at, sort_order')
  .eq('is_active', true)
  .order('sort_order', { ascending: true })
// + .eq('is_featured', true)   ← only when featuredOnly = true
```

**Columns returned (public):**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `title` | TEXT | Project name |
| `slug` | TEXT | URL-safe identifier |
| `description` | TEXT | Full description |
| `short_desc` | TEXT \| null | One-line summary |
| `client_name` | TEXT \| null | Client name |
| `category` | TEXT \| null | Project category |
| `tags` | TEXT[] | Array of tech tags |
| `image_url` | TEXT \| null | Hero image URL |
| `is_featured` | BOOLEAN | True = show on homepage |
| `completed_at` | DATE \| null | Completion date |
| `sort_order` | INT | Display order |

**Example response (single item):**

```json
{
  "id": "a1b2c3d4-...",
  "title": "E-Commerce Platform Redesign",
  "slug": "ecommerce-platform-redesign",
  "description": "Complete redesign of a high-traffic retail platform...",
  "short_desc": "Modern e-commerce rebuild with 40% faster checkout",
  "client_name": "RetailCo",
  "category": "Web App",
  "tags": ["React", "Node.js", "PostgreSQL"],
  "image_url": "https://<project>.supabase.co/storage/v1/object/public/media/uploads/image.jpg",
  "is_featured": true,
  "completed_at": "2024-06-30",
  "sort_order": 1
}
```

---

### 5.2 Read — Admin (all projects including inactive)

**Hook:** `useAdminProjects()`

```js
// useAdminData.js
const { data } = await supabase
  .from('projects')
  .select('*')
  .order('sort_order', { ascending: true })
  .order('created_at', { ascending: false })
```

Returns all columns including `is_active`, `gallery_urls`, `updated_at`, `created_at`.

---

### 5.3 Create

**Called from:** `AdminProjectsPage.handleSave()` when no existing `id`

```js
const { error } = await supabase.from('projects').insert([payload])
```

**Payload sent to Supabase:**

```json
{
  "title":        "My New Project",
  "slug":         "my-new-project",
  "description":  "Full description text (min 10 chars)",
  "short_desc":   "One-line summary",
  "client_name":  "Client Corp",
  "category":     "Mobile App",
  "tags":         ["React Native", "Firebase"],
  "image_url":    "https://example.com/image.jpg",
  "is_featured":  false,
  "is_active":    true,
  "completed_at": "2024-12-31",
  "sort_order":   5
}
```

**Client-side validation (Zod schema):**

| Field | Rule |
|---|---|
| `title` | Required, min 2, max 200 chars |
| `slug` | Required, min 2, max 200, regex `^[a-z0-9-]+$` |
| `description` | Required, min 10 chars |
| `short_desc` | Optional, max 300 chars |
| `client_name` | Optional, max 100 chars |
| `category` | Optional, max 100 chars |
| `tags` | Comma-separated string; split to array before insert |
| `image_url` | Optional; if provided must be a valid URL |
| `is_featured` | Boolean |
| `is_active` | Boolean |
| `completed_at` | Optional date string (HTML date input) |
| `sort_order` | Integer ≥ 0 |

**Slug auto-generation:** When creating a new project, the slug is auto-generated from the title using:

```js
title.toLowerCase().trim()
     .replace(/[^a-z0-9\s-]/g, '')
     .replace(/\s+/g, '-')
     .replace(/-+/g, '-')
```

The slug field remains editable before submission.

---

### 5.4 Update

**Called from:** `AdminProjectsPage.handleSave()` when existing `id` present

```js
const { error } = await supabase
  .from('projects')
  .update(payload)
  .eq('id', modal.record.id)
```

Same payload shape as create. The `updated_at` column is set automatically by the `trg_projects_updated_at` trigger.

---

### 5.5 Delete

**Called from:** `AdminProjectsPage.handleDelete()`

```js
const { error } = await supabase
  .from('projects')
  .delete()
  .eq('id', delTarget.id)
```

No cascade rules are defined on `projects`. Deletion is permanent.

> **Missing functionality:** Deleting a project does not automatically delete associated images from Supabase Storage. Image URLs stored in `image_url` or `gallery_urls` become orphaned references.

---

## 6. Services — CRUD Operations

**Files:**
- Read (public): `src/hooks/useServices.js`
- Read / Write (admin): `src/hooks/useAdminData.js`, `src/pages/admin/ServicesPage.jsx`

---

### 6.1 Read — Public (active services only)

**Hook:** `useServices()`

```js
// useServices.js
const { data } = await supabase
  .from('services')
  .select('id, title, slug, description, short_desc, icon, image_url, sort_order')
  .eq('is_active', true)
  .order('sort_order', { ascending: true })
```

**Columns returned (public):**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `title` | TEXT | Service name |
| `slug` | TEXT | URL-safe identifier |
| `description` | TEXT | Full description |
| `short_desc` | TEXT \| null | One-line summary |
| `icon` | TEXT \| null | Lucide icon name (e.g. `"code"`) |
| `image_url` | TEXT \| null | Service image URL |
| `sort_order` | INT | Display order |

**Example response:**

```json
{
  "id": "b2c3d4e5-...",
  "title": "Web Development",
  "slug": "web-development",
  "description": "We build fast, scalable web applications...",
  "short_desc": "Custom web apps, CMSes, and portals",
  "icon": "code",
  "image_url": null,
  "sort_order": 1
}
```

---

### 6.2 Read — Admin (all services including inactive)

**Hook:** `useAdminServices()`

```js
const { data } = await supabase
  .from('services')
  .select('*')
  .order('sort_order', { ascending: true })
  .order('created_at', { ascending: false })
```

Returns all columns including `is_active`, `updated_at`, `created_at`.

---

### 6.3 Create

```js
const { error } = await supabase.from('services').insert([payload])
```

**Payload:**

```json
{
  "title":       "Cloud Infrastructure",
  "slug":        "cloud-infrastructure",
  "description": "Full cloud migration and management...",
  "short_desc":  "AWS, GCP, Azure deployments",
  "icon":        "cloud",
  "image_url":   null,
  "is_active":   true,
  "sort_order":  3
}
```

**Client-side validation (Zod):**

| Field | Rule |
|---|---|
| `title` | Required, min 2, max 200 chars |
| `slug` | Required, min 2, max 200, regex `^[a-z0-9-]+$` |
| `description` | Required, min 10 chars |
| `short_desc` | Optional, max 300 chars |
| `icon` | Optional, max 100 chars |
| `image_url` | Optional; if provided must be a valid URL |
| `is_active` | Boolean |
| `sort_order` | Integer ≥ 0 |

---

### 6.4 Update

```js
const { error } = await supabase
  .from('services')
  .update(payload)
  .eq('id', modal.record.id)
```

`updated_at` is set by the `trg_services_updated_at` trigger.

---

### 6.5 Delete

```js
const { error } = await supabase
  .from('services')
  .delete()
  .eq('id', delTarget.id)
```

---

## 7. Enquiry Submission and Management

**Files:**
- Public submit: `src/pages/public/ContactPage.jsx`
- Admin management: `src/hooks/useAdminData.js`, `src/pages/admin/EnquiriesPage.jsx`

---

### 7.1 Submit Enquiry (public, unauthenticated)

**Called from:** Contact page form submission

```js
// ContactPage.jsx
const { error } = await supabase.from('enquiries').insert([payload])
```

**Payload (required fields only — optional fields omitted if empty):**

```json
{
  "name":    "Jane Smith",
  "email":   "jane@example.com",
  "message": "We need a custom web application for our logistics company."
}
```

**With optional fields:**

```json
{
  "name":    "Jane Smith",
  "email":   "jane@example.com",
  "phone":   "+91 98765 43210",
  "subject": "Project enquiry",
  "message": "We need a custom web application for our logistics company."
}
```

**Client-side validation (Zod schema in ContactPage):**

| Field | Rule |
|---|---|
| `name` | Required, min 2, max 100 chars |
| `email` | Required, valid email format |
| `phone` | Optional, max 20 chars |
| `subject` | Optional, max 200 chars |
| `message` | Required, min 10, max 5000 chars |

**Server-side validation (PostgreSQL CHECK constraints):**

| Column | Constraint |
|---|---|
| `name` | `char_length(name) BETWEEN 2 AND 100` |
| `email` | `email ~* '^[^@]+@[^@]+\.[^@]+$'` |
| `phone` | `phone IS NULL OR char_length(phone) <= 20` |
| `subject` | `subject IS NULL OR char_length(subject) <= 200` |
| `message` | `char_length(message) BETWEEN 10 AND 5000` |
| `status` | `status IN ('new', 'read', 'replied', 'closed')` |

The `status` field defaults to `'new'` on insert. The `created_at` and `updated_at` are set by the database.

**Error handling in ContactPage:**

| Supabase error code | Displayed message |
|---|---|
| `'23514'` (check_violation) | `"Your submission contains invalid data. Please check the form and try again."` |
| Any other | `"Failed to send your message. Please try again."` |

---

### 7.2 Read Enquiries (admin only)

**Hook:** `useAdminEnquiries(statusFilter?: string)`

```js
// useAdminData.js
let q = supabase
  .from('enquiries')
  .select('*')
  .order('created_at', { ascending: false })

if (statusFilter) q = q.eq('status', statusFilter)
```

**Status filter values:** `''` (all) | `'new'` | `'read'` | `'replied'` | `'closed'`

**Example response (single row):**

```json
{
  "id":          "c3d4e5f6-...",
  "name":        "Jane Smith",
  "email":       "jane@example.com",
  "phone":       "+91 98765 43210",
  "subject":     "Project enquiry",
  "message":     "We need a custom web application...",
  "status":      "new",
  "admin_notes": null,
  "ip_address":  null,
  "created_at":  "2024-11-18T07:32:00.000Z",
  "updated_at":  "2024-11-18T07:32:00.000Z"
}
```

---

### 7.3 Read Recent Enquiries (admin dashboard only)

**Hook:** `useRecentEnquiries(limit?: number)` — defaults to 5

```js
// useAdminData.js
const { data } = await supabase
  .from('enquiries')
  .select('id, name, email, subject, status, created_at')
  .order('created_at', { ascending: false })
  .limit(5)
```

Returns a projection (not all columns) for the dashboard preview widget.

---

### 7.4 Update Enquiry Status (admin only)

**Called from:** `EnquiriesPage` detail modal on save

```js
// EnquiriesPage.jsx
const { error } = await supabase
  .from('enquiries')
  .update({ status: data.status, admin_notes: data.admin_notes || null })
  .eq('id', enquiry.id)
```

**Fields updatable by admin:**

| Field | Allowed values |
|---|---|
| `status` | `'new'` \| `'read'` \| `'replied'` \| `'closed'` |
| `admin_notes` | Any text string, or null |

**Status workflow:**

```
new  →  read  →  replied  →  closed
```

The status can be updated non-linearly (e.g. `new` → `closed` directly) since the update sets whatever value is selected.

---

### 7.5 Delete Enquiry (admin only)

Not exposed in the current admin UI. The RLS policy `"enquiries: admin can delete"` exists in the database, but no delete button or confirm dialog is implemented in `EnquiriesPage.jsx`.

> **Missing functionality:** The admin UI does not currently expose an enquiry delete action. The database policy permits it; the UI simply does not call it.

---

## 8. Media — Upload, Retrieval and Deletion

**Files:** `src/pages/admin/MediaPage.jsx`, `src/hooks/useAdminData.js`

Upload is a **two-step operation**: file → Supabase Storage, then metadata row → `public.media` table.

---

### 8.1 Client-side File Validation

Performed before any network call in `MediaPage.handleFiles()`:

| Constraint | Value |
|---|---|
| Maximum file size | 10 MB (`10 * 1024 * 1024` bytes) |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml` |

Violations show a toast error immediately, with no network request made.

---

### 8.2 Upload — Step 1: Storage

```js
// MediaPage.jsx
const path = `uploads/${Date.now()}_${sanitisedFilename}`

const { error: upErr } = await supabase.storage
  .from('media')                 // bucket name
  .upload(path, file, {
    cacheControl: '3600',        // 1 hour CDN cache
    upsert: false,               // fail if file already exists
    contentType: file.type,
  })
```

**Storage path pattern:** `uploads/<unix-timestamp>_<sanitised-filename>`

Filename sanitisation: `file.name.replace(/[^a-zA-Z0-9._-]/g, '_')`

---

### 8.3 Get Public URL

```js
const { data: urlData } = supabase.storage
  .from('media')
  .getPublicUrl(path)

const publicUrl = urlData?.publicUrl
// e.g. "https://<project>.supabase.co/storage/v1/object/public/media/uploads/1700000000_my_image.jpg"
```

This is a synchronous call — no network request. The URL is deterministic based on bucket and path.

---

### 8.4 Upload — Step 2: Database Record

```js
const { error: dbErr } = await supabase.from('media').insert([{
  file_name:    file.name,
  storage_path: path,
  public_url:   publicUrl,
  mime_type:    file.type,
  file_size:    file.size,
  uploaded_by:  user?.id ?? null,
}])
```

**If the DB insert fails**, the uploaded storage file is cleaned up:

```js
await supabase.storage.from('media').remove([path])
```

**Example inserted row:**

```json
{
  "id":           "d4e5f6g7-...",
  "file_name":    "banner.jpg",
  "storage_path": "uploads/1700000000_banner.jpg",
  "public_url":   "https://<project>.supabase.co/storage/v1/object/public/media/uploads/1700000000_banner.jpg",
  "mime_type":    "image/jpeg",
  "file_size":    524288,
  "alt_text":     null,
  "uploaded_by":  "uuid-of-admin",
  "created_at":   "2024-11-18T10:00:00.000Z"
}
```

---

### 8.5 Read Media (admin)

**Hook:** `useAdminMedia()`

```js
const { data } = await supabase
  .from('media')
  .select('*')
  .order('created_at', { ascending: false })
```

Returns all media rows, newest first.

---

### 8.6 Delete Media

**Called from:** `MediaPage.handleDelete()` — a two-step operation:

**Step 1 — Remove from storage:**

```js
const { error: storErr } = await supabase.storage
  .from('media')
  .remove([delTarget.storage_path])
```

**Step 2 — Delete database row:**

```js
const { error: dbErr } = await supabase
  .from('media')
  .delete()
  .eq('id', delTarget.id)
```

The DB row is deleted regardless of whether the storage removal succeeded (to keep the registry clean). Both errors are reported if either fails.

---

### 8.7 Storage Bucket Configuration

Defined in `supabase/migrations/001_initial_schema.sql`:

| Setting | Value |
|---|---|
| Bucket name | `media` |
| Public | `true` |
| File size limit | 10,485,760 bytes (10 MB) |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml` |

---

## 9. Database Tables and Schema

All tables are in the `public` schema. All have RLS enabled.

---

### 9.1 `public.profiles`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, FK → `auth.users(id)` ON DELETE CASCADE | Matches Supabase Auth user ID |
| `full_name` | TEXT | nullable | Admin display name |
| `role` | TEXT | NOT NULL, DEFAULT `'admin'`, CHECK `IN ('admin')` | Only `'admin'` is a valid role |
| `avatar_url` | TEXT | nullable | URL to profile image |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Auto-updated by trigger |

**Trigger:** `trg_profiles_updated_at` — BEFORE UPDATE, sets `updated_at = NOW()`  
**Trigger:** `trg_prevent_role_change` — BEFORE UPDATE, raises `check_violation` if `NEW.role IS DISTINCT FROM OLD.role`

---

### 9.2 `public.services`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `title` | TEXT | NOT NULL | |
| `slug` | TEXT | NOT NULL, UNIQUE | URL-safe identifier |
| `description` | TEXT | NOT NULL | |
| `short_desc` | TEXT | nullable | |
| `icon` | TEXT | nullable | Lucide icon name |
| `image_url` | TEXT | nullable | Supabase Storage URL |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| `sort_order` | INT | NOT NULL, DEFAULT 0 | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Auto-updated by trigger |

**Indexes:** `is_active`, `sort_order`, `slug`

---

### 9.3 `public.projects`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `title` | TEXT | NOT NULL | |
| `slug` | TEXT | NOT NULL, UNIQUE | |
| `description` | TEXT | NOT NULL | |
| `short_desc` | TEXT | nullable | |
| `client_name` | TEXT | nullable | |
| `category` | TEXT | nullable | |
| `tags` | TEXT[] | NOT NULL, DEFAULT `'{}'` | |
| `image_url` | TEXT | nullable | Primary image |
| `gallery_urls` | TEXT[] | NOT NULL, DEFAULT `'{}'` | Additional images |
| `is_featured` | BOOLEAN | NOT NULL, DEFAULT FALSE | |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | |
| `completed_at` | DATE | nullable | |
| `sort_order` | INT | NOT NULL, DEFAULT 0 | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Auto-updated by trigger |

**Indexes:** `is_active`, `is_featured`, `category`, `slug`, `sort_order`

> **Note:** `gallery_urls` is defined in the schema but is not managed by the admin UI. The admin form handles `image_url` only. `gallery_urls` remains as an empty array `{}` on all records created through the dashboard.

---

### 9.4 `public.enquiries`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `name` | TEXT | NOT NULL, CHECK `length BETWEEN 2 AND 100` | |
| `email` | TEXT | NOT NULL, CHECK regex email | |
| `phone` | TEXT | nullable, CHECK `length <= 20` | |
| `subject` | TEXT | nullable, CHECK `length <= 200` | |
| `message` | TEXT | NOT NULL, CHECK `length BETWEEN 10 AND 5000` | |
| `status` | TEXT | NOT NULL, DEFAULT `'new'`, CHECK `IN ('new','read','replied','closed')` | |
| `admin_notes` | TEXT | nullable | Internal admin use |
| `ip_address` | INET | nullable | Not populated by current frontend code |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Auto-updated by trigger |

**Indexes:** `status`, `created_at DESC`

> **Note:** `ip_address` is defined in the schema for spam control but is not populated by any current frontend code.

---

### 9.5 `public.media`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `file_name` | TEXT | NOT NULL | Original filename |
| `storage_path` | TEXT | NOT NULL, UNIQUE | Path within `media` bucket |
| `public_url` | TEXT | NOT NULL | CDN-served URL |
| `mime_type` | TEXT | NOT NULL, CHECK IN allowed types | |
| `file_size` | BIGINT | CHECK `0 < size <= 10485760` | Bytes; max 10 MB |
| `alt_text` | TEXT | nullable | Not currently editable via UI |
| `uploaded_by` | UUID | nullable, FK → `auth.users(id)` ON DELETE SET NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | No `updated_at` on this table |

**Indexes:** `uploaded_by`, `mime_type`

> **Note:** `alt_text` is in the schema but there is no UI field to set it. All records uploaded via the admin UI will have `alt_text = null`.

---

## 10. RLS Policies and Access Permissions

### Policy summary table

| Table | Operation | Role | Condition | Policy name |
|---|---|---|---|---|
| `profiles` | SELECT | `authenticated` | `auth.uid() = id` | `"profiles: admin can read own profile"` |
| `profiles` | UPDATE | `authenticated` | `auth.uid() = id` | `"profiles: admin can update own profile"` |
| `services` | SELECT | `anon` | `is_active = TRUE` | `"services: public can read active"` |
| `services` | SELECT | `authenticated` | `is_admin()` | `"services: admin full read"` |
| `services` | INSERT | `authenticated` | `is_admin()` | `"services: admin can insert"` |
| `services` | UPDATE | `authenticated` | `is_admin()` | `"services: admin can update"` |
| `services` | DELETE | `authenticated` | `is_admin()` | `"services: admin can delete"` |
| `projects` | SELECT | `anon` | `is_active = TRUE` | `"projects: public can read active"` |
| `projects` | SELECT | `authenticated` | `is_admin()` | `"projects: admin full read"` |
| `projects` | INSERT | `authenticated` | `is_admin()` | `"projects: admin can insert"` |
| `projects` | UPDATE | `authenticated` | `is_admin()` | `"projects: admin can update"` |
| `projects` | DELETE | `authenticated` | `is_admin()` | `"projects: admin can delete"` |
| `enquiries` | INSERT | `anon` | field length / regex checks | `"enquiries: public can insert"` |
| `enquiries` | SELECT | `authenticated` | `is_admin()` | `"enquiries: admin full read"` |
| `enquiries` | UPDATE | `authenticated` | `is_admin()` | `"enquiries: admin can update"` |
| `enquiries` | DELETE | `authenticated` | `is_admin()` | `"enquiries: admin can delete"` |
| `media` | SELECT | `anon` | `TRUE` | `"media: public can read"` |
| `media` | SELECT | `authenticated` | `is_admin()` | `"media: admin full read"` |
| `media` | INSERT | `authenticated` | `is_admin() AND auth.uid() = uploaded_by` | `"media: admin can insert"` |
| `media` | UPDATE | `authenticated` | `is_admin()` | `"media: admin can update"` |
| `media` | DELETE | `authenticated` | `is_admin()` | `"media: admin can delete"` |
| `storage.objects` | SELECT | `anon` | `bucket_id = 'media'` | `"storage media: public read"` |
| `storage.objects` | INSERT | `authenticated` | `bucket_id = 'media' AND is_admin()` | `"storage media: admin can upload"` |
| `storage.objects` | UPDATE | `authenticated` | `bucket_id = 'media' AND is_admin()` | `"storage media: admin can update"` |
| `storage.objects` | DELETE | `authenticated` | `bucket_id = 'media' AND is_admin()` | `"storage media: admin can delete"` |

### `public.is_admin()` function

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;
```

This function is called inline in every write RLS policy. A user holding a valid JWT (`authenticated` role) but without a matching `profiles` row with `role = 'admin'` will have all write operations rejected.

---

## 11. Input Validation and Error Handling

### Validation layers

```
Layer 1 — React UI       Zod schema via react-hook-form → inline field errors
Layer 2 — Supabase RLS   Policy WITH CHECK expressions  → HTTP 403 from PostgREST
Layer 3 — PostgreSQL     CHECK constraints on columns   → SQLSTATE 23514
Layer 4 — Trigger        prevent_role_change()          → SQLSTATE 23514 on role update
```

### Error handling pattern (all data hooks)

```js
const { data, error } = await supabase.from('table').select('...')
if (error) setError(error.message)
else       setData(data ?? [])
```

The `error.message` string is the message returned by Supabase PostgREST / Auth. Common SQLSTATE codes:

| SQLSTATE | Meaning | When triggered |
|---|---|---|
| `23514` | `check_violation` | Column CHECK constraint violated; also `prevent_role_change` trigger |
| `23505` | `unique_violation` | Duplicate slug on services or projects |
| `42501` | `insufficient_privilege` | `get_dashboard_stats()` body guard; non-admin calling RPC |

### Toast notifications

All admin mutation operations (create, update, delete for projects, services, enquiries, and media) use `react-hot-toast`:

```js
toast.success('Project created.')        // on success
toast.error(error.message)               // on Supabase error
```

---

## 12. Database Functions and Triggers

### Functions

| Function | Language | Security | Purpose |
|---|---|---|---|
| `public.is_admin()` | SQL | INVOKER | Returns TRUE if caller has admin profile row |
| `public.get_dashboard_stats()` | PL/pgSQL | DEFINER | Returns aggregate counts; enforces is_admin() body guard |
| `public.set_updated_at()` | PL/pgSQL | INVOKER | Sets `updated_at = NOW()` before every UPDATE |
| `public.prevent_role_change()` | PL/pgSQL | INVOKER | Raises exception if `NEW.role ≠ OLD.role` |

### Triggers

| Trigger name | Table | Timing | Event | Function |
|---|---|---|---|---|
| `trg_profiles_updated_at` | `profiles` | BEFORE | UPDATE | `set_updated_at()` |
| `trg_services_updated_at` | `services` | BEFORE | UPDATE | `set_updated_at()` |
| `trg_projects_updated_at` | `projects` | BEFORE | UPDATE | `set_updated_at()` |
| `trg_enquiries_updated_at` | `enquiries` | BEFORE | UPDATE | `set_updated_at()` |
| `trg_prevent_role_change` | `profiles` | BEFORE | UPDATE | `prevent_role_change()` |

The `prevent_role_change` trigger fires before every UPDATE on `profiles`. It compares `OLD.role IS DISTINCT FROM NEW.role` — if different, it raises `check_violation` (SQLSTATE 23514) and aborts the update. All other column updates (`full_name`, `avatar_url`) are unaffected.

---

## 13. Files Inspected and Documentation Limitations

### Files inspected

| File | Purpose |
|---|---|
| `src/lib/supabase.js` | Client initialisation and configuration |
| `src/context/AuthContext.jsx` | Auth state, signIn, signOut |
| `src/router/ProtectedRoute.jsx` | Client-side route guard |
| `src/router/index.jsx` | Full route tree |
| `src/hooks/useServices.js` | Public services query |
| `src/hooks/useProjects.js` | Public projects query |
| `src/hooks/useAdminData.js` | All admin data hooks |
| `src/pages/public/ContactPage.jsx` | Enquiry submission form |
| `src/pages/admin/LoginPage.jsx` | Login form and error handling |
| `src/pages/admin/DashboardPage.jsx` | Stats display |
| `src/pages/admin/ProjectsPage.jsx` | Projects CRUD mutations |
| `src/pages/admin/ServicesPage.jsx` | Services CRUD mutations |
| `src/pages/admin/EnquiriesPage.jsx` | Enquiry management |
| `src/pages/admin/MediaPage.jsx` | File upload and deletion |
| `supabase/migrations/001_initial_schema.sql` | Tables, indexes, triggers, RLS (migration 001 — executed in production) |
| `supabase/migrations/003_security_hardening.sql` | Hardened functions, trigger, corrected RLS policies |

### Documentation limitations

The following are **present in the schema or codebase** but not fully implemented in the UI:

| Item | Status |
|---|---|
| `enquiries.ip_address` | Column exists, not populated by frontend |
| `projects.gallery_urls` | Column exists, admin form does not expose it; always `{}` |
| `media.alt_text` | Column exists, no UI field to set it |
| Enquiry delete | RLS policy exists (`"enquiries: admin can delete"`); no UI button |
| Auto-create profile on sign-up | Comment in migration 001 mentions a trigger; no such trigger is defined in the migrations. Profile rows must be inserted manually. |
| Pagination | No pagination is implemented on any list; all rows are fetched in a single query |
| Real-time subscriptions | Supabase supports `supabase.channel().on(...)` for live data; not used in this project |
| Search on enquiries / media | No server-side search; projects and services have client-side title filter only |
| Rate limiting | No rate limiting is implemented in the application layer; Supabase platform-level limits apply |

---

*Generated from source code inspection — `2026-11-18`*  
*All examples derived from actual code in `src/` and `supabase/migrations/`.*
