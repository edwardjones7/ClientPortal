/**
 * Live Call Simulator — question bank and scoring config for the sales-rep
 * training quiz. Pure data + tiny helpers, no server imports — safe to import
 * from client components (mirrors the lib/courses.ts convention).
 *
 * Categories: p = Pricing & Money, w = Ownership & IP, r = Trust & Skepticism,
 * s = Process & Support.
 */

export type SimCategory = "p" | "w" | "r" | "s";

export interface SimQuestion {
  cat: SimCategory;
  /** Caller label shown above the quote. */
  who: string;
  /** What the caller says. */
  q: string;
  /** Four candidate responses. */
  opts: [string, string, string, string];
  /** Index of the playbook-correct response in `opts`. */
  a: number;
  /** Explanation shown after answering. */
  x: string;
}

export const SIM_CATEGORIES: Record<
  SimCategory,
  { label: string; color: string }
> = {
  p: { label: "Pricing & Money", color: "var(--color-accent)" },
  w: { label: "Ownership & IP", color: "var(--color-progress)" },
  r: { label: "Trust & Skepticism", color: "var(--color-waiting)" },
  s: { label: "Process & Support", color: "var(--color-resolved)" },
};

export const SIM_PASS_PCT = 90;
export const SIM_SECONDS_PER_QUESTION = 45;

