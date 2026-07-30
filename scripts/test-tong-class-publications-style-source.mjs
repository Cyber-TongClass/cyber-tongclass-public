import assert from "node:assert/strict"
import fs from "node:fs"

const tongPage = fs.readFileSync("src/app/tong-class/publications/page.tsx", "utf8")
const researchPage = fs.readFileSync("src/app/research/page.tsx", "utf8")
const tongArchivePath = "src/components/content/tong-class-publication-archive.tsx"

assert.match(tongPage, /TongClassPublicationArchive/)
assert.doesNotMatch(tongPage, /<PublicationArchive(?:\s|>)/)
assert.match(researchPage, /<PublicationArchive(?:\s|>)/)
assert.equal(fs.existsSync(tongArchivePath), true)

const tongArchive = fs.readFileSync(tongArchivePath, "utf8")
assert.match(tongArchive, /bg-primary/)
assert.match(tongArchive, /groupedByYear/)
assert.match(tongArchive, /publicationKind/)
assert.doesNotMatch(tongArchive, /--aia-red/)

console.log("Tong Class publication archive style contract passed")
