# OOXML security fixtures

`scripts/test-ooxml-package.mjs` builds byte-level ZIP fixtures in memory. This avoids storing active-content samples while still covering duplicate entries, traversal, encryption, CRC failures, invalid offsets, oversized archives, macros, OLE packages, unsafe external relationships, DTDs, and external entities.
