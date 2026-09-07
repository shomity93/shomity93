# PDF Review Notes: DOC-20260907-WA0118.pdf

## Pass 1: Overall content and visual evidence

The supplied PDF contains **6 pages**. It is not a clean exported accounting report. Instead, it mixes a typed Bengali complaint page, mobile screenshots, and plain member-contact listings. This already confirms that the current export/print flow is not isolating only the selected report content.

| Page | Observed content | Key defect |
| --- | --- | --- |
| 1 | Bengali paragraph-style complaint text | Not a structured report export; wrong content source is being printed/exported |
| 2 | Mobile screenshot of accounting page plus Android print dialog/printer error | Device UI is being captured instead of report-only output |
| 3 | Mobile login/signup screenshots with mixed English error text | Authentication screens are leaking into exported document |
| 4 | Plain member list in English field labels | Export formatting is inconsistent with Bengali reporting UI |
| 5 | Additional member list in English/plain text | Same isolation/formatting problem continues |
| 6 | Additional member list in English/plain text | Export remains non-report content |

## Pass 2: Print-layout and language defects

The PDF shows that the print/export pipeline is still allowing **non-report UI and unrelated screens** into the output. The report is not being rendered as a dedicated clean print surface on A4 pages.

| Category | Finding |
| --- | --- |
| Print isolation | The exported PDF includes mobile browser screenshots and system print UI instead of only the requested ledger/report |
| Annual/monthly report integrity | No proper annual accounting table is visible in the supplied PDF; this supports the complaint that annual export is blank or wrong |
| Language consistency | Several pages use English labels such as `Name`, `Country`, `Mobile`, and `Email`, which conflicts with the required fully Bengali interface |
| Layout quality | The document lacks a consistent report header, table structure, page numbering, or accounting context |
| Data trustworthiness | Member-contact pages appear as raw freeform text rather than structured member-sheet exports |
| Device leakage | Android browser chrome and printer error UI appear in the PDF, meaning the export path is not isolated from the live app shell or user device context |

## Preliminary diagnosis before code tracing

The supplied PDF strongly suggests at least one of the following remaining issues:

1. The wrong DOM region is being printed for some export paths.
2. A mobile/browser screenshot workflow is being used instead of the dedicated print surface.
3. The selected report state is not consistently bound to the print-only renderer.
4. Some report types may still fall back to generic page content or member-directory text.
5. The live deployed bundle may still be stale for part of the export logic.

These notes must be rechecked against the local report-rendering and print CSS implementation in the next phase.

## Pass 3: Metadata and text extraction

`pdfinfo` confirms a six-page PDF. Text extraction shows a page break after the initial Bengali complaint text and then a second empty form-feed before the member-contact pages, indicating at least one blank/empty page boundary in the document structure. The first page's Bengali text extracts with severe encoding corruption, while pages 4–6 extract as raw English contact records rather than structured Bengali member sheets. The extracted content contains no reliable monthly/annual financial report table or selected-report title.

The three-pass conclusion is therefore consistent: the supplied PDF is a capture/print artifact rather than a valid isolated report export. The repair must force a dedicated report-only print root, keep the live app and browser/device UI out of print media, render all five report choices from the selected report state, use Bengali labels, and avoid blank pages caused by hidden or nested print sections.
