// Norwegian (bokmål) text for every app-kit component that takes `strings`. Plain values with type
// only imports, so this entry point needs no peer dependency and a server component can import it.
//
// The wording follows Norwegian public services. A field error names the field or the problem first,
// says what is wrong and how to fix it, as Skatteetaten does, and uses Altinn's phrasing such as
// "Du må fylle ut" and "Bruk {max} eller færre tegn".

import type { AdminShellStrings } from "../admin/adminShellStrings";
import type { AdminUsersPanelStrings } from "../admin/adminUsersPanelStrings";
import type { CompanySettingsFormStrings } from "../admin/companySettingsFormStrings";
import type { EmailStatsPanelStrings } from "../admin/emailStatsPanelStrings";
import type { LegalPagesEditorStrings } from "../admin/legalPagesEditorStrings";
import type { StatHistoryChartStrings } from "../admin/statHistoryChartStrings";
import type { BrandingManagerStrings } from "../branding/brandingManagerStrings";
import type { ConsentBannerStrings, ConsentSettingsLinkStrings } from "../consent/consentBannerStrings";
import type { DefaultLegalPageKey } from "../legal/keys";
import type { LegalPageViewStrings } from "../legal/legalPageViewStrings";
import type { SectionsEditorStrings } from "../sections/sectionsEditorStrings";
import type { SharedSectionType } from "../sections/types";
import type { CredentialsFormStrings } from "../session/react/credentialsFormStrings";
import type { LoginPageStrings } from "../session/react/loginPageStrings";
import type { SessionExpiryGuardStrings } from "../session/react/sessionExpiryGuardStrings";
import type { ConfirmDialogStrings } from "../ui/confirmDialogStrings";
import type { ErrorStateStrings } from "../ui/errorStateStrings";
import type { NotFoundStateStrings } from "../ui/notFoundStateStrings";
import type { ResetPasswordFlowStrings } from "../ui/resetPasswordFlowStrings";
import { PASSWORD_MIN_LENGTH, type PasswordStrings } from "../validation/passwordRules";

const required = "Du må fylle ut dette feltet.";
const tooLong = "Bruk {max} eller færre tegn.";
const passwordRules = `Bruk minst ${PASSWORD_MIN_LENGTH} tegn, med minst én liten og én stor bokstav fra A til Z og ett siffer fra 0 til 9.`;

/** For `passwordSchema` and the `passwordStrings` of `ResetPasswordFlow`. */
export const nbPasswordStrings: PasswordStrings = {
  tooShort: `Passordet er for kort. Bruk minst ${PASSWORD_MIN_LENGTH} tegn.`,
  lowercase: "Passordet mangler en liten bokstav. Ta med en bokstav fra a til z.",
  uppercase: "Passordet mangler en stor bokstav. Ta med en bokstav fra A til Z.",
  digit: "Passordet mangler et siffer. Ta med et siffer fra 0 til 9.",
};

/** For `CredentialsForm`, and the `formStrings` of `LoginPage` and `SessionExpiryGuard`. */
export const nbCredentialsFormStrings: CredentialsFormStrings = {
  email: "E-post",
  password: "Passord",
  signIn: "Logg inn",
  signingIn: "Logger inn…",
  invalidCredentials: "Feil e-post eller passord.",
  lockedOut: "Du har prøvd å logge inn for mange ganger, så innloggingen er låst en stund. Prøv igjen senere.",
  signInUnavailable: "Innlogging er ikke tilgjengelig akkurat nå. Prøv igjen om litt.",
  somethingWentWrong: "Noe gikk galt. Prøv igjen.",
  showPassword: "Vis passord",
  hidePassword: "Skjul passord",
};

/** For `LoginPage`. */
export const nbLoginPageStrings: LoginPageStrings = {
  title: "Logg inn",
  forgotPassword: "Glemt passord?",
  registerPrompt: "Har du ikke konto?",
  register: "Opprett konto",
};

/** For `SessionExpiryGuard`. */
export const nbSessionExpiryGuardStrings: SessionExpiryGuardStrings = {
  expiredTitle: "Økten er utløpt",
  expiredBody: "Økten din er utløpt. Logg inn på nytt for å lagre.",
  expiringSoon: "Økten utløper om {minutes} min. Logg inn på nytt for å fortsette uten avbrudd.",
  reSignIn: "Logg inn på nytt",
  notRestored: "Vi fikk ikke fornyet økten. Prøv igjen.",
  wrongUser: "Denne siden tilhører en annen bruker. Logg inn med samme konto.",
  close: "Lukk",
};

