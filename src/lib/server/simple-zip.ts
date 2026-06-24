type ZipEntryInput = {
  name: string
  data: Uint8Array | Buffer | string
}

const encoder = new TextEncoder()

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let crc = i
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
    table[i] = crc >>> 0
  }
  return table
})()

function crc32(data: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function toDosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980)
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { dosTime, dosDate }
}

function writeUInt16LE(buffer: Buffer, value: number, offset: number) {
  buffer.writeUInt16LE(value & 0xffff, offset)
}

function writeUInt32LE(buffer: Buffer, value: number, offset: number) {
  buffer.writeUInt32LE(value >>> 0, offset)
}

function normalizeEntryData(data: ZipEntryInput["data"]) {
  if (typeof data === "string") return Buffer.from(encoder.encode(data))
  return Buffer.from(data)
}

export function buildSimpleZip(entries: ZipEntryInput[]) {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0
  const { dosTime, dosDate } = toDosDateTime()

  for (const entry of entries) {
    const name = entry.name.replace(/^\/+/, "")
    const nameBytes = Buffer.from(encoder.encode(name))
    const data = normalizeEntryData(entry.data)
    const crc = crc32(data)

    const localHeader = Buffer.alloc(30)
    writeUInt32LE(localHeader, 0x04034b50, 0)
    writeUInt16LE(localHeader, 20, 4)
    writeUInt16LE(localHeader, 0x0800, 6)
    writeUInt16LE(localHeader, 0, 8)
    writeUInt16LE(localHeader, dosTime, 10)
    writeUInt16LE(localHeader, dosDate, 12)
    writeUInt32LE(localHeader, crc, 14)
    writeUInt32LE(localHeader, data.length, 18)
    writeUInt32LE(localHeader, data.length, 22)
    writeUInt16LE(localHeader, nameBytes.length, 26)
    writeUInt16LE(localHeader, 0, 28)

    localParts.push(localHeader, nameBytes, data)

    const centralHeader = Buffer.alloc(46)
    writeUInt32LE(centralHeader, 0x02014b50, 0)
    writeUInt16LE(centralHeader, 20, 4)
    writeUInt16LE(centralHeader, 20, 6)
    writeUInt16LE(centralHeader, 0x0800, 8)
    writeUInt16LE(centralHeader, 0, 10)
    writeUInt16LE(centralHeader, dosTime, 12)
    writeUInt16LE(centralHeader, dosDate, 14)
    writeUInt32LE(centralHeader, crc, 16)
    writeUInt32LE(centralHeader, data.length, 20)
    writeUInt32LE(centralHeader, data.length, 24)
    writeUInt16LE(centralHeader, nameBytes.length, 28)
    writeUInt16LE(centralHeader, 0, 30)
    writeUInt16LE(centralHeader, 0, 32)
    writeUInt16LE(centralHeader, 0, 34)
    writeUInt16LE(centralHeader, 0, 36)
    writeUInt32LE(centralHeader, 0, 38)
    writeUInt32LE(centralHeader, offset, 42)

    centralParts.push(centralHeader, nameBytes)
    offset += localHeader.length + nameBytes.length + data.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  writeUInt32LE(end, 0x06054b50, 0)
  writeUInt16LE(end, 0, 4)
  writeUInt16LE(end, 0, 6)
  writeUInt16LE(end, entries.length, 8)
  writeUInt16LE(end, entries.length, 10)
  writeUInt32LE(end, centralDirectory.length, 12)
  writeUInt32LE(end, offset, 16)
  writeUInt16LE(end, 0, 20)

  return Buffer.concat([...localParts, centralDirectory, end])
}
