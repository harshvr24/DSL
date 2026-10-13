// Contact-form receiver for the DSL site. Runs as an AWS Lambda function (Node.js 22)
// behind a Function URL. The form in src/components/sections/Contact.astro posts
// JSON { name, email, company, need } to it; this checks the enquiry and emails it on.
// No packages: paste this file into the Lambda console as index.mjs.
//
// Settings (Lambda → Configuration → Environment variables):
//   RESEND_API_KEY   required  Resend key with "Sending access"
//   CONTACT_EMAIL    required  where enquiries are delivered (commas for several)
//   CONTACT_FROM     optional  sender; must be on the domain verified in Resend
//   ALLOWED_ORIGINS  optional  comma-separated sites allowed to post
//
// CORS is switched on in the Function URL's own settings, so no CORS headers are set here.

const DEFAULT_FROM = 'DSL website <contact@dslhyperscale.com>';
const DEFAULT_ORIGINS = 'https://www.dslhyperscale.com';
const LIMITS = { name: 120, email: 254, company: 160, need: 4000 }; // characters
const MAX_BODY = 10_000; // bytes
const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/;

const env = (k, fallback = '') => (process.env[k] ?? '').trim() || fallback;
const list = (v) => v.split(',').map((s) => s.trim()).filter(Boolean);
// one line: control characters (line breaks included) become spaces
const line = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim() : '');
// several lines: keeps \n and \t, drops the other control characters
const lines = (v) => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]+/g, '').trim() : '');

const reply = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

// The only provider-specific part. To change email provider, replace this function.
async function sendMail({ key, from, to, replyTo, subject, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, reply_to: replyTo, subject, text }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json().catch(() => ({}))).id;
}

export const handler = async (event) => {
  if (event?.requestContext?.http?.method !== 'POST') return reply(405, { error: 'method' });

  const headers = Object.fromEntries(Object.entries(event.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  const origin = headers.origin ?? '';
  if (!list(env('ALLOWED_ORIGINS', DEFAULT_ORIGINS)).includes(origin)) return reply(403, { error: 'origin' });

  const key = env('RESEND_API_KEY');
  const to = list(env('CONTACT_EMAIL'));
  if (!key || !to.length) {
    console.error('contact: RESEND_API_KEY or CONTACT_EMAIL is not set');
    return reply(500, { error: 'config' });
  }

  if (!(headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) return reply(415, { error: 'type' });
  const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : (event.body ?? '');
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY) return reply(413, { error: 'size' });
  let data;
  try { data = JSON.parse(raw); } catch { return reply(400, { error: 'json' }); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return reply(400, { error: 'json' });

  // Spam trap: the form's hidden "website" field. A person never fills it in.
  if (line(data.website)) return reply(200, { ok: true });

  const f = { name: line(data.name), email: line(data.email), company: line(data.company), need: lines(data.need) };
  const bad = Object.keys(LIMITS).filter((k) => !f[k] || f[k].length > LIMITS[k]);
  if (!bad.includes('email') && !EMAIL.test(f.email)) bad.push('email');
  if (bad.length) return reply(400, { error: 'invalid', fields: bad });

  const text = [
    `Name:    ${f.name}`,
    `Email:   ${f.email}`,
    `Company: ${f.company}`,
    '',
    f.need,
    '',
    '--',
    `Sent from the contact form on ${origin}. Reply to this email to answer ${f.name}.`,
  ].join('\n');

  try {
    const id = await sendMail({
      key,
      from: env('CONTACT_FROM', DEFAULT_FROM),
      to,
      replyTo: f.email,
      subject: `Website enquiry: ${f.name}, ${f.company}`,
      text,
    });
    console.log('contact: sent', id ?? '');
  } catch (err) {
    console.error('contact: send failed.', err?.message ?? err);
    return reply(502, { error: 'send' });
  }
  return reply(200, { ok: true });
};