/** For `ResetPasswordFlow`. Pass `nbPasswordStrings` as its `passwordStrings` too. */
export const nbResetPasswordFlowStrings: ResetPasswordFlowStrings = {
  title: "Sett nytt passord",
  signInPrompt: "Husker du passordet?",
  signIn: "Logg inn",
  backToSignIn: "Logg inn →",
  intro: "Skriv inn e-postadressen din, så sender vi en kode.",
  codeSent: "Sjekk e-posten din. Vi har sendt deg en kode.",
  email: "E-post",
  code: "Kode fra e-post",
  newPassword: "Nytt passord",
  passwordHint: passwordRules,
  requestCode: "Send kode",
  requestingCode: "Sender…",
  setPassword: "Lagre passord",
  settingPassword: "Lagrer…",
  done: "Passordet er endret. Du kan logge inn nå.",
  passwordInvalid: `Passordet oppfyller ikke kravene. ${passwordRules}`,
  somethingWentWrong: "Noe gikk galt. Prøv igjen.",
  validation: {
    required,
    invalidEmail: "E-postadressen er ugyldig. Skriv den slik: navn@domene.no.",
    passwordTooShort: "Passordet er for kort. Bruk minst {max} tegn.",
    passwordRequiresDigit: "Passordet mangler et siffer. Ta med et siffer fra 0 til 9.",
    passwordRequiresLower: "Passordet mangler en liten bokstav. Ta med en bokstav fra a til z.",
    passwordRequiresUpper: "Passordet mangler en stor bokstav. Ta med en bokstav fra A til Z.",
    passwordRequiresNonAlphanumeric: "Passordet mangler et spesialtegn. Ta med et tegn som ikke er en bokstav eller et siffer, for eksempel ! eller #.",
  },
  errors: {
    invalidResetCode: "Koden er feil eller har gått ut. Sjekk koden i e-posten, eller be om en ny kode.",
    tooManyResetAttempts: "Du har skrevet feil kode for mange ganger. Be om en ny kode.",
  },
};

/** For `ErrorState`. */
export const nbErrorStateStrings: ErrorStateStrings = {
  title: "Midlertidig utilgjengelig",
  body: "Vi får ikke kontakt med tjenesten akkurat nå. Prøv igjen om litt.",
  tryAgain: "Prøv igjen",
  home: "Til forsiden",
};

/** For `NotFoundState`. */
export const nbNotFoundStateStrings: NotFoundStateStrings = {
  code: "404",
  body: "Siden finnes ikke, eller den er flyttet.",
  home: "Til forsiden",
};

/** For `ConfirmDialog`. */
export const nbConfirmDialogStrings: ConfirmDialogStrings = {
  confirm: "Bekreft",
  cancel: "Avbryt",
};

/** For `CompanySettingsForm`. */
export const nbCompanySettingsFormStrings: CompanySettingsFormStrings = {
  contactRecipient: "Mottaker for henvendelser",
  contactRecipientHint: "Meldinger fra kontaktskjemaet sendes til denne adressen.",
  companyName: "Firmanavn",
  legalName: "Registrert navn",
  legalNameHint: "Navnet i Enhetsregisteret. La feltet stå tomt for å bruke firmanavnet.",
  orgNumber: "Organisasjonsnummer",
  vatRegistered: "Registrert i Merverdiavgiftsregisteret",
  vatHint: "Krever organisasjonsnummer. Når dette er slått på, vises nummeret med «MVA».",
  streetAddress: "Gateadresse",
  postalCode: "Postnummer",
  addressLocality: "Poststed",
  addressRegion: "Fylke",
  addressHint: "Postnummer og poststed holdes atskilt slik at søkemotorer kan lese adressen. Fylke er valgfritt.",
  publicEmail: "E-post som vises på nettsiden",
  publicPhone: "Telefon som vises på nettsiden",
  loading: "Laster…",
  save: "Lagre",
  saving: "Lagrer…",
  loadFailed: "Kunne ikke laste innstillingene",
  saved: "Innstillingene er lagret",
  saveFailed: "Kunne ikke lagre innstillingene",
  validation: {
    required,
    tooLong,
    invalidEmail: "E-postadressen er ugyldig. Skriv den slik: navn@domene.no.",
    orgNumberRequiredForVat: "Du må fylle ut organisasjonsnummer når virksomheten er registrert i Merverdiavgiftsregisteret.",
    invalidOrgNumber: "Organisasjonsnummeret er ugyldig. Et organisasjonsnummer består av 9 siffer.",
    invalidPostalCode: "Postnummeret er ugyldig. Et postnummer består av 4 siffer.",
    placeRequired: "Du må fylle ut poststed når du har fylt ut postnummer.",
  },
};

