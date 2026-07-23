import crypto from "crypto"

const PROOF_SEPARATOR = "."

type PasswordResetProofPayload = {
    userId: string
    email: string
    exp: number
}

type EmailVerificationProofPayload = {
    email: string
    exp: number
}

export function normalizeEmail(email: string) {
    return email.trim().toLowerCase()
}

export function generateVerificationToken() {
    return crypto.randomBytes(32).toString("base64url")
}

export function generateVerificationCode() {
    return String(Math.floor(100000 + Math.random() * 900000))
}

export function sha256Hex(input: string) {
    return crypto.createHash("sha256").update(input).digest("hex")
}

function base64UrlEncode(input: string) {
    return Buffer.from(input).toString("base64url")
}

function base64UrlDecode(input: string) {
    return Buffer.from(input, "base64url").toString("utf8")
}

function getProofSecret() {
    const secret = process.env.EMAIL_SIGNING_KEY
    if (!secret) {
        throw new Error("EMAIL_SIGNING_KEY is not configured")
    }
    return secret
}

export function signPasswordResetProof(userId: string, email: string, expiresInMinutes = 15) {
    const payload: PasswordResetProofPayload = {
        userId,
        email: normalizeEmail(email),
        exp: Date.now() + expiresInMinutes * 60_000,
    }

    const payloadJson = JSON.stringify(payload)
    const payloadB64 = base64UrlEncode(payloadJson)

    const signature = crypto
        .createHmac("sha256", getProofSecret())
        .update(payloadB64)
        .digest("base64url")

    return `${payloadB64}${PROOF_SEPARATOR}${signature}`
}

export function signEmailVerificationProof(email: string, expiresInMinutes = 30) {
    const payload: EmailVerificationProofPayload = {
        email: normalizeEmail(email),
        exp: Date.now() + expiresInMinutes * 60_000,
    }

    const payloadJson = JSON.stringify(payload)
    const payloadB64 = base64UrlEncode(payloadJson)

    const signature = crypto
        .createHmac("sha256", getProofSecret())
        .update(payloadB64)
        .digest("base64url")

    return `${payloadB64}${PROOF_SEPARATOR}${signature}`
}

function verifySignedPayload(proof: string) {
    const [payloadB64, signature] = proof.split(PROOF_SEPARATOR)
    if (!payloadB64 || !signature) {
        return null
    }

    const expected = crypto
        .createHmac("sha256", getProofSecret())
        .update(payloadB64)
        .digest("base64url")

    // Length-checked constant-time comparison. HMAC outputs are fixed-length
    // base64url strings; if lengths differ we still run a comparison against
    // the expected value to keep the timing profile consistent.
    const expectedBuf = Buffer.from(expected, "utf8")
    const providedBuf = Buffer.from(signature, "utf8")
    if (
        expectedBuf.length !== providedBuf.length ||
        !crypto.timingSafeEqual(expectedBuf, providedBuf)
    ) {
        return null
    }

    return payloadB64
}

export function verifyPasswordResetProof(proof: string) {
    const payloadB64 = verifySignedPayload(proof)
    if (!payloadB64) {
        return null
    }

    const payload = JSON.parse(base64UrlDecode(payloadB64)) as PasswordResetProofPayload
    if (!payload.userId || !payload.email || !payload.exp) {
        return null
    }

    if (Date.now() > payload.exp) {
        return null
    }

    return payload
}

export function verifyEmailVerificationProof(proof: string) {
    const payloadB64 = verifySignedPayload(proof)
    if (!payloadB64) {
        return null
    }

    const payload = JSON.parse(base64UrlDecode(payloadB64)) as EmailVerificationProofPayload
    if (!payload.email || !payload.exp) {
        return null
    }

    if (Date.now() > payload.exp) {
        return null
    }

    return payload
}
