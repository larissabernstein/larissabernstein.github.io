---
layout: default
title: Google Sheets Snippets
---


# Google Sheets Snippets for K/S Advent & The Terror Advent

These snippets live in a shared Google Sheet and generate ready-to-post snippets for different platforms:

- **HTML** – for the daily reveal posts o Tumblr or Dreamwidth
- **Discord** – formatted announcement for the server  
- **Plain text** – e.g. for Bluesky

They are designed to work for both **K/S Advent** and **The Terror Advent**.

---

## 1. Column mapping / expected sheet structure

These formulas assume the following columns (by letter) in the main sheet:

- **B** – `Work Type`  
  - Values like: `fic`, `poem`, `filk`, `drabble`, `podfic`, `art`
- **C** – `Title`  
- **E** – `Creator`  
  - Author / artist / podficcer name
- **F** – `Link`  
  - Direct URL to the AO3 work
- **L** – `Fandom`  
- **Q** – `Rating`  
  - e.g. General, Teen, Mature, Explicit
- **S** – `Words`  
  - Numeric word count
- **T** – `Chapters`  
  - Either text (e.g. `1/1`, `2/3`) or a number
- **U** – `Summary`  
  - Work summary text from AO3
- **V** – `Prompter` / `In response to a prompt by`  
  - Cleaned name of the prompter (no “For …” prefix, no trailing dot)

If **C2** (Title) is empty, all formulas return an empty string.

---

## 2. HTML snippet (for the daily reveal)

Used for the Tumblr reveal, producing HTML with a linked title and basic metadata. Words and chapters are only mentioned for fic, drabble, poem, or filk.

```gsheet
=IF($C2="","",
  "Title: <strong><a href='" & $F2 & "' target='_blank'>" & $C2 & "</a></strong><br><br>" &
  IF(LOWER($B2)="art","Artist",
     IF(LOWER($B2)="podfic","Podficcer","Author")
  ) & ": <strong>" & $E2 & "</strong><br><br>" &
  "Fandom: " & $L2 & "<br>" &
  "Rating: " & $Q2 & "<br>" &
  IF(OR(LOWER($B2)="fic", LOWER($B2)="poem", LOWER($B2)="filk", LOWER($B2)="drabble"),
     "Words: " & $S2 & "<br>" &
     "Chapters: " &
       IF(ISTEXT($T2), $T2, TEXT($T2,"d/m")) & "<br>",
     ""
  ) &
  "<br>Summary:<br><br>" &
  SUBSTITUTE(TO_TEXT($U2), CHAR(10), "<br>") &
  IF(LEN(TRIM($V2))>0,
     "<br><br>In response to a prompt by " &
     TRIM(
       REGEXREPLACE(
         REGEXREPLACE($V2, "^For\s+", ""),
         "\.$", ""
       )
     ) & ".",
     ""
  ) &
  "<br><br>"
)

```

## 3. Discord Snippet

Includes clickable title, Markdown labels, and cleans up broken apostrophes.

```gsheet
=IF($C2="","",
  TEXTJOIN(CHAR(10)&CHAR(10), TRUE,
    IF(LOWER($B2)="art",
       "**Title:** [" & $C2 & "](" & $F2 & ")" & CHAR(10) &
       "**Artist:** " & $E2,
    IF(LOWER($B2)="podfic",
       "**Title:** [" & $C2 & "](" & $F2 & ")" & CHAR(10) &
       "**Podficcer:** " & $E2,
       "**Title:** [" & $C2 & "](" & $F2 & ")" & CHAR(10) &
       "**Author:** " & $E2
    )),
    "**Fandom:** " & $L2 & CHAR(10) &
    "**Rating:** " & $Q2 &
    IF(OR(LOWER($B2)="art", LOWER($B2)="podfic"),
       "",
       CHAR(10) &
       "**Words:** " & $S2 &
       IF($T2<>"",
          CHAR(10) & "**Chapters:** " &
            IF(ISTEXT($T2), $T2, TEXT($T2,"d/m")),
          ""
       )
    ),
    IF($U2<>"",
       "**Summary:**" & CHAR(10) & CHAR(10) &
         SUBSTITUTE(
           SUBSTITUTE(
             SUBSTITUTE($U2,"â€™","'"),
           "â€œ",""""),
         "â€",""""),
       ""
    ),
    IF(LEN(TRIM($V2))>0,
       "In response to a prompt by " &
       TRIM(
         REGEXREPLACE(
           REGEXREPLACE($V2, "^For\s+", ""),
           "\.$", ""
         )
       ) & ".",
       ""
    )
  )
)

```

## 4. Plain Text Snippet

For platforms without HTML or Markdown. Includes visible URL.

```gsheet
=IF($C2="","",
  "Title: " & $C2 & CHAR(10) & CHAR(10) &
  "Link: " & $F2 & CHAR(10) & CHAR(10) &
  IF(LOWER($B2)="art","Artist",
     IF(LOWER($B2)="podfic","Podficcer","Author")
  ) & ": " & $E2 & CHAR(10) & CHAR(10) &
  "Fandom: " & $L2 & CHAR(10) &
  "Rating: " & $Q2 &
  IF(OR(LOWER($B2)="fic", LOWER($B2)="poem", LOWER($B2)="filk", LOWER($B2)="drabble"),
     CHAR(10) & "Words: " & $S2 &
     IF($T2<>"",
        CHAR(10) & "Chapters: " &
          IF(ISTEXT($T2), $T2, TEXT($T2,"d/m")),
        ""
     ),
     ""
  ) &
  CHAR(10) & CHAR(10) &
  "Summary:" & CHAR(10) & CHAR(10) &
  SUBSTITUTE(
    SUBSTITUTE(
      SUBSTITUTE(TO_TEXT($U2),"â€™","'"),
    "â€œ",""""),
  "â€","""") &
  IF(LEN(TRIM($V2))>0,
     CHAR(10) & CHAR(10) &
     "In response to a prompt by " &
     TRIM(
       REGEXREPLACE(
         REGEXREPLACE($V2, "^For\s+", ""),
         "\.$", ""
       )
     ) & ".",
     ""
  )
)
```

## 5. Reuse across K/S Advent & The Terror Advent

These formulas are intentionally collection-agnostic:
They only depend on the sheet’s column structure (B, C, E, F, L, Q, S, T, U, V).
As long as both K/S Advent and The Terror Advent sheets keep this layout and value conventions (work type strings in column B), you can reuse them directly by copying the formulas into the appropriate columns/rows.
If the column layout ever changes, update the column letters here and in the live sheet together so everything stays in sync.

## 6. License

Free to reuse for fandom events.
Maintained for K/S Advent and The Terror Advent.
