# Design Decisions

## Assumptions

- Staff accounts are created internally, so seeded accounts are used instead of building a registration flow.
- A single `customerContact` field accepts either an email address or a phone number, matching how inquiries usually come in from chat or phone calls.
- Each inquiry is owned by the staff member who logged it.

## Key Design Choices

### 1. Role-based ownership enforced in the API
- **Rule:** `STAFF` users can only list, view, and update inquiries they created. `ADMIN` users can view and manage all inquiries.
- **Why:** Enforcing this in the Express controllers (before revealing any inquiry details) guarantees that opening a direct link to someone else's inquiry returns `403 Forbidden`, even if the UI is bypassed.

### 2. Forward-only inquiry lifecycle
- **Rule:** Inquiries move strictly `NEW -> IN_PROGRESS -> RESOLVED`. Skipping straight to `RESOLVED` or reopening a resolved inquiry returns `400 Bad Request`.
- **Why:** Prevents staff from accidentally closing new tickets without working on them and keeps resolution history predictable. If a customer follows up later, staff can log a new inquiry.

### 3. Optimistic concurrency for stale data (two-tab scenario)
- **Rule:** Every inquiry has a `version` integer. When updating status, the frontend sends the `version` it loaded, and the backend includes `version` in the database `WHERE` clause (`prisma.inquiry.updateMany`) while incrementing it atomically.
- **Why:** If two tabs open the same inquiry and one updates it first, the second tab gets a `409 Conflict` (`STALE_DATA`). The UI disables the action button and shows a Refresh prompt instead of silently overwriting the newer status.

### 4. Independent validation and simple duplicate check
- **Rule:** The frontend validates fields inline for quick feedback, and the backend independently validates everything with Zod. Creating a new inquiry is rejected with `409 Conflict` if an open (`NEW` or `IN_PROGRESS`) inquiry with the same contact and subject already exists.

## Trade-Off Accepted

- **JWT in `localStorage` instead of `HttpOnly` cookies:** Keeping the token in `localStorage` made local cross-origin development (`localhost:3000` to `localhost:5000`) simple without extra cookie/CSRF configuration. The trade-off is higher exposure to XSS if untrusted scripts ever ran on the page.

## Testing Gaps

- The current suite covers 16 backend integration tests (auth, `401`/`403`/`404`/`400`/`409`, full lifecycle, and concurrent status updates) and 5 frontend component tests (form validation, contact format, Escape key, duplicate error, and network failure).
- Full browser end-to-end tests (e.g., Playwright) for the multi-tab flow are not included.
- Duplicate detection on create uses a read-before-write check, so two identical create requests fired at the exact same millisecond could both pass (unlike status updates, which are guarded atomically).

## What I Would Improve Next

1. Move JWT storage to `HttpOnly`, `Secure`, `SameSite=Lax` cookies.
2. Add a partial unique index in PostgreSQL on `(lower(customerContact), lower(subject))` for active inquiries to close the duplicate-create race condition.
3. Add pagination to `GET /api/inquiries` and an activity log table to track who changed each status and when.