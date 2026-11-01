# Student Accommodation Recommendation Prototype

An alpha Next.js and Supabase prototype for the research project **Development of a Big Data Analytic System for Recommending NSFAS-Accredited Student Accommodation**.

## Research aim

Develop and implement a big-data analytics system for recommending NSFAS-accredited student accommodation. The research objectives are to analyze literature/technology trends, investigate student needs and develop a framework, and design/develop/evaluate the recommendation system.

The current alpha partially addresses the third objective: it ranks active rental listings using a deterministic preference heuristic. It is **not** a big-data pipeline, does not verify NSFAS accreditation, and has not established recommendation quality through an empirical evaluation. Literature review and student-needs findings must be supported by research records outside the application.

## Core prototype workflow

1. **Owner:** create a listing and complete its rent, location, type, bedrooms, bathrooms, parking, and description details.
2. **Student:** set budget, area/campus text, accommodation type, lifestyle, minimum bedroom/bathroom, and parking requirements; inspect ranked listings, criterion scores, and data coverage.
3. **Student:** open a listing and submit a lease request.
4. **Owner:** review and approve or reject requests for their own listings; the student can then check the request status.
5. **University:** access student and accommodation information. University staff do not decide property owners' lease requests.

The ranker uses budget (30%), area/campus text (25%), property type (15%), bedroom fit (10%), bathroom fit (5%), lifestyle text (10%), and parking (5%). Criteria only apply when relevant to the student and present in the listing. Missing criterion data contributes a neutral score and lowers the displayed data-coverage percentage. Requested minimum bedrooms/bathrooms and required parking are hard filters; missing data fails a requested hard requirement. Location is text similarity, not geographic distance. A market summary shows active listing count, median listed rent, and number priced within budget. Preferences are stored in browser local storage.

These are explainable multi-criteria analytics over the listings returned by the existing Supabase endpoint. The workspace has no large external dataset, event history, distributed processing engine, NSFAS verification source, or student relevance labels; therefore this is not yet a big-data system or an empirically validated recommender. Run focused algorithm tests with `node --test lib/recommendation-engine.test.mjs`.

## Out-of-scope prototype modules

Student hub operations, roommate matching, marketplace, campus events, university announcements, visitor/overnight registration, and broad compliance screens have been removed from the primary routes/navigation to keep the application focused on accommodation recommendations and requests. Direct student-owner messaging remains as application support. Legacy API/data code may remain but is not part of the research demonstration.

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

- Student recommendations: /user/recommendations
- Owner listings and requests: /user/owner and owner routes
- University accommodations: /user/university/accommodations
- Admin: /user/admin
- Messaging: /user/messages

If auth is not fully connected in your local setup, some modules may use demo-style flows or local fallback data. Lease requests require configured Supabase persistence.

## Known limitations and research gaps

- No big-data ingestion, storage, or processing pipeline is implemented.
- No authoritative NSFAS accreditation source or verification workflow is connected.
- The preference score is a heuristic, not a validated probability or proven measure of recommendation quality.
- The prototype has not established an empirical evaluation with student outcomes or recommendation baselines.
- Some modules use demo/fallback persistence; lease requests require Supabase.
- Production authentication, security hardening, and end-to-end regression coverage remain incomplete.

## Test login details

The project includes demo test accounts for the main user flows:

- Student: `student@demo.local` / `Student123!`
- Owner: `owner@demo.local` / `Owner123!`

Additional university/admin accounts can be created through Supabase or by creating users with the matching role metadata in the app’s auth profile flow when needed.

## Notes

This project is a role-based housing platform prototype built for a demo environment and local development. It is suitable for evaluating flows such as listing management, booking, university oversight, messaging, and student-hub operations.
