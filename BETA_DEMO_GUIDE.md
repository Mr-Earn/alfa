# Core Accommodation Recommendation Demo Guide

## 1. Research aim and objectives

**Title:** Development of a Big Data Analytic System for Recommending NSFAS-Accredited Student Accommodation.

**Aim:** Develop and implement a big data analytics system for recommending NSFAS-accredited student accommodations.

1. Identify and analyze current technological and literature trends in big data analytics for accommodation recommendation.
2. Investigate student needs and requirements and develop a framework to address them.
3. Design, develop, and evaluate a big data analytics system for recommending NSFAS-accredited accommodation.

The current application is an alpha prototype. It implements preference-based ranking, not a big-data pipeline; it does not verify NSFAS accreditation or establish recommendation effectiveness. The presentation must identify the evidence for literature review and student-needs work separately, and must not claim Objective 3 is fully achieved without the missing implementation and evaluation evidence.

## 2. Scope and responsibilities

The evaluated journey is **owner listing → student preference ranking → student lease request → owner decision → student sees status**.

| Role | Responsibility in the core workflow |
| --- | --- |
| Student | Set preferences, compare listings, submit and track a lease request. |
| Property owner | Create/manage their listings and approve or reject requests for those listings. |
| University | Support student oversight and manage accommodation information; not the decision-maker for a property owner's lease request. |
| Administrator | Platform-level oversight; does not approve or reject student lease requests. |

The primary navigation excludes the student hub, marketplace, events, university announcements, visitor/overnight registration, and broad compliance screens. Their old URLs redirect to core accommodation pages. Direct student-owner messaging remains available to support an application. Supporting API code/data may remain for compatibility, but those modules are not part of this research demonstration.

## 3. What the recommender currently does

The student recommendations page fetches active rental listings and ranks them using an explainable, weighted multi-criteria score:

| Criterion | Maximum contribution | Current behavior |
| --- | ---: | --- |
| Monthly budget | 30% | Smooth affordability curve: highest below budget; decreases as rent rises above budget. |
| Preferred area/campus | 25% | Case-insensitive phrase/token similarity against address, city, and country; no distance calculation. |
| Accommodation type | 15% | Match against structured property type and selected listing text. |
| Bedrooms | 10% | Scores whether the listing meets the student's selected minimum. |
| Bathrooms | 5% | Scores whether the listing meets the student's selected minimum. |
| Lifestyle keywords | 10% | Partial keyword coverage in title, description, and property type. |
| Parking | 5% | Scores whether parking is available when required. |
| Minimum bedrooms/bathrooms and required parking | Hard filters | Excludes listings with an unmet or unknown selected requirement. |

The score is normalized against relevant criteria; missing criterion data contributes a neutral score and reduces the displayed coverage. Results include criterion-level explanations and a market summary (active count, median listed rent, and within-budget count). Preferences are stored in browser local storage. Focused deterministic tests are run with `node --test lib/recommendation-engine.test.mjs`. This remains a prototype ranker: there is no distributed big-data processing, training from student choices, independent quality evaluation, or NSFAS accreditation check. Accreditation must be confirmed independently.

## 4. Prepare the test environment

1. Use a staging deployment reachable by the evaluator, or state clearly that the demonstration is local-only.
2. Use fictional student and owner accounts and a small set of fictional rental listings.
3. Prepare one listing owned by the demo owner with a clear title, non-zero monthly rent, address/city containing the test area, bedroom count, property type, and description terms that exercise the chosen lifestyle/type criteria.
4. Ensure the listing is active and visible through the public rental-listings endpoint.
5. Confirm the Supabase `listings` and `lease_requests` tables are configured. Lease requests require Supabase; do not imply this step works in the local fallback when it does not.
6. Confirm the owner and student accounts can sign in; do not put passwords or service-role credentials in the submitted guide/video.
7. Record the environment, test date, listing ID, test preferences, request ID, and observed outcomes.

## 5. End-to-end test script

### A. Owner creates and manages a listing

1. Sign in as the owner and select **Post Your Ad**.
2. Enter a manual property address and choose a property type; save and continue.
3. Complete the listing details on the edit page, including title, description, monthly rent, and bedrooms; save.
4. Open **My Listings** and confirm the record is present under the signed-in owner with the expected details.

**Pass condition:** A saved listing has a stable ID, correct owner, non-zero rent, expected bedrooms/type/location text, and is available to students.

### B. Student preference ranking

1. Sign in as the student and open **Recommendations**.
2. Record preferences, for example budget `R5,000`, area `Central`, minimum bedrooms `1`, type `Apartment`, lifestyle `quiet`.
3. Record the first three results and displayed reasons.
4. Change one preference—such as the area to a string matching a different test listing—and save.
5. Record whether scores/order/reasons change as expected. Test bedroom filtering separately by setting a minimum above one listing's bedroom count.

**Pass condition:** Active listings are ranked using the documented available criteria, changed preferences affect ranking/reasons, and the bedroom filter excludes insufficient/missing bedroom listings. Scores are interpreted as heuristic estimates only.

**Research limitation to state:** The implementation neither filters on verified NSFAS accreditation nor confirms eligibility. Do not label the test listings NSFAS-accredited without independent evidence.

### C. Student requests and owner decides

1. Open a recommended listing and submit a lease request with a fictional note/move-in date.
2. Record the request ID and initial status in the student view.
3. Sign in as the owner of that listing; open **Lease Requests**.
4. Confirm the same student's request is visible; approve or reject it.
5. Return to the student account and confirm the updated status.

**Pass condition:** Only the owner of the listing makes the request decision, the decision is persisted, and the student can see the final status. Admin approval is not part of this property-level workflow.

If any step fails, capture the error and report the case as failed. Do not replace missing evidence with a screen-only walkthrough.

## 6. Suggested 10-minute presentation

| Time | Demonstration |
| --- | --- |
| 0:00–1:00 | State the research title, aim, three objectives, and what remains unproven. |
| 1:00–2:30 | Owner creates/completes a listing and verifies it in **My Listings**. |
| 2:30–5:00 | Student sets preferences, explains the score weights, changes a preference, and observes ranking/filter changes. |
| 5:00–7:30 | Student submits a lease request; owner reviews and approves/rejects; student verifies status. |
| 7:30–9:00 | Explain the student/owner/university/admin responsibilities and why owners decide requests. |
| 9:00–10:00 | Summarize observed test results and limitations: no big-data pipeline, no verified NSFAS source, no empirical quality evaluation yet. |

## 7. Research evidence still required

- **Objective 1:** Document search strategy, inclusion criteria, selected literature/technology trends, and synthesis.
- **Objective 2:** Provide the actual student needs-gathering method, participants/data, findings, and the resulting requirements/framework. Do not invent survey results.
- **Objective 3:** Identify a lawful, sufficiently sized accommodation dataset and authoritative NSFAS accreditation source; define data processing, recommendation design, baselines, evaluation measures, and a reproducible evaluation procedure. Report results and limitations.

The current UI/build demonstrates a prototype capability; it is not evidence that these research activities have been completed.
