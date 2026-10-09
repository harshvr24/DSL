// Every value wrapped in [PLACEHOLDER …] must be replaced before launch.
// Search the repo for "PLACEHOLDER" to find them all.

export const company = {
  legalName: 'DSL HYPERSCALE ADVISORY PRIVATE LIMITED',
  shortName: 'DSL Hyperscale Advisory',
  url: 'https://www.example.com', // [PLACEHOLDER: production URL, used for canonical/OG/JSON-LD]
  email: '[PLACEHOLDER: email]',
  phone: '[PLACEHOLDER: phone]',
  address: '[PLACEHOLDER: registered address]',
  cin: '[PLACEHOLDER: CIN]',
  partnerTier: '[PLACEHOLDER: AWS partner tier]',
  offshoreCity: 'Delhi',
  onshoreLocations: 'United States · Canada · New Zealand',
};

// Clock shown above the horizon when the visitor is already on IST
// (otherwise the visitor's own timezone is used).
export const fallbackOnshore = {
  label: 'New York',
  timeZone: 'America/New_York',
};

// Contact form target. Set PUBLIC_FORM_ENDPOINT at build time
// (e.g. an API Gateway + Lambda URL, Formspree, etc.). Empty = stub mode.
export const formEndpoint: string = import.meta.env.PUBLIC_FORM_ENDPOINT ?? '';
