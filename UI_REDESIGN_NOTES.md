# Avestro Meet dashboard redesign

## What changed
- Replaced the crowded dashboard with a compact overview: three key metrics, four route-linked shortcut cards, and a concise subscription panel.
- Added a dedicated `/dashboard/rooms` page with room listing and a prominent create-room action.
- Reworked desktop sidebar navigation: Overview, Room list, People, Subscription & payments, Tariffs, Account settings. Room creation is now an action rather than a sidebar destination.
- Replaced the mobile drawer-style navigation with a four-item bottom bar (Home, Rooms, Create room, More). More opens a mobile bottom sheet with account details, people, subscription, tariffs, settings, support entry, and logout.
- Removed the event-type selection step from room creation. The room kind is inferred from the first room kind permitted by the active plan; the wizard now starts with room information and continues through features and review.
- Put the authenticated tariff builder inside the dashboard shell at `/dashboard/pricing`; public `/pricing` remains available for unauthenticated visitors.
- Aligned People, Tariffs, Subscription, Account settings, and room creation surfaces with the existing dashboard blue/mint palette and lighter border treatment. No meeting-room experience or backend API contract was intentionally changed.

## Validation
- Source-level route and JSX review completed.
- `npm run build` could not be run in this environment because dependencies are not installed. `npm ci` timed out, and offline installation confirmed required packages are not cached.

## Main changed files
- `src/components/layout/AppMainPage.jsx`
- `src/components/layout/Sidebar.jsx`
- `src/pages/dashboard/DashboardPage.jsx`
- `src/pages/dashboard/RoomsPage.jsx` (new)
- `src/pages/event/CreateEventPage.jsx`
- `src/pages/people/PeoplePage.jsx`
- `src/pages/dashboard/SubscriptionPage.jsx`
- `src/pages/settings/AccountSettingsPage.jsx`
- `src/pages/landing/PricingPage.jsx`
- `src/components/shared/PlanCard.jsx`
- `src/components/shared/CustomPlanBuilder.jsx`
- `src/routes/Router.jsx`
- `src/routes/appRoutes.js`
