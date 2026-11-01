# Publication Answers

## What did the completed project build?

The approved research title is **Development of a Big Data Analytic System for Recommending NSFAS-Accredited Student Accommodation**. The current alpha is a focused Next.js and Supabase prototype connecting owner-created listings, student preference-based ranking, lease requests, and owner decisions.

The alpha does not yet implement a big-data pipeline or authoritative NSFAS accreditation verification, and it has no recorded empirical evaluation of recommendation quality.

## What are the approved aim and objectives?

**Aim:** Develop and implement a big data analytics system for recommending NSFAS-accredited student accommodations.

1. Identify and analyze current technological and literature trends in big data analytics for accommodation recommendation.
2. Investigate student needs and requirements and develop a framework to address them.
3. Design, develop and evaluate a big data analytics system for recommending NSFAS-accredited accommodation.

The current application only partially addresses Objective 3. Literature-review evidence for Objective 1 and actual student-needs data/findings for Objective 2 must be supplied from research records; they cannot be inferred from application features.

## Does the alpha implement accommodation recommendations?

Yes. The student recommendations page loads active rental listings and scores them using budget (30%), preferred area/campus text (25%), property type (15%), bedrooms (10%), bathrooms (5%), lifestyle text (10%), and parking (5%). Criteria apply when relevant to the student's preferences and available in listing data. Missing criterion data receives a neutral contribution and lowers the displayed data coverage. Selected minimum bedroom/bathroom and required parking conditions are hard filters. Results include criterion breakdowns and summary statistics (active listings, median listed rent, and within-budget count).

Preferences are stored in browser local storage, not in the student's Supabase profile. Area matching compares text against listing address/city/country; it does not calculate campus distance. Shared/private accommodation type and lifestyle matches are partly inferred from listing text. The displayed score is an explainable ranking estimate, not a statistically validated probability or proven measure of recommendation quality.

This is a rule-based prototype, not a big-data analytics pipeline or machine-learning recommender. It does not verify NSFAS accreditation and has no empirical evaluation of recommendation quality. Describe the implemented feature as **preference-based, rule-based accommodation ranking**; do not claim the approved big-data/NSFAS objective has been achieved by this implementation.

## Which technologies were actually used?

The implemented application uses **Next.js** and **Supabase**. Firebase/MongoDB and Django were described in the original proposal, not confirmed as technologies used in the completed alpha. Visual Studio Code was used as a development environment.

## What methodology describes the completed work?

The work is best described as the **design and development of an alpha software prototype**. The system uses Next.js, API routes, and Supabase data services. Its recommendation feature applies a deterministic, explainable multi-criteria score to the listings currently returned by Supabase, with hard filters, criterion coverage, and market summary statistics. It uses text similarity rather than geographic distance. Preference persistence is browser-local. The repository does not establish a large-scale data-processing pipeline, external provider dataset, NSFAS verification source, or student relevance dataset.

## Which user roles does the platform support?

The platform supports **students, accommodation owners, universities, administrators, and agents**, with role-specific pages, dashboards, and workflows.

## What verification has been completed?

The recommendation page passed its focused lint check, and the application production build succeeded. These checks verify linting and successful compilation/building; they do not establish that all workflows have been tested end to end, that the recommendation ranking is useful, or that the system has undergone usability or production-readiness evaluation.

## What are the main limitations?

The system is an **alpha/proof of concept**, not a production-hardened service. Automated testing is limited, and some workflows are demonstration-oriented. The recommendation scores are heuristic and have not been shown to be calibrated or evaluated against user outcomes. No big-data analytics pipeline or machine-learning recommendation algorithm has been established.
