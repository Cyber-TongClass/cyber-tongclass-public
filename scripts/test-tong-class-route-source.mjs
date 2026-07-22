import { access, readdir, readFile } from "node:fs/promises"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const publicRouteRoots = [
  "about",
  "members",
  "news",
  "publications",
  "resources",
  "courses",
  "events",
  "intranet",
]
const crossCuttingFiles = [
  "src/app/search/page.tsx",
  "src/components/publications/publication-authors-list.tsx",
  "src/components/courses/course-directory-page.tsx",
  "src/lib/intranet-modules.ts",
  "src/app/admin/intranet/page.tsx",
]
const expectedCrossCuttingPrefixes = new Map([
  ["src/app/search/page.tsx", ["/tong-class/news/", "/tong-class/members/", "/tong-class/publications/", "/tong-class/events/", "/tong-class/courses/"]],
  ["src/components/publications/publication-authors-list.tsx", ["/tong-class/members/"]],
  ["src/components/courses/course-directory-page.tsx", ["/tong-class/courses"]],
  ["src/lib/intranet-modules.ts", ["/tong-class/intranet/"]],
  ["src/app/admin/intranet/page.tsx", ["/tong-class/intranet"]],
])
const barePublicRoute = new RegExp(
  "([\\\"'\\x60])/(about|members|news|publications|resources|courses|events|intranet)(?=/|[\\\"'\\x60?#])",
  "g"
)
const errors = []

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function collectSourceFiles(path) {
  const entries = await readdir(path, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = join(path, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(entryPath))
    } else if (entry.isFile() && /\\.(?:[cm]?[jt]sx?)$/.test(entry.name)) {
      files.push(entryPath)
    }
  }

  return files
}

function expect(condition, message) {
  if (!condition) errors.push(message)
}

for (const routeRoot of publicRouteRoots) {
  const movedRouteRoot = join(repositoryRoot, "src", "app", "tong-class", routeRoot)
  const oldRouteRoot = join(repositoryRoot, "src", "app", routeRoot)

  expect(await exists(movedRouteRoot), "Missing moved route tree: " + relative(repositoryRoot, movedRouteRoot))
  expect(!(await exists(oldRouteRoot)), "Obsolete public route tree remains: " + relative(repositoryRoot, oldRouteRoot))
}

const tongClassLayout = join(repositoryRoot, "src", "app", "tong-class", "layout.tsx")
expect(await exists(tongClassLayout), "Missing Tong Class route layout")
if (await exists(tongClassLayout)) {
  const layoutSource = await readFile(tongClassLayout, "utf8")
  expect(layoutSource.includes("title:"), "Tong Class layout metadata must define a title")
  expect(layoutSource.includes("description:"), "Tong Class layout metadata must define a description")
  expect(!layoutSource.includes("canonical:"), "Tong Class layout must not set a fixed canonical URL")
}

const canonicalCourseDetail = join(repositoryRoot, "src", "app", "tong-class", "courses", "[name]", "page.tsx")
const obsoleteCourseDetail = join(repositoryRoot, "src", "app", "tong-class", "resources", "courses", "[name]", "page.tsx")
expect(await exists(canonicalCourseDetail), "Missing canonical course detail route under /tong-class/courses/[name]")
expect(!(await exists(obsoleteCourseDetail)), "Obsolete duplicate course detail route remains under /tong-class/resources/courses/[name]")

const sourceFiles = []
for (const routeRoot of publicRouteRoots) {
  const movedRouteRoot = join(repositoryRoot, "src", "app", "tong-class", routeRoot)
  if (await exists(movedRouteRoot)) {
    sourceFiles.push(...await collectSourceFiles(movedRouteRoot))
  }
}
sourceFiles.push(...crossCuttingFiles.map((file) => join(repositoryRoot, file)))

for (const sourceFile of sourceFiles) {
  if (!(await exists(sourceFile))) {
    errors.push("Missing expected source file: " + relative(repositoryRoot, sourceFile))
    continue
  }

  const source = await readFile(sourceFile, "utf8")
  barePublicRoute.lastIndex = 0
  const bareTargets = Array.from(source.matchAll(barePublicRoute), (match) => match[0])
  expect(
    bareTargets.length === 0,
    "Bare undergraduate route target in " + relative(repositoryRoot, sourceFile) + ": " + bareTargets.join(", ")
  )
}

for (const [file, prefixes] of expectedCrossCuttingPrefixes) {
  const source = await readFile(join(repositoryRoot, file), "utf8")
  for (const prefix of prefixes) {
    expect(source.includes(prefix), file + " must target " + prefix)
  }
}

const apiIntranetRoute = join(repositoryRoot, "src", "app", "api", "intranet")
const relocatedApiIntranetRoute = join(repositoryRoot, "src", "app", "tong-class", "api", "intranet")
expect(await exists(apiIntranetRoute), "The /api/intranet route must remain outside /tong-class")
expect(!(await exists(relocatedApiIntranetRoute)), "The /api/intranet route must not be moved under /tong-class")

if (errors.length > 0) {
  console.error("Tong Class route source checks failed:")
  for (const error of errors) console.error("- " + error)
  process.exitCode = 1
} else {
  console.log("Tong Class route source checks passed.")
}
