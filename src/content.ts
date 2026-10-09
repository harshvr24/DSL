// All page copy lives here so wording can be edited without touching layout.
// Items marked SUGGESTED are commercial or operational commitments drafted for
// review: confirm or change them before launch.
import { company } from './config';

// wrap [PLACEHOLDER …] segments so they are visibly marked
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const ph = (t: string) => esc(t).replace(/\[PLACEHOLDER[^\]]*\]/g, (m) => `<span class="ph">${m}</span>`);

export const sections = [
  { id: 'top', n: '01', t: 'Horizon', note: 'Your team logs off. The work doesn’t.', nav: false },
  { id: 'what', n: '02', t: 'What we do', note: 'AWS engineers, inside your team', nav: false },
  { id: 'sun', n: '03', t: 'Follow the sun', note: 'One backlog through 24 hours', nav: true },
  { id: 'model', n: '04', t: 'Onshore / Offshore', note: 'Two models and how they blend', nav: true },
  { id: 'team', n: '05', t: 'Team', note: 'Who you get', nav: false },
  { id: 'capabilities', n: '06', t: 'Capabilities', note: 'Seven disciplines, one estate', nav: true },
  { id: 'working', n: '07', t: 'How we work', note: 'Your accounts, repos and rules', nav: false },
  { id: 'engagement', n: '08', t: 'Engagement', note: 'First call to deployed', nav: true },
  { id: 'faq', n: '09', t: 'Questions', note: 'What procurement asks', nav: false },
  { id: 'contact', n: '10', t: 'Contact', note: 'Talk to an engineer', nav: true },
];

// 02 — three ways to engage
export const ways = [
  {
    k: 'A', name: 'Named consultants',
    d: 'One or more engineers who join your team under your lead. You run the backlog; they do the work.',
    inc: ['CVs and interviews before you commit', 'Your tools, your ceremonies', 'Day rate or monthly rate'],
    fit: 'You have a plan and a lead, and not enough hands.',
  },
  {
    k: 'B', name: 'Delivery squad',
    d: 'A lead plus engineers who take a defined outcome: a migration wave, a landing zone, a platform build.',
    inc: ['A lead in your hours', 'Written scope and acceptance', 'Weekly demo of working output'],
    fit: 'You know the outcome and want one team accountable for it.',
  },
  {
    k: 'C', name: 'Managed support',
    d: 'A run team for AWS workloads that are already in production.',
    inc: ['Monitoring and alarm triage', 'Patching, backups, restores', 'Incident response and a monthly review'],
    fit: 'The build is done and nobody wants the pager.',
  },
];

// 03 — follow the sun. Locations on the globe; onshore cities stand in for the country.
export const places = [
  { id: 'in', name: 'Delhi', role: 'offshore', zone: 'Asia/Kolkata', lat: 28.61, lon: 77.21, start: 570, end: 1110, dx: 26, dy: -40 },
  { id: 'us', name: 'United States', sub: 'New York time', role: 'onshore', zone: 'America/New_York', lat: 40.71, lon: -74.01, start: 540, end: 1080, dx: -28, dy: 44 },
  { id: 'ca', name: 'Canada', sub: 'Toronto time', role: 'onshore', zone: 'America/Toronto', lat: 43.65, lon: -79.38, start: 540, end: 1080, dx: -34, dy: -46 },
  { id: 'nz', name: 'New Zealand', sub: 'Auckland time', role: 'onshore', zone: 'Pacific/Auckland', lat: -36.85, lon: 174.76, start: 540, end: 1080, dx: 28, dy: 40 },
];

export const sunStates = {
  onshore: { t: 'Onshore has the board.', d: 'The lead on your site works with your team: decisions, reviews, stakeholder calls. Delhi is off.' },
  both: { t: 'Overlap.', d: 'Both sides are online. Stand-up, questions and the hand-over happen live.' },
  offshore: { t: 'Delhi has the board.', d: 'Your site is off. The offshore squad works the tickets from the hand-over note; pipelines run, pull requests open.' },
  none: { t: 'Note on the ticket.', d: 'Nobody is online. The hand-over note and the pipeline state hold the context until the next shift starts.' },
};

// 04 — comparison
export const compare = [
  {
    k: 'Where they sit',
    on: 'In your office or your country, inside your team, on your stand-ups.',
    off: `${company.offshoreCity}, India. On your tooling through your SSO and VPN; nothing runs on our laptops that you can’t audit.`,
  },
  {
    k: 'Hours',
    on: 'Your working day.',
    off: 'The Indian working day, with an agreed overlap window with yours for hand-over.',
  },
  {
    k: 'Fits when',
    on: 'Discovery workshops, architecture decisions with many stakeholders, regulated sites that need people in the room, production cut-overs.',
    off: 'A defined backlog: build-out, migration waves, pipelines, runbook-driven operations, coverage outside your hours.',
  },
  {
    k: 'Typical roles',
    on: 'Lead architect, engagement lead, migration lead.',
    off: 'Cloud engineers, platform and DevOps engineers, data engineers, support engineers.',
  },
  {
    k: 'Commercials', // SUGGESTED
    on: 'Day rate, time and materials.',
    off: 'Monthly rate per engineer.',
  },
];