export function formatSimDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export const SIM_QUESTIONS: SimQuestion[] = [
  // ===== PRICING & MONEY (13) =====
  {
    cat: "p",
    who: "HVAC owner",
    q: "Why do I have to keep paying every month? I’d rather just buy the AI thing outright.",
    opts: [
      "You’re licensing access to a system we run — the monthly keeps it live, hosted, and improving, and if it stops, the system stops. The website side is different: that part you do own outright.",
      "You’re licensing access rather than buying — though for a client committing long-term, we can structure the license to convert to full ownership once you’ve been with us a couple of years.",
      "You’re not really buying software either way — you’re buying booked jobs. Owned versus licensed matters less than whether the phone rings, and the monthly is what keeps the phone ringing.",
      "It’s licensed rather than sold because the AI needs our infrastructure to run — but the configuration and prompts tuned to your business are yours, so the intelligence itself you keep.",
    ],
    a: 0,
    x: "License framing plus honesty about the split — AI licensed, website owned. “Converts to ownership later” is a vesting promise that can’t exist; “ownership doesn’t matter” dodges the question; “you keep the intelligence” hands them a piece of the engine.",
  },
  {
    cat: "p",
    who: "Roofing owner",
    q: "Drop the monthly and I’ll pay you more upfront. Deal?",
    opts: [
      "I can’t remove it, but I can honor the intent — prepay twelve months at signing and we’ll lock the retainer at today’s rate for the life of the account. One payment, no surprises.",
      "No — on the AI side the monthly IS the license, so removing it removes the product. If it’s the cash structure you’re solving for, I’ve got real flexibility on how the build fee gets paid.",
      "The monthly is the license, so it can’t go to zero — but I hear you. Let’s raise the build and cut the monthly in half: license stays active, and you get the lower recurring number you want.",
      "That works cleanly on the website side, where the monthly is optional anyway — and we can mirror the same shape on the AI: heavier upfront, leaner monthly, everything stays live.",
    ],
    a: 1,
    x: "Hold the monthly entirely; flex only on build-fee terms. Prepay-and-lock invents a deal; “cut it in half” caves while quoting the license rule; mirroring the website’s optional structure onto the AI blurs the two products.",
  },
  {
    cat: "p",
    who: "Plumber",
    q: "That’s too expensive. It’s out of my budget.",
    opts: [
      "Fair — and rather than guess at what’s behind that, let me just take the pressure off directly: we’ll split the build across milestones so the timing never pinches your cash flow.",
      "Fair. Most owners who say that are really asking whether it pays for itself — so let me walk you through the math on what a single extra booked job covers each month.",
      "Fair — before I respond to it, is it the timing of the cash, or that you’re not sure it’s worth it yet? Because I’d answer those two concerns in completely different ways.",
      "Fair question to raise. What were you budgeting for this? If I know the number you need to hit, I can tell you honestly whether we can build something real at that level.",
    ],
    a: 2,
    x: "Clarify before you address — always. Milestones assume it’s a cash gap; ROI math assumes it’s a value gap; asking their budget teaches them the price bends. All three skip the diagnostic question.",
  },
  {
    cat: "p",
    who: "Electrician",
    q: "The other guy quoted me half of what you’re asking.",
    opts: [
      "You can find cheaper — but a site built to book jobs instead of just exist takes senior people and real hours. That gap is roughly what building it properly actually costs.",
      "Totally fair to compare. Send his scope over and I’ll mark the gaps honestly — and if he’s genuinely covering what we cover, take his deal and I’ll tell you so to your face.",
      "That gap says more about him than about us — half-market quotes usually mean templates, offshore work, or a bait number that grows later. I’d ask him what happens after launch.",
      "You can get cheaper, sure. The difference is what it’s built to do — one’s built to exist, ours is built to book jobs. A site that looks fine but converts nobody costs you twice.",
    ],
    a: 3,
    x: "Reframe the comparison — exist vs convert — without auditing his quote or attacking him. Option one borrows the right language but anchors the price to YOUR costs; the “honest audit” is still an audit; option three is a competitor attack in a trench coat.",
  },
  {
    cat: "p",
    who: "Landscaper",
    q: "Can you take some stuff out to lower the price?",
    opts: [
      "We can — it’s modular. But let’s cut by phasing, not gutting: launch the pieces that drive leads first, add the rest once it’s producing. Lower number now, without a weaker product.",
      "The build is engineered as a system — pulling pieces out hands you something that underperforms, and I won’t sell you that version. Scope stays; where I can move is payment terms.",
      "Sure — walk me through which pieces feel least essential to you and I’ll re-quote without them today. It’s your build, and my job is to fit it honestly to your number.",
      "Rather than pull scope, let’s trade — commit to a kickoff this week plus a testimonial down the road, and I’ll sharpen the total for you without touching what’s inside the build.",
    ],
    a: 0,
    x: "Phase, don’t gut — and don’t refuse. Option two borrows “I won’t sell you the version that fails you” to dodge a legitimate scope-down; option three cuts wherever they point; option four answers a scope question with a discount.",
  },
  {
    cat: "p",
    who: "Pest control owner",
    q: "What’s this actually going to cost me?",
    opts: [
      "Foundation, Growth, and Systems — three tiers at twenty-four, forty-eight, and seventy-nine hundred flat, monthly included in each. Pick the lane that fits your business and we can start as early as this week.",
      "Depends what we’re solving — a converting site starts around fifteen hundred to thirty-five with a monthly; a full AI-capture system runs six thousand up. Exact number once I know the business.",
      "I don’t quote ranges — every business is different, and a number without context anchors us both badly. Let’s do a proper discovery call first and I’ll price it precisely for you.",
      "Entry work starts around fifteen hundred, and honestly we can find something workable at almost any budget — tell me yours and I’ll build the scope backwards from that number.",
    ],
    a: 1,
    x: "Anchors as the shape of the conversation, exact number later. Option one turns the tier names into a fixed menu with invented prices; refusing all numbers stalls trust; “any budget” teaches them the price is soft.",
  },
  {
    cat: "p",
    who: "Auto shop owner",
    q: "Why is your monthly higher than the other AI company I talked to?",
    opts: [
      "Ours carries hosting, infra, and support — and if theirs looks lighter, that’s usually what’s missing. Get me their line items and I’ll show you exactly where the difference hides.",
      "Because the number covers what your system actually consumes — hosting, compute, support hours. Cheaper monthlies are subsidized somewhere, usually buried inside the build fee.",
      "Ours includes hosting, infrastructure, and full support — nothing on your plate. Rather carry infra yourself? There’s a lower-monthly structure for that. Which way do you want to operate?",
      "Two structures exist for exactly this reason — full-service, or run your own infra. Tell you what: start on the lighter one, and when you outgrow it we’ll credit your first month back.",
    ],
    a: 2,
    x: "Give them the choice — full-service value or the lower-retainer structure — and let them self-select. Option one is the right framing welded to a quote audit; cost-consumption framing sells the retainer as expenses; option four invents credits.",
  },
  {
    cat: "p",
    who: "Tree service owner",
    q: "I’m not signing up for another subscription. I’m drowning in monthly fees already.",
    opts: [
      "This one consolidates fees you already pay — hosting, plugins, the guy who fixes things. One number replaces three or four, so your total monthly outlay may actually go down.",
      "I get it — and this isn’t rent, it’s upkeep on an asset. A site has to stay fast, secure, and keep converting or your competitors pass you. Skip it and a nice site slowly rots.",
      "Completely understand — it’s month-to-month with no long contract, so it’s not a subscription in the way that traps people. You can walk away whenever you want, zero penalty.",
      "Nobody wants another bill — so let’s de-risk it: run the first ninety days, and if you don’t feel it earning its keep, we’ll sit down and rework the arrangement together.",
    ],
    a: 1,
    x: "Fee to function: the monthly is what keeps the asset alive and improving. Consolidation math frames it as costs; “cancel anytime” undersells what it does; the 90-day rework offer announces that the number is negotiable.",
  },
  {
    cat: "p",
    who: "Med spa owner",
    q: "Give me a discount and I’ll sign right now.",
    opts: [
      "I’ll trade with you — not for signing today, that’s not a trade — but a testimonial and case study once we get you results, or a locked kickoff this week, and I’ve got room to move.",
      "Signing today is worth something real to both of us — call it ten percent, and honestly you’ve earned it just by being decisive while everyone else takes three weeks to decide.",
      "The number holds — discounting for whoever asks would shortchange every client who paid full rate. What I’ll promise instead is that the work itself will justify what you paid.",
      "Keep the price where it is and I’ll add the review-generation setup at no charge — you get more value in the deal and we don’t start the relationship by cheapening the work.",
    ],
    a: 0,
    x: "Trade for something durable — a testimonial, a case study, a locked kickoff. “Decisiveness” is a discount wearing a compliment; the flat no wastes convertible urgency; the free add-on is still value handed over for nothing.",
  },
  {
    cat: "p",
    who: "HVAC owner",
    q: "What do I get for the $499 a month exactly?",
    opts: [
      "Three things — unlimited support with same-day response, up to three hours a month of updates, and the license keeping the system live. Bigger features get scoped for approval.",
      "The honest breakdown is operational — hosting, compute for the AI, monitoring, plus the engineering hours your account consumes in a typical month. It maps to what running you costs.",
      "Unlimited support, monthly update hours, the license — and as a retainer client, priority queueing plus a preferred hourly rate whenever you want features built beyond original scope.",
      "Day-to-day, whatever you need — questions, changes, fixes, ideas. The monthly exists so you never see another invoice from us for anything short of a brand-new project.",
    ],
    a: 0,
    x: "Three buckets, stated plainly — including that big features cost extra. Option two prices the retainer as your costs; option three lists the right buckets then invents perks; “whatever you need” overpromises and burns trust at the first scoped quote.",
  },
  {
    cat: "p",
    who: "Roofer",
    q: "Do I have to pay everything upfront?",
    opts: [
      "Half at signing, half at launch — the balance stays tied to delivery. And the monthly doesn’t begin until the month after your site is actually live and working for you.",
      "Half at signing, half at launch — and if cash is tight at the start, we can flip it: smaller deposit now, heavier back end once the site’s producing. Same total, friendlier curve.",
      "We ask for the full amount at signing, but with a satisfaction checkpoint at launch — if we haven’t delivered what was promised, we make it right before you owe anything more.",
      "Deposit-light — a quarter down to start, and the remaining balance spreads across your first year of the monthly so the build barely registers against your cash flow.",
    ],
    a: 0,
    x: "50/50, monthly starts the month after launch — that exact structure is also your de-risk story. Option two invents a flexible variant of the true answer; checkpoints and quarter-down spreads are terms nobody authorized.",
  },
  {
    cat: "p",
    who: "Cafe owner",
    q: "A new website won’t pay for itself. It’s just an expense.",
    opts: [
      "What’s one catering order worth to you? One extra booked job a month and it’s covered itself. Every person who lands on a confusing site and leaves — that’s revenue walking out.",
      "It pays for itself, and I’ll prove it your way — analytics from day one, every call and order traced to the site, so within a quarter the return is a number, not an argument.",
      "The category data is strong — professionally rebuilt sites see meaningful conversion lift in year one, before even counting mobile, which is where most of your traffic lives now.",
      "Some of the return is honestly unmeasurable — credibility compounds quietly. But the measurable part alone, captured leads and bookings, tends to clear the cost within months.",
    ],
    a: 0,
    x: "Their job value, their leak — make them feel it. Analytics promises to measure value rather than establish it; category data is someone else’s business; conceding unmeasurability gives the objection a foothold.",
  },
  {
    cat: "p",
    who: "Locksmith",
    q: "Money’s tight right now. Can we start for free and I pay you when it makes me money?",
    opts: [
      "We can’t start free — but we can shape the cash flow: split the build fee, tie payments to milestones, phase the lead-driving core first. You see it working before the rest is due.",
      "We can’t do free, but here’s close — the build fee waits ninety days while the monthly starts now, so the big number only lands after you’ve already watched it work.",
      "There’s a version of that — revenue share. Nothing upfront, we take a slice of what the site books for a year. You pay more over time, but your risk today is genuinely zero.",
      "If the budget truly isn’t there, pushing now serves neither of us — let’s pick this up next quarter when it loosens, and I’ll flag you first if our calendar starts filling.",
    ],
    a: 0,
    x: "Split, milestones, phasing — structure the cash flow with tools that exist. Deferred-fee and revenue-share “versions” are invented deals; walking away skips the structure that could have closed it.",
  },

  // ===== OWNERSHIP & IP (10) =====
  {
    cat: "w",
    who: "Franchise owner",
    q: "So if I’m paying all this money, I own the AI system, right?",
    opts: [
      "You own everything specific to your business — data, content, configurations. The engine itself is our platform, licensed to you: live, hosted, and improving while the license runs.",
      "You own everything specific to your business — and the engine is licensed, though the prompts and tuning we build around your operation are business-specific, so those transfer as yours.",
      "Functionally, yes — the license is perpetual, so it’s yours to use forever and no one can take it away. The distinction between that and ownership is mostly a legal formality.",
      "Not on day one — ownership builds. The build fee plus your first two years of the retainer effectively amortize the purchase, after which the monthly covers only hosting and support.",
    ],
    a: 0,
    x: "Business-specific yours, engine licensed — clean line. Option two sneaks the prompts and tuning (engine parts) into the “yours” bucket; “perpetual equals ownership” erases the distinction the whole model rests on; vesting doesn’t exist.",
  },
  {
    cat: "w",
    who: "E-commerce client",
    q: "Who owns the website when it’s done?",
    opts: [
      "You do — code, design, deployment, everything, yours on payment. Work for hire, plain and simple: walk away tomorrow and the whole thing goes with you, nothing owed.",
      "You do — fully, on payment. The one operational note is that access runs through our deployment layer, so completely independent control lands after the first retainer year.",
      "You own it in every practical sense — use, modify, move it anywhere. We keep a nonexclusive license back so patterns from the work can inform future client builds.",
      "The custom work is yours outright — design, content, business logic. The shared components underneath ride the same platform license as everything else we deploy for you.",
    ],
    a: 0,
    x: "Work for hire, no strings — and absolutely no “deployment layer” or delayed control; implying any hold on a website is on the never list. License-back clauses and “shared components” quietly move the site into the licensed bucket.",
  },
  {
    cat: "w",
    who: "Coffee co. owner",
    q: "What exactly do I own versus what do you own?",
    opts: [
      "Three layers — your business-specific work — data, brand, configs, custom code — is yours outright; our reusable platform is ours and licensed to you; the open-source underneath belongs to nobody.",
      "Three layers — yours, ours-licensed, and open-source. The dividing line in practice: anything we’d reuse for another client is platform, and anything we wouldn’t is yours, judged build by build.",
      "Cleanest way to hold it: what your customers see and touch is yours; what makes it run behind the scenes is ours under license. Front of house yours, back of house ours.",
      "You own the data and the content without question; the design and code sit under the platform license — one consistent legal structure across the website and the AI both.",
    ],
    a: 0,
    x: "The three layers with the real boundary: business-specific vs reusable-platform vs open-source. Option two quotes the layers then makes the line a judgment call; front/back-of-house misplaces custom back-end work; option four licenses what the client owns.",
  },
  {
    cat: "w",
    who: "Multi-location owner",
    q: "Can I take your platform and offer it to the other franchisees in my network?",
    opts: [
      "Your license covers what you directly own and operate. Franchisees are their own businesses — that’s a separate deal, and a good one: we’d scope it together, revenue share or otherwise.",
      "Your license covers your direct operations — and a franchise network under your brand and agreement generally qualifies as that, so your locations can standardize without extra paperwork.",
      "Not under your license — but there’s a clean path: each franchisee signs their own standard agreement at standard rates, and volume like that usually earns the network some consideration.",
      "The field-of-use clause is strict there — entities you own outright only, no franchisee path under the current structure. It’s the one hard ceiling in an otherwise flexible license.",
    ],
    a: 0,
    x: "Franchisees are separate businesses — separate conversation, framed as an opportunity, escalated to Eddie. “Brand umbrella” coverage stretches the license; quoting per-seat rates invents a deal; the hard-no slams a door the model deliberately leaves open.",
  },
  {
    cat: "w",
    who: "Skeptical operator",
    q: "If I ever leave, do I lose everything I paid for?",
    opts: [
      "Your website stays yours, your data exports anytime, and client-hosted code has been in your GitHub since day one. The AI goes dark — that’s the rented part, better you hear it now.",
      "Website stays, data exports, code’s in your GitHub — and for the AI, you keep the configuration snapshot, so a capable developer could stand up something equivalent on your own infrastructure.",
      "Nothing shuts off abruptly — there’s a standard ninety-day wind-down where everything runs while you migrate or reconsider. After that, the licensed pieces come offline on schedule.",
      "You’d lose the licensed platform access, though in practice we’ve never left anyone stranded — offboarding gets worked case by case and we always land somewhere both sides call fair.",
    ],
    a: 0,
    x: "Exact honesty: site stays, data exports, license survives, AI goes dark — said proudly, not apologetically. “Configuration snapshots” hand over engine internals; wind-down windows don’t exist; case-by-case vagueness reads as a trap.",
  },
  {
    cat: "w",
    who: "Technical founder",
    q: "Do I get the source code?",
    opts: [
      "Client-hosted, yes — your GitHub from day one, pushed continuously through the build, documented well enough that any qualified developer could pick it up without us in the room.",
      "Yes — continuously through the build you have read access for review, and the full transfer with write control completes at launch alongside the final payment milestone.",
      "Yes, with belt-and-suspenders — it’s in your repositories as we work, and a sealed copy sits in third-party escrow that releases automatically if we ever ceased operating.",
      "The complete handoff package lands at project close — repository export, documentation, deployment guides — once the final payment clears and the launch checklist is signed off.",
    ],
    a: 0,
    x: "Day one, their repos, continuous pushes — that IS the architecture. Read-now-write-later staging and launch-day handoffs contradict it; the escrow embellishment adds a mechanism we don’t have to an answer that didn’t need it.",
  },
  {
    cat: "w",
    who: "Owner with a dev friend",
    q: "Can I modify the code myself or have my own developer work on it?",
    opts: [
      "Yes — modification rights are in the license, any developer you choose, standard tools throughout. The restriction is commercial reuse: selling it, repackaging it, offering it to others.",
      "Yes — full modification rights, any developer. Just know that code changed outside our process falls outside retainer update coverage, since we can’t maintain what we didn’t write.",
      "Yes for everything business-specific — that’s yours to change freely. The licensed platform files stay read-only to protect the IP, with deeper changes routed through us as scoped work.",
      "Yes, through the contributor path — your developer gets repository access after a short onboarding review, and merges touching licensed components get a quick check from our side.",
    ],
    a: 0,
    x: "Any developer, full modification rights, no gates — the only line is commercial reuse. Warranty-void carve-outs, read-only platform files, and contributor onboarding all add friction the license doesn’t contain and undercut the continuity story.",
  },
  {
    cat: "w",
    who: "Wholesale client",
    q: "What happens to my customer data if we part ways?",
    opts: [
      "It’s yours — always was. Exports, records, order history: available anytime, in standard formats, whether we’re actively working together or not. Nothing about leaving changes that.",
      "It’s yours — full export delivered within thirty days of offboarding per the agreement, formatted for whatever system you’re moving to, verified complete before we close out.",
      "Yours completely — we handle the migration to your next platform as part of offboarding, with a modest transition fee covering the formatting and verification work involved.",
      "Yours, with one footnote — anonymized aggregates, stripped of anything identifying, stay in the improvement pipeline that makes the platform better across every client we serve.",
    ],
    a: 0,
    x: "Anytime, standard formats, no process and no conditions — leaving changes nothing. A 30-day delivery window invents a gate; transition fees monetize their own data; “anonymized aggregates” concedes a retained copy that doesn’t exist.",
  },
  {
    cat: "w",
    who: "Cautious buyer",
    q: "You’re telling me you can license this same platform to my competitors?",
    opts: [
      "The license is non-exclusive — the platform improves across clients and you get each improvement free. Your data, brand, and custom work never travel. If exclusivity matters, we can talk.",
      "Non-exclusive, yes — improvements flow to everyone, your custom work stays yours — and informally we avoid signing direct local rivals, so in practice the situation never really arises.",
      "Yes, the same way every platform you already run your business on works — your accounting software never promised your competitors couldn’t buy it. That’s just modern software.",
      "Technically yes — and we treat it with care: any potential conflict in your area gets flagged to you before we sign them, so you’d never be blindsided by a competitor on it.",
    ],
    a: 0,
    x: "Non-exclusive sold as a feature, custom work protected, exclusivity escalated — not promised. Option two wraps an unkeepable informal market rule inside the correct answer; “everyone does it” wins the argument and loses the buyer; conflict-flagging is a promise you can’t keep.",
  },
  {
    cat: "w",
    who: "Handy prospect",
    q: "If the AI is so great, why won’t you just sell it to me outright? Feels like a trap.",
    opts: [
      "Because it doesn’t sit still — it runs on our infrastructure and improves constantly; a frozen copy is outdated in six months. The license means you always hold the current version.",
      "Because it protects you as much as us — you skip the maintenance liability and staffing burden of running AI infrastructure, and we keep quality control over how the work performs.",
      "Because a sale would drag hosting contracts, model agreements, and infrastructure relationships along with it — the legal and technical tangle makes outright transfer impractical.",
      "Honestly? Almost anything has a number. If owning it outright matters that much, let me carry a serious offer up to ownership and find out whether some version of that deal exists.",
    ],
    a: 0,
    x: "The living-system logic is the honest answer to suspicion. Mutual-protection framing is a half-answer; the legal-tangle excuse implies it’s merely inconvenient rather than off the table; “everything has a number” puts the engine on the market.",
  },

  // ===== TRUST & SKEPTICISM (13) =====
  {
    cat: "r",
    who: "Burned owner",
    q: "The last agency took my money and gave me a slow, generic site. How do I know you won’t do the same?",
    opts: [
      "You’d be crazy not to be skeptical. So let the structure carry it — payments tied to milestones, real work before more money moves — and here’s a business like yours we did this for. Call them.",
      "You’d be crazy not to be skeptical — so let’s shrink the bet: a small paid pilot first, one page and one campaign, and you judge the actual work at low stakes before the full build.",
      "Milestone payments, absolutely — and beyond that, a written commitment: if the site misses the numbers we project together, we keep working at no charge until it hits them.",
      "That experience is the exact reason we exist — specialists in service businesses, built to convert rather than decorate, and you work directly with the person building it. No black box.",
    ],
    a: 0,
    x: "Acknowledge the burn, de-risk with milestones, close with a callable peer (Lyons Electrical). The pilot borrows the acknowledgment then shrinks the deal; the performance guarantee will be collected on; the why-us pitch sells hardest when the moment wants proof, not pitch.",
  },
  {
    cat: "r",
    who: "DIY-minded owner",
    q: "Why can’t my nephew just do this? Or I’ll use Wix.",
    opts: [
      "You could — if a site that exists is all you need, that’s fine. But your time beats three weekends fighting a builder, and those tools aren’t built to convert. Your trade’s yours; this one’s mine.",
      "You could — and if you go that route, have him start from a conversion-first template and I’ll happily review the result, then quote only the gaps that genuinely need a professional.",
      "Genuinely no judgment on the tools — but the pattern is predictable: they hold up for a year, the business outgrows them, and the rebuild happens anyway — just later, under pressure, and at a worse price.",
      "Let’s make it concrete instead of abstract — I’ll send a side-by-side of what builders include versus what we build: load speed, capture, booking flow. The checklist settles it.",
    ],
    a: 0,
    x: "Respect the option, reframe on time and existing-vs-converting, land “your trade, my trade.” Reviewing the nephew’s work makes you the cleanup crew; the outgrow-it warning is a soft insult with a deadline; checklists start a feature war.",
  },
  {
    cat: "r",
    who: "Word-of-mouth believer",
    q: "I don’t even need a website. All my business comes from word of mouth.",
    opts: [
      "Word of mouth is your best source — and the referred customer still looks you up first. If what they find looks dated, the warm lead your reputation earned goes cold. A good site protects that.",
      "Word of mouth is the best source there is — the catch is it ages with your customer base. The next wave of homeowners searches first, asks second, so that engine slowly shrinks.",
      "Word of mouth got you here — the ceiling is that referrals plateau near your size, and growth past that point historically needs digital channels layered on top of reputation.",
      "Respect that completely — so let’s keep it minimal: a clean one-pager, just so something presentable appears when people search your name. Light, fast, genuinely inexpensive, and honest about what you need.",
    ],
    a: 0,
    x: "Honor the strength and show the site protecting it — the referral looks you up before calling. The aging-customer-base and plateau lines argue with their identity while praising it; the cheap one-pager solves a smaller problem than the one they have.",
  },
  {
    cat: "r",
    who: "Content owner",
    q: "My current website is fine. It does the job.",
    opts: [
      "It might be — quick gut check: how many visitors leave without calling? How fast is it on a phone? When’d you last trace a job to it? Easy yeses, you’re set. Shrugs — that’s worth a look.",
      "It might be — and rather than trade opinions, let me run a free audit and send the findings: speed, mobile, capture, visibility. Ten minutes of reading settles it with zero guesswork.",
      "It might be — the catch is that fine gets graded on a curve: customers compare three companies before calling, and fine loses to great even when nothing about it is broken.",
      "It might well be — you know your business best. Would it be alright if I checked in every quarter or so? Things change, and I’d rather be a familiar name when they do.",
    ],
    a: 0,
    x: "Audit out loud — the questions make them feel the cost of “fine” in their own numbers. The free-audit report is homework that stalls; “fine loses to great” argues at them; the quarterly check-in politely ends the sale.",
  },
  {
    cat: "r",
    who: "Small-town skeptic",
    q: "You guys are just another company in a polo shirt selling “digital marketing.” I’ve heard this pitch before.",
    opts: [
      "Fair — usually that pitch came from a template shop, a vanished freelancer, or an agency treating you like a rounding error. We built this for owner-operators — and you talk to the builder.",
      "Fair — so no pitch. Give me twenty minutes to map where your leads leak right now, free and no strings, and if I can’t show you something real by the end of it, you’ve lost nothing but the coffee.",
      "Fair — though the category’s wrong: we’re a software studio, not marketers. We ship systems that book jobs; impressions, campaigns, and that whole vocabulary aren’t what we sell.",
      "Fair — and the record answers better than I can: four-hundred-plus reviews across businesses like yours, retention most agencies would kill for. The pattern is the rebuttal.",
    ],
    a: 0,
    x: "Name the three burns and plant the positioning in the gap, ending on “the person who builds it.” Free-audit hooks smell exactly like the pitch they’re tired of; category corrections and stat-flexing deflect the feeling instead of meeting it.",
  },
  {
    cat: "r",
    who: "Nervous owner",
    q: "What happens to my business if you guys disappear tomorrow?",
    opts: [
      "It keeps running — by design, not promise: your site is yours, code’s in your GitHub, documentation’s complete, standard tools any developer maintains, data exports anytime.",
      "It keeps running through the transition clause — our agreements obligate a clean migration to another provider before anything winds down, so the scenario has a written answer.",
      "It keeps running because the infrastructure outlives us — redundant backups across regions and providers mean even total failure on our end can’t take your systems down with it.",
      "It’s the right thing to check — and for whatever it’s worth, we’re profitable, growing, and boring in the good way. The doomsday case is one I genuinely don’t lose sleep over.",
    ],
    a: 0,
    x: "Architecture, not promises: GitHub, docs, standard tools, exportable data. Transition clauses don’t exist to cite; backups answer a different question; “we’re stable” asks them to trust the exact thing they’re stress-testing.",
  },
  {
    cat: "r",
    who: "Referral-checking prospect",
    q: "Can you show me proof this works for a business like mine?",
    opts: [
      "Lyons Electrical in Blackwood — same kind of business, same kind of owner, four-hundred-plus reviews. I’ll connect you directly; ask them anything. A peer beats anything I’d say.",
      "Better than proof — skin in the game: if lead volume hasn’t risen ninety days after launch, we work free until it has. Confidence you can hold us to beats a reference call.",
      "I’ll send the before-and-after numbers — traffic, conversion, booked calls — for three service businesses in your bracket. Hard data reads cleaner than any testimonial would.",
      "Three written testimonials, names and businesses attached so you can verify every one — real owners in the trades describing what changed. I’ll have them to you this afternoon.",
    ],
    a: 0,
    x: "The live peer connection, offered with total confidence, is the strongest proof in the kit. The results guarantee is a liability dressed as boldness; data packets and verified testimonials are real but weaker forms of the same thing.",
  },
  {
    cat: "r",
    who: "Spouse-checking owner",
    q: "I need to run this by my wife first — she handles the money.",
    opts: [
      "Smart — make it a joint call. What will she want to know? I’ll arm you with those answers now, and let’s hold fifteen minutes Thursday so you’re not defending it solo.",
      "Smart — and let me make her read easy: a one-page summary tonight, numbers, timeline, what you get. Five minutes of her time and you two can decide on your own schedule.",
      "Smart — quick question first, though: what would she need to see for this to be a yes? If I know her sticking point in advance, the proposal can answer it before she asks.",
      "Smart — and to give you two something concrete to weigh, I’ll send both versions: the full build and a leaner starting point, so the conversation is which, not whether.",
    ],
    a: 0,
    x: "Arm them AND book the joint call — both halves, or the deal dies silently. The one-pager travels alone into a decision you’re not in; probing her objection without the meeting is half the move; two price options invites picking the small one.",
  },
  {
    cat: "r",
    who: "Hesitant prospect",
    q: "This all sounds good, but let me think about it.",
    opts: [
      "Of course — it’s a real decision. Just so I’m useful while you do: which part do you most want to sit with — the price, the timing, or whether it’ll actually work for your business?",
      "Of course — take the week, genuinely. Let’s hold Friday morning on the calendar so I can hear where you landed and clear up whatever surfaced while you sat with it.",
      "Of course — one practical note while you do: the build calendar runs about three weeks out, so I’ll keep your slot warm through Friday and we can decide from there.",
      "Of course — and while it’s fresh, worth restating what you told me: untraceable ad spend, a site older than your work, after-hours calls dying. Those don’t resolve on their own.",
    ],
    a: 0,
    x: "Surface the real concern — price, timing, or fit — before anything else. Booking Friday schedules the fog rather than clearing it; the warm-slot line is manufactured scarcity; restating their pains is a re-pitch wearing a recap costume.",
  },
  {
    cat: "r",
    who: "Busy contractor",
    q: "Now’s not a good time. Call me after the busy season.",
    opts: [
      "Makes sense you’re slammed — and that’s the case for now: the build takes a few weeks, so starting today means it’s live right as the rush hits instead of scrambling mid-season.",
      "Makes sense — and the math cuts the other way: busy season is when each missed call costs the most, so every week of waiting right now carries the highest price tag of the year.",
      "Makes sense — so let’s split the difference: all the prep happens now, design and content and structure, and nothing invoices until the season winds down. Momentum without the cash hit.",
      "Makes complete sense — when does it wind down for you? I’ll set our call for that first week back so this doesn’t slip through the cracks on either of our ends.",
    ],
    a: 0,
    x: "Turn their timeline into the reason to start — live by the rush, not scrambling during it. The missed-call math is pressure without the reframe; deferred invoicing is a deal that doesn’t exist; calendaring the brush-off accepts it politely.",
  },
  {
    cat: "r",
    who: "Ghosting-prone prospect",
    q: "Looks great. Just send me something and I’ll look it over.",
    opts: [
      "Happy to — give me two days to tailor exactly what I’d build and what it costs to what you told me, and let’s take fifteen minutes Thursday at ten so I can walk you through it live.",
      "Happy to — full proposal in your inbox today, plus a short video of me walking through it, so everything makes sense even if our schedules don’t line up again this week.",
      "Happy to — one habit of ours first: numbers travel with context or they get misread, so we do a twenty-minute walkthrough before anything lands in writing. When works for you?",
      "Happy to — quick logistics: who else should be on it? If a partner or office manager weighs in on spending, better it reaches everyone at once than gets forwarded around piecemeal.",
    ],
    a: 0,
    x: "The proposal travels WITH a booked walkthrough — date and time locked before you hang up. The async video lands in the same graveyard as the PDF; the no-numbers-in-writing policy is the right instinct hardened into a wall; stakeholder mapping dodges the close.",
  },
  {
    cat: "r",
    who: "Data-privacy conscious owner",
    q: "Is my customer information safe with you? I don’t want my client list floating around.",
    opts: [
      "Your customer data is yours — owned outright, never shared, never part of anything we license to anyone. Client-hosted, it sits in your own accounts under your name, exportable anytime.",
      "Yours outright and never shared between clients — the single narrow use is improving your own system’s accuracy, and nothing ever touches other accounts or any shared model.",
      "Locked down to the standard the big platforms run — encrypted at rest and in transit, access-controlled, audited on a cycle. Your list is safer with us than on your office machine.",
      "Protected contractually, not just technically — every engagement carries a signed confidentiality and data-processing agreement, so the safeguard is enforceable, not a policy page.",
    ],
    a: 0,
    x: "The ownership answer: theirs outright, their accounts, never shared, exportable anytime. Even a “narrow” improvement carve-out concedes a use of their data that doesn’t exist; encryption posture and signed DPAs answer a different question than the one asked.",
  },
  {
    cat: "r",
    who: "Comparison shopper",
    q: "What makes you different from the ten other web companies that call me every month?",
    opts: [
      "Three things — we build for service businesses specifically, your journey and your seasonality; we build to convert, not decorate; and you talk to the person who actually builds it.",
      "The engine — nobody else calling you has proprietary AI behind their sites. They sell pages that sit there; we sell a system that works your leads around the clock, every day.",
      "The retention — clients stay for years, and in this business that’s the one number that can’t be faked. The overpromisers churn their whole book roughly every eighteen months.",
      "For starters, we didn’t call you — and that’s worth noticing. A shop that has to cold-call for its own work is telling you something about how its current clients feel about it.",
    ],
    a: 0,
    x: "The why-us three: specialists, built to convert, direct line to the builder. Leading with the engine sells product before problem; retention numbers are a flex, not an answer; “we didn’t call you” is posture — clever for one second, hollow after two.",
  },

  // ===== PROCESS & SUPPORT (14) =====
  {
    cat: "s",
    who: "New prospect",
    q: "How long does this take? I need something soon.",
    opts: [
      "Two to three weeks for a website from kickoff, four to six for full e-commerce — milestones laid out upfront, and internally we aim to beat the dates we give you.",
      "Two to three weeks for the site itself — and if soon means days, we can float a lean landing page this week to start catching leads while the real build runs behind it.",
      "Six to eight weeks for anything built properly — shops quoting faster are usually skinning a template and calling it custom. Quality has a floor, and pretending otherwise costs later.",
      "Honestly, mostly up to you — content, photos, and feedback turnaround set the pace more than our build does. Clients who move fast on their side launch fast on ours.",
    ],
    a: 0,
    x: "Real numbers with milestones upfront: 2–3 weeks site, 4–6 e-commerce. The interim landing page is an invented product welded to the true timeline; padding to 6–8 weeks performs premium; pre-blaming the client’s turnaround erodes the professional frame.",
  },
  {
    cat: "s",
    who: "Signed client",
    q: "Something on the site broke this morning and I’ve got customers hitting it. What happens now?",
    opts: [
      "Covered, full stop — support is unlimited with same-day response, and troubleshooting is exactly what it exists for. Drop it in your client portal now and we’re on it today.",
      "Covered — send it through the portal and we’ll patch it today. It draws from your monthly platform hours, and you’ve got plenty left, so nothing extra lands on your invoice.",
      "Anything customer-facing jumps the queue automatically — that’s our four-hour commitment on critical issues. I’m flagging this one priority as we speak; expect movement fast.",
      "Good odds it’s already caught — monitoring flags most incidents before clients feel them. Let me pull the alert log and confirm within the hour whether a patch is running.",
    ],
    a: 0,
    x: "Troubleshooting lives in the unlimited bucket — same-day, through the portal, no hour-counting. Billing it against the 3 monthly hours mixes buckets; four-hour critical SLAs don’t exist to promise; “monitoring probably caught it” dodges a live emergency.",
  },
  {
    cat: "s",
    who: "Client with a big idea",
    q: "I want to add a whole wholesale ordering portal for my B2B customers. Is that covered by my monthly?",
    opts: [
      "That one’s its own project — own scope, price, and timeline, same license model as what you have. Quote inside twenty-four hours; nothing gets built until you approve.",
      "It’s beyond the included hours as one piece — but phased across several months of your update time, it builds gradually under the monthly with no separate invoice landing.",
      "That’s the tier boundary, honestly — stepping the retainer up a level brings larger feature work like this inside the ongoing engagement instead of pricing it as a project.",
      "Wholesale capability is on the platform roadmap — and platform improvements flow to you as part of what you already pay. You’d receive it as it rolls out, no project needed.",
    ],
    a: 0,
    x: "Scoped work: own project, 24-hour quote, approval before build. Phasing months of work through update hours misprices it to zero; retainer tiers that unlock features don’t exist; “it’s on the roadmap” promises the platform will absorb their custom project.",
  },
  {
    cat: "s",
    who: "Non-technical owner",
    q: "I don’t want to deal with servers, hosting, tech bills — any of it. Can you just handle everything?",
    opts: [
      "That’s exactly what the fully-hosted setup is — we run everything, you get a simple admin and one bill that covers it all. You touch nothing; the convenience is the product.",
      "We run everything — and to keep it transparent, infrastructure passes through at cost on its own line, so you always see precisely what the technology spend actually is.",
      "We run everything except the two pieces that legally stay in your name for portability — your domain and business email. Those you hold; every other moving part is ours.",
      "We’ll run it all day-to-day — and quietly train your office manager along the way, so within a year you’ve got in-house capability and a lighter monthly to show for it.",
    ],
    a: 0,
    x: "Tier B self-identifying — one bill, zero visibility into the machinery, convenience AS the product. Pass-through line items resurrect the tech bills they just rejected; carve-outs and office-manager training programs complicate the simplicity they’re buying.",
  },
  {
    cat: "s",
    who: "Technical owner",
    q: "We’ve got our own dev team and we run our own infrastructure. We don’t want you in the middle of it.",
    opts: [
      "That’s our client-hosted model exactly — code in your GitHub, infra in your accounts, vendors paid direct with no markup, lower monthly. The one piece staying with us is the AI engine.",
      "That’s client-hosted — your repos, your accounts, your vendor bills, lower monthly. And for teams at your level, the engine itself can deploy inside your infrastructure under enterprise terms.",
      "We can absolutely run lean — your team owns front end and infrastructure, and our engineers simply review merges touching licensed components so the agreement stays clean on both sides.",
      "Happy to set that up — with one honest caveat: most technical teams self-manage for a quarter, tally the internal hours, and hand hosting back. The lower monthly rarely covers it.",
    ],
    a: 0,
    x: "Everything moves to them except the engine — our backend, every client, every tier, zero exceptions. Option two is the correct answer with an “enter­prise engine deployment” grafted on — the one thing that can never even be hinted; merge reviews and you’ll-be-back predictions sour the fit.",
  },
  {
    cat: "s",
    who: "Client mid-build",
    q: "How do I know you won’t go quiet on me once I’ve paid the deposit?",
    opts: [
      "You’ll always know what’s happening — milestones upfront, weekly check-ins, a stated next-contact every time we talk. Plus half the payment only moves at launch.",
      "Structurally — a dedicated project manager as your one point of contact, and a twenty-four-hour response commitment on anything you send while the build is in motion.",
      "Contractually — missed milestones trigger fee reductions on our side, so the schedule has our money behind it, not just our word. Few shops will put that in writing.",
      "Empirically — read the reviews: communication is the most-praised thing across hundreds of projects. That pattern is a better answer than any promise I could make you today.",
    ],
    a: 0,
    x: "Cadence plus aligned incentives: milestones, weekly check-ins, next-contact clarity, payment tied to launch. A dedicated PM contradicts “you talk to the builder”; penalty clauses don’t exist to cite; pointing at reviews outsources a question aimed at you.",
  },
  {
    cat: "s",
    who: "Prospect on first call",
    q: "Alright, pitch me. What would you build for my business?",
    opts: [
      "I’d be guessing, and you’d hear it — walk me through how a customer finds you today. Where do jobs come from? Once I see where leads fall through, I’ll say exactly what and why.",
      "I’ll answer with a starting point — the build most trades your size land on: converting site, lead capture, review flow. Then we bend it around your specifics as I learn them.",
      "I’d rather show than tell — here are two client sites in your trade. Point at what resonates and what doesn’t, and we’ll reverse-engineer your build from your own reactions.",
      "Let’s ground it in your reality — name the three things that frustrate you most about the current site, and I’ll map each one to the specific piece that fixes it.",
    ],
    a: 0,
    x: "Diagnose the business — lead flow, not layout — before prescribing anything. The starting-point package is a pitch with a fitting appointment; portfolio reactions anchor on taste; mapping site frustrations audits the website instead of the business behind it.",
  },
  {
    cat: "s",
    who: "Just-launched client",
    q: "Site’s been live two weeks and it looks great. What else can you guys do?",
    opts: [
      "Glad it’s producing first — your own data shows a chunk of inquiries land after six p.m. and sit cold till morning. There’s a fix that answers and books those overnight. Want to see it?",
      "Glad it’s working — the natural next rung for most clients is review generation: lowest cost, fastest visible win, and it compounds everything else. Want me to price that first?",
      "Plenty — reviews, SEO, ads management, CRM automation, deeper AI. I’ll send the expansion menu with pricing tonight so you can rank what fits your appetite and your budget.",
      "Love the energy — let’s aim it well: I’ll set a quarterly growth review where we read your data together and sequence the roadmap properly instead of grabbing at add-ons.",
    ],
    a: 0,
    x: "Problem-first from THEIR data: observation, implied cost, bridge, low-pressure ask to show. “Cheapest win first” picks by price rather than by their leak; the menu sells features; the quarterly-review deferral parks a moment that’s ripe right now.",
  },
  {
    cat: "s",
    who: "Happy client",
    q: "Honestly, this has been great. The phone’s ringing more than it has in years.",
    opts: [
      "Glad it’s working. Quick favor — you know owners leaking leads the way you were. Who comes to mind? I’ll take great care of them, and you get five to ten percent of the build fee.",
      "That’s the best thing I’ll hear all week — any chance you’d put it in a Google review? One paragraph from a real owner does more for us than anything we could ever run.",
      "Perfect timing to say it — because a ringing phone changes the bottleneck: capacity and follow-up. Worth a conversation about what phase two of the system should look like.",
      "That means a lot — I’m logging it in your file, and once the numbers mature a bit we may ask to shape it into a proper case study, if you’d be open to that later on.",
    ],
    a: 0,
    x: "A landed result is THE referral window — a happy electrician knows three happy plumbers, and the 5–10% sweetener makes asking effortless. The review request and case-study note are smaller asks; the phase-two pivot upsells through the referral moment.",
  },
  {
    cat: "s",
    who: "Client considering cancel",
    q: "Business is slow. I’m thinking about pausing the monthly for a few months.",
    opts: [
      "Two honest things — pausing means the AI goes dark, and restarting isn’t a switch. And slow season is when each lead counts most. Let’s diagnose the slowdown before pulling what catches jobs.",
      "The honest middle path is our maintenance rate — half the monthly keeps the system alive and your place held, and you step back to full whenever the phones pick up again.",
      "We can pause it — the practical note is re-onboarding runs about two weeks on return, so plan the restart against your season. I’ll pencil it for the first of the month.",
      "I want to find you relief — and I have to be straight that the agreement runs annual terms, so a pause lands as an early-termination event on paper. So let’s find your relief somewhere inside the term.",
    ],
    a: 0,
    x: "Honesty about the consequence plus the reframe — slow season is when capture matters MOST, so diagnose before disconnecting. Half-rate maintenance tiers and two-week re-onboarding are invented mechanics; citing annual terms turns a save into a hostage note.",
  },
  {
    cat: "s",
    who: "Curious prospect",
    q: "What kind of businesses do you actually work with? Am I even a fit?",
    opts: [
      "Owner-operated service businesses — electrical, HVAC, plumbing, roofing, landscaping. Established shops, five-plus years, real reviews. If that’s you, this was built for you.",
      "The through-line is inbound calls — if your business lives or dies on the phone ringing, you’re squarely in the zone we serve, whatever the specific trade turns out to be.",
      "Trades are the core, and we take select work outside the lane when the fit is right — med spas, cafes, professional services. Either way it’s worth the conversation to find out.",
      "The cleanest qualifier is ad spend — if you’re already buying traffic, there’s a measurable leak worth fixing and a budget accustomed to working. Everything else we can assess.",
    ],
    a: 0,
    x: "Name the ICP proudly — owner-operator trades, established, reviewed — it qualifies them FOR you. “Anyone with inbound calls” and “select work outside the lane” dilute the exact positioning that closes this buyer; ad spend is one signal, not the profile.",
  },
  {
    cat: "s",
    who: "Prospect near close",
    q: "Okay… I think I’m in. What happens next?",
    opts: [
      "Agreement goes out today while it’s fresh — secure payment link, half now, half at launch — and let’s lock kickoff before we hang up: how’s Thursday? I’ll send what I need tonight.",
      "Agreement goes out today — take a few days with it, run it past whoever should see it, and the moment it’s signed we’ll get your kickoff call onto the calendar.",
      "Next step is a short call with our operations lead this week — they finalize scope and paper the agreement properly, and I’ll make that introduction before end of day.",
      "Simplest path — take the deposit now while we’re on the phone, which locks your build slot on the spot, and the formal paperwork follows right behind it before the end of this afternoon.",
    ],
    a: 0,
    x: "Same-day agreement, frictionless payment, kickoff locked before the call ends — momentum dies in inboxes. “Take a few days” reopens a closed decision; the ops handoff installs the telephone game; charging before the agreement exists is backwards.",
  },
  {
    cat: "s",
    who: "Overwhelmed owner",
    q: "I’m interested in the AI stuff but honestly all of this tech talk is over my head.",
    opts: [
      "That’s the design — you shouldn’t need to understand it. You run your trade; it catches calls and books jobs behind the scenes, one bill. The less you think about it, the better we’re doing.",
      "Then thirty minutes fixes it — a plain-English walkthrough, no jargon, until you can see inside the box. Owners decide better when the machinery stops being mysterious.",
      "Common and solvable — most owners name a point person, usually the office manager, who handles the technical side with us. You stay out of it and just watch results land.",
      "Then let’s sequence it kindly — the website first, familiar ground, and the AI layers in around month six once you’ve gotten comfortable with us and the fundamentals have properly settled in.",
    ],
    a: 0,
    x: "Tier B is asking for invisibility — sell “you never think about it,” not a curriculum. The walkthrough teaches what they asked not to learn; the point-person setup adds an org chart; sequencing the AI out six months shrinks the deal they were leaning into.",
  },
  {
    cat: "s",
    who: "Prospect at proposal",
    q: "So what’s the bottom line — what’s this going to run me?",
    opts: [
      "Forty-five hundred to build it and get it live, three-forty-nine a month to keep it sharp and improving. Book one extra job a month off it and it’s paid for itself.",
      "Forty-five hundred for the build — let’s settle that number first, and once you’re comfortable there I’ll walk you through the modest monthly that keeps it maintained.",
      "Forty-five hundred plus three-forty-nine monthly — and if that lands heavy, say so right now and we’ll find pieces to trim before you’re reacting to the wrong number.",
      "I’ve shaped three ways in — a lean core at thirty-two, the full recommendation at forty-five, and a premium tier at sixty-one — so you control the spend. Walk through them?",
    ],
    a: 0,
    x: "Full number — build AND monthly together — one line of ROI, then silence. Settling the build before revealing the monthly splits the price; pre-offering trims before they react IS the flinch; the three-option menu offloads the decision you were hired to make.",
  },
];
