# Avestro Meet – dashboard accessibility refinement

## Changes in this delivery

- `/dashboard/settings`: grouped account defaults into focused cards, clearer descriptions, larger controls, visible keyboard focus, accessible toggle labels, and compact responsive layout.
- `/dashboard/subscription`: simplified the page header and clarified the hierarchy between the active subscription, reserved plans, and payment history.
- `/dashboard/people`: simplified the page header, grouped actions, made the total count visible, and refined the responsive user list while preserving Excel import/export and CRUD behavior.
- Mobile navigation: replaced the uneven plus item with a balanced five-column bottom navigation and a centered, elevated create-room action; added focus trapping, Escape handling, scroll locking, and focus restoration to the More bottom sheet.
- Room capacity validation: stopped treating `room_allocations.users_remaining` (the account-wide remaining allocation) as the maximum capacity of one room. The per-room limit is now read from `limits.max_participants.value`, with a fallback to the active plan's `max_participants` limit. Image-stream allocation remains separate.

## Important configuration note

The archive intentionally does not include `.env`. Keep the existing local `.env` file and its API/Jitsi configuration when applying this update.

## Validation

- JSX syntax transpilation passed for all five modified files.
- A full Vite production build could not be run in this environment because npm dependency installation did not complete.

## Files changed in this refinement

- `src/components/layout/AppMainPage.jsx`
- `src/pages/settings/AccountSettingsPage.jsx`
- `src/pages/dashboard/SubscriptionPage.jsx`
- `src/pages/people/PeoplePage.jsx`
- `src/pages/event/CreateEventPage.jsx`