// 04 — example team shapes (SUGGESTED sizes)
export const shapes = [
  { name: 'Migration wave', on: 1, off: 4, d: 'One lead on your site owns the wave plan and the cut-over. Four engineers in Delhi rehearse and run the moves.' },
  { name: 'Platform build', on: 1, off: 3, d: 'An architect with your product teams. Three platform engineers building modules, pipelines and clusters.' },
  { name: 'Run team', on: 1, off: 3, d: 'Support engineers on shift in Delhi through your night. A service lead in your hours for reviews and escalations.' },
];

// 05 — roles
export const roles = [
  { n: '5.1', name: 'Engagement lead', owns: 'Scope, staffing and escalation. Your single point of contact.', on: true, off: false, sits: 'Onshore' },
  { n: '5.2', name: 'Solutions architect', owns: 'Target architecture, decision records, Well-Architected reviews.', on: true, off: false, sits: 'Onshore' },
  { n: '5.3', name: 'Migration engineer', owns: 'Discovery, replication, cut-over rehearsals and runbooks.', on: true, off: true, sits: 'Offshore · on-site for cut-over' },
  { n: '5.4', name: 'Platform / DevOps engineer', owns: 'Infrastructure code, pipelines, clusters, the paved road for developers.', on: false, off: true, sits: 'Offshore' },
  { n: '5.5', name: 'Data engineer', owns: 'Ingestion, lake and warehouse models, data-quality checks.', on: false, off: true, sits: 'Offshore' },
  { n: '5.6', name: 'Security engineer', owns: 'Identity, guardrails, logging, audit evidence.', on: true, off: true, sits: 'Either side' },
  { n: '5.7', name: 'FinOps analyst', owns: 'Cost reports, rightsizing, commitment plans, tagging.', on: false, off: true, sits: 'Offshore' },
  { n: '5.8', name: 'Support engineer / SRE', owns: 'Monitoring, patching, incident response, runbooks.', on: false, off: true, sits: 'Offshore · on shift' },
];

// 06 — capabilities; `art` picks the plate drawing in the stack
export const caps = [
  {
    n: '6.01', art: 'source', plate: 'Source estate', name: 'Migration',
    d: 'Discovery, wave planning and cut-over for servers, databases and applications. Rehost where it is safe, refactor where it pays back, and keep a rollback path for every wave.',
    out: 'Portfolio inventory · wave plan · cut-over runbooks · rollback plans',
    svc: 'Application Migration Service · DMS · Migration Hub',
  },
  {
    n: '6.02', art: 'zone', plate: 'Landing zone', name: 'Architecture & Well-Architected reviews',
    d: 'A workload checked against the six pillars, returned as a ranked list of fixes with owners, not a slide deck. Landing zones and multi-account designs for new builds.',
    out: 'Findings register · target architecture · decision records',
    svc: 'Well-Architected Tool · Control Tower · Organizations',
  },
  {
    n: '6.03', art: 'platform', plate: 'Platform', name: 'DevOps & platform engineering',
    d: 'Infrastructure as code, CI/CD, container platforms and the paved road your product teams deploy on.',
    out: 'Terraform / CDK modules · pipelines · EKS or ECS baselines',
    svc: 'EKS · ECS · CodePipeline · CDK · Terraform',
  },
  {
    n: '6.04', art: 'data', plate: 'Data', name: 'Data & analytics',
    d: 'Ingestion, storage layout and query layers for data that has outgrown a single database.',
    out: 'Ingestion pipelines · lake layout · warehouse models',
    svc: 'S3 · Glue · Athena · Redshift · Kinesis · EMR',
  },
  {
    n: '6.05', art: 'guard', plate: 'Guardrails', name: 'Security & compliance',
    d: 'Identity, guardrails, logging and detection set up once across every account, with the evidence your auditors ask for.',
    out: 'SCPs and guardrails · central logging · control mapping',
    svc: 'IAM Identity Center · GuardDuty · Security Hub · KMS · Config',
  },
  {
    n: '6.06', art: 'meter', plate: 'Meter', name: 'Cost optimisation',
    d: 'Rightsizing, commitment planning and storage tiering, with every saving tied to a resource and an owner.',
    out: 'Savings register · tagging policy · commitment plan',
    svc: 'Cost Explorer · CUR · Compute Optimizer · Savings Plans',
  },
  {
    n: '6.07', art: 'run', plate: 'Run', name: 'Managed support',
    d: 'On-call for your AWS workloads: patching, backups, alarms, incident response and a monthly review. Offshore hours cover your night.',
    out: 'Runbooks · alarm catalogue · monthly report · 24-hour cover Mon–Fri, on-call at weekends', // SUGGESTED cover hours
    svc: 'CloudWatch · Systems Manager · AWS Backup',
  },
];

