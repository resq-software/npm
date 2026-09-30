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

`escapeCsvField` now neutralises formulas behind any run of leading whitespace or quotes, treats LF and the full-width `=` `+` `-` `@` (U+FF1D, U+FF0B, U+FF0D, U+FF20) as formula triggers, and treats array and object cells as text; only numbers, booleans and bigints skip the prefix. It also tests the value's NFKC form, as `CSV-FORMULA-LEAD-001` does, so a leading small `=` `+` `-` `@`, or a trigger behind a full-width quote, is prefixed too; the written value is unchanged apart from the apostrophe. `CSV-FORMULA-LEAD-001` matches the same leading run and triggers.

`escapeCsvField` also quotes a field that contains a comma, semicolon or TAB whatever the delimiter, or any character of a multi-character delimiter; quoting changes no values. For a reader that splits on a different separator than the file was written with, this protects the first column only. A quote opens a field only at the start of a field as the reader sees it, so in later columns that reader takes the quote literally, and a separator or line break inside the value can still start a cell whose leading characters were never checked. Read the file with the delimiter it was written with.
