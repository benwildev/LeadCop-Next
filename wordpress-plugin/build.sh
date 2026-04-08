#!/usr/bin/env bash
# Build and package the LeadCop WordPress plugin.
# Output: artifacts/tempshield/public/downloads/leadcop-email-validator.zip
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_SRC="$SCRIPT_DIR/leadcop-email-validator"
OUT_DIR="$SCRIPT_DIR/../artifacts/tempshield/public/downloads"
OUT_FILE="$OUT_DIR/leadcop-email-validator.zip"

mkdir -p "$OUT_DIR"

# Try the system zip binary; fall back to Node.js if it is unavailable or broken.
use_zip=0
if command -v zip >/dev/null 2>&1; then
    # Run a quick smoke-test so a broken binary doesn't abort the script.
    if ( cd /tmp && zip -q /tmp/__leadcop_test.zip /dev/null 2>/dev/null ); then
        use_zip=1
    fi
    rm -f /tmp/__leadcop_test.zip
fi

if [ "$use_zip" -eq 1 ]; then
    (
        cd "$SCRIPT_DIR"
        zip -qr "$OUT_FILE" leadcop-email-validator/ \
            --exclude "*.DS_Store" \
            --exclude "__MACOSX/*" \
            --exclude ".git*"
    )
    echo "Built (zip): $OUT_FILE ($(wc -c < "$OUT_FILE") bytes)"
    exit 0
fi

# Fallback: Node.js DEFLATE-compressed ZIP writer.
node - "$PLUGIN_SRC" "$OUT_FILE" << 'JSEOF'
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const [, , pluginDir, outFile] = process.argv;

function crc32(buf) {
    const t = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t.push(c >>> 0);
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = (t[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(entries) {
    const parts = [];
    const centrals = [];
    let offset = 0;
    for (const [name, raw] of entries) {
        const nb = Buffer.from(name, 'utf8');
        const comp = raw.length > 0 ? zlib.deflateRawSync(raw) : Buffer.alloc(0);
        const method = raw.length > 0 ? 8 : 0;
        const crc = crc32(raw);
        const lh = Buffer.alloc(30 + nb.length);
        lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4);
        lh.writeUInt16LE(0, 6); lh.writeUInt16LE(method, 8);
        lh.writeUInt32LE(crc, 14);
        lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22);
        lh.writeUInt16LE(nb.length, 26); nb.copy(lh, 30);
        const cd = Buffer.alloc(46 + nb.length);
        cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6);
        cd.writeUInt16LE(method, 10);
        cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(raw.length, 24);
        cd.writeUInt16LE(nb.length, 28); cd.writeUInt32LE(offset, 42);
        nb.copy(cd, 46);
        parts.push(lh, comp);
        centrals.push(cd);
        offset += lh.length + comp.length;
    }
    const cdbuf = Buffer.concat(centrals);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(centrals.length, 8); eocd.writeUInt16LE(centrals.length, 10);
    eocd.writeUInt32LE(cdbuf.length, 12); eocd.writeUInt32LE(offset, 16);
    return Buffer.concat([...parts, cdbuf, eocd]);
}

const entries = [];
function walk(dir, rel) {
    for (const name of fs.readdirSync(dir).sort()) {
        if (name === '.DS_Store' || name === '.git') continue;
        const full = path.join(dir, name);
        const r = rel ? rel + '/' + name : name;
        if (fs.statSync(full).isDirectory()) walk(full, r);
        else entries.push(['leadcop-email-validator/' + r, fs.readFileSync(full)]);
    }
}
walk(pluginDir, '');
const buf = buildZip(entries);
fs.writeFileSync(outFile, buf);
process.stdout.write('Built (node): ' + outFile + ' (' + buf.length + ' bytes)\n');
JSEOF