// 07 — working agreements
export const agreements = [
  { n: '7.1', t: 'We work in your accounts.', d: 'No shadow infrastructure. Everything we build runs in AWS accounts you own and can audit.' },
  { n: '7.2', t: 'Access through your identity provider.', d: 'Single sign-on with least-privilege roles. Access ends the day the engagement does.' },
  { n: '7.3', t: 'Your change process.', d: 'Pull requests, reviews and approvals go through your pipeline. We don’t deploy round it.' },
  { n: '7.4', t: 'A written hand-over, every shift.', d: 'Each shift closes with a note on the ticket: what changed, what is running, what is blocked, what is next.' },
  { n: '7.5', t: 'Everything stays in your repository.', d: 'Infrastructure code, runbooks and decision records are committed as we go. If we left tomorrow, you would keep all of it.' },
  { n: '7.6', t: 'One board.', d: 'Onshore and offshore take work from the same backlog in your tracker. There is no private task list on our side.' },
];

// 07 — sample hand-over note. Illustrative only; labelled as an example on the page.
export const note = {
  ticket: 'PLAT-412',
  title: 'Move orders-api to EKS (staging)',
  from: 'Offshore · Delhi · 18:25 IST',
  to: 'Onshore lead',
  blocks: [
    { k: 'Done', items: ['Helm chart merged (PR #218), deployed to staging by pipeline run #1432', 'Autoscaling set to 2–6 pods; load test at 300 rps passed'] },
    { k: 'Running', items: ['Soak test until 02:00 UTC. Dashboard: orders-api / staging'] },
    { k: 'Blocked', items: ['Database security-group rule needs approval (CHG-0931) before production'] },
    { k: 'Next', items: ['After approval: production deploy behind a 10% weighted route'] },
  ],
};

// 07 — access (SUGGESTED: confirm these match how you operate)
export const access = [
  { t: 'NDA first', d: 'Signed before anyone sees an account, a repo or a diagram.' },
  { t: 'Your device policy', d: 'Your VDI, your managed laptops or ours: whichever your security team requires.' },
  { t: 'Your network path', d: 'VPN or zero-trust access you control and can switch off.' },
  { t: 'Production on your terms', d: 'Offshore access to production only if you grant it. Many clients keep it behind their own approval step.' },
];

// 08 — engagement steps (SUGGESTED durations)
export const steps = [
  { t: 'T0', name: 'First call', dur: '30 min', d: 'Thirty minutes with an engineer. Bring the workload and the problem; we’ll ask about both.', bring: 'The workload, the deadline, the constraint that worries you.', get: 'A straight answer on whether we can help, and who would do it.' },
  { t: 'T1', name: 'Scope', dur: '2–3 days', d: 'Roles, seniority, onshore / offshore split, overlap hours, security requirements.', bring: 'An hour with whoever owns the backlog.', get: 'A one-page scope: roles, split, overlap hours, start date.' },
  { t: 'T2', name: 'Profiles', dur: '3–5 days', d: 'Named consultants, with CVs. You interview them; you can say no.', bring: 'An hour per interview.', get: 'CVs of named people. You choose.' },
  { t: 'T3', name: 'Contract', dur: 'about 1 week', d: 'NDA, MSA and a statement of work.', bring: 'Your paper or ours.', get: 'Signed NDA, MSA and statement of work.' },
  { t: 'T4', name: 'Onboarding', dur: '3–5 days', d: 'Accounts, SSO, VPN, hardware, your security induction.', bring: 'SSO groups, network access, your induction.', get: 'Consultants with working access and a first-week plan.' },
  { t: 'T5', name: 'Deployed', dur: '2–4 weeks from first call', d: 'Consultants in your stand-up and on your board.', bring: 'A place on the board.', get: 'The first hand-over note, at the end of day one.' },
];

// 09 — FAQ (SUGGESTED answers; 9.2, 9.6 and 9.7 are commitments)
export const faqs = [
  { n: '9.1', q: 'Who manages the consultants day to day?', a: 'For named consultants, you do: they join your stand-ups and take work from your board. For a delivery squad, our lead manages the team and reports to one owner on your side.' },
  { n: '9.2', q: 'What if someone isn’t working out?', a: 'Tell the engagement lead. We replace the consultant and cover the hand-over between them at our cost.' },
  { n: '9.3', q: 'Who owns the code and the documents?', a: 'You do. Everything is committed to your repositories and written in your tools from the first day.' },
  { n: '9.4', q: 'How much overlap do we get with Delhi?', a: 'It depends on your time zone; the chart in section 03 shows it for yours. Where there is no natural overlap, part of the squad shifts its hours so stand-up is live.' },
  { n: '9.5', q: 'Can offshore engineers touch production?', a: 'Only if you allow it. Many clients keep production changes with onshore staff or behind their own approval step, and the squad works through the pipeline.' },
  { n: '9.6', q: 'What is the smallest engagement?', a: 'One consultant for one month. Reviews, such as a Well-Architected review, are fixed-scope and shorter.' },
  { n: '9.7', q: 'How do we end it?', a: 'Thirty days’ notice. The final hand-over is a walkthrough plus the documents that are already in your repository.' },
  { n: '9.8', q: 'Which tools do you work with?', a: 'Yours. Commonly Terraform or CDK, GitHub or GitLab, Jira, Slack or Teams, and the AWS services listed under Capabilities.' },
];
