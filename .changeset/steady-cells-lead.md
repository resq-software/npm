<!--
  Copyright 2026 ResQ Systems, Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

---
"@resq-systems/security": patch
---

`escapeCsvField` now neutralises formulas behind any run of leading whitespace or quotes. The run includes U+001C to U+001F and U+0085, which JavaScript's `\s` omits but Python's `strip()` removes. It treats LF and the full-width `=` `+` `-` `@` (U+FF1D, U+FF0B, U+FF0D, U+FF20) as formula triggers, and treats array and object cells as text; only numbers, booleans and bigints skip the prefix. It also tests the NFKC form of the value's leading run and the 16 characters after it, as `CSV-FORMULA-LEAD-001` tests the whole value's, so a leading small `=` `+` `-` `@`, or a trigger behind a full-width quote, is prefixed too; the written value is unchanged apart from the apostrophe. `CSV-FORMULA-LEAD-001` matches the same leading run and triggers.

`escapeCsvField` also neutralises a formula that starts right after a boundary inside a text value: it inserts an apostrophe right after that character. The boundaries are comma, semicolon, TAB, CR and LF, the other line separators of Python's `str.splitlines()` (VT, FF, U+001C to U+001E, U+0085, U+2028 and U+2029), U+037E, which NFC folds onto `;`, and each character of the delimiter. The check there uses the same leading run, triggers and NFKC check, except that TAB, CR and LF are leading-run characters only: a run of them before `=` `+` `-` `@` or a full-width or small form is seen through, but on their own they lead no formula after a boundary. At the start of the value they are still triggers. A reader that splits on any boundary, or that ignores quotes, then finds every field that starts inside a value neutralised, in every column, including after an earlier cell has thrown it out of step. This is an intentional value change where a formula follows a boundary: a reader that uses the file's own delimiter shows the apostrophe as part of the value, so `"a\n=b"` reads back as `"a\n'=b"`. Text with no formula after a boundary, such as `"line1\r\nline2"`, `"a\n\nb"` or `"x,\ty"`, reads back unchanged apart from RFC 4180 quoting. Numbers, booleans and bigints are unchanged. The check runs in time linear in the value's length.

`escapeCsvField` quotes a field that contains a comma, semicolon or TAB whatever the delimiter, or any character of a multi-character delimiter; quoting changes no values. A reader that splits on any other character, such as `|`, a space, or a character that only NFKC folds onto a boundary, such as the full-width comma U+FF0C, is still not protected: it gets no apostrophe there, and quoting protects it at most in the first column. Read the file with the delimiter it was written with.

The delimiter must play no other part in the file. It is written between cells, where no apostrophe can go, and `escapeCsvField` does not reject any delimiter. One containing `=`, `+`, `-`, `@` or a character whose NFKC form is one of them, such as their full-width or small forms, puts a trigger at the start of a field for a reader that splits on anything else: `toCsvRow(["", "1+1"], { delimiter: "=" })` is `=1+1`. One containing `'` lets a reader that splits on it cut the apostrophe off a neutralised cell. One containing `"`, CR or LF leaves the apostrophes working but breaks RFC 4180 framing, so quoting protects no reader.
