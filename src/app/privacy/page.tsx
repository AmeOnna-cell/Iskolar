import Link from "next/link";

export const metadata = { title: "How we handle your data" };

const CONTACT = <a href="mailto:iskolar.notifications@gmail.com">iskolar.notifications@gmail.com</a>;

const h2 = "text-title-sm font-[650] text-ink sm:text-title";
const list = "mt-3 flex list-disc flex-col gap-2 pl-5 [&_a]:underline";

/** Plain-language privacy page. Every statement here matches what the code and database rules do (Phase 9). */
export default function PrivacyPage() {
  return (
    <div className="page-container py-6 sm:py-8">
      <article className="reading-column flex max-w-[70ch] flex-col gap-8 text-ink-secondary">
        <header>
          <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">How we handle your data</h1>
          <p className="mt-2">
            Iskolar helps you find scholarships you may qualify for. This page explains what we keep about you, why, who can see it, and what you can
            change. Last updated 8 November 2026.
          </p>
        </header>

        <section aria-labelledby="collect-h">
          <h2 id="collect-h" className={h2}>What we collect</h2>
          <ul className={list}>
            <li>
              <strong className="font-semibold text-ink">Your account:</strong> your name, email address and password. The password is stored
              scrambled (hashed) by our sign-in service; nobody at Iskolar can read it.
            </li>
            <li>
              <strong className="font-semibold text-ink">Your eligibility answers</strong>, if you give them: course area, program, year level, GWA
              (or that you don&apos;t know it yet), household income range, whether your family is in 4Ps or Listahanan, whether a parent is an OFW,
              and your home region. Every question can be left unanswered.
            </li>
            <li>
              <strong className="font-semibold text-ink">Your tracker:</strong> the scholarships you save, how far along each application is, its
              result if you record one, and which documents you&apos;ve checked off.
            </li>
            <li>
              <strong className="font-semibold text-ink">Questions you send</strong> to the scholarship office, and their replies.
            </li>
            <li>
              <strong className="font-semibold text-ink">Alerts:</strong> your notification settings, the alerts we send you and whether they were
              delivered. If you turn on push alerts, your browser gives us a delivery address for this device and a short description of the browser.
            </li>
            <li>
              <strong className="font-semibold text-ink">Abuse protection:</strong> to limit repeated sign-in, sign-up and password-reset attempts, we
              count attempts per IP address and per email address.
            </li>
            <li>
              <strong className="font-semibold text-ink">Cookies:</strong> only the ones that keep you signed in. Your light or dark theme choice is
              saved in your own browser.
            </li>
          </ul>
          <p className="mt-3">We don&apos;t use advertising or analytics trackers.</p>
        </section>

        <section aria-labelledby="why-h">
          <h2 id="why-h" className={h2}>Why we use it</h2>
          <ul className={list}>
            <li>Your answers are compared with each scholarship&apos;s requirements to show which ones may fit you, and to alert you about new matches if you keep that alert on.</li>
            <li>Your tracker is used for deadline reminders and to tell you when a scholarship you saved changes.</li>
            <li>When you send a question, your program and year level are attached so the office can give a useful answer.</li>
            <li>Your email address is used to confirm your account, reset your password, and send the email alerts you keep on.</li>
          </ul>
        </section>

        <section aria-labelledby="see-h">
          <h2 id="see-h" className={h2}>Who can see it</h2>
          <ul className={list}>
            <li>
              <strong className="font-semibold text-ink">You</strong> can see everything above that&apos;s yours.
            </li>
            <li>
              <strong className="font-semibold text-ink">Only you</strong> can see your eligibility answers, your tracker and your alerts. Coordinators
              and admins can&apos;t open them; database rules block it.
            </li>
            <li>
              <strong className="font-semibold text-ink">Scholarship coordinators and admins</strong> see the questions you send, with your program and
              year level, but not your name or email.
            </li>
            <li>
              <strong className="font-semibold text-ink">Admins</strong> see your name, email address, role and account status, so they can manage
              accounts.
            </li>
            <li>
              <strong className="font-semibold text-ink">The audit log</strong>, which only admins can read, records changes made by coordinators and
              admins. When an admin changes your account (for example, deactivates it), the log records the change, not your name or email.
            </li>
          </ul>
        </section>

        <section aria-labelledby="where-h">
          <h2 id="where-h" className={h2}>Where it&apos;s stored and who handles it</h2>
          <ul className={list}>
            <li>
              <strong className="font-semibold text-ink">Supabase</strong> stores the database and handles sign-in, in its Singapore data centre.
            </li>
            <li>
              <strong className="font-semibold text-ink">Vercel</strong> runs the Iskolar website, so your requests pass through it.
            </li>
            <li>
              <strong className="font-semibold text-ink">Gmail</strong> (Google) sends our emails, so it handles your email address and the message.
            </li>
            <li>
              If you turn on push alerts, <strong className="font-semibold text-ink">your browser&apos;s push service</strong> (for example Google,
              Mozilla or Apple) delivers them to your device.
            </li>
          </ul>
          <p className="mt-3">We don&apos;t sell your information or use it for advertising.</p>
        </section>

        <section aria-labelledby="choices-h">
          <h2 id="choices-h" className={h2}>Your choices</h2>
          <ul className={list}>
            <li>
              <strong className="font-semibold text-ink">Change or delete your answers</strong> any time in <Link href="/settings#answers">Settings</Link>.
              Deleting them removes them right away; your saved scholarships and alerts stay.
            </li>
            <li>
              <strong className="font-semibold text-ink">Choose your alerts</strong> in <Link href="/settings#reminders">Settings</Link>: email, push or
              on-site, how many days before a deadline, and whether to hear about new matches and changes. Every email also links there.
            </li>
            <li>
              <strong className="font-semibold text-ink">Delete your account:</strong> ask us at {CONTACT}, and an admin will delete it. This removes
              your answers, tracker, alerts, alert settings and push sign-ups, clears your name and email, and ends every session. It can&apos;t be
              undone, but you can sign up again later with the same email.
            </li>
          </ul>
          <p className="mt-3">A few things stay after deletion:</p>
          <ul className={list}>
            <li>Questions you sent keep their text, labelled &ldquo;Deleted account&rdquo;, along with the office&apos;s replies.</li>
            <li>The audit log is permanent and can&apos;t be edited, so it keeps its record that your account was deleted, without your name or email.</li>
            <li>Abuse-protection counters may still hold your email address or IP address.</li>
          </ul>
        </section>

        <section aria-labelledby="law-h">
          <h2 id="law-h" className={h2}>Your rights and how to reach us</h2>
          <p className="mt-3">
            The Data Privacy Act of 2012 (Republic Act No. 10173) gives you rights over your personal data, including the right to see it, correct it
            and have it deleted. To use them, or to ask anything about this page, email {CONTACT}.
          </p>
        </section>
      </article>
    </div>
  );
}
