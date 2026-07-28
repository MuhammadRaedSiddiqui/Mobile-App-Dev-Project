# Project Evaluation Document

**Course:** Mobile Application Development  
**Project Title:** Estate Ease — Verified Rental Discovery App  
**Platform:** Android / iOS (Cross-Platform)  
**Submission Date:** July 2026

---

## Team Members

| Name | Role |
|------|------|
| Muhammad Raed Siddiquie | Full-Stack Developer |
| Hashir Badar | Mobile Frontend Developer |
| Uzair Ali | Backend Developer |

---

## 1. Project Overview

Estate Ease is a cross-platform mobile application for discovering verified residential rentals in Karachi, Pakistan. The app serves two user roles — **Seekers** (tenants looking for rentals) and **Agents** (property managers listing rentals). 

The app's core value proposition is **trust and transparency** in the rental market through three differentiators:
- **Listing Freshness** — Every listing shows how recently it was verified by the agent
- **Report-as-Unavailable** — Seekers can flag rented-out listings (auto-suppressed after 3 reports)
- **True Monthly Cost** — Shows actual monthly expense (rent + amortized deposit + maintenance + utilities)

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Mobile Framework | React Native 0.86 + Expo SDK 57 |
| Language | TypeScript (strict mode) |
| State Management | Redux Toolkit + React-Redux |
| Navigation | React Navigation v6 (native-stack + bottom-tabs) |
| Maps | react-native-maps + clustering |
| Backend | Node.js + Express 4 |
| Database | Firebase Firestore |
| Storage | Firebase Cloud Storage |
| Authentication | Firebase Auth |
| Validation | Zod |
| Testing | Jest + Supertest |
| CI/CD | GitHub Actions |

---

## 3. Application Features

### 3.1 Authentication & Onboarding
- Onboarding carousel for first-time users
- Role-based registration (Seeker or Agent)
- Email/password login with session persistence
- Token-based API authentication

### 3.2 Seeker Features (6-tab interface)
- **Home** — Category chips, infinite-scroll feed with pull-to-refresh, offline cache
- **Search** — Full-text search with filters (budget, bedrooms, area, freshness, livability tags), recent & saved searches
- **Map Discovery** — Interactive map with clustered markers, viewport/radius search (1/2/5 km)
- **Favorites** — Save/unsave listings with optimistic UI updates
- **Messages** — Real-time messaging threads with agents
- **Profile** — View/edit profile, notification settings

### 3.3 Agent Features (4-tab interface)
- **Dashboard** — Verification queue and listing statistics
- **Listings** — Manage own listings (all statuses)
- **Inbox** — Respond to seeker inquiries
- **Profile** — Agent profile management

### 3.4 Shared Screens
- **Listing Detail** — Full-screen gallery, cost breakdown, freshness badge, similar listings, share, report
- **Listing Form** — 4-step creation wizard (Basics, Location, Costs, Photos)
- **Deep Linking** — `estateease://` scheme for direct navigation to any screen

---

## 4. Architecture & Design Decisions

### 4.1 Read/Write Split Architecture
The app follows a strict architectural rule: the mobile client reads directly from Firestore for speed, but **all writes go through the Express API** using the Firebase Admin SDK. This ensures data validation, business logic enforcement, and security at the server level.

### 4.2 Firestore Security Rules
Client-side write access is completely denied in security rules. Only the Admin SDK (backend) can modify data. This prevents any client-side manipulation.

### 4.3 Navigation Architecture
```
RootNavigator (session guard)
├── AuthNavigator (Login, Register, Onboarding)
└── MainNavigator
    ├── SeekerTabs (Home, Search, Map, Favorites, Messages, Profile)
    ├── AgentTabs (Dashboard, Listings, Inbox, Profile)
    └── Shared Screens (ListingDetail, ListingForm, etc.)
```

### 4.4 Offline Support
- Cached browse data with TTL (1 hour)
- Offline banner shown when network is unavailable
- Favorites persist locally via AsyncStorage
- Graceful degradation when API is unreachable

---

## 5. Codebase Metrics

| Metric | Value |
|--------|-------|
| Frontend Source Files | 76 |
| Frontend Lines of Code | ~8,800 |
| Backend Source Files | 40 |
| Backend Lines of Code | ~3,800 |
| Total Lines of Code | ~12,600 |
| Screen Components | 19 |
| API Route Modules | 8 |
| Backend Test Files | 9 |
| Screen Prototypes (HTML/PNG) | 14 |

