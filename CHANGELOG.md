## [1.5.1](https://github.com/jimburch/coati/compare/v1.5.0...v1.5.1) (2026-04-16)


### Bug Fixes

* **ci:** repair cli release flow with PR-based version bumps and sync 0.4.0 ([93c53fb](https://github.com/jimburch/coati/commit/93c53fb93c9fcd38a0333bbf1787bdb6acb5fbee))

# [1.5.0](https://github.com/jimburch/coati/compare/v1.4.1...v1.5.0) (2026-04-15)


### Bug Fixes

* **db:** resolve bad timestamps in migration ([cae0e7e](https://github.com/jimburch/coati/commit/cae0e7e07efead0e12a730da48bc1724846418f7))
* **ui:** file viewer content wraps instead of overflows ([20d5e44](https://github.com/jimburch/coati/commit/20d5e4423bc9351f5e3ec88e178f846d82ff7fb3))
* **ui:** prevent guide popup from flashing on refresh ([c5dc892](https://github.com/jimburch/coati/commit/c5dc8929b929f5a1fb2b00a05b806540745f1fbb))
* **ui:** readme editor preview shows content ([d59e21e](https://github.com/jimburch/coati/commit/d59e21efb89a51cf37059524de4de45d888159c9))


### Features

* **ui:** users can edit setup about details with dedicated display name ([#282](https://github.com/jimburch/coati/issues/282)) ([b2c5b1f](https://github.com/jimburch/coati/commit/b2c5b1f85efa3a3e6d2978d40fe2b769946e36be))

## [1.4.1](https://github.com/jimburch/coati/compare/v1.4.0...v1.4.1) (2026-04-15)


### Bug Fixes

* **docs:** correct example of coati json ([4e92bb2](https://github.com/jimburch/coati/commit/4e92bb2683a6afaa2f730fd4b98f319cf0d5003a))
* **ui:** prevent nav bar from popping out of view when menu opens ([c4a8132](https://github.com/jimburch/coati/commit/c4a8132eb07eee8492d082171babbe66f5c59f1b))

# [1.4.0](https://github.com/jimburch/coati/compare/v1.3.0...v1.4.0) (2026-04-14)


### Features

* **ui:** adds light mode with toggle ([f5f79c3](https://github.com/jimburch/coati/commit/f5f79c36399badeebf6c3eb80a98fdef10ff6fda))

# [1.3.0](https://github.com/jimburch/coati/compare/v1.2.2...v1.3.0) (2026-04-14)


### Features

* **ui:** add GuideNudge popover for first-time users ([#266](https://github.com/jimburch/coati/issues/266)) ([#268](https://github.com/jimburch/coati/issues/268)) ([c64c930](https://github.com/jimburch/coati/commit/c64c930599ae0e46ca5d42d58ef9e49698b08eb7))

## [1.2.2](https://github.com/jimburch/coati/compare/v1.2.1...v1.2.2) (2026-04-14)


### Bug Fixes

* **ci:** fix order with npm merge and semantic updates ([71e8c8d](https://github.com/jimburch/coati/commit/71e8c8d0132da157f41514416a784b6076c79022))

## [1.2.1](https://github.com/jimburch/coati/compare/v1.2.0...v1.2.1) (2026-04-14)


### Bug Fixes

* **cli:** fix cli versioning ([1864552](https://github.com/jimburch/coati/commit/18645522d419f11ee6e25808f6812e8e74242fc0))

# [1.2.0](https://github.com/jimburch/coati/compare/v1.1.0...v1.2.0) (2026-04-14)


### Bug Fixes

* **beta:** new users awaiting approval can access public routes ([c533767](https://github.com/jimburch/coati/commit/c533767396669bcd159358b85606ebc7eb35603f))
* **build:** adds changelog at build time ([8143a18](https://github.com/jimburch/coati/commit/8143a189be0a1ab073a9f27ab17c158dc4e671bb))
* **build:** version falls back to 0 on dev if it cant access the right number ([6ecd16b](https://github.com/jimburch/coati/commit/6ecd16bc9e60551539a4faa487351852083fffe1))
* **cli:** pulls latest version with correct version refs ([f521bca](https://github.com/jimburch/coati/commit/f521bca67dd3915bf59345c6c0f0b6e372ccc5f6))
* **ui:** setup delete leads back to profile page ([0e7a3d2](https://github.com/jimburch/coati/commit/0e7a3d259111c74cf61c66cd30999984cecd801a))
* **urls:** profile url now leads to external site ([c0a6519](https://github.com/jimburch/coati/commit/c0a651975b95605187f2d9565dd6b52d28ab85a4))


### Features

* **ui:** add delete setup confirmation UI with owner dropdown ([#255](https://github.com/jimburch/coati/issues/255)) ([#256](https://github.com/jimburch/coati/issues/256)) ([7de213c](https://github.com/jimburch/coati/commit/7de213cb403cb80de09a30a076d1df1cfbabd1d1))
* **version:** add changelog version and link to footer ([49e52aa](https://github.com/jimburch/coati/commit/49e52aa9ec1bae881152260b79657f0c74628b6f))

# [1.1.0](https://github.com/jimburch/coati/compare/v1.0.3...v1.1.0) (2026-04-09)


### Bug Fixes

* apply prettier formatting to TEST-ENV-SETUP.md ([8989343](https://github.com/jimburch/coati/commit/89893431f637e29d4cb78457d885b1b9935a1389))
* **ci:** add coolify auth script to prevent dupe deploys ([0816af3](https://github.com/jimburch/coati/commit/0816af384afac0f01494a92211e5fdae01488e26))
* **ci:** add npm token to cli deploy action ([8cd6b62](https://github.com/jimburch/coati/commit/8cd6b62363526707557f6ee839fd7827834e56e8))
* **ci:** fix back merge script ([02ca236](https://github.com/jimburch/coati/commit/02ca23646df36055cead2bc346f24f6eb633df06))
* **ci:** remove broken coolify deploy script ([73ac34a](https://github.com/jimburch/coati/commit/73ac34ad49c7afd4b1bbddbf5d38c5e4676f7906))
* **ci:** use env vars for task JSON and track completed issues locall… ([#223](https://github.com/jimburch/coati/issues/223)) ([956ae7f](https://github.com/jimburch/coati/commit/956ae7f5c5a3711931aefaee2e179f6898ff2f09))
* **ci:** use PAT for semantic-release to bypass branch ruleset ([#210](https://github.com/jimburch/coati/issues/210)) ([404bd4e](https://github.com/jimburch/coati/commit/404bd4eaa1cb7093c29ce327385ccf44c3b8aed6))
* **ci:** use port env when building prod app ([4ac5a27](https://github.com/jimburch/coati/commit/4ac5a278789bcf34fa570d78b4abb6054f45f8bd))
* **cli:** handle login publish flow ([1561706](https://github.com/jimburch/coati/commit/1561706cc7802a67f772c2a8121a02e259ac5953))
* **cli:** replace recursive walkDir with targeted iterative scanner ([#246](https://github.com/jimburch/coati/issues/246)) ([5c684fc](https://github.com/jimburch/coati/commit/5c684fc4492c1a059825820d0dcf046a9dceb7f0))
* **cli:** update dependencies and setup to fix prod downloads ([7ad9298](https://github.com/jimburch/coati/commit/7ad9298c1b2e8a0cce649633b11e37c7c14a09c5))
* **cli:** workflow update to fix auto deploy ([a2fdfd5](https://github.com/jimburch/coati/commit/a2fdfd5081f5ace33f9c6fb8157cff996b159c90))
* format +page.svelte to pass Prettier lint check ([656079a](https://github.com/jimburch/coati/commit/656079a0e7889ce516cf8fd1fc8bb749b99333d1))
* **ralph:** fix branch name on dispatch ([#222](https://github.com/jimburch/coati/issues/222)) ([8e7242d](https://github.com/jimburch/coati/commit/8e7242d0d4165f93cab906eb22026c454d86e69a))
* **ralph:** runs prettier before comitting work ([c0e1bcd](https://github.com/jimburch/coati/commit/c0e1bcd58618bbe22ba0f83d8185295bd4dd8020))
* resolve lint and formatting issues for issue [#57](https://github.com/jimburch/coati/issues/57) ([0f34a7a](https://github.com/jimburch/coati/commit/0f34a7a43739f1f232218162bc9c905695aed3a8))
* resolve Svelte rune warnings and prettier formatting ([6414568](https://github.com/jimburch/coati/commit/64145687db719061ddfce3e95ce2a095bd30216d))
* **sematic release:** fix issue that caused dupe deploys on ci ([16fd7f0](https://github.com/jimburch/coati/commit/16fd7f01d298ef73d698d21a57875f1f5fc45e4c))
* **ui:** fix agent chip containers ([f929d1c](https://github.com/jimburch/coati/commit/f929d1cbc89959e7ea5880026fd65e8a2e9c9838))
* **ui:** improve code theme and cli package name updates ([2624c89](https://github.com/jimburch/coati/commit/2624c89597a6bd240f0208ee6c35e02f3f6e0573))
* **ui:** SetupCard height consistency and agent chip alignment ([#213](https://github.com/jimburch/coati/issues/213)) ([7e0c81d](https://github.com/jimburch/coati/commit/7e0c81d49592bf92652c96382c9cb5b9d8c385d7))
* update feedback issue tests for 3-label flow and add environment field ([3e515ee](https://github.com/jimburch/coati/commit/3e515eebf808416e5603591293bd47db3f64d6d0))
* use untrack() to suppress state_referenced_locally warnings ([3fa1ac5](https://github.com/jimburch/coati/commit/3fa1ac5b34081a12ba765e42be55a4d7910ead83))


### Features

* add activity feed for issue [#58](https://github.com/jimburch/coati/issues/58) ([799138e](https://github.com/jimburch/coati/commit/799138ed2e86bd21a39dc9a8f250d7b79caf8dca))
* add unified search endpoint with user + setup results ([#187](https://github.com/jimburch/coati/issues/187)) ([5f1e95a](https://github.com/jimburch/coati/commit/5f1e95acb3ea40747ab474a9816dca8fc5ac1229))
* **api:** add PATCH /api/v1/setups/{id} with ownership check and slug redirects ([#218](https://github.com/jimburch/coati/issues/218)) ([6d61bba](https://github.com/jimburch/coati/commit/6d61bba10359a90373f2131582d32eff26de0c2c))
* **api:** add slug redirect resolution to GET routes ([#220](https://github.com/jimburch/coati/issues/220)) ([4d647a3](https://github.com/jimburch/coati/commit/4d647a398dcd829658dce2d156bb86a0a07cd234))
* **beta:** link github issue after bug report ([f19d910](https://github.com/jimburch/coati/commit/f19d910ce8e9aa9bf31b7c91d64a039405623a99))
* **ci:** Ralph PR workflow, CI checks, semantic release, re-work workflow ([#202](https://github.com/jimburch/coati/issues/202)) ([#208](https://github.com/jimburch/coati/issues/208)) ([4027d70](https://github.com/jimburch/coati/commit/4027d70ae242c11a05efdd46724d9d6887fe09b1))
* **cli:** add placement prompt to clone command + tests ([#227](https://github.com/jimburch/coati/issues/227)) ([57b233e](https://github.com/jimburch/coati/commit/57b233e13739c7d8ea89179a03641c210bea9a2f)), closes [#226](https://github.com/jimburch/coati/issues/226)
* **cli:** publish command — ID-based create/update flow ([#221](https://github.com/jimburch/coati/issues/221)) ([3fcda28](https://github.com/jimburch/coati/commit/3fcda28810608ac2bd6bd67cfce9922368e66076))
* **cli:** write sourceId and refresh source on clone ([#219](https://github.com/jimburch/coati/issues/219)) ([83c80d0](https://github.com/jimburch/coati/commit/83c80d001b318a14d49949a5468ad0664f27c6f8))
* **db:** auto-generate migrations in Ralph worker pipeline ([4fe1a28](https://github.com/jimburch/coati/commit/4fe1a280bbf183828b06dab7730ffe772976f9d0))

## [1.0.3](https://github.com/jimburch/coati/compare/v1.0.2...v1.0.3) (2026-04-08)


### Bug Fixes

* update cli workflow to fix release ([#238](https://github.com/jimburch/coati/issues/238)) ([938f43e](https://github.com/jimburch/coati/commit/938f43e386c2686796e1718a965f79fa4b6e5687))

## [1.0.2](https://github.com/jimburch/coati/compare/v1.0.1...v1.0.2) (2026-04-08)


### Bug Fixes

* CLI prod downloads, code theme improvements, and feedback widget enhancements ([#237](https://github.com/jimburch/coati/issues/237)) ([a790168](https://github.com/jimburch/coati/commit/a790168ab942c52cbd99517729dd3c7a470ef03b))

## [1.0.1](https://github.com/jimburch/coati/compare/v1.0.0...v1.0.1) (2026-04-08)


### Bug Fixes

* ci/cd improvements for coolify ([#234](https://github.com/jimburch/coati/issues/234)) ([dc7d381](https://github.com/jimburch/coati/commit/dc7d381de5c87d2bb485e260301eef23ecef9f04))

# 1.0.0 (2026-04-08)


### Features

* beta release ([#232](https://github.com/jimburch/coati/issues/232)) ([f050b8d](https://github.com/jimburch/coati/commit/f050b8d18d654853d96c21d699dbd15f2f3b6219))
* beta release (2) ([#233](https://github.com/jimburch/coati/issues/233)) ([45e43fa](https://github.com/jimburch/coati/commit/45e43fae1a7e76374e4bccc2e977bead362829d0))