/** For `AdminShell`. */
export const nbAdminShellStrings: AdminShellStrings = {
  breadcrumb: "Brødsmulesti",
};

/** For `AdminUsersPanel`. */
export const nbAdminUsersPanelStrings: AdminUsersPanelStrings = {
  users: "Brukere",
  showDeleted: "Vis slettede",
  inviteUser: "Inviter bruker",
  firstName: "Fornavn",
  lastName: "Etternavn",
  email: "E-post",
  role: "Rolle",
  sendInvite: "Send invitasjon",
  sending: "Sender…",
  inviteHint: "Brukeren får en e-post med en kode og setter passordet selv på siden for glemt passord.",
  loading: "Laster…",
  deleted: "slettet",
  delete: "Slett",
  remove: "Fjern",
  noRoles: "Ingen roller",
  addRole: "Legg til rolle",
  add: "Legg til",
  cancel: "Avbryt",
  usersLoadFailed: "Kunne ikke laste brukerne",
  rolesLoadFailed: "Kunne ikke laste rollene",
  roleAssigned: "{name} har fått rollen {role}",
  roleAssignFailed: "Kunne ikke tildele rollen",
  roleRemoved: "{role} er fjernet fra {name}",
  roleRemoveFailed: "Kunne ikke fjerne rollen",
  confirmDelete: "Slette {name}? Navn, e-post og passord blir fjernet, og brukeren kan ikke logge inn igjen.",
  userDeleted: "Brukeren er slettet",
  userDeleteFailed: "Kunne ikke slette brukeren",
  inviteIncomplete: "Du må fylle ut navn og e-post.",
  inviteSent: "Invitasjonen er sendt. Brukeren får en kode for å sette passord.",
  inviteFailed: "Kunne ikke sende invitasjonen",
  validation: {
    required,
    tooLong,
    invalidEmail: "E-postadressen er ugyldig. Skriv den slik: navn@domene.no.",
    unknownRole: "Rollen finnes ikke. Velg en rolle fra listen.",
    emailTaken: "E-postadressen har allerede en konto. Bruk en annen e-postadresse.",
  },
  errors: {
    unknownRole: "Rollen finnes ikke. Velg en rolle fra listen.",
    ownAdminRole: "Du kan ikke fjerne din egen administratorrolle. Be en annen administrator om å gjøre det.",
    lastAdmin: "Den siste administratoren må beholde administratorrollen. Gi rollen til noen andre først.",
    roleAssignFailed: "Rollen ble ikke tildelt. Prøv igjen.",
    roleRemoveFailed: "Rollen ble ikke fjernet. Prøv igjen.",
    emailTaken: "E-postadressen har allerede en konto. Bruk en annen e-postadresse.",
  },
  deleteErrors: {
    lastAdmin: "Den siste administratoren kan ikke slettes. Gi administratorrollen til noen andre først.",
    accountChangeConflict: "Noen andre endret brukerkontoene samtidig. Prøv igjen.",
  },
};

/** For `LegalPagesEditor`. */
export const nbLegalPagesEditorStrings: LegalPagesEditorStrings = {
  heading: "Juridiske sider",
  title: "Tittel",
  bodyMarkdown: "Innhold (Markdown)",
  notFilled: "Ikke fylt ut",
  loading: "Laster…",
  save: "Lagre",
  saving: "Lagrer…",
  loadFailed: "Kunne ikke laste sidene",
  required: "Du må fylle ut tittel og innhold.",
  saved: "Siden er lagret",
  saveFailed: "Kunne ikke lagre siden",
  revisionsHeading: "Tidligere versjoner",
  noRevisions: "Ingen tidligere versjoner",
  revisionsFailed: "Kunne ikke laste tidligere versjoner",
  currentRevision: "Gjeldende",
  revisionSaved: "Lagret",
  closeRevision: "Lukk",
  revisionFailed: "Kunne ikke åpne versjonen",
  validation: { required, tooLong },
};

/** The tab labels of the default legal pages, for the `keyLabels` of `LegalPagesEditor`. */
export const nbLegalPageKeyLabels: Record<DefaultLegalPageKey, string> = {
  terms: "Vilkår",
  privacy: "Personvern",
  cookies: "Informasjonskapsler",
};

/** For `StatHistoryChart`. */
export const nbStatHistoryChartStrings: StatHistoryChartStrings = {
  empty: "Ingen historikk ennå. Se innom i morgen.",
  chart: "Statistikk over tid",
};

