<!--
  Copyright 2026 ResQ

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

# example-email-pipeline

Renders a `@resq-sw/email-templates` payload to HTML + text the way a backend
pipeline (queue worker, cron job) would, and shows how to send it via Resend.

## Run

```sh
# from the repo root
bun install
bun --filter @resq-sw/email-templates build   # the example imports the built package
bun --filter example-email-pipeline start
```

You should see the rendered subject, HTML byte count, and the plain-text body
for the `incident-alert` template.

## Sending

Uncomment the `./send` block in [index.ts](index.ts) and set `RESEND_API_KEY`
(plus a verified `from` domain) to actually deliver the email:

```sh
RESEND_API_KEY=re_... bun --filter example-email-pipeline start
```
