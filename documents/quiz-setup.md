# Quiz setup and handover

## What lives where

| Component | Git destination | Local checkout | URL while hosted locally |
| --- | --- | --- | --- |
| Student quiz platform | `public/quiz` | `/home/xiyao/Documents/Projects/Cyber-TongClass` | `http://localhost:3000/quiz` (root also redirects here) |
| Main-site quiz administration | `public/main` | `/home/xiyao/Documents/Projects/Cyber-TongClass/tmp/main-admin` | `http://localhost:3002/admin/quiz` |
| Independent quiz backend | Separate local Git repository; no remote configured | `/home/xiyao/Documents/Projects/Cyber-TongClass-quiz-backend` | Convex API `http://127.0.0.1:3210` |

The student branch and main branch are separate deployments. Do not merge the student branch into main: it intentionally changes the home page to the quiz entry point. Main retains its website home page, existing AIA account system, and member-directory policy. Main has the quiz management pages; the student branch has the quiz student pages. Shared public DTOs/client configuration are intentionally present in both branches.

The quiz backend is **not** committed to the public website repository. Back it up or add a private repository remote before moving to another machine. Do not delete the admin worktree's `tmp/main-admin` directory as temporary build output; it is an active Git worktree. Existing main-site `convex/` code and npm scripts are unchanged.

## Link the new cloud project: step by step

Provided project endpoints:

- Convex client URL: `https://calm-raccoon-865.convex.cloud`
- HTTP actions URL: `https://calm-raccoon-865.convex.site`

The frontend uses the **`.convex.cloud`** URL. The backend uses native Convex actions; no custom HTTP endpoint on `.convex.site` is required.

1. Open the Convex dashboard and select the project containing `calm-raccoon-865`. Note the team/project names and whether this deployment is **Development** or **Production**. A project URL alone is not deployment authorization or a deploy key.

2. Open a terminal in the **separate backend directory**:

   ```bash
   cd /home/xiyao/Documents/Projects/Cyber-TongClass-quiz-backend
   npm ci
   ```

3. Stop the local backend watcher before switching this checkout to cloud. If using the running session, attach with `tmux attach -t tongclass-quiz-backend` and press Ctrl-C. Preserve `.convex/`; it contains the anonymous local test database. Save the current environment selection:

   ```bash
   cp .env.local .env.local-backup
   ```

4. Link the existing project and its cloud **development** deployment:

   ```bash
   npx convex dev --configure existing --dev-deployment cloud
   ```

   Follow the browser login if prompted, choose the team and **existing project**, and let codegen/typecheck/function upload finish. Do not choose “new project.” Never run this from the website root: that checkout belongs to the main service. The backend checkout has its own package, lockfile, schema, and deployment selection.

5. Read the resulting development URL shown by the CLI. If it is `https://calm-raccoon-865.convex.cloud`, use that below. If Convex assigned another personal development deployment, use the **actual development URL** for testing. If `calm-raccoon-865` is the production deployment, this dev command does not deploy there; validate the development service first and arrange a separately authorized release. Do not blindly point the frontend at an empty production deployment.

6. In a second terminal in the backend directory, configure the read-only main-admin identity authority:

   ```bash
   npx convex env set MAIN_AUTH_CONVEX_URL https://aiagora.pku.edu.cn/convex
   ```

   Leave `npx convex dev` running while developing. It watches only this independent backend. Do not copy the main site's deployment value, deploy key, user table, or credentials into the quiz project.

7. In **both frontend checkouts**, set the following in their ignored `.env.local` files. Replace the quiz URL if step 5 selected a different development deployment:

   ```dotenv
   NEXT_PUBLIC_QUIZ_CONVEX_URL=https://calm-raccoon-865.convex.cloud
   NEXT_PUBLIC_AIA_CONVEX_URL=https://aiagora.pku.edu.cn/convex
   ```

   Keep each website checkout's existing `CONVEX_DEPLOYMENT` unchanged: its legacy build codegen still belongs to the main website. The quiz deployment selection lives only in the separate backend checkout. No deploy key belongs in a `NEXT_PUBLIC_*` variable.

8. Restart each frontend. For local development, use separate terminals:

   ```bash
   # Student frontend
   cd /home/xiyao/Documents/Projects/Cyber-TongClass
   npm ci
   npm run dev -- --port 3000
   ```

   ```bash
   # Main-site admin frontend
   cd /home/xiyao/Documents/Projects/Cyber-TongClass/tmp/main-admin
   npm ci
   npm run dev -- --port 3002
   ```

   Stop the corresponding `tongclass-quiz-web` / `tongclass-quiz-admin` tmux session before starting a second server on its port. For hosted builds, set these variables in each deployment's environment and rebuild: `NEXT_PUBLIC_*` values are embedded at build time. Preserve the existing `npm run build` and `npm run start` scripts. The frontend build does not deploy the quiz backend.

9. Visit the main-site `/admin/quiz`, log in using your **existing main-site administrator account**, and confirm access. Every quiz admin operation validates the current main session against AIA server-side. A student quiz account cannot log into or administer the main website. No shared admin password or service deploy key is needed in the frontend.

