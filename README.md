# Kindora: Community Connect

Kindora — Complete MVP Development Prompt

Project Overview

Build a production-ready mobile-first web application and installable PWA called Kindora: Free Help & Services, powered by Socilet.

Kindora is a community-driven platform where people can request free services, offer their skills, give away permitted products, and access free AI tools. The platform must not require payment for receiving help. Users may optionally support Kindora through voluntary donations.

The product must be designed for real users, with a clean, trustworthy, modern startup-quality interface. Do not build a generic template or a simple CRUD demo.

1. Brand Identity

Product name: Kindora

Tagline: Free Help. Real Impact.

Supporting tagline: Give Skills. Share Products. Help People.

Branding: Kindora is the primary brand.

Attribution: Powered by Socilet.

Use a modern, friendly, professional visual identity.

Use a clean logo with an abstract helping/community concept.

Avoid excessive gradients, clutter, unnecessary animations, and fake statistics.

Make the interface accessible, responsive, and suitable for both Indian and international users.

Use Kindora branding consistently across the application. Display “Powered by Socilet” in the footer, About page, and appropriate onboarding or splash branding areas without making it dominate the user experience.

2. Technology Stack

Use the most reliable Lovable-supported production stack:

React + TypeScript.

Vite or the default supported Lovable frontend setup.

Tailwind CSS.

Supabase for authentication, PostgreSQL database, storage, and server-side functionality where appropriate.

Secure server-side API integrations through Edge Functions or equivalent backend functions.

Progressive Web App support.

Responsive design for mobile, tablet, and desktop.

Use environment variables for all secrets and API keys.

Use reusable components, clean architecture, and maintainable TypeScript.

Do not expose private API keys, service-role keys, payment secrets, or privileged database credentials in frontend code.

3. Core User Roles

Implement role-based access control:

Guest user

Browse public content.

Search available help and products.

View public profiles and listings where permitted.

Sign up or log in to request help, offer help, message users, or post listings.

Registered user

Create a profile.

Request free services.

Offer skills and services.

List permitted free products.

Apply to help with requests.

Use free AI tools within fair usage limits.

Message other users through protected in-app messaging.

Report, block, and manage interactions.

View activity, notifications, and completed help history.

Moderator

Review reported content.

Moderate listings, requests, and user profiles.

Handle abuse reports.

Remove prohibited or unsafe content.

Apply warnings, suspensions, and restrictions according to policy.

Admin

Full platform management.

User and role management.

Category management.

Moderation dashboard.

AI usage and cost monitoring.

Donation reporting.

Platform analytics.

Feature flags and configuration.

Audit logs.

Never trust frontend role claims. Enforce authorization server-side using secure database policies and backend checks.

4. Main Navigation

Create a simple mobile-first navigation:

Home

Explore

Post / Create

Messages

Profile

Include a prominent “I Need Help” and “I Want to Help” action on the home screen.

5. Home Page

Build a polished landing/home experience with:

Kindora logo and brand identity.

Clear headline: “Free Help. Real Impact.”

Supporting description explaining that people can request help, share skills, and give away permitted products for free.

Primary CTA: I Need Help.

Secondary CTA: I Want to Help.

Search bar.

Browse categories.

Featured or recently posted approved requests.

Available free products.

Recommended volunteer opportunities.

Free AI Tools section.

How Kindora Works section.

Trust and Safety section.

Optional “Support Kindora” section.

Footer with legal links and “Powered by Socilet.”

Do not use fake user counts, fake reviews, fake success stories, or invented platform statistics.

6. Service Categories

Create an extensible category system with these initial categories:

Digital Services

Logo Design

Poster and Banner Design

Resume and CV

Website Starter

App Prototype

Graphic Design

Video Editing

Translation

Content Writing

Technical Guidance

Skills and Knowledge

Coding Help

Education

Career Guidance

Business Mentorship

Digital Literacy

Marketing Guidance

General Knowledge Sharing

Free Products

Books

Clothes

Furniture

Electronics

Educational Materials

Household Items

Other Permitted Items

Allow administrators to add, edit, disable, and reorder categories.

7. Help Request System

Users must be able to create a structured help request.

Request fields:

Title.

Detailed description.

Category and subcategory.

Type: Digital Service, Skill/Knowledge, or Product.

