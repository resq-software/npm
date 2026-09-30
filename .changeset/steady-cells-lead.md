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

`escapeCsvField` now neutralises formulas behind any run of leading whitespace or quotes, treats LF and the full-width `=` `+` `-` `@` (U+FF1D, U+FF0B, U+FF0D, U+FF20) as formula triggers, and treats array and object cells as text; only numbers, booleans and bigints skip the prefix. It also quotes a field that contains a comma, semicolon or TAB whatever the delimiter, or any character of a multi-character delimiter; quoting changes no values. `CSV-FORMULA-LEAD-001` matches the same leading run and triggers.
