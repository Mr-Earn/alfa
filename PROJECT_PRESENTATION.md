# Five-Minute Research Prototype Demonstration

## Research aim

**Project title:** Development of a Big Data Analytic System for Recommending NSFAS-Accredited Student Accommodation.

**Aim:** Develop and implement a big data analytics system for recommending NSFAS-accredited student accommodations.

**Objectives:**

1. Identify and analyze current technological and literature trends in big data analytics for accommodation recommendation.
2. Investigate student needs and requirements and develop a framework to address them.
3. Design, develop, and evaluate a big data analytics system for recommending NSFAS-accredited accommodation.

## Important status statement

Present the application as an **alpha prototype**, not as completion of all three objectives. It ranks the active listings returned by Supabase using budget (30%), area/campus text (25%), type (15%), bedrooms (10%), bathrooms (5%), lifestyle text (10%), and parking (5%). It also applies requested minimum bedroom/bathroom and parking requirements as hard filters, reports data coverage and criterion scores, and summarizes the available rent distribution. Missing data is treated as neutral and lowers coverage. Location uses text similarity, not geographic distance. No distributed big-data pipeline, student-choice training data, NSFAS verification source, or empirical recommendation-quality study is connected. Objective 1 literature findings and Objective 2 student-research evidence must be presented from actual research records, not inferred from the UI.

## Narrated demonstration

### 0:00–0:40 — State the problem and aim

> “This research investigates how student needs and accommodation data can support recommendations for NSFAS-accredited accommodation. The intended outcome is a data-informed recommendation system. This application is an alpha prototype, and I will distinguish what is implemented from what remains to be evaluated.”

Name the three objectives briefly. Do not claim that literature review, student research, NSFAS verification, or big-data evaluation is complete unless you can show its evidence.

### 0:40–1:20 — Explain the roles

- **Student:** enters housing preferences, compares ranked listings, and submits a lease request.
- **Property owner:** creates and manages listings, then approves or rejects requests for their properties.
- **University:** supports student oversight and manages accommodation information in the current prototype.
- **Administrator:** manages platform-level operations; administrators do **not** decide student lease requests.

### 1:20–2:10 — Owner creates a listing

Sign in with the owner demo account. Open **Post Your Ad**, enter a full manual address, select a property type, and save. On the edit page, complete the rent, bedrooms, title, description, and other available details. Return to **My Listings** and verify that the listing belongs to this owner and appears with the saved details.

Use fictional data. The listing flow does not verify NSFAS accreditation; do not describe an owner-entered listing as accredited.

### 2:10–3:20 — Student receives and interprets recommendations

Sign in with the student demo account and open **Recommendations**. Enter a monthly budget, minimum bedrooms/bathrooms, area/campus text, accommodation type, lifestyle, and whether parking is required. Save preferences and explain the actual ranking:

- Budget contributes 30%; area/campus text 25%; property type 15%; bedrooms 10%; bathrooms 5%; lifestyle keywords 10%; and parking 5%.
- A requested minimum bedroom/bathroom count or parking requirement filters out listings that fail it or lack the required data.
- Each result shows criterion scores and the percentage of requested criteria that had data; the market summary shows median listed rent and affordability counts.

Change one preference and show the ranking/reasons update. Explain that missing data receives a neutral contribution and reduces the coverage measure. The match score is an explainable ranking estimate, not a probability or validated measure of suitability. The current page does not filter for verified NSFAS accreditation.

### 3:20–4:30 — Submit and decide a request

Open the selected listing, submit a lease request with a short note and fictional move-in date, and show its request status. Sign in as the listing owner, open **Lease Requests**, and approve or reject the request. Return to the student view and verify the resulting status. Explain that the owner makes this property-level decision because the request concerns the owner's listing; administrators do not approve or reject it.

### 4:30–5:00 — Report results and limitations

State what was observed in this run: listing saved, recommendation order/reasons changed with preferences, request persisted, and owner decision reflected for the student. If any step fails, report it as a failed test rather than narrating an expected result as completed.

Conclude that the tested flow demonstrates a connected prototype journey, while the big-data implementation, authoritative NSFAS accreditation source, formal student-needs evidence, and recommendation evaluation remain research work.

## Secondary functionality

The primary app navigation now excludes the student hub, marketplace, campus events, university announcements, visitor/overnight registration, and broad compliance screens. Their old URLs redirect to the core accommodation flow. Direct student-owner messaging remains because it supports the request process. Do not spend the research demonstration on unrelated legacy APIs or modules.

## Evidence checklist

- [ ] Record the test environment, date, and fictional account roles.
- [ ] Capture listing ID/title, owner, and saved listing details.
- [ ] Record preferences and the top three listing scores/reasons before and after changing a preference.
- [ ] Record the lease-request ID/status before and after the owner's decision.
- [ ] Distinguish application build checks from functional tests and research evaluation.
- [ ] Do not claim NSFAS accreditation, big-data processing, or recommendation effectiveness without verifiable evidence.
