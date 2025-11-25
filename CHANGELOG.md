# Changelog

## 1.0.0 (2025-11-25)


### Features

* add .gitignore for GitShift personal account configuration ([079bd9f](https://github.com/VidyaJunglee/google-calendar-mcp/commit/079bd9ffc1d7d488a11695c4c0dc8fb30dc56b50))
* add create recurring event feature ([15b7570](https://github.com/VidyaJunglee/google-calendar-mcp/commit/15b7570e3ae81c5ab813ba8361b817c4cc8264d5))
* add Google Meet tools for creating, updating, retrieving, and deleting meetings ([b4ce772](https://github.com/VidyaJunglee/google-calendar-mcp/commit/b4ce772eb56d5d71cf2de3ac3e15b183ab36c023))
* add update recurring event feature ([b9bfbcb](https://github.com/VidyaJunglee/google-calendar-mcp/commit/b9bfbcb26be72dd92cb80b2df10362a016fa04d5))
* add zod for schema validation and replace natural datetime parser ([ebdb929](https://github.com/VidyaJunglee/google-calendar-mcp/commit/ebdb92962ab62265256a18653e17eb3709c6ee37))
* **auth:** integrate auth_handler for OAuth token management ([41acd33](https://github.com/VidyaJunglee/google-calendar-mcp/commit/41acd33c4ff8c0c61824a3c9a24758dcaba44b6a))
* enhance CreateEventHandler to support Google Meet link creation and attendee management ([9c390ab](https://github.com/VidyaJunglee/google-calendar-mcp/commit/9c390ab5baef80815564e5db70796f6365b2ad0d))
* implement natural language datetime parsing and flexible schema for event times ([97dee63](https://github.com/VidyaJunglee/google-calendar-mcp/commit/97dee63679ee2b574bcf518aac2a8187fd40705d))
* integrate FastMCP for server handling and tool execution ([e566cf9](https://github.com/VidyaJunglee/google-calendar-mcp/commit/e566cf9b63048461cd1fdb76ef9b682ba3895c02))
* update start script to include transport and port configuration ([5b9c3c0](https://github.com/VidyaJunglee/google-calendar-mcp/commit/5b9c3c0c6e40be15fcb013c7aa4e928177f2b9c1))


### Bug Fixes

* Add quota project header support with centralized credential handling ([#101](https://github.com/VidyaJunglee/google-calendar-mcp/issues/101)) ([a9afcfc](https://github.com/VidyaJunglee/google-calendar-mcp/commit/a9afcfc2e402c816add0e24dbf3f361992d4daef))
* add reminders and recurrence to default event fields ([#128](https://github.com/VidyaJunglee/google-calendar-mcp/issues/128)) ([#130](https://github.com/VidyaJunglee/google-calendar-mcp/issues/130)) ([5b32b9b](https://github.com/VidyaJunglee/google-calendar-mcp/commit/5b32b9b6f30866c9382bbbea578c457a06ac6d3f))
* **auth:** improve port availability error message ([9205fd7](https://github.com/VidyaJunglee/google-calendar-mcp/commit/9205fd75445702d9e49520e4183c96a93078ea46)), closes [#110](https://github.com/VidyaJunglee/google-calendar-mcp/issues/110)
* auto-resolve calendar names and summaryOverride to IDs (closes [#104](https://github.com/VidyaJunglee/google-calendar-mcp/issues/104)) ([#105](https://github.com/VidyaJunglee/google-calendar-mcp/issues/105)) ([d10225c](https://github.com/VidyaJunglee/google-calendar-mcp/commit/d10225ca767a0641fef118cf3d56869bf66e2421))
* javascript example from examples/ dir ([#91](https://github.com/VidyaJunglee/google-calendar-mcp/issues/91)) ([79515e2](https://github.com/VidyaJunglee/google-calendar-mcp/commit/79515e27bb8055b73156017fcd54e2e149f6e29b))
* **list-events:** support native arrays for Python MCP clients ([#95](https://github.com/VidyaJunglee/google-calendar-mcp/issues/95)) ([#116](https://github.com/VidyaJunglee/google-calendar-mcp/issues/116)) ([0e91c23](https://github.com/VidyaJunglee/google-calendar-mcp/commit/0e91c23c9ae9db0c0ff863cd9019f6212544f62a))
* move esbuild to devDependencies and fix publish workflow ([3900358](https://github.com/VidyaJunglee/google-calendar-mcp/commit/39003589278dbab95c85f27af012293405f34f74)), closes [#113](https://github.com/VidyaJunglee/google-calendar-mcp/issues/113)
* resolve macOS installation error and improve publish workflow ([ec13f39](https://github.com/VidyaJunglee/google-calendar-mcp/commit/ec13f397652a864cccd003f05ddd03d4e046316f)), closes [#113](https://github.com/VidyaJunglee/google-calendar-mcp/issues/113)
* Resolve rollup optional dependency issue in CI ([#102](https://github.com/VidyaJunglee/google-calendar-mcp/issues/102)) ([0bc39bd](https://github.com/VidyaJunglee/google-calendar-mcp/commit/0bc39bd54fdb57828b033153974e1a93e2b38737))
* return currentTime in requested timezone, not UTC ([#127](https://github.com/VidyaJunglee/google-calendar-mcp/issues/127)) ([63f7aed](https://github.com/VidyaJunglee/google-calendar-mcp/commit/63f7aed9f7725c90de858e1b75fa9a59d6f3c77f))
* support converting between timed and all-day events in update-event ([#119](https://github.com/VidyaJunglee/google-calendar-mcp/issues/119)) ([407e4c8](https://github.com/VidyaJunglee/google-calendar-mcp/commit/407e4c89753932e13f9ccd55800999b4b12288be))
* Support single-quoted JSON arrays in list-events calendarId ([d2af7cf](https://github.com/VidyaJunglee/google-calendar-mcp/commit/d2af7cf99e3d090bceb388cbf10f7f9649100e3c))
* update publish workflow to use release-please ([47addc9](https://github.com/VidyaJunglee/google-calendar-mcp/commit/47addc95cc04e552017afd7523638795bf9f9090))

## [2.0.7](https://github.com/nspady/google-calendar-mcp/compare/v2.0.6...v2.0.7) (2025-11-05)


### Bug Fixes

* add reminders and recurrence to default event fields ([#128](https://github.com/nspady/google-calendar-mcp/issues/128)) ([#130](https://github.com/nspady/google-calendar-mcp/issues/130)) ([5b32b9b](https://github.com/nspady/google-calendar-mcp/commit/5b32b9b6f30866c9382bbbea578c457a06ac6d3f))
* return currentTime in requested timezone, not UTC ([#127](https://github.com/nspady/google-calendar-mcp/issues/127)) ([63f7aed](https://github.com/nspady/google-calendar-mcp/commit/63f7aed9f7725c90de858e1b75fa9a59d6f3c77f))

## [2.0.6](https://github.com/nspady/google-calendar-mcp/compare/v2.0.5...v2.0.6) (2025-10-22)


### Bug Fixes

* support converting between timed and all-day events in update-event ([#119](https://github.com/nspady/google-calendar-mcp/issues/119)) ([407e4c8](https://github.com/nspady/google-calendar-mcp/commit/407e4c89753932e13f9ccd55800999b4b12288be))

## [2.0.5](https://github.com/nspady/google-calendar-mcp/compare/v2.0.4...v2.0.5) (2025-10-19)


### Bug Fixes

* **list-events:** support native arrays for Python MCP clients ([#95](https://github.com/nspady/google-calendar-mcp/issues/95)) ([#116](https://github.com/nspady/google-calendar-mcp/issues/116)) ([0e91c23](https://github.com/nspady/google-calendar-mcp/commit/0e91c23c9ae9db0c0ff863cd9019f6212544f62a))

## [2.0.4](https://github.com/nspady/google-calendar-mcp/compare/v2.0.3...v2.0.4) (2025-10-15)


### Bug Fixes

* resolve macOS installation error and improve publish workflow ([ec13f39](https://github.com/nspady/google-calendar-mcp/commit/ec13f397652a864cccd003f05ddd03d4e046316f)), closes [#113](https://github.com/nspady/google-calendar-mcp/issues/113)

## [2.0.3](https://github.com/nspady/google-calendar-mcp/compare/v2.0.2...v2.0.3) (2025-10-15)


### Bug Fixes

* move esbuild to devDependencies and fix publish workflow ([3900358](https://github.com/nspady/google-calendar-mcp/commit/39003589278dbab95c85f27af012293405f34f74)), closes [#113](https://github.com/nspady/google-calendar-mcp/issues/113)

## [2.0.2](https://github.com/nspady/google-calendar-mcp/compare/v2.0.1...v2.0.2) (2025-10-14)


### Bug Fixes

* **auth:** improve port availability error message ([9205fd7](https://github.com/nspady/google-calendar-mcp/commit/9205fd75445702d9e49520e4183c96a93078ea46)), closes [#110](https://github.com/nspady/google-calendar-mcp/issues/110)

## [2.0.1](https://github.com/nspady/google-calendar-mcp/compare/v2.0.0...v2.0.1) (2025-10-13)


### Bug Fixes

* auto-resolve calendar names and summaryOverride to IDs (closes [#104](https://github.com/nspady/google-calendar-mcp/issues/104)) ([#105](https://github.com/nspady/google-calendar-mcp/issues/105)) ([d10225c](https://github.com/nspady/google-calendar-mcp/commit/d10225ca767a0641fef118cf3d56869bf66e2421))
* Resolve rollup optional dependency issue in CI ([#102](https://github.com/nspady/google-calendar-mcp/issues/102)) ([0bc39bd](https://github.com/nspady/google-calendar-mcp/commit/0bc39bd54fdb57828b033153974e1a93e2b38737))
* Support single-quoted JSON arrays in list-events calendarId ([d2af7cf](https://github.com/nspady/google-calendar-mcp/commit/d2af7cf99e3d090bceb388cbf10f7f9649100e3c))
* update publish workflow to use release-please ([47addc9](https://github.com/nspady/google-calendar-mcp/commit/47addc95cc04e552017afd7523638795bf9f9090))

## [2.0.2](https://github.com/nspady/google-calendar-mcp/compare/v2.0.1...v2.0.2) (2025-10-13)

### Bug Fixes

* auto-resolve calendar names and summaryOverride to IDs (closes [#104](https://github.com/nspady/google-calendar-mcp/issues/104)) ([#105](https://github.com/nspady/google-calendar-mcp/issues/105)) ([d10225c](https://github.com/nspady/google-calendar-mcp/commit/d10225ca767a0641fef118cf3d56869bf66e2421))
* update publish workflow to use release-please ([47addc9](https://github.com/nspady/google-calendar-mcp/commit/47addc95cc04e552017afd7523638795bf9f9090))

## [2.0.1](https://github.com/nspady/google-calendar-mcp/compare/v2.0.0...v2.0.1) (2025-10-11)

### Bug Fixes

* Resolve rollup optional dependency issue in CI ([#102](https://github.com/nspady/google-calendar-mcp/issues/102)) ([0bc39bd](https://github.com/nspady/google-calendar-mcp/commit/0bc39bd54fdb57828b033153974e1a93e2b38737))
* Support single-quoted JSON arrays in list-events calendarId ([d2af7cf](https://github.com/nspady/google-calendar-mcp/commit/d2af7cf99e3d090bceb388cbf10f7f9649100e3c))
