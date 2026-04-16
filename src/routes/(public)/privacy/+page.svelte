<script lang="ts">
	import OgMeta from '$lib/components/OgMeta.svelte';
</script>

<OgMeta title="Privacy Policy - Coati" description="Privacy policy for the Coati platform." />

<div class="mx-auto max-w-3xl px-4 py-12 lg:py-16">
	<h1 class="text-foreground mb-2 text-3xl font-bold tracking-tight lg:text-4xl">Privacy Policy</h1>
	<p class="text-muted-foreground mb-10 text-sm">Last updated: April 16, 2026</p>

	<div class="prose prose-neutral dark:prose-invert max-w-none space-y-8">
		<section>
			<h2 class="text-foreground text-xl font-semibold">1. Introduction</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				Coati ("we", "us", or "our") operates the Coati platform at coati.sh (the "Service"). This
				Privacy Policy explains how we collect, use, disclose, and safeguard your information when
				you use our Service.
			</p>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">2. Information We Collect</h2>
			<h3 class="text-foreground mt-4 text-lg font-medium">Account Information</h3>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				When you sign in via GitHub OAuth, we receive and store your GitHub username, display name,
				email address, and avatar URL. We do not store your GitHub password or OAuth tokens beyond
				what is needed to maintain your session.
			</p>

			<h3 class="text-foreground mt-4 text-lg font-medium">User-Generated Content</h3>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				We store the setups you publish, including configuration files, scripts, documentation, and
				manifest data. We also store comments, stars, and follow relationships you create on the
				platform.
			</p>

			<h3 class="text-foreground mt-4 text-lg font-medium">Usage Data (Web)</h3>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				The web platform uses two third-party services for observability and analytics:
			</p>
			<ul class="text-muted-foreground mt-2 list-disc space-y-1 pl-6">
				<li>
					<strong>Sentry</strong> — captures JavaScript errors and performance traces to help us diagnose
					and fix bugs. Sentry receives error messages, stack traces, breadcrumbs (a log of recent actions
					leading up to the error), the request path that triggered the error, and an anonymous session
					ID. After you sign in, your Coati user ID is also attached to error reports so we can follow
					up on issues that affect your account.
				</li>
				<li>
					<strong>Mixpanel</strong> — collects anonymous product analytics (page views, feature interactions,
					funnel events) to help us understand how the platform is used and where to improve it. Before
					you sign in, Mixpanel uses an anonymous ID. After sign-in, your Coati user ID is associated
					with your analytics profile so we can understand authenticated user journeys.
				</li>
			</ul>
			<p class="text-muted-foreground mt-3 leading-relaxed">
				<strong>What the web platform does NOT collect:</strong>
			</p>
			<ul class="text-muted-foreground mt-2 list-disc space-y-1 pl-6">
				<li>
					We do not store your IP address beyond what is incidentally logged by our infrastructure.
				</li>
				<li>We do not capture request bodies or form submissions.</li>
				<li>
					Mixpanel autocapture is disabled — we only track events we explicitly instrument, not
					every click on the page.
				</li>
				<li>Session replay is not used. Input fields are never recorded.</li>
			</ul>

			<h3 class="text-foreground mt-4 text-lg font-medium">CLI Usage</h3>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				When you use the Coati CLI, authentication tokens are stored locally on your machine at
				<code class="bg-muted rounded px-1.5 py-0.5 text-sm">~/.coati/config.json</code>. API
				requests from the CLI include your authentication token and standard HTTP metadata.
			</p>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				The CLI also sends <strong>crash reports</strong> to Sentry when an unhandled error occurs.
				This is crash reporting only — the CLI does not send analytics events or track which
				commands you run. A crash report includes the error message, stack trace, breadcrumbs, the
				subcommand that was running (e.g.
				<code class="bg-muted rounded px-1.5 py-0.5 text-sm">clone</code>), and an anonymous device
				ID. After you run
				<code class="bg-muted rounded px-1.5 py-0.5 text-sm">coati login</code>, your Coati user ID
				is also attached to crash reports.
			</p>
			<p class="text-muted-foreground mt-3 leading-relaxed">
				<strong>What the CLI does NOT collect:</strong>
			</p>
			<ul class="text-muted-foreground mt-2 list-disc space-y-1 pl-6">
				<li>We do not log which commands you run outside of a crash context.</li>
				<li>We do not capture file contents, setup names, or arguments you pass to commands.</li>
				<li>We do not store your IP address.</li>
				<li>There are no analytics events — only crash reports when something goes wrong.</li>
			</ul>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">3. Opting Out of CLI Crash Reporting</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				CLI crash reporting is opt-out. You can disable it using any of the following three
				mechanisms — whichever is most convenient for your workflow:
			</p>
			<ul class="text-muted-foreground mt-2 list-disc space-y-2 pl-6">
				<li>
					<strong>Environment variable (per-session):</strong> set
					<code class="bg-muted rounded px-1.5 py-0.5 text-sm">DO_NOT_TRACK=1</code> in your shell.
					This also disables telemetry in other tools that respect the standard.
					<pre
						class="bg-muted mt-1 rounded px-3 py-2 text-sm">DO_NOT_TRACK=1 coati clone owner/setup</pre>
				</li>
				<li>
					<strong>Environment variable (Coati-specific):</strong> set
					<code class="bg-muted rounded px-1.5 py-0.5 text-sm">COATI_TELEMETRY=false</code> to
					disable only Coati crash reporting without affecting other tools.
					<pre
						class="bg-muted mt-1 rounded px-3 py-2 text-sm">COATI_TELEMETRY=false coati publish</pre>
				</li>
				<li>
					<strong>Persistent config:</strong> run the command below to permanently disable crash
					reporting in your local config at
					<code class="bg-muted rounded px-1.5 py-0.5 text-sm">~/.coati/config.json</code>. This
					persists across sessions.
					<pre
						class="bg-muted mt-1 rounded px-3 py-2 text-sm">coati config set telemetry false</pre>
				</li>
			</ul>
			<p class="text-muted-foreground mt-3 leading-relaxed">
				When crash reporting is disabled, errors are still displayed in your terminal — they are
				just not sent to Sentry.
			</p>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">4. How We Use Your Information</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">We use your information to:</p>
			<ul class="text-muted-foreground mt-2 list-disc space-y-1 pl-6">
				<li>Provide, operate, and maintain the Service</li>
				<li>Authenticate your identity and manage your account</li>
				<li>Display your public profile, setups, and activity</li>
				<li>Enable social features (stars, follows, comments)</li>
				<li>Improve and develop new features for the Service</li>
				<li>Diagnose and fix errors reported via Sentry</li>
				<li>Communicate with you about the Service (e.g., security notices)</li>
				<li>Enforce our Terms of Service and protect against misuse</li>
			</ul>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">5. Information Sharing</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				We do not sell, rent, or trade your personal information. We may share information only in
				the following circumstances:
			</p>
			<ul class="text-muted-foreground mt-2 list-disc space-y-1 pl-6">
				<li>
					<strong>Public content:</strong> Your username, profile, published setups, stars, follows, and
					comments are publicly visible by design.
				</li>
				<li>
					<strong>Service providers:</strong> We use Sentry (error tracking), Mixpanel (web analytics),
					and infrastructure providers (hosting, database) that process data on our behalf under appropriate
					data protection agreements.
				</li>
				<li>
					<strong>Legal requirements:</strong> We may disclose information if required by law, court order,
					or governmental regulation.
				</li>
			</ul>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">6. Data Retention</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				We retain your account information and content for as long as your account is active. If you
				delete your account, we will remove your personal information and content within a
				reasonable timeframe. Some information may be retained in backups for a limited period or as
				required by law.
			</p>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">7. Data Security</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				We implement reasonable technical and organizational measures to protect your information,
				including encrypted connections (HTTPS), secure session management, and access controls.
				However, no method of transmission over the Internet is 100% secure, and we cannot guarantee
				absolute security.
			</p>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">8. Your Rights</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">You have the right to:</p>
			<ul class="text-muted-foreground mt-2 list-disc space-y-1 pl-6">
				<li>Access the personal information we hold about you</li>
				<li>Request correction of inaccurate information</li>
				<li>Request deletion of your account and associated data</li>
				<li>Export your setups and content</li>
				<li>Opt out of CLI crash reporting at any time (see Section 3)</li>
			</ul>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				To exercise any of these rights, contact us at the email address below.
			</p>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">9. Cookies</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				We use essential cookies for authentication and session management. These cookies are
				strictly necessary for the Service to function and cannot be disabled. We do not use
				third-party tracking cookies or advertising cookies.
			</p>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">10. Children's Privacy</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				The Service is not intended for children under 13 years of age. We do not knowingly collect
				personal information from children under 13. If you believe we have collected such
				information, please contact us so we can promptly remove it.
			</p>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">11. Changes to This Policy</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				We may update this Privacy Policy from time to time. We will notify you of material changes
				by posting the updated policy on this page with a revised "Last updated" date. Your
				continued use of the Service after changes are posted constitutes acceptance of the updated
				policy.
			</p>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">12. Contact Us</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				If you have questions about this Privacy Policy or your personal data, please open an issue
				on our
				<a
					href="https://github.com/jimburch/coati"
					target="_blank"
					rel="noopener noreferrer"
					class="text-foreground underline hover:no-underline">GitHub repository</a
				>.
			</p>
		</section>
	</div>
</div>
