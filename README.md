# MCU PDF Reader

A lightweight GitHub Pages reader for MCU reference manuals copied from the `IoTS-P/LibAFL-Emulator` repository (`gemu-v2` branch).

**Website:** https://shandianchengzi.github.io/mcu-pdf-reader/

The site provides chip-name search, active/archived filters, embedded PDF viewing, page navigation, direct PDF links and downloads. It does not load PDFs from the private source repository at runtime.

## Manual inventory

`source-manuals.tsv` records the 22 PDF files (17 active, 5 archived) found at source commit `987fafaa42f9937006d3e9226134f5c78dc5aeb6`, including exact sizes and Git blob hashes. Files go into `site/pdfs/`, preserving the original subdirectories. `site/manuals.json` marks each document as available only after its original bytes have been copied and verified.

**Current status:** 1 PDF has been copied and verified; the remaining 21 entries are catalogued but unavailable. The website displays the actual availability instead of broken file links.

## Copy from a local checkout

For a machine with network access and read permission to the source repository:

```bash
git clone https://github.com/shandianchengzi/mcu-pdf-reader.git
git clone --filter=blob:none --no-checkout https://github.com/IoTS-P/LibAFL-Emulator.git
git -C LibAFL-Emulator sparse-checkout set rule_generator/Manuals
git -C LibAFL-Emulator checkout 987fafaa42f9937006d3e9226134f5c78dc5aeb6

python3 mcu-pdf-reader/scripts/import_manuals.py --source LibAFL-Emulator --target mcu-pdf-reader/site
python3 mcu-pdf-reader/scripts/import_manuals.py --target mcu-pdf-reader/site --verify-only

cd mcu-pdf-reader
git add site/pdfs site/manuals.json
git commit -m "Copy MCU manuals from LibAFL Emulator"
git push origin main
```

The Python utility simply copies PDF files from the local source checkout, validates the source inventory's exact file size, Git blob SHA and PDF signature, and updates `manuals.json`. It does not contact GitHub or run on a schedule. No bulk-copy GitHub Actions workflow, secret, or source-repository access token is configured.

To run the reader locally:

```bash
python3 -m http.server --directory site 8000
```

The existing `Deploy MCU PDF Reader` GitHub Actions workflow deploys `site/` after a push to `main`.

Third-party vendor PDF documents retain their respective publisher copyrights and distribution terms.