---

## 6. Backend API Endpoints

All endpoints are versioned under `/v1`:

| Module | Purpose |
|--------|---------|
| `/auth` | Login, register, logout, profile management |
| `/listings` | Browse, detail, categories, similar, view-count |
| `/listings/:id/verify` | Agent re-verification of listing freshness |
| `/listings/:id/report` | Seeker report-as-unavailable |
| `/favorites` | Save/remove favorite listings |
| `/agent` | Agent listing CRUD + image upload |
| `/agents` | Public agent profiles |
| `/notifications` | Push tokens, preferences, saved search alerts |
| `/messages` | Send messages, list threads, mark read |

---

## 7. Testing & Quality Assurance

### 7.1 Automated Testing (Backend)
Nine test suites covering:
- API integration tests (auth, listings, favorites, trust operations)
- Cost breakdown computation
- Freshness status calculation
- Geospatial distance utilities
- Notification services
- Text tokenization for search
- Image upload handling
- Input validation (Zod schemas)
- Listing visibility rules

### 7.2 CI/CD Pipeline (GitHub Actions)
Two automated jobs run on every push/PR:
1. **Mobile:** ESLint + TypeScript type-checking
2. **Backend:** ESLint + TypeScript type-checking + Jest test suite

### 7.3 Security Measures
- Helmet (HTTP security headers)
- CORS configuration
- Express rate-limiting
- Zod input validation on all endpoints
- Firebase security rules (deny all client writes)

---

## 8. Design & UI/UX

- Clean, modern UI inspired by Airbnb's design language
- Consistent design system (defined colors, typography, spacing)
- 14 high-fidelity screen prototypes (HTML + PNG)
- Full design documentation (DESIGN.md)
- Responsive layout with safe-area handling
- Accessibility considerations (camera/photo permissions with clear descriptions)

---

## 9. Project Documentation

| Document | Purpose |
|----------|---------|
| README.md | Setup instructions & architecture overview |
| DESIGN.md | Complete design system specification |
| Technical Documentation v1.2 | Detailed technical specification |
| Implementation Plan | Phase-by-phase development breakdown |
| API Reference (docs/api.md) | Endpoint documentation |
| QA Manual Matrix | Manual testing checklist |
| Release Notes | Version changelog |
| Firebase Setup Guide | Cloud infrastructure setup |
| Known Limitations | Documented constraints |

---

## 10. Key Technical Highlights

1. **TypeScript throughout** — Both frontend and backend use strict TypeScript for type safety
2. **Feature-first architecture** — Code organized by feature domain, not by file type
3. **Cursor-based pagination** — Efficient infinite-scroll without offset issues
4. **Optimistic UI updates** — Favorites toggle instantly with rollback on error
5. **Deep linking** — Full `estateease://` URL scheme support
6. **Server-computed trust metrics** — Freshness, cost, and visibility are computed server-side (not client-manipulable)
7. **Mock mode** — Full vertical slice runs without Firebase credentials for development

---

## 11. Current Status & Limitations

- The app runs in **mock mode** with 14 sample Karachi rental listings
- Firebase live wiring is prepared but not connected (credentials placeholder)
- Push notifications are structured but not connected to a delivery service
- Image upload logic exists but targets mock storage in dev mode

---

## 12. Individual Contributions

| Member | Role | Contributions |
|--------|------|--------------|
| Muhammad Raed Siddiquie | Project Lead / Full-Stack Developer | Project architecture, state management, navigation setup, CI/CD, documentation, integration |
| Hashir Badar | Frontend Developer / UI-UX Designer | UI screens implementation, design system, screen prototypes, map integration, search & filter UI |
| Uzair Ali | Backend Developer / QA Engineer | Backend API development, Firebase configuration, security rules, testing, data modeling |

---

## 13. Conclusion

Estate Ease demonstrates a production-grade approach to mobile development with:
- Clear separation of concerns (client reads, server writes)
- Type-safe codebase with strict TypeScript
- Role-based access control with proper session management
- Automated testing and CI/CD pipeline
- Comprehensive documentation and design artifacts
- Thoughtful UX with offline support, optimistic updates, and trust transparency

The project successfully implements a complete rental discovery platform covering authentication, listing management, search/filter, map-based discovery, favorites, messaging, and agent verification workflows — all within a maintainable, well-documented codebase.

---

*Prepared for course evaluation — Mobile Application Development, July 2026*
