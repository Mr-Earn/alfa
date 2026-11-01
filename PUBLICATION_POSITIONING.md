# Publication Positioning and Methodology Brief

## Purpose

The approved research title is **Development of a Big Data Analytic System for Recommending NSFAS-Accredited Student Accommodation**. This brief aligns claims with the current alpha implementation; it is not evidence that every research objective has been completed.

## What the project demonstrates

The current alpha is a focused student accommodation prototype built with Next.js and Supabase. It connects accommodation-owner listings, student preference-based ranking, lease requests, and owner decisions.

The research aim is to develop and implement a big data analytics system for recommending NSFAS-accredited student accommodation. The objectives are: analyze literature and technology trends; investigate student needs and develop a framework; and design, develop, and evaluate the recommendation system.

The current implementation only partially addresses the third objective. It contains a deterministic preference-scoring heuristic, not a demonstrated big-data pipeline. It neither verifies NSFAS accreditation nor provides an empirical evaluation of recommendation quality. Literature-review evidence for Objective 1 and student-needs evidence/framework for Objective 2 must come from the research records, not the application.

## Direct answers and title decision

### Does the completed alpha recommend or rank accommodation?

**Yes. The current alpha ranks listings using an explainable multi-criteria scoring function.** Its weights are budget (30%), area/campus text (25%), type (15%), bedrooms (10%), bathrooms (5%), lifestyle keywords (10%), and parking (5%). Selected minimum bedroom/bathroom and required parking preferences are hard filters. Missing feature data contributes a neutral score and lowers displayed criteria coverage. The page also calculates simple market summaries (active count, median listed rent, and within-budget count).

This is a deterministic prototype ranker, not an empirically validated probability or measure of recommendation quality. Preferences are stored in browser local storage. Location compares entered text against listing address/city/country; it does not calculate campus distance. Some type and lifestyle matches use listing text. There is no distributed processing engine, large external dataset, student-interaction training set, or official NSFAS provider verification source connected.

The paper can accurately call this an **explainable, preference-based multi-criteria ranking prototype**. Do not describe it as a big-data analytics pipeline, machine-learning model, or quality-validated recommender.

### Which publication title should be used?

The approved research title is:

> **Development of a Big Data Analytic System for Recommending NSFAS-Accredited Student Accommodation**

Keep the title as the research goal, but clearly label the current software as an alpha prototype and report the gap between the intended system and implemented capabilities. Do not imply the title proves an operational big-data or NSFAS verification feature.

## Proposal versus implemented system

Keep the distinction explicit throughout the paper:

- **Research aim/title:** the intended outcome and objectives supplied by the researcher.
- **Current alpha:** the implemented prototype capabilities and the research/technical work that remains.

The proposal's references to Firebase or MongoDB and Django should not be reported as implementation details unless those technologies are present in the completed system. The implementation described for this alpha uses **Next.js** for the web application and **Supabase** for data services. Visual Studio Code may be mentioned as a development environment if relevant, but it is not part of the system architecture.

## Methodology framing

A suitable methodological framing is **design and development of an alpha software prototype**. Describe the actual process followed; do not retrospectively claim a named methodology (such as Scrum, Agile, or Design Science Research) unless project records support it.

The Methodology can document:

1. **Problem and user roles:** the student accommodation workflows and the needs of students, owners, universities, administrators, and agents that informed the prototype.
2. **Requirements and scope:** the functions included in the alpha and those intentionally deferred.
3. **Architecture:** a Next.js application layer, route-based user experiences, API routes for data operations, and Supabase-backed persistence.
4. **Role-aware workflows:** the pages, dashboards, and permission checks provided for each role.
5. **Implemented functions:** accommodation discovery and listing management, bookings, messaging, and student-housing workflows such as maintenance, inspections, and waiting lists.
6. **Fallback and demonstration support:** local fallback persistence and demo-user provisioning, where used, distinguishing these from production services.
7. **Verification:** the checks actually performed—such as manual workflow checks, API checks, or automated tests—and the environment and test data used.

### Draft methodology paragraph

> This project used a design-and-development approach to produce an alpha web prototype for student accommodation management. The prototype was implemented with Next.js and Supabase and organized around role-specific workflows for students, accommodation owners, universities, administrators, and agents. Its functions include accommodation discovery and listing management, bookings, messaging, student-housing administration workflows, and a rule-based accommodation recommendation feature. That feature scores active rental listings against student preferences for budget, accommodation type or campus-related terms, bedroom count, and lifestyle terms, then ranks listings by score and price. Some criteria use keyword matching against listing text, and preferences are stored in browser local storage. The available verification evidence includes successful linting and a successful production build. These checks confirm that the code passes the configured lint command and can be compiled and built; they do not establish recommendation quality or that every user workflow has been functionally or usability tested. The resulting system is an alpha proof of concept, not a production deployment or a big-data or machine-learning recommendation system.

Only claim additional manual, API, usability, or automated testing if its procedure and results can be documented. The available evidence does not justify claiming that all workflows were tested end to end.

## Results and contribution

Present results as implemented capabilities and observed verification outcomes. For example, the paper may report that the prototype provides distinct role-based user journeys, and then identify which workflows were exercised successfully. Do not infer usability, effectiveness, scalability, accuracy, fairness, or real-world impact from feature presence alone. Those claims require corresponding evaluation data.

The paper can report the implemented rule-based ranking as an alpha prototype capability. It cannot be described as a completed big-data recommender or validated NSFAS accommodation recommender unless the required data pipeline, authoritative accreditation source, and evaluation are implemented and evidenced.

## Limitations to report

The current project description supports the following limitations:

- The delivered system is an alpha or proof of concept, not a fully production-hardened service.
- Automated testing is limited; state the actual coverage rather than implying comprehensive validation.
- No big-data ingestion, storage, or processing pipeline has been established.
- NSFAS accreditation is not verified by an authoritative data source.
- The implemented recommendation score is a heuristic; its quality has not been empirically evaluated.
- Literature synthesis and student-needs findings are not evidenced by the application repository.

Avoid unsupported claims about production security, regulatory compliance, system scalability, or NSFAS accreditation integration. Explain these as limitations or future work if they remain unimplemented.

## Evidence and claims for the paper

- **Recommendation status:** the code implements preference-based ranking using a deterministic heuristic. Describe it as a rule-based prototype recommender, not a validated or big-data recommender.
- **NSFAS scope:** distinguish the approved title/aim from the current alpha, which does not verify accreditation.
- **Technology:** report Next.js and Supabase as the implemented technologies. Firebase/MongoDB and Django belong to the proposal only, unless they are independently verified in the final system.
- **Validation:** the available checks are linting and a successful production build. Report them accurately as code/build checks, not as proof of end-to-end correctness, user acceptance, or production readiness.
- **Consistency:** keep the title, abstract, research questions, methodology, results, and conclusion aligned with the actual alpha and its available evidence.

## Repository context

The repository's [project presentation](./PROJECT_PRESENTATION.md), [traceability record](./PROJECT_TRACEABILITY.md), and [README](./README.md) describe the alpha as a Next.js and Supabase student-housing platform with multiple role-specific workflows. These documents are useful starting evidence, but implementation and test claims in a publication should still be checked against the code and actual validation records.