/** For `EmailStatsPanel`. */
export const nbEmailStatsPanelStrings: EmailStatsPanelStrings = {
  title: "E-post (siste {days} dager)",
  sent: "Sendt",
  delivered: "Levert",
  bounces: "Returnert",
  blocked: "Blokkert eller spam",
  hardBounces: "Returnert, permanent feil",
  softBounces: "Returnert, midlertidig feil",
  blockedOnly: "Blokkert",
  spamReports: "Meldt som spam",
  invalid: "Ugyldig adresse",
  period: "Periode",
  periodOption: "{days} dager",
  loading: "Laster…",
  unavailable: "E-poststatistikken er ikke tilgjengelig akkurat nå. Prøv igjen senere.",
};

/** For `BrandingManager`. */
export const nbBrandingManagerStrings: BrandingManagerStrings = {
  title: "Logo og ikon",
  logo: "Logo",
  logoHint: "Vises i menylinjen og bunnteksten. PNG, JPEG, WebP eller GIF, maks 2 MB.",
  icon: "Ikon (favicon)",
  iconHint: "Ikonet i nettleserfanen. Kvadratisk PNG eller ICO, maks 2 MB.",
  none: "ingen",
  choose: "Velg fil",
  remove: "Fjern",
  save: "Lagre logo og ikon",
  saving: "Lagrer…",
  saved: "Logo og ikon er lagret",
  saveFailed: "Kunne ikke lagre logo og ikon",
  validation: {
    invalidImage: "Ugyldig filformat. Last opp en bildefil.",
    imageTooLarge: "Filen er for stor. Last opp en fil på 2 MB eller mindre.",
  },
};

/** For `LegalPageView`. */
export const nbLegalPageViewStrings: LegalPageViewStrings = {
  updated: "Sist oppdatert",
  missing: "Dette innholdet er ikke lagt inn ennå.",
  toFrontPage: "Til forsiden",
};

/** For `SectionsEditor` and the section editors. */
export const nbSectionsEditorStrings: SectionsEditorStrings = {
  hide: "Skjul",
  show: "Vis",
  moveUp: "Flytt opp",
  moveDown: "Flytt ned",
  duplicate: "Dupliser",
  remove: "Slett",
  addSection: "Legg til seksjon",
  heading: "Overskrift",
  headingOptional: "Overskrift (valgfri)",
  subheading: "Undertekst",
  text: "Tekst",
  body: "Brødtekst (Markdown)",
  primaryButtonLabel: "Tekst på knapp 1",
  primaryButtonHref: "Lenke på knapp 1",
  secondaryButtonLabel: "Tekst på knapp 2",
  secondaryButtonHref: "Lenke på knapp 2",
  buttonLabel: "Tekst på knappen",
  buttonHref: "Lenke på knappen",
  bullets: "Punkter",
  addBullet: "Legg til punkt",
  count: "Antall som vises",
  stats: "Tall",
  source: "Kilde",
  sourceStatic: "Fast tall",
  value: "Verdi",
  label: "Tekst",
  addStat: "Legg til tall",
  layout: "Oppsett",
  layoutStandard: "Standard (midtstilt)",
  layoutFull: "Full bredde",
  layoutLeft: "Bilde til venstre, tekst til høyre",
  layoutRight: "Bilde til høyre, tekst til venstre",
  layoutOverlay: "Tekst over bildet",
  layoutOverlayFull: "Tekst over bildet (full bredde)",
  altText: "Alternativ tekst",
  caption: "Bildetekst (valgfri)",
  image: "Bilde",
  uploadImage: "Last opp bilde",
  replaceImage: "Bytt bilde",
  uploading: "Laster opp…",
  removeImage: "Fjern",
  uploadFailed: "Kunne ikke laste opp bildet",
};

/** For the `typeLabels` of `SectionsEditor`. */
export const nbSectionTypeLabels: Record<SharedSectionType, string> = {
  hero: "Toppfelt",
  feature: "Punktliste",
  text: "Tekst",
  feed: "Siste oppføringer",
  contact: "Kontaktskjema",
  cta: "Handlingsfelt",
  stats: "Tallrad",
  image: "Bilde",
};

/** For `ConsentBanner`. */
export const nbConsentBannerStrings: ConsentBannerStrings = {
  title: "Informasjonskapsler for markedsføring",
  body:
    "Vi vil gjerne bruke Meta Pixel til å måle annonsene våre og vise deg markedsføring på Metas tjenester. Den setter " +
    "informasjonskapsler og sender Meta opplysninger om besøket ditt. Ingenting lastes inn før du godtar, og du kan endre valget når som helst.",
  cookiePolicy: "Les om informasjonskapsler",
  accept: "Godta",
  reject: "Avvis",
  close: "Lukk",
};

/** For `ConsentSettingsLink`. */
export const nbConsentSettingsLinkStrings: ConsentSettingsLinkStrings = {
  label: "Innstillinger for informasjonskapsler",
};
