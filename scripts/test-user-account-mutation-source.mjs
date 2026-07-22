import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const usersSource = await readFile("convex/users.ts", "utf8")
const apiSource = await readFile("src/lib/api.ts", "utf8")

const mutationBlock = (name) => {
  const marker = `export const ${name} = mutation({`
  const start = usersSource.indexOf(marker)
  assert.notEqual(start, -1, `${name} mutation is present`)
  const next = usersSource.indexOf("export const ", start + marker.length)
  return usersSource.slice(start, next === -1 ? undefined : next)
}

test("managed account mutations authenticate the actor from a session token", () => {
  assert.match(usersSource, /import\s+\{[^}]*getUserBySession[^}]*\}\s+from\s+"\.\/reviewer\/lib"/)

  for (const name of ["create", "update", "updateRole", "resetPasswordAsSuperAdmin", "remove", "updatePasswordWithCurrent"]) {
    const source = mutationBlock(name)
    assert.match(source, /sessionToken:\s*v\.string\(\)/, `${name} requires a session token`)
    assert.match(source, /getUserBySession\(ctx,\s*(?:args\.)?sessionToken\)/, `${name} derives the actor from the session`)
  }
})

test("user account mutations do not accept a caller-selected requester identity", () => {
  for (const name of ["create", "update", "updateRole", "resetPasswordAsSuperAdmin", "remove", "updatePasswordWithCurrent"]) {
    assert.doesNotMatch(mutationBlock(name), /requesterId/, `${name} has no client requester id`)
  }
})

test("canonical client hooks attach the stored main session token", () => {
  for (const hook of [
    "useCreateUser",
    "useUpdateUser",
    "useUpdateUserRole",
    "useUpdatePasswordWithCurrent",
    "useResetPasswordAsSuperAdmin",
    "useDeleteUser",
  ]) {
    const start = apiSource.indexOf(`export function ${hook}()`)
    assert.notEqual(start, -1, `${hook} is exported`)
    const next = apiSource.indexOf("export function ", start + hook.length)
    const source = apiSource.slice(start, next === -1 ? undefined : next)
    assert.match(source, /getTongClassStoredSessionToken\(\)/, `${hook} reads the main session token`)
    assert.match(source, /sessionToken/, `${hook} sends the session token`)
  }

  const signUpStart = apiSource.indexOf("export function useSignUp()")
  const signUpEnd = apiSource.indexOf("export function ", signUpStart + 1)
  const signUpSource = apiSource.slice(signUpStart, signUpEnd === -1 ? undefined : signUpEnd)
  assert.doesNotMatch(signUpSource, /api\.users\.create/, "the disabled registration hook cannot call users.create")
})