10. Create a draft course, upload a private bank, create/publish a lecture, then publish the course. Preview and import a small course roster. Open an account detail page, assign the course if necessary, generate an activation code, and privately give it to that student with the **student deployment's** `/quiz/activate` address. The admin deployment does not host the activation page.

11. As the student, activate the account, log in, complete practice, and verify `/quiz/account` shows the roster name and progress. Check the same record under the main site's `/admin/quiz/progress`. Disable the account and confirm the quiz session becomes invalid. Only after this pilot should you import the full roster.

## First-use formats and behavior

Roster UI: one `studentId,name` row per line, no header, at most 100 students per batch. Student IDs are strings (leading zeroes survive), unique after trim/uppercase. Imports update existing students and enrollments instead of duplicating them. A preview is required before the UI enables import. Imports do not send email, generate shared passwords, or create main-site members.

Question bank: UTF-8 JSON containing an array or `{ "questions": [...] }`, at most 4 MB / 1000 questions. These examples are synthetic only:

```json
[
  {"id":"q1","type":"single_choice","stem":"1 + 1 = ?","options":[{"id":"A","text":"2"},{"id":"B","text":"3"}],"answer":"A"},
  {"id":"q2","type":"multiple_choice","stem":"Select even numbers","options":[{"id":"A","text":"2"},{"id":"B","text":"4"},{"id":"C","text":"5"}],"answer":["A","B"]},
  {"id":"q3","type":"fill_blank","stem":"Enter hello","answer":["hello"]}
]
```

Imports are staged in batches of 25; a bank becomes usable only after its expected question count is verified. The file digest identifies retries; published versions are immutable. To change a bank, upload a changed file as a new version and update the lecture. Running attempts keep their original questions. Do not copy answer-bearing files from `dev/quiz` into public Git.

Practice policy `practice-v1`: unlimited attempts; uniform per-question score; exact choice/set matching; fill answers compare NFC-normalized, trimmed, case-insensitive strings. No timers or first-two-attempt grade policy is enabled. Students can review their submitted responses and score but cannot retrieve the correct keys. Scores are calculated server-side. Progress counts a published lecture once after its first completed attempt, regardless of repeats; archived lectures remain in history but leave the completion denominator.

Account activation/reset codes expire after 24 hours and work once. Reset immediately invalidates the previous password and sessions. Passwords require 12–256 characters and use salted scrypt; session tokens are stored hashed in Convex and expire after seven days. Ten login/activation attempts per student identifier are allowed per 15-minute window. Quiz sessions use their own browser key.

## Local services and repeatable checks

The local frontend builds currently use `NEXT_PUBLIC_QUIZ_CONVEX_URL=http://127.0.0.1:3210`. Therefore use a browser on this machine; a different machine would interpret `127.0.0.1` as itself. Use the cloud project or rebuild with a reachable, appropriately secured development endpoint for remote testing.

Persistent sessions:

```bash
 tmux attach -t tongclass-quiz-web
 tmux attach -t tongclass-quiz-admin
 tmux attach -t tongclass-quiz-backend
```

Detach without stopping a server: Ctrl-B, then D. Logs are `/tmp/tongclass-quiz-web.log`, `/tmp/tongclass-quiz-admin.log`, and `/tmp/tongclass-quiz-convex.log`.

Frontend checks, in each frontend checkout:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The unchanged main website build invokes its existing Convex codegen. Do not redirect it to the quiz deployment. Use the main project's established build configuration.

Backend checks, in the separate backend checkout:

```bash
npx tsc -p convex/tsconfig.json
node tests/integration.mjs
```

The integration suite refuses non-anonymous deployments, creates only synthetic local records, temporarily uses a loopback auth fixture, and restores the AIA auth URL afterward. It is a manually invoked test, never a lifecycle hook. It does not seed your cloud project. Do not run it while another person is administering the local test database.

## Validation record and remaining connection step

- Both frontend production builds and zero-warning lint gates passed.
- Both frontends have exactly the same 16 pre-existing TypeScript diagnostics as a fresh `public/main` baseline; none is in quiz code. Production build ignores type errors by existing project configuration. Main backend source and package scripts were not changed.
- Independent backend typecheck and 30 local integration assertions passed: invalid/non-admin sessions; roster/bank idempotency; one-time activation; private serialization; question-key secrecy; concurrent start/resume; stale-save rejection; cross-student access rejection; grading; repeated submit; unenrollment/disable; direct internal-function rejection; admin role revocation.
- Browser verified student login → enrolled course → all three question types → saved submission → score and name/progress/history; mobile account layout inspected. Main admin route redirects unauthenticated visitors to the existing website login.
- Live AIA introspection returned `null` for an invalid session, and the supplied cloud quiz deployment is reachable. No real admin credentials were used, so a successful real-admin pilot remains step 9 above. The cloud quiz project has **not** received these functions or roster data yet.
- Course/bank admin catalog supports up to 500 courses/banks and 2000 lectures; roster/progress/history are paginated. Admin search scans pages, and export is bounded to 10000 scanned progress records. This release supports the course-sized deployment; larger-scale catalog pagination and historical data migration are separate work.

Rollback: disable the new quiz feature or restore the previous frontend release; retain the independent backend and its attempt history. Never point quiz requests at AIA as a fallback, and never merge student identities into main-site users.
