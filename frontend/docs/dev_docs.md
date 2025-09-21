Here you go—drop this into `docs/DEV_SETUP.md` (or your README) so any dev can get the mocked auth + MSW running fast.

---

# Dev Setup — Mocked Auth with MSW (Vite + React)

This project uses **Mock Service Worker (MSW)** to develop the UI against `/api/*` endpoints **before** the Django backend is ready. You can switch mocks on/off via an env flag without changing component code.

## Prereqs

* Node 18+ / npm
* Tailwind v4 already wired (done)
* Vite 7+ (done)

## 1) Install & Generate the Service Worker

From the `frontend/` directory:

```bash
npm i -D msw@latest
npx msw init public --save
```

This creates: `frontend/public/mockServiceWorker.js` (must exist for MSW to work).

## 2) Env Flags

Create/update `frontend/.env.development`:

```
VITE_USE_MOCKS=true
VITE_API_BASE_URL=http://localhost:8000/api
```

For prod/staging, set `VITE_USE_MOCKS=false` and point `VITE_API_BASE_URL` to your Django API.

## 3) App Bootstrap (already done)

* `src/main.jsx` starts MSW **only when** `VITE_USE_MOCKS=true`:

    * It imports `./mocks/browser` and calls `worker.start({ serviceWorker: { url: '/mockServiceWorker.js' } })` before rendering `<App />`.
* `src/app/App.jsx` wraps routes with `<AuthProvider>`.

## 4) Auth Mock (what’s included)

**Files added/updated in Step 2:**

```
src/app/providers/AuthProvider.jsx          # provides { user, token, isAuthed, login(), logout() }
src/app/routes/ProtectedRoute.jsx           # redirects to /auth/login if not authed
src/services/auth.js                        # localStorage helpers (auth:token, auth:user)
src/mocks/browser.js                        # MSW worker setup
src/mocks/fixtures/auth.json                # demo user fixture
src/mocks/handlers/authHandlers.js          # mocks: POST /api/auth/login, GET /api/auth/me

# updated screens
src/main.jsx                                # boots MSW in dev
src/app/App.jsx                             # routes + AuthProvider
src/components/layout/AppShell.jsx          # shows user + Sign out
src/features/auth/pages/LoginPage.jsx       # working mock login form
```

**Mocked endpoints available:**

* `POST /api/auth/login` → `{ access, refresh, user }` (accepts any email with `@`)
* `GET /api/auth/me` → `{ user }` (requires `Authorization: Bearer <token>`)

**Auth storage (localStorage keys):**

* `auth:token`, `auth:user`

## 5) Run It

```bash
npm run dev
```

* Visit `/auth/login`, use any email containing `@` + any password.
* You’ll be redirected to `/dashboard` with the App Shell visible.
* “Sign out” clears local storage and returns you to `/auth/login`.

## 6) Switching Mocks ON/OFF

* **Mocks ON (default in dev):** `VITE_USE_MOCKS=true` → MSW intercepts `/api/*`.
* **Mocks OFF (for real Django):** `VITE_USE_MOCKS=false` → requests go to `VITE_API_BASE_URL`.

    * No code changes required in components.

## 7) Adding More Mocked Endpoints

1. Put sample data in `src/mocks/fixtures/…`
2. Create a handler in `src/mocks/handlers/<feature>Handlers.js`
3. Add it to `setupWorker` in `src/mocks/browser.js`
4. Restart dev server

## 8) Troubleshooting

**Error: unsupported MIME type ‘text/html’ for mockServiceWorker.js**

* You forgot to generate the worker file.

  ```bash
  npx msw init public --save
  ```
* Visit `http://localhost:5173/mockServiceWorker.js` — you should see JS, not HTML.
* In DevTools → Application → Service Workers: **Unregister** old workers, then hard-refresh.

**Styles not applying**

* Ensure `src/styles/globals.css` includes Tailwind v4 import:

  ```css
  @import "tailwindcss";
  ```
* And `src/main.jsx` imports it exactly once:

  ```js
  import './styles/globals.css';
  ```

**Session not persisting**

* Check localStorage for `auth:token` and `auth:user`.
* If missing, login again; if stale, click **Sign out** and retry.

---

### What’s Next?

* **Step 3:** Add a shared HTTP client (`src/services/http.js`) and env helpers (`src/lib/env.js`) so all features use the same API pipe, with 401 → auto-logout.
