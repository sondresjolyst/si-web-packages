# Changelog

## [1.2.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v1.1.0...app-kit-v1.2.0) (2026-10-19)


### Features

* **admin:** mark a tab active on the pages below its href in AdminShell ([#98](https://github.com/sondresjolyst/si-web-packages/issues/98)) ([720496e](https://github.com/sondresjolyst/si-web-packages/commit/720496e729fe74887c220319d01211068c42a465)), closes [#97](https://github.com/sondresjolyst/si-web-packages/issues/97)
* **api:** export apiFieldErrorDetails, fieldErrorText, fieldErrorTexts and errorText ([#100](https://github.com/sondresjolyst/si-web-packages/issues/100)) ([29f610d](https://github.com/sondresjolyst/si-web-packages/commit/29f610d5f3904462bcff13b661c024b4aed507a3)), closes [#99](https://github.com/sondresjolyst/si-web-packages/issues/99)
* **app-kit:** announce a change of state in PaymentReturn through a polite live region ([#103](https://github.com/sondresjolyst/si-web-packages/issues/103)) ([8ab5fc5](https://github.com/sondresjolyst/si-web-packages/commit/8ab5fc5b70e85a4dd289818a78d486bed154b5ab)), closes [#101](https://github.com/sondresjolyst/si-web-packages/issues/101)
* **legal:** list and open the earlier versions of a legal page in LegalPagesEditor ([#110](https://github.com/sondresjolyst/si-web-packages/issues/110)) ([3b09390](https://github.com/sondresjolyst/si-web-packages/commit/3b09390117f3bc675de5d90b9661dcc29523888a))
* **server:** let one createPublicApi call set its own revalidate ([#104](https://github.com/sondresjolyst/si-web-packages/issues/104)) ([83a9f12](https://github.com/sondresjolyst/si-web-packages/commit/83a9f1223570b85b3a8b720b69c9cd291c08f8c1)), closes [#102](https://github.com/sondresjolyst/si-web-packages/issues/102)


### Bug Fixes

* **app-kit:** wrap long words in the LegalPageView title and the AdminUsersPanel rows ([#108](https://github.com/sondresjolyst/si-web-packages/issues/108)) ([7db3b4b](https://github.com/sondresjolyst/si-web-packages/commit/7db3b4bf3dc9d5f6e2ee07396cfd996781a41c1b)), closes [#107](https://github.com/sondresjolyst/si-web-packages/issues/107)
* **markdown:** wrap long words and links in the default elements ([#96](https://github.com/sondresjolyst/si-web-packages/issues/96)) ([0665c54](https://github.com/sondresjolyst/si-web-packages/commit/0665c54ea188ff278d9bef0fe7d38e3cad5dae5f)), closes [#95](https://github.com/sondresjolyst/si-web-packages/issues/95)
* **sections:** wrap long words in the default section renderers ([#106](https://github.com/sondresjolyst/si-web-packages/issues/106)) ([50f6274](https://github.com/sondresjolyst/si-web-packages/commit/50f627495d21f2e8b0feb6deebdca1a642000c6b)), closes [#105](https://github.com/sondresjolyst/si-web-packages/issues/105)

## [1.1.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v1.0.2...app-kit-v1.1.0) (2026-10-18)


### Features

* **admin:** add a period picker and separate counts to EmailStatsPanel ([#91](https://github.com/sondresjolyst/si-web-packages/issues/91)) ([f8929e9](https://github.com/sondresjolyst/si-web-packages/commit/f8929e91339113b34cf186dc2ca9a92b897243a9)), closes [#78](https://github.com/sondresjolyst/si-web-packages/issues/78)


### Bug Fixes

* **next-config:** default expireTime to a year so stale pages stay up while the API is down ([#94](https://github.com/sondresjolyst/si-web-packages/issues/94)) ([4c138f2](https://github.com/sondresjolyst/si-web-packages/commit/4c138f2027fbf203a191d2ab2f7571a2945e2956)), closes [#92](https://github.com/sondresjolyst/si-web-packages/issues/92)

## [1.0.2](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v1.0.1...app-kit-v1.0.2) (2026-10-18)


### Bug Fixes

* **company:** export the company helpers from ./company, which needs neither axios nor next-auth ([#87](https://github.com/sondresjolyst/si-web-packages/issues/87)) ([6c61fc4](https://github.com/sondresjolyst/si-web-packages/commit/6c61fc4980521502b6c5297785a36217e08a8259)), closes [#85](https://github.com/sondresjolyst/si-web-packages/issues/85)
* **server:** let createPublicApi build pages empty when the API fails during next build ([#90](https://github.com/sondresjolyst/si-web-packages/issues/90)) ([84799ed](https://github.com/sondresjolyst/si-web-packages/commit/84799ed4f43b992e4bf902282f24c7eed58f9e1b)), closes [#86](https://github.com/sondresjolyst/si-web-packages/issues/86)
* **ui:** show the password rules once after a weak password in ResetPasswordFlow ([#89](https://github.com/sondresjolyst/si-web-packages/issues/89)) ([d1f9ebd](https://github.com/sondresjolyst/si-web-packages/commit/d1f9ebd8fb57e6e002bcf91e0a15a383dd6477d6)), closes [#81](https://github.com/sondresjolyst/si-web-packages/issues/81)


### Dependencies

* **npm:** bump next from 16.3.8 to 16.4.0 in the next group ([#83](https://github.com/sondresjolyst/si-web-packages/issues/83)) ([64f48f7](https://github.com/sondresjolyst/si-web-packages/commit/64f48f70204d14dc4fe4d36081f236fca9e4f012))

## [1.0.1](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v1.0.0...app-kit-v1.0.1) (2026-10-17)


### Bug Fixes

* **app-kit:** give the section delete, reset password and branding refusal texts their own English defaults ([#79](https://github.com/sondresjolyst/si-web-packages/issues/79)) ([d6df37e](https://github.com/sondresjolyst/si-web-packages/commit/d6df37ef7f4fd2d7e56347731cb5787acdd00d8c))

## [1.0.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.22.0...app-kit-v1.0.0) (2026-10-17)


### ⚠ BREAKING CHANGES

* **sections:** stop exporting the default registries and newSectionId ([#71](https://github.com/sondresjolyst/si-web-packages/issues/71))
* **app-kit:** stop exporting internal helpers ([#68](https://github.com/sondresjolyst/si-web-packages/issues/68))

### Features

* **app-kit:** add an email stats panel and service for the admin stats page ([#74](https://github.com/sondresjolyst/si-web-packages/issues/74)) ([694ef3e](https://github.com/sondresjolyst/si-web-packages/commit/694ef3eb52f2dc59c9d6edc389e301616206a9bd))
* **app-kit:** ship Norwegian strings for every component in ./locales/nb ([#75](https://github.com/sondresjolyst/si-web-packages/issues/75)) ([50b60dd](https://github.com/sondresjolyst/si-web-packages/commit/50b60dd29ec297eff6497d4108cd94eba6a15d2b))
* **app-kit:** show auth and user admin errors in the app's language and load roles from the service ([#73](https://github.com/sondresjolyst/si-web-packages/issues/73)) ([7fd112f](https://github.com/sondresjolyst/si-web-packages/commit/7fd112fcf9b301a419db9838631df0100a29f9f4))
* **app-kit:** take the app's legal page keys once, as the API's Keys option does ([#72](https://github.com/sondresjolyst/si-web-packages/issues/72)) ([4317a4d](https://github.com/sondresjolyst/si-web-packages/commit/4317a4dbc6a739276e07bb06379248f936ddb765))
* **sections:** add shared page sections with a renderer and an editor registry ([#66](https://github.com/sondresjolyst/si-web-packages/issues/66)) ([c74d7e8](https://github.com/sondresjolyst/si-web-packages/commit/c74d7e819eb0fc4fb0e7839c00eb0c0521cbf150))


### Bug Fixes

* **app-kit:** let the legal entry point typecheck without axios and next-auth ([#69](https://github.com/sondresjolyst/si-web-packages/issues/69)) ([efc32c4](https://github.com/sondresjolyst/si-web-packages/commit/efc32c4215f2c1b745aa11749c79a47e70311300))
* **app-kit:** let the public phone stay blank in the company settings form ([#65](https://github.com/sondresjolyst/si-web-packages/issues/65)) ([20a3ee1](https://github.com/sondresjolyst/si-web-packages/commit/20a3ee1458a4f5e446b251191f1552a80c9207ac))
* **app-kit:** make @heroicons/react an optional peer dependency ([#70](https://github.com/sondresjolyst/si-web-packages/issues/70)) ([10dbd83](https://github.com/sondresjolyst/si-web-packages/commit/10dbd8389da426919dce1647b780ba8aae3dd053))
* **app-kit:** show the legal page and branding errors in the app's language ([#67](https://github.com/sondresjolyst/si-web-packages/issues/67)) ([a67d3b9](https://github.com/sondresjolyst/si-web-packages/commit/a67d3b9608101033dea762f383569a9f8556bee9))
* **app-kit:** show the settings field errors under their fields in the app's language ([#62](https://github.com/sondresjolyst/si-web-packages/issues/62)) ([739d180](https://github.com/sondresjolyst/si-web-packages/commit/739d1801139c226348ada45520b235d28c4b21f6)), closes [#60](https://github.com/sondresjolyst/si-web-packages/issues/60)


### Code Refactoring

* **app-kit:** stop exporting internal helpers ([#68](https://github.com/sondresjolyst/si-web-packages/issues/68)) ([33d4ee0](https://github.com/sondresjolyst/si-web-packages/commit/33d4ee077074cb6506ab653c447f7de526c43b6a))
* **sections:** stop exporting the default registries and newSectionId ([#71](https://github.com/sondresjolyst/si-web-packages/issues/71)) ([729c3ad](https://github.com/sondresjolyst/si-web-packages/commit/729c3ad0b50247047397d96bec8c18e2cabe24b8))

## [0.22.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.21.0...app-kit-v0.22.0) (2026-10-16)


### ⚠ BREAKING CHANGES

* **app-kit:** narrow the public API for 1.0 ([#59](https://github.com/sondresjolyst/si-web-packages/issues/59))

### Bug Fixes

* **app-kit:** name the image types the API accepts in BrandingManager ([#57](https://github.com/sondresjolyst/si-web-packages/issues/57)) ([613d0e4](https://github.com/sondresjolyst/si-web-packages/commit/613d0e4ab27e9cfde3026f71c9b851a26eaaaea0)), closes [#36](https://github.com/sondresjolyst/si-web-packages/issues/36)


### Code Refactoring

* **app-kit:** narrow the public API for 1.0 ([#59](https://github.com/sondresjolyst/si-web-packages/issues/59)) ([b8692dd](https://github.com/sondresjolyst/si-web-packages/commit/b8692ddd433e659cd385b2eae2a92c16493664e6))

## [0.21.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.20.0...app-kit-v0.21.0) (2026-10-16)


### Features

* **app-kit:** add CompanySettingsForm, mergeCompanyInfo and formatOrgNumber ([#51](https://github.com/sondresjolyst/si-web-packages/issues/51)) ([685a5ce](https://github.com/sondresjolyst/si-web-packages/commit/685a5ce5a614e4651e8007919217aae5c66507b9))
* **app-kit:** add defineRevalidateTargets ([#49](https://github.com/sondresjolyst/si-web-packages/issues/49)) ([8607315](https://github.com/sondresjolyst/si-web-packages/commit/86073152ac0815dff1b0cbfd9c0c8415ea0bfa48))
* **app-kit:** add LegalPageView, LegalPagesEditor and LocaleTabs ([#52](https://github.com/sondresjolyst/si-web-packages/issues/52)) ([1a56d7b](https://github.com/sondresjolyst/si-web-packages/commit/1a56d7ba238d5ee0664f4d0c0d3929e39cde2806))
* **app-kit:** add organizationNode options and make next-auth and axios optional peers ([#48](https://github.com/sondresjolyst/si-web-packages/issues/48)) ([2315681](https://github.com/sondresjolyst/si-web-packages/commit/23156810656dcb4d2910048ad1f62193b98a5d9a))
* **app-kit:** add sitemap helpers for legal pages and sites without locales ([#47](https://github.com/sondresjolyst/si-web-packages/issues/47)) ([12da482](https://github.com/sondresjolyst/si-web-packages/commit/12da482a8d1131ea56d50ace0cb49ff09ef14a60))
* **app-kit:** add StatHistoryChart ([#50](https://github.com/sondresjolyst/si-web-packages/issues/50)) ([02b37b5](https://github.com/sondresjolyst/si-web-packages/commit/02b37b5f7dc6105a0cb9aba6e43f0875e135a7ad))

## [0.20.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.19.0...app-kit-v0.20.0) (2026-10-16)


### Features

* **app-kit:** add AdminShell and AdminUsersPanel ([#45](https://github.com/sondresjolyst/si-web-packages/issues/45)) ([340696b](https://github.com/sondresjolyst/si-web-packages/commit/340696b4d4d7251e4f8e8e46edde4b562abb362c))
* **app-kit:** add LoginPage ([#44](https://github.com/sondresjolyst/si-web-packages/issues/44)) ([6278050](https://github.com/sondresjolyst/si-web-packages/commit/6278050f2b349d2fda74c7547ebd2846c2b5e141))
* **app-kit:** ship the next-auth session and token declarations ([#43](https://github.com/sondresjolyst/si-web-packages/issues/43)) ([8043781](https://github.com/sondresjolyst/si-web-packages/commit/804378148cdb10ce6ca259f1fe654b5299575a39))

## [0.19.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.18.0...app-kit-v0.19.0) (2026-10-16)


### Features

* **app-kit:** add ResetPasswordFlow for the two-step password reset page ([#41](https://github.com/sondresjolyst/si-web-packages/issues/41)) ([f97a80c](https://github.com/sondresjolyst/si-web-packages/commit/f97a80cbb25245330d99afe27b01b4c03c58b8ef))

## [0.18.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.17.0...app-kit-v0.18.0) (2026-10-16)


### Features

* **app-kit:** add zodFieldErrors and apiFieldErrors for showing errors beside form fields ([#39](https://github.com/sondresjolyst/si-web-packages/issues/39)) ([23480fd](https://github.com/sondresjolyst/si-web-packages/commit/23480fd85956d8ad695e965cb8283912477d1cb9))

## [0.17.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.16.0...app-kit-v0.17.0) (2026-10-16)


### Features

* **app-kit:** add service factories for the auth, settings, branding and legal endpoints ([#37](https://github.com/sondresjolyst/si-web-packages/issues/37)) ([30efaa8](https://github.com/sondresjolyst/si-web-packages/commit/30efaa8593a15d0000b0dfff437966eeb6b40e15))

## [0.16.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.15.0...app-kit-v0.16.0) (2026-10-12)


### Features

* **app-kit:** delete the refresh token at the API on sign-out ([#33](https://github.com/sondresjolyst/si-web-packages/issues/33)) ([b5f9dea](https://github.com/sondresjolyst/si-web-packages/commit/b5f9deaab4f9634db4662cbf1058dcdd6726ca59))

## [0.15.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.14.0...app-kit-v0.15.0) (2026-10-11)


### Features

* **app-kit:** add payments with PaymentReturn, usePollUntilFinal and formatNok ([#31](https://github.com/sondresjolyst/si-web-packages/issues/31)) ([4119141](https://github.com/sondresjolyst/si-web-packages/commit/411914196fe9ab9de8b2377d22f6bb19011acf85))

## [0.14.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.13.0...app-kit-v0.14.0) (2026-10-11)


### Features

* **app-kit:** add branding and branding/server ([#29](https://github.com/sondresjolyst/si-web-packages/issues/29)) ([0197e93](https://github.com/sondresjolyst/si-web-packages/commit/0197e93f495dd712b6d72ec7a6ba66338545c026))

## [0.13.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.12.0...app-kit-v0.13.0) (2026-10-11)


### Features

* **app-kit:** add seo and seo/og ([#27](https://github.com/sondresjolyst/si-web-packages/issues/27)) ([f843620](https://github.com/sondresjolyst/si-web-packages/commit/f843620091e7d36bfbfb5bdc59610e08997ff86c))

## [0.12.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.11.0...app-kit-v0.12.0) (2026-10-11)


### Features

* **app-kit:** add Markdown in app-kit/markdown ([#24](https://github.com/sondresjolyst/si-web-packages/issues/24)) ([e583a40](https://github.com/sondresjolyst/si-web-packages/commit/e583a40a8a0dd67c47b870c8757013665e8fa0ff))


### Dependencies

* **npm:** bump jsonwebtoken and @types/jsonwebtoken ([#26](https://github.com/sondresjolyst/si-web-packages/issues/26)) ([16fd784](https://github.com/sondresjolyst/si-web-packages/commit/16fd78486271b118e0e9827daca26e4ce8e6cc38))

## [0.11.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.10.0...app-kit-v0.11.0) (2026-10-10)


### Features

* **app-kit:** add ContentImage, ErrorState and NotFoundState ([#22](https://github.com/sondresjolyst/si-web-packages/issues/22)) ([b21cbe0](https://github.com/sondresjolyst/si-web-packages/commit/b21cbe0aadc4f06d5a479fc74606cb2eb2c82e9c))

## [0.10.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.9.0...app-kit-v0.10.0) (2026-10-10)


### Features

* **next-config:** add the shared Next config with security headers ([#20](https://github.com/sondresjolyst/si-web-packages/issues/20)) ([a3a379e](https://github.com/sondresjolyst/si-web-packages/commit/a3a379ea6dc2e1452c0ecef54025f6a310137c62))

## [0.9.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.8.0...app-kit-v0.9.0) (2026-10-10)


### Features

* **ui:** add TextArea and Toggle ([#18](https://github.com/sondresjolyst/si-web-packages/issues/18)) ([8b7c13f](https://github.com/sondresjolyst/si-web-packages/commit/8b7c13ff26cc20f65b0cd04e50595113964a4754))

## [0.8.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.7.0...app-kit-v0.8.0) (2026-10-10)


### Features

* **validation:** add a shared password schema ([#16](https://github.com/sondresjolyst/si-web-packages/issues/16)) ([9055ece](https://github.com/sondresjolyst/si-web-packages/commit/9055ece498fc85a8fd0aee614616844f43171e1d))

## [0.7.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.6.0...app-kit-v0.7.0) (2026-10-09)


### Features

* add RoleGate, AppSessionProvider, public fetch and revalidate helpers, and a quiet toast ([#13](https://github.com/sondresjolyst/si-web-packages/issues/13)) ([bbdeda8](https://github.com/sondresjolyst/si-web-packages/commit/bbdeda8a275383fdbfaa268794c5474f8717e211))


### Bug Fixes

* **server:** harden the revalidate route and public fetch paths ([#15](https://github.com/sondresjolyst/si-web-packages/issues/15)) ([2b76f93](https://github.com/sondresjolyst/si-web-packages/commit/2b76f93d05207a0b797b3c08ac0604955c45571f))

## [0.6.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.5.0...app-kit-v0.6.0) (2026-10-09)


### Features

* **ui:** add TextInput, CredentialsForm, SessionExpiryGuard and ProtectedGate ([#11](https://github.com/sondresjolyst/si-web-packages/issues/11)) ([c552284](https://github.com/sondresjolyst/si-web-packages/commit/c5522845326df79a9b05c2f3c0d67b05023e19b3))

## [0.5.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.4.0...app-kit-v0.5.0) (2026-10-08)


### Features

* **auth:** add createAuthOptions and createApiClient for signing in against the API ([#9](https://github.com/sondresjolyst/si-web-packages/issues/9)) ([97b7e34](https://github.com/sondresjolyst/si-web-packages/commit/97b7e34c861f5d63ef8f725fb530ed1372253cb0))

## [0.4.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.3.0...app-kit-v0.4.0) (2026-10-07)


### Features

* **session:** add the session gate and form drafts ([#7](https://github.com/sondresjolyst/si-web-packages/issues/7)) ([6e23bc3](https://github.com/sondresjolyst/si-web-packages/commit/6e23bc3955dd7f079bd91188d753645df8433398))

## [0.3.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.2.0...app-kit-v0.3.0) (2026-10-06)


### ⚠ BREAKING CHANGES

* let apps restyle the components and read more API error bodies ([#3](https://github.com/sondresjolyst/si-web-packages/issues/3))

### Features

* let apps restyle the components and read more API error bodies ([#3](https://github.com/sondresjolyst/si-web-packages/issues/3)) ([3c72ade](https://github.com/sondresjolyst/si-web-packages/commit/3c72ade6d084333dc2388846e5a43eaba8894e1d))


### Bug Fixes

* never show the generic problem details title in formatApiError ([#5](https://github.com/sondresjolyst/si-web-packages/issues/5)) ([c5e26ad](https://github.com/sondresjolyst/si-web-packages/commit/c5e26ad29fb9eda32b702e997c96226f4b8218c5))

## [0.2.0](https://github.com/sondresjolyst/si-web-packages/compare/app-kit-v0.1.0...app-kit-v0.2.0) (2026-10-06)


### Features

* add formatApiError ([9248f37](https://github.com/sondresjolyst/si-web-packages/commit/9248f37635fe76ab27b5f882f688267325874143))
* **ui:** add Alert and PasswordInput ([d7fbc38](https://github.com/sondresjolyst/si-web-packages/commit/d7fbc38d34907302730ff6a42bf9f9e56417ed09))
* **ui:** ship a stylesheet that registers the components with Tailwind ([db720e2](https://github.com/sondresjolyst/si-web-packages/commit/db720e2fb0958685ef82cadb274933bc6a1946ec))