Location or remote-only preference.

Optional budget field, but clearly mark the request as free and prohibit mandatory payment.

Required completion date.

Attachments where appropriate.

Preferred communication language.

Request visibility.

Contact and privacy preferences.

Request statuses:

Draft

Pending Review

Published

Receiving Offers

In Progress

Completed

Cancelled

Rejected

Closed

Allow request owners to edit, cancel, close, and mark requests completed.

For high-effort services such as full website or app development, provide scope fields:

Required features.

Expected deliverables.

Estimated complexity.

Hosting and maintenance expectations.

Whether the request is for a prototype or production deployment.

Do not promise unlimited free development. Clearly communicate that acceptance depends on volunteer capacity, scope, and availability.

8. Volunteer / Service Provider System

Users must be able to create an offer profile:

Skills.

Categories.

Experience level.

Portfolio links or uploaded work.

Availability.

Remote or local service preference.

Languages.

Short introduction.

Completed help count based only on verified platform activity.

Users can browse suitable requests and submit an offer:

Introduction.

Relevant skills.

Proposed deliverables.

Estimated completion time.

Questions or limitations.

Confirmation that the help is offered without mandatory payment.

Request owners can review offers, accept one, decline others, and communicate with the selected helper.

Implement a structured workflow for accepting, starting, completing, and closing a help engagement.

9. Free Products Marketplace

Create a separate product giveaway experience.

Product listing fields:

Product title.

Description.

Category.

Condition.

Photos.

Location.

Pickup or delivery availability.

Approximate size or quantity where relevant.

Availability status.

Giveaway rules.

Contact preferences.

Product statuses:

Pending Review

Published

Reserved

Given Away

Expired

Removed

Features:

Search and filters.

Location-based browsing.

Product detail page.

Request or express interest.

Reserve item.

Mark as given away.

Report listing.

Seller/donor profile.

Privacy-preserving communication.

Do not facilitate prohibited goods, illegal products, dangerous items, regulated weapons, prescription drugs, or other restricted categories. Create an admin-managed prohibited items policy and enforce it in the listing workflow.

Do not build a payment or shipping escrow system in the MVP.

10. Free AI Tools

Create a dedicated “Free AI Tools” section with controlled usage.

Tool 1: Free Logo Maker

Business or project name.

Industry.

Preferred style.

Color preference.

Generate logo concepts.

Preview results.

Download permitted output.

Save generated designs to the user's account.

Tool 2: Free Resume Builder

Personal details.

Education.

Experience.

Skills.

Projects.

Templates.

AI-assisted wording.

Preview.

PDF export.

Tool 3: Free Website Starter

Business/project name.

Industry.

Description.

Sections required.

Style preference.

Generate a simple landing page.

Preview.

Export/download code where technically supported.

AI requirements:

Use a provider abstraction so AI providers can be changed later.

Keep all secret API keys server-side.

Add rate limits, per-user quotas, usage tracking, and error handling.

Do not promise unlimited AI generation.

Add abuse prevention and content safety checks.

Show clear notices that AI-generated results may require review.

Design the system so free usage can be adjusted through admin-configurable limits.

Do not claim that every AI output is original, legally cleared, or guaranteed suitable for commercial use.

11. Search and Discovery

Implement a useful search system across:

Help requests.

Service offers.

Free products.

Categories.

Public volunteer profiles.

Filters:

Category.

Type.

Location.

Remote / local.

Status.

Date posted.

Availability.

Language.

Use appropriate database indexes and efficient queries. Avoid loading all records into the frontend.

12. User Profiles

Profile features:

Display name.

Profile photo.

Bio.

Skills and interests.

Languages.

Location at an appropriate privacy level.

Portfolio links.

Offers and requests.

Completed help history.

Reviews or feedback where permitted.

Account settings.

Privacy settings.

Blocked users.

Do not publicly expose email addresses, phone numbers, precise home addresses, or other sensitive personal information by default.

13. Messaging

Implement secure in-app messaging between relevant users.

Requirements:

One-to-one conversations.

Conversation linked to a request or product listing where applicable.

Message timestamps.

Read status.

Report conversation.

Block user.

Message rate limits.

Basic spam prevention.

Safe handling of attachments.

No automatic exposure of private contact information.

