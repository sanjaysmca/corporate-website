-- ═══════════════════════════════════════════════════════════════════════════
--  seed.sql — Development sample data
--  Run AFTER 001_initial_schema.sql
--  Purpose: provide realistic data to develop and test the UI against.
--  DO NOT run in production with real customer data.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Sample Services ───────────────────────────────────────────────────────────
INSERT INTO public.services (title, slug, description, short_desc, icon, is_active, sort_order) VALUES
(
  'Web Development',
  'web-development',
  'We build fast, accessible, and scalable web applications using modern frameworks such as React, Next.js, and Node.js. Our team delivers clean, maintainable code backed by thorough testing.',
  'Scalable web applications built with modern frameworks.',
  'code',
  TRUE, 1
),
(
  'Mobile Applications',
  'mobile-applications',
  'Native and cross-platform mobile apps for iOS and Android. We use React Native and Flutter to deliver consistent, high-performance experiences across both platforms.',
  'Cross-platform iOS and Android applications.',
  'smartphone',
  TRUE, 2
),
(
  'UI/UX Design',
  'ui-ux-design',
  'Human-centred design from wireframing and prototyping through to production-ready Figma files. We conduct user research and usability testing to validate every design decision.',
  'User-centred design from concept to delivery.',
  'layout',
  TRUE, 3
),
(
  'Cloud & DevOps',
  'cloud-devops',
  'Infrastructure-as-code, CI/CD pipelines, container orchestration, and cloud cost optimisation on AWS, GCP, and Azure. We help teams ship faster with confidence.',
  'CI/CD, containers, and cloud infrastructure.',
  'cloud',
  TRUE, 4
),
(
  'Digital Consulting',
  'digital-consulting',
  'Strategic guidance on digital transformation, technology selection, and architecture reviews. We help organisations make informed technology decisions aligned with business goals.',
  'Technology strategy and digital transformation advice.',
  'briefcase',
  TRUE, 5
),
(
  'Legacy Modernisation',
  'legacy-modernisation',
  'Assessment, re-architecture, and phased migration of legacy systems to modern, maintainable stacks — minimising risk and downtime throughout the transition.',
  'Modernise and migrate ageing systems safely.',
  'refresh-cw',
  FALSE, 6   -- inactive: not shown publicly, visible only in admin
)
ON CONFLICT (slug) DO NOTHING;


-- ── Sample Projects ───────────────────────────────────────────────────────────
INSERT INTO public.projects (title, slug, description, short_desc, client_name, category, tags, is_featured, is_active, completed_at, sort_order) VALUES
(
  'FinTrack — Personal Finance Dashboard',
  'fintrack-finance-dashboard',
  'A real-time personal finance management platform with bank integrations, spending analytics, and customisable budget goals. Built with React, Node.js, and PostgreSQL.',
  'Real-time personal finance management with analytics.',
  'FinTrack Ltd',
  'Web Application',
  ARRAY['React', 'Node.js', 'PostgreSQL', 'Chart.js'],
  TRUE, TRUE, '2025-09-15', 1
),
(
  'MediBook — Healthcare Appointment System',
  'medibook-healthcare',
  'A HIPAA-compliant appointment booking and patient management system serving over 50 clinics. Features include real-time slot availability, automated reminders, and EHR integration.',
  'HIPAA-compliant appointment and patient management.',
  'MediBook Health',
  'Healthcare',
  ARRAY['React Native', 'Node.js', 'PostgreSQL', 'Twilio'],
  TRUE, TRUE, '2025-06-30', 2
),
(
  'ShopForward — E-commerce Platform',
  'shopforward-ecommerce',
  'A headless e-commerce platform supporting 200+ merchants with multi-currency checkout, inventory management, and a drag-and-drop storefront builder.',
  'Headless e-commerce for 200+ merchants.',
  'ShopForward Inc.',
  'E-commerce',
  ARRAY['Next.js', 'Stripe', 'PostgreSQL', 'Redis'],
  TRUE, TRUE, '2025-03-20', 3
),
(
  'LogiFlow — Supply Chain Tracker',
  'logiflow-supply-chain',
  'End-to-end supply chain visibility platform with live GPS tracking, predictive ETAs, and exception alerting for a fleet of 1,000+ vehicles.',
  'Real-time supply chain visibility and tracking.',
  'LogiFlow Logistics',
  'Logistics',
  ARRAY['React', 'Node.js', 'Socket.io', 'MapBox'],
  FALSE, TRUE, '2024-12-01', 4
),
(
  'EduPath — Online Learning Platform',
  'edupath-learning',
  'An adaptive online learning platform delivering personalised course recommendations and spaced-repetition exercises to 20,000+ active learners.',
  'Adaptive learning platform with personalised content.',
  'EduPath Ltd',
  'EdTech',
  ARRAY['React', 'Python', 'FastAPI', 'PostgreSQL'],
  FALSE, TRUE, '2024-08-18', 5
),
(
  'Internal Payroll Tool (Stealth)',
  'internal-payroll-stealth',
  'Confidential internal payroll automation tool — not yet published publicly.',
  'Confidential client project.',
  'Undisclosed',
  'Internal Tools',
  ARRAY['React', 'Node.js'],
  FALSE, FALSE, NULL, 6   -- inactive draft
)
ON CONFLICT (slug) DO NOTHING;
