# Student Housing Platform

A Next.js app for student accommodation discovery, management, and communications across multiple roles: students, owners, universities, agents, and admins.

## Implemented functions

- Student-facing property search and listing browsing
- Listing creation, editing, and management for property owners
- Booking and lease-request flows tied to listings and student profiles
- Student dashboard with housing-related tools and quick links
- Owner dashboard for bookings, lease requests, and messaging
- University workspace for student oversight, communications, compliance, accommodations, and events
- Student hub features such as maintenance tracking, visitor flows, waiting lists, inspections, and event planning
- Messaging system for direct chat between users and recipients selected from the app
- Role-based access controls and request header handling via the permissions layer
- Supabase-backed profile, booking, and student-hub persistence with local file fallback for demo mode

## Running the system

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file in the project root with your Supabase keys:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-key
   SUPABASE_SERVICE_ROLE=your-service-role-key
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open the app in the browser:

   - Default: http://localhost:3000
   - Local testing in this workspace is also commonly run on: http://localhost:3002

5. Sign in through the app auth pages or create demo users with the helper scripts.

   ```bash
   node scripts/create-demo-student.js
   node scripts/create-demo-owner.js
   ```

## Accessing the app

The app supports role-aware dashboards:

- Student: /user or /student-hub
- Owner: /user and owner routes
- University: /user/university
- Admin: /user with admin dashboard access
- Messaging: /user/messages

If auth is not fully connected in your local setup, the system still exposes demo-style flows through role headers and local fallback data for testing.

## Known limitations and incomplete areas

- Some advanced features are still demo-oriented rather than production-complete.
- Email delivery, notifications, and true external integrations are not fully configured out of the box.
- A few analytics and automation features are present as UI scaffolding but not fully backed by production-grade workflows.
- If Supabase is missing or misconfigured, the app may fall back to local JSON data for some modules instead of live database storage.
- The app is intended for local/demo use unless production credentials and deployment configuration are added.

## Test login details

The project includes demo test accounts for the main user flows:

- Student: `student@demo.local` / `Student123!`
- Owner: `owner@demo.local` / `Owner123!`

Additional university/admin accounts can be created through Supabase or by creating users with the matching role metadata in the app’s auth profile flow when needed.

## Notes

This project is a role-based housing platform prototype built for a demo environment and local development. It is suitable for evaluating flows such as listing management, booking, university oversight, messaging, and student-hub operations.