Messages must be protected by authorization rules. Users should not be able to access conversations they are not participants in.

14. Trust, Safety, and Moderation

This is a launch-critical feature.

Implement:

Report user.

Report listing.

Report request.

Report message.

Block user.

Content moderation status.

Admin review queue.

Moderation actions.

User warnings.

Temporary suspension.

Permanent account restriction.

Audit logs.

Prohibited content rules.

Abuse and spam controls.

Create moderation reason categories:

Spam.

Scam or fraud.

Illegal goods.

Harassment.

Hate or abusive content.

Sexual content.

Dangerous activity.

Misleading offer.

Privacy violation.

Other.

Require appropriate user-generated content reporting and blocking functionality. Do not allow users to post unmoderated public content without a way to report violations.

15. Reviews and Trust Signals

After a completed engagement, allow participants to leave feedback.

Implement:

Star rating or structured feedback.

Optional written review.

Report review.

Admin moderation.

Review eligibility based on actual completed engagements.

Prevention of duplicate or self-reviews.

Do not display fabricated ratings, testimonials, or success metrics.

16. Notifications

Implement in-app notifications for:

New relevant offers.

Request accepted.

Request status changes.

New messages.

Listing interest.

Reservation updates.

Moderation actions.

Account security events.

Use notification preferences so users can control non-essential notifications.

17. Optional Donations / Support Kindora

Create a separate optional “Support Kindora” area.

Important rules:

Users must be able to receive free help without donating.

Donations must not unlock services, increase ranking, or guarantee acceptance.

Do not describe donations as mandatory fees.

Clearly explain how funds are intended to support platform operations.

Maintain donation records and transparent reporting.

Use a compliant payment integration only after validating the applicable Google Play billing and Indian payment/legal requirements.

Do not build user-to-user money transfers or a stored-value wallet in the MVP.

Do not claim tax-deductibility unless legally verified and applicable.

Keep donation functionality modular and feature-flagged so it can remain disabled until the payment and legal structure is ready.

18. Admin Dashboard

Build a functional admin dashboard with:

Overview

Registered users.

Active requests.

Active offers.

Published products.

Completed engagements.

Reports pending review.

AI usage.

Donation totals where applicable.

Management

Users.

Roles.

Categories.

Requests.

Offers.

Product listings.

Reports.

Reviews.

Notifications.

AI quotas.

Platform settings.

Feature flags.

Moderation

Review queue.

Content preview.

User history.

Action controls.

Reason selection.

Audit trail.

Analytics

New registrations.

Active users.

Requests created.

Requests completed.

Volunteer participation.

Category demand.

Product giveaways completed.

AI usage and estimated cost.

Use role-restricted admin routes and secure server-side authorization.

19. Database Architecture

Design a normalized PostgreSQL schema with appropriate foreign keys, indexes, timestamps, and status fields.

Suggested tables:

profiles

user_roles

categories

help_requests

service_offers

request_applications

product_listings

product_interests

conversations

conversation_participants

messages

reviews

reports

moderation_actions

notifications

ai_generations

ai_usage_limits

donations

feature_flags

audit_logs

Use UUID primary keys where appropriate. Add created_at and updated_at fields. Use soft deletion for content that must be retained for moderation or audit purposes.

Implement Row Level Security policies carefully. Test access for guest, registered user, moderator, and admin roles.

20. Security Requirements

Secure authentication.

Email verification where appropriate.

Password reset.

Protected routes.

Server-side authorization.

Row Level Security.

Input validation.

Output encoding.

Rate limiting.

Secure file upload validation.

File size limits.

MIME type validation.

Protection against unauthorized data access.

Protection against XSS, SQL injection, CSRF where applicable, and abuse of backend functions.

No secrets in frontend bundles.

No service-role keys in client code.

Audit logs for privileged actions.

Account deletion workflow.

Privacy-conscious data retention.

Do not implement fake verification badges or claim identity verification unless a real verification process exists.

21. Legal and Compliance Pages

Create accessible pages:

Privacy Policy.

Terms of Service.

Community Guidelines.

Prohibited Products and Services Policy.

User-Generated Content Rules.

Donation / Support Policy.

Account Deletion.

Contact / Support.

