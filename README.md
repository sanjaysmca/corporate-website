# NexusCorp – Corporate Website with Admin Dashboard

A modern, responsive corporate website with a secure admin dashboard for managing projects, services, customer enquiries and media content.

**Live Website:** https://corporate-website-mu-indol.vercel.app  
**GitHub Repository:** https://github.com/sanjaysmca/corporate-website

---

## 1. Project Overview

NexusCorp is a full-stack corporate website developed to demonstrate modern web development practices, database integration, authentication, authorization and content management.

The application provides a public-facing corporate website where visitors can explore company information, services and projects, and submit enquiries.

It also includes a separate administrator portal where authorized users can manage website content and customer enquiries.

## 2. Key Features

### Public Website
- Responsive homepage with modern UI.
- About Us page.
- Dynamic Services listing.
- Dynamic Projects portfolio.
- Contact enquiry form with validation.
- Loading, error and empty states.
- Responsive navigation and footer.

### Admin Dashboard
- Secure administrator login and logout.
- Protected admin routes.
- Dashboard statistics.
- Project management (Create, Read, Update, Delete).
- Service management (Create, Read, Update, Delete).
- Customer enquiry management.
- Enquiry status updates.
- Image upload and management.
- Responsive admin interface.

## 3. Technology Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend development |
| Vite | Development server and build tool |
| Tailwind CSS | UI styling |
| React Router | Client-side routing |
| Lucide React | Icons |
| Supabase | Backend services |
| PostgreSQL | Relational database |
| Supabase Auth | Administrator authentication |
| Supabase Storage | Image management |
| Git & GitHub | Version control |
| Vercel | Deployment |

## 4. System Architecture

The application follows a frontend-to-backend-as-a-service architecture.

1. React provides the public website and admin dashboard.
2. React Router manages application navigation and protected routes.
3. Supabase Auth manages administrator authentication.
4. Supabase PostgreSQL stores application data.
5. Row Level Security (RLS) controls database access.
6. Supabase Storage manages uploaded media.
7. Vercel hosts the production frontend.

## 5. Database Design

The application uses PostgreSQL with the following main tables:

| Table | Description |
|---|---|
| profiles | Administrator profile and role information |
| services | Corporate services |
| projects | Portfolio projects |
| enquiries | Contact form submissions |
| media | Uploaded media information |

### Security Implementation
- Row Level Security enabled.
- Admin-only management policies.
- Public read access restricted to active projects and services.
- Public enquiry insertion with validation.
- Protected administrator operations.
- Role-change protection.
- Restricted dashboard statistics function.

Database migrations are available in:

`supabase/migrations/`

Sample development data is available in:

`supabase/seed.sql`

## 6. Project Structure

```text
corporate-website/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── admin/
│   │   └── common/
│   │
│   ├── context/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   │   ├── admin/
│   │   └── public/
│   │
│   ├── router/
│   ├── App.jsx
│   └── main.jsx
│
├── supabase/
│   ├── migrations/
│   └── seed.sql
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 7. Installation and Setup

### Prerequisites
- Node.js
- npm
- Git
- Supabase account

### Step 1: Clone the Repository

```bash
git clone https://github.com/sanjaysmca/corporate-website.git
cd corporate-website
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the project root.

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
```

Use your own Supabase project credentials.

Never commit your actual `.env` file or service-role credentials.

### Step 4: Configure Supabase

1. Create a Supabase project.
2. Execute the database migration files in order.
3. Configure the administrator account and profile.
4. Configure the media storage bucket and access policies.
5. Run `supabase/seed.sql` to insert sample development data.

### Step 5: Start Development Server

```bash
npm run dev
```

Open:

`http://localhost:5173`

### Step 6: Production Build

```bash
npm run build
```

## 8. Application Routes

### Public Routes

| Route | Description |
|---|---|
| `/` | Homepage |
| `/about` | About Us |
| `/services` | Services |
| `/projects` | Projects |
| `/contact` | Contact Us |

### Admin Routes

| Route | Description |
|---|---|
| `/admin/login` | Administrator login |
| `/admin` | Dashboard |
| `/admin/projects` | Project management |
| `/admin/services` | Service management |
| `/admin/enquiries` | Enquiry management |
| `/admin/media` | Media management |

Administrator routes require authentication and authorization.

## 9. Deployment

The application is deployed using Vercel.

Deployment process:

1. Push the source code to GitHub.
2. Import the GitHub repository into Vercel.
3. Configure Supabase environment variables.
4. Build the React application.
5. Deploy to Vercel Production.

## 10. Testing

The following functionality has been tested:

- Public website navigation.
- Dynamic project and service listings.
- Contact enquiry submission.
- Administrator authentication.
- Dashboard statistics.
- Project CRUD operations.
- Service CRUD operations.
- Enquiry status management.
- Media upload and deletion.
- Logout and protected routes.
- Production deployment and Supabase connectivity.

## 11. Future Enhancements

- Advanced dashboard analytics.
- Search and pagination.
- Improved media categorization.
- Email notifications for new enquiries.
- Automated testing.
- Enhanced SEO and performance optimization.

## 12. Author

**Sanjay S**

MCA Student | Full-Stack Development Enthusiast

GitHub: https://github.com/sanjaysmca

---

*Developed as part of a full-stack development practical assignment.*