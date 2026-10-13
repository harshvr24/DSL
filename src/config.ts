// Values still wrapped in [PLACEHOLDER …] are waiting on real details. The page leaves
// those items out until they are filled in; search the repo for "PLACEHOLDER" to find them.

export const company = {
  legalName: 'DSL HYPERSCALE ADVISORY PRIVATE LIMITED',
  shortName: 'DSL Hyperscale Advisory',
  url: 'https://www.dslhyperscale.com', // keep in step with `site` in astro.config.mjs
  email: 'info@dslhyperscale.com',
  phone: '+91 99581 87994',          // as shown on the page
  phoneHref: 'tel:+919958187994',    // as dialled
  address: '[PLACEHOLDER: registered address]',
  cin: 'U62020UP2026PTC253531',
  partnerTier: '[PLACEHOLDER: AWS partner tier]',
  partnerBadge: '', // [PLACEHOLDER: official AWS Partner badge] put the file in /public and set its path, e.g. '/aws-partner-badge.png'
  offshoreCity: 'Delhi',
  onshoreLocations: 'United States · Canada · New Zealand',
};

/** True once a value has been filled in (is not a [PLACEHOLDER …] and not empty). */
export const isSet = (v: string) => !!v && !v.startsWith('[PLACEHOLDER');

// Clock shown above the horizon when the visitor is already on IST
// (otherwise the visitor's own timezone is used).
export const fallbackOnshore = {
  label: 'New York',
  timeZone: 'America/New_York',
};

// Contact form target. Set PUBLIC_FORM_ENDPOINT at build time
// (e.g. an API Gateway + Lambda URL, Formspree, etc.). Empty = stub mode.
export const formEndpoint: string = import.meta.env.PUBLIC_FORM_ENDPOINT ?? '';