Use placeholders for the final legal entity details, support email, and jurisdiction until verified. Do not invent legal registrations, licenses, addresses, or compliance certifications.

The app should be designed to support Google Play requirements relating to user-generated content, privacy, account deletion, payments, and data safety. Final compliance must be verified against the actual production implementation before submission.

22. ASO Optimization

Optimize the app's metadata for Google Play without keyword stuffing or misleading claims.

Proposed app title

Kindora: Free Help & Services

Before final publication, confirm that the title is within the current Google Play character limit and that the brand name has completed trademark and domain clearance.

Suggested short description

Find free help, share skills, give products, and access free community tools.

Suggested full description

Kindora is a community-driven platform that makes it easier to give and receive help for free.

Need a logo, resume, website starter, technical guidance, or another useful service? You can post a request and connect with people who want to help.

Have a skill, product, or resource to share? Offer it to the community and make a positive impact.

With Kindora, you can:

Request free digital services and skills.

Offer your expertise and volunteer support.

Give away permitted products.

Discover free help and community resources.

Use selected free AI tools.

Connect through in-app messaging.

Report and block unsafe or inappropriate content.

Support the platform voluntarily.

Kindora is built around a simple idea: helpful people should be able to connect with people who need help, without mandatory payment.

Powered by Socilet.

ASO implementation:

Use relevant keywords naturally in the title, short description, and full description.

Use clear app icon and feature graphics.

Create original screenshots showing actual app functionality.

Use concise screenshot captions.

Localize metadata for relevant target markets.

Add accurate privacy and data safety disclosures.

Do not use fake download counts, fake ratings, misleading claims, or prohibited promotional language.

Track acquisition, conversion, retention, and successful help completions after launch.

23. Performance and UX

Mobile-first responsive layout.

Fast initial loading.

Optimized images.

Pagination or infinite scrolling with bounded queries.

Loading skeletons.

Empty states.

Error states.

Offline-friendly basic PWA shell where feasible.

Accessible form labels and keyboard navigation.

Good contrast and readable typography.

Clear success and failure feedback.

Avoid unnecessary animations.

Use lazy loading for non-critical content.

24. Launch Scope and Feature Flags

Implement feature flags for:

Donations.

AI logo generation.

AI resume generation.

AI website starter.

Messaging attachments.

Product marketplace.

New categories.

Experimental features.

The initial launch should prioritize:

Authentication and profiles.

Help requests.

Volunteer offers.

Product giveaways.

Search and discovery.

Messaging.

Moderation and reporting.

Basic AI tools with quotas.

Legal pages.

Admin dashboard.

Do not enable donation payments until the integration and legal requirements have been verified.

25. Quality Assurance

Before declaring the project complete:

Test signup, login, logout, password reset, and account deletion.

Test all user roles and permissions.

Test request creation, acceptance, completion, and cancellation.

Test product listing and reservation workflows.

Test reporting and blocking.

Test messaging authorization.

Test AI quotas and API failure handling.

Test admin moderation.

Test mobile, tablet, and desktop layouts.

Test empty states and error handling.

Test database security policies.

Test production build.

Verify that no secret keys are exposed.

Verify that legal links work.

Verify that all user-facing claims are accurate.

Verify Play Store metadata and Data Safety disclosures against the actual implementation.

26. Development Approach

Build the application in logical phases:

Phase 1: Foundation, branding, authentication, database, profiles, and navigation.

Phase 2: Help requests, volunteer offers, product listings, search, and discovery.

Phase 3: Messaging, notifications, trust, safety, reporting, and moderation.

Phase 4: AI tools, usage limits, admin analytics, and feature flags.

Phase 5: QA, security review, performance optimization, legal integration, PWA setup, and production deployment.

Do not mark a feature as completed unless it is functional, connected to the backend where required, validated, and tested.

Final Instructions

Build Kindora as a real, scalable, trustworthy community platform. Prioritize user safety, privacy, maintainability, cost control, and genuine utility over superficial visual features.

Use “Kindora” as the primary brand and “Powered by Socilet” as the technology/ownership attribution.

Start by implementing the foundation and core MVP, then proceed phase by phase. Provide a clear summary of implemented features, remaining work, configuration requirements, and any decisions that require manual verification.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dc4e75d5-5f01-4924-ba90-204ec316802a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
