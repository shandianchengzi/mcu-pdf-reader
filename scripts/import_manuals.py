#!/usr/bin/env python3
"""One-time, byte-for-byte import of a pinned MCU PDF inventory.

The TSV catalog captures sizes and Git blob hashes of gemu-v2 manuals.
Do not fetch or modify PDFs beyond this explicit snapshot.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'source-manuals.tsv'
DESTINATION = ROOT / 'site'


def read_inventory() -> list[dict]:
    entries = []
    for raw in CATALOG.read_text(encoding='utf-8').splitlines():
        if not raw.strip() or raw.startswith('#'):
            continue
        relative, size, sha = raw.split('\t')
        p = Path(relative)
        if p.is_absolute() or '..' in p.parts or p.suffix.lower() != '.pdf':
            raise ValueError(f'Unsafe PDF path: {relative}')
        entries.append({'id': p.as_posix(), 'filename': p.name,
                        'archived': p.parts[0] == 'archived',
                        'path': f'pdfs/{p.as_posix()}', 'size': int(size),
                        'git_sha': sha, 'available': False})
    if len(entries) != 22 or len({e['id'] for e in entries}) != 22:
        raise ValueError('Unexpected inventory count or duplicate PDF path')
    return entries


def git_blob_sha(file: Path) -> str:
    digest = hashlib.sha1()
    digest.update(f'blob {file.stat().st_size}\0'.encode('utf-8'))
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def run(source: Path | None, target: Path, *, verify_only: bool = False) -> None:
    records = read_inventory()
    copied = 0
    for entry in records:
        dest = target / entry['path']
        if source is not None:
            src = source / 'rule_generator' / 'Manuals' / entry['id']
            if not src.is_file():
                raise FileNotFoundError(f'Source PDF missing: {src}')
            if not verify_only:
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(src, dest)
                copied += 1
        if dest.is_file():
            if dest.stat().st_size != entry['size']:
                raise ValueError(f'Size mismatch: {entry["id"]}')
            if git_blob_sha(dest) != entry['git_sha']:
                raise ValueError(f'Git SHA mismatch: {entry["id"]}')
            with dest.open('rb') as stream:
                if stream.read(5) != b'%PDF-':
                    raise ValueError(f'Invalid PDF header: {entry["id"]}')
            entry['available'] = True
        elif source is not None:
            raise FileNotFoundError(f'Imported PDF missing: {dest}')
    if source is not None and not all(entry['available'] for entry in records):
        raise RuntimeError('Import did not complete')
    if not verify_only:
        target.mkdir(parents=True, exist_ok=True)
        (target / 'manuals.json').write_text(
            json.dumps({'schema_version': 1, 'manuals': records}, ensure_ascii=False, indent=2) + '\n',
            encoding='utf-8')
    print(f'{len(records)} tracked manuals, {sum(r["available"] for r in records)} valid, {copied} copied, total expected bytes {sum(r["size"] for r in records)}')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, help='Checked-out LibAFL-Emulator repository (copy source)')
    parser.add_argument('--target', type=Path, default=DESTINATION, help='Site root')
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    run(args.source, args.target, verify_only=args.verify_only)


if __name__ == '__main__':
    main()
