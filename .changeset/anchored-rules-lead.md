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

Detection rules now match after any leading whitespace. `PROMPT-ROLE-SPOOF-001`, `RFI-REMOTE-SCHEME-001`, `RFI-DATA-URI-001`, `RFI-REMOTE-HOST-PATH-001` and `SSRF-NON-HTTP-SCHEME-001` previously looked past at most eight leading whitespace characters. `PROMPT-ROLE-SPOOF-001` reads the run within a single line, and all five run in time linear in the input's length.
