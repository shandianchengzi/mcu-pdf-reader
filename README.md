# MCU PDF Reader

Static GitHub Pages reader for MCU reference manuals. Source: `IoTS-P/LibAFL-Emulator`, branch `gemu-v2`, under `rule_generator/Manuals/`.

- Site (after enabling Pages): https://shandianchengzi.github.io/mcu-pdf-reader/
- GitHub Actions → **Deploy MCU PDF Reader**: publishes the static website in `site/` after a push to `main`.
- GitHub Actions → **One-time copy of LibAFL Emulator PDFs**: explicitly triggered once to copy **22 PDFs** (17 active, 5 archived, ~293 MB) to `site/pdfs/`; it does **not** run on a schedule or when the source changes.

## One-time PDF copy

`LibAFL-Emulator` is a **private GitHub repository**. Although the reference manuals can be redistributed as original vendor documents where their licenses allow it, a GitHub Actions runner cannot read that private Git repository with the public destination repository's default `GITHUB_TOKEN`.

1. Create a fine-grained GitHub Personal Access Token authorized to **read `IoTS-P/LibAFL-Emulator`**, with **Contents: Read-only**. If an organization approval or SSO authorization is required, complete it there.
2. In `mcu-pdf-reader` → **Settings → Secrets and variables → Actions**, create the repository secret `MANUALS_SOURCE_TOKEN` and paste the token. Do not commit or expose the token in the site.
3. In **Actions → One-time copy of LibAFL Emulator PDFs → Run workflow** (branch `main`), run the import manually. The workflow checks out the actual source repository, copies each original PDF byte for byte, validates size, PDF header and Git blob SHA-1 against the frozen inventory in `source-manuals.tsv`, and pushes the PDFs to this repository in one commit.
4. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. The `Deploy MCU PDF Reader` workflow runs after the import push. You may also invoke it manually.
5. Remove `MANUALS_SOURCE_TOKEN` from Secrets after the successful one-time import if you no longer need it.

All 22 PDFs and their original sizes/hashes were enumerated from `gemu-v2` before this initial import. There is **no automated synchronization**. New changes to the source repository are not propagated here.

## Reading

Visit https://shandianchengzi.github.io/mcu-pdf-reader/ . The sidebar has chip search and active/archived filters. Select a manual to open the local same-origin PDF with the browser's PDF viewer. The reader provides a page number jump, a shareable URL, a standalone window, and a download link. `Ctrl+F`, outline navigation, zoom and print are provided by your browser's PDF viewer. Mobile browsers that do not embed PDFs can open the file in a new window or download it.

The site intentionally has no build dependencies, backend, external CDN, or runtime access to GitHub APIs. PDFs are stored as ordinary Git blobs (no LFS pointers).

## Local validation

```bash
python scripts/import_manuals.py --verify-only
python3 -m http.server --directory site 8000
```

The inventory in `site/manuals.json` initially marks files unavailable until copied. Importing rewrites it with verified availability. `scripts/import_manuals.py` refuses missing/mismatching PDFs and preserves source subdirectories, including `archived/`.

> Third-party semiconductor manuals retain their respective publisher copyrights and terms. This reader is an independent navigation interface, not a statement that all manuals are open source or licensed under a single license.
