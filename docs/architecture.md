# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep the React app focused on route-level views, shared API-client fetch behavior, and accessible state handling. Each capability page should render data from the backend with clear loading, empty, and error states, while the root app handles navigation and route composition.
- Logic tier decision: Keep business rules in dedicated service functions under `octofit-tracker/backend/src/services`, with lightweight Express routes only forwarding request/response data. This keeps validation and aggregation logic testable and avoids embedding business behavior inside controllers.
- Data tier decision: Use Mongoose schemas for validation and defaults, and keep seed logic idempotent with upserts that preserve existing demo fixtures and reconcile prior team membership when a seeded user moves teams. The data layer owns the source of truth for user/team/activity/workout records.
- Activity tracking approach: Validate request payloads before creating a record, ensure `userId` and `teamId` refer to existing documents, reject invalid IDs with 4xx responses, and create an `Activity` document with `user`, `team`, `type`, `minutes`, computed `points`, and `occurredAt` fields.
- Team management approach: Require a team name before creation, store member references as ObjectIds, and expose those members in the list response while leaving validation details in the model rather than route handlers.
- Leaderboard approach: Aggregate each team's total activity points, sort from highest to lowest, and assign 1-based ranks in the response so the UI can render stable rankings without re-calculating order in the client.
- Workout suggestions approach: Resolve the user by email, inspect their fitness goal and recent activity patterns, and recommend workouts whose focus matches that trend. Return a list with a clear `reason` and ensure unknown email addresses fail with a deliberate 4xx instead of a generic 500.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Use this first to verify the Mongoose schemas and seed behavior. Failures here usually indicate missing validation rules, broken seed updates, or incorrect required fields before API logic is even exercised.
- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Use this after the data layer is stable to validate the Express routes and service behavior. Failures here show broken request validation, improper 4xx handling, missing aggregates, or incorrect suggestion matching.
- Frontend command: `npm test --prefix octofit-tracker/frontend`
  - Use this to validate that the React UI renders the correct data, loading states, empty states, and accessible error alerts. Failures here typically trace back to missing fetch handling or component-level contract mismatches.
- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - Use this as a TypeScript correctness check for the API code and database model layer. Build failures usually point to incorrect imports, missing exports, or type mismatch in service implementations.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - Use this to confirm the React app compiles cleanly with the Vite setup and route/component contracts. Build failures usually indicate missing props, broken imports, or rendering code that does not match the TypeScript contract.
- Execution order: run the data-tier test first, then the API test, then the frontend test, and finish with the backend/frontend builds. This order keeps the smallest safe implementation loop: model contract -> API contract -> UI contract.
