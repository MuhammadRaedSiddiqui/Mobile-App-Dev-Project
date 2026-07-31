# Proposal Form for Semester Project — Updated

**Department:** Department of Computer Science, University of Karachi (UBIT)  
**Course:** CS-575 — Mobile Application Development  
**Semester:** 2026  
**Project:** Estate Ease — Verified Rental Discovery App  
**Platform:** Android / iOS (cross-platform)

---

## Project Group Information

| Role | Name | Roll number |
|---|---|---|
| Member | Uzair Ali | EB24210006126 |
| Member | Muhammad Raed Siddiquie | EB24210006069 |
| Member | Hashir Badar | EB24210006054 |

## Project Description

Estate Ease is a cross-platform mobile application for discovering **residential rental** properties in Karachi, Pakistan. It supports two roles: **Seekers**, who browse and save rentals, and **Agents**, who create, update, remove, and re-verify their own listings.

The project focuses on trust and transparency in rental discovery. Each listing exposes its verification freshness and a clear monthly-cost breakdown. Seekers can report unavailable properties; after three distinct reports, a listing is suppressed from normal discovery until its agent re-verifies it. The application also provides search, filters, map-based discovery, favorites, offline-friendly cached data, and agent listing management.

This is a rental-only MVP. For-sale and commercial inventory are intentionally out of scope for this release.

## Project Objectives

1. **Provide secure, role-aware access.** Support seeker and agent registration, login, logout, profile management, authenticated API requests, and role-based route protection.
2. **Deliver reliable rental discovery.** Allow seekers to browse listing feeds, view details, filter by category/budget/bedrooms/area/freshness/tags, search by keywords, and explore listings on a map.
3. **Improve listing trust.** Surface listing freshness, report unavailable listings safely, and show true monthly cost including rent, deposit context, maintenance, and estimated utilities.
4. **Enable controlled agent workflows.** Let agents manage only their own listings through a multi-step form with photos, location, pricing, soft deletion, and re-verification.
5. **Maintain quality and safety.** Use typed data contracts, server-side validation, ownership checks, rate limiting, cursor pagination, automated backend tests, and client-write restrictions in Firestore rules.

## Core Features

### User and profile management

- Onboarding carousel and email/password registration and login.
- Two roles: Seeker and Agent.
- Session restoration, logout, editable display name, phone number, and avatar.

### Rental listing management

- Residential rental categories: one-bed flats, portions, shared rooms, and studios.
- Listing detail pages with images, rent, bedrooms, bathrooms, area, address, description, agent profile, and sharing.
- Agent-only create, edit, draft, publish, soft-delete, and re-verify workflows.
- Up to ten validated listing images per upload request.

### Discovery, search, and organization

- Home feed with categories, cursor pagination, pull-to-refresh, and offline cache.
- Keyword search over listing titles, with area/tag suggestions in mock mode.
- Filters for category, price range, bedrooms, area, freshness, and amenity/livability tags.
- Recent searches, saved searches, and similar-listing recommendations.

### Favorites and trust signals

- Persistent favorites with optimistic save/remove behaviour.
- Listing freshness states: fresh, aging, and stale.
- Seeker-only unavailable reports, deduplicated per seeker; reported listings are suppressed after the configured threshold.
- Server-computed true monthly cost: rent, amortized deposit, maintenance, and estimated utilities.

### Map-based discovery

- Interactive Karachi map with listing markers and clustering.
- Viewport search on map movement and selectable 1 km, 2 km, and 5 km radius searches.
- Navigation from map markers to listing details.

### Agent messaging and notifications

- Inbox and message-thread API/UI structure for agent responses to seeker inquiries.
- Saved-search preferences and mock notification dispatch for matching new listings.

## Methodology and Technology Stack

| Layer | Technology / approach |
|---|---|
| Mobile application | React Native 0.86, Expo SDK 57, TypeScript |
| Navigation and state | React Navigation v6, Redux Toolkit, AsyncStorage |
| Maps | react-native-maps and react-native-map-clustering |
| Backend | Node.js, Express, Zod validation |
| Data and authentication | Firebase Auth, Firestore, Firebase Admin SDK; mock in-memory store for the current demo |
| Media | Expo Image Picker/Image Manipulator and server-side upload validation |
| Quality | ESLint, TypeScript strict mode, Jest, Supertest, GitHub Actions |
| Version control | Git and GitHub |

## Architecture

- The mobile client is organized by feature (authentication, listings, search, favorites, map, agent, and messaging).
- Agent listing mutations, favorites, reports, media uploads, and trust actions use the Express API, where validation and ownership checks are enforced.
- Firestore rules deny client writes for listings, favorites, and reports; the backend Admin SDK is the privileged write path for those resources.
- The current supported demonstration mode uses seeded in-memory data and mock tokens, so the full application can run without Firebase credentials.

## Current Scope and Delivery Status

The implemented release is a **mock-mode MVP release candidate**. It provides the complete primary seeker and agent journeys using seeded Karachi rental data.

The following are prepared but not yet part of a live production deployment:

- Live Firebase Firestore reads, Admin Storage uploads, deployed rules/indexes, and Firebase emulator validation.
- Push-notification delivery through FCM (the current implementation uses mock dispatch).
- EAS/store installable builds and formal physical-device map performance evidence.
- Commercial and for-sale property support.
- Full-text description search; current keyword matching is title-based.

## Approval Section

| Status | Approved | Not approved |
|---|---:|---:|
| Proposal revision |  |  |

