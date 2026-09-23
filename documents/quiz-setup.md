# Quiz administrator deployment

The main website hosts the administrator interface at `/admin/quiz`. The standalone student app and isolated Convex backend are maintained in `Cyber-TongClass/Cyber-TongClass-Quiz`; the student domain is `https://quiz.tongclass.ac.cn`.

## Main-site build configuration

Set `NEXT_PUBLIC_QUIZ_CONVEX_URL=https://calm-raccoon-865.convex.cloud` in the main website's Vercel project and rebuild. It is a public endpoint, not a deploy key. Preserve existing main-site authentication and backend settings. Both websites must use the same quiz URL. The existing main-site build/codegen remains tied to the main backend and does not deploy the quiz backend.

The quiz currently uses **development deployment** `dev:calm-raccoon-865`. A public frontend domain does not migrate Convex to a production deployment. A future migration requires a separate explicit operation.

## Management

- Independent student roster, account status, enrollments and one-time reset codes.
- Floating course/lesson editors and hide, delete and restore controls.
- Editing actual questions, options, keys, explanations, time limits and difficulty creates immutable bank versions.
- ToNG lectures use 15 easy, 15 medium, 20 hard single-answer questions, drawing 3/3/4 for each quiz.
- Select a course to show one row per enrolled student (including students who have not started), with ID, name and lesson completion columns. Lesson and student filters also apply to CSV exports.
- 课程练习 is last in the management navigation.

Every backend admin action validates the main administrator session against the existing main authentication service. Quiz accounts remain separate from the main user database and member directory.

Student links are `/login`, `/activate`, `/account` on `quiz.tongclass.ac.cn`. Distribute reset codes privately. This admin release adds no student pages to the main site.

The cloud already contains ToNG lectures 0–10 (550 questions), 151 roster accounts and one retained internal test account. Builds and starts never perform data migration. No credentials, roster files, answer banks or snapshots belong in Git.
