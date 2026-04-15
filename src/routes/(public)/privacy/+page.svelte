<script lang="ts">
	import OgMeta from '$lib/components/OgMeta.svelte';
</script>

<OgMeta title="Privacy Policy - Coati" description="Privacy policy for the Coati platform." />

<div class="mx-auto max-w-3xl px-4 py-12 lg:py-16">
	<h1 class="text-foreground mb-2 text-3xl font-bold tracking-tight lg:text-4xl">Privacy Policy</h1>
	<p class="text-muted-foreground mb-10 text-sm">Last updated: April 14, 2026</p>

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

			<h3 class="text-foreground mt-4 text-lg font-medium">Usage Data</h3>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				We may collect non-personally-identifiable usage data such as pages visited, features used,
				and general interaction patterns to improve the Service. We use privacy-respecting analytics
				and do not sell or share this data with third-party advertisers.
			</p>

			<h3 class="text-foreground mt-4 text-lg font-medium">CLI Usage</h3>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				When you use the Coati CLI, authentication tokens are stored locally on your machine at
				<code class="bg-muted rounded px-1.5 py-0.5 text-sm">~/.coati/config.json</code>. API
				requests from the CLI include your authentication token and standard HTTP metadata (IP
				address, user agent).
			</p>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">3. How We Use Your Information</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">We use your information to:</p>
			<ul class="text-muted-foreground mt-2 list-disc space-y-1 pl-6">
				<li>Provide, operate, and maintain the Service</li>
				<li>Authenticate your identity and manage your account</li>
				<li>Display your public profile, setups, and activity</li>
				<li>Enable social features (stars, follows, comments)</li>
				<li>Improve and develop new features for the Service</li>
				<li>Communicate with you about the Service (e.g., security notices)</li>
				<li>Enforce our Terms of Service and protect against misuse</li>
			</ul>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">4. Information Sharing</h2>
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
					<strong>Service providers:</strong> We may use third-party services for hosting, analytics,
					or infrastructure that process data on our behalf under appropriate data protection agreements.
				</li>
				<li>
					<strong>Legal requirements:</strong> We may disclose information if required by law, court order,
					or governmental regulation.
				</li>
			</ul>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">5. Data Retention</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				We retain your account information and content for as long as your account is active. If you
				delete your account, we will remove your personal information and content within a
				reasonable timeframe. Some information may be retained in backups for a limited period or as
				required by law.
			</p>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">6. Data Security</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				We implement reasonable technical and organizational measures to protect your information,
				including encrypted connections (HTTPS), secure session management, and access controls.
				However, no method of transmission over the Internet is 100% secure, and we cannot guarantee
				absolute security.
			</p>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">7. Your Rights</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">You have the right to:</p>
			<ul class="text-muted-foreground mt-2 list-disc space-y-1 pl-6">
				<li>Access the personal information we hold about you</li>
				<li>Request correction of inaccurate information</li>
				<li>Request deletion of your account and associated data</li>
				<li>Export your setups and content</li>
			</ul>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				To exercise any of these rights, contact us at the email address below.
			</p>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">8. Cookies</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				We use essential cookies for authentication and session management. These cookies are
				strictly necessary for the Service to function and cannot be disabled. We do not use
				third-party tracking cookies or advertising cookies.
			</p>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">9. Children's Privacy</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				The Service is not intended for children under 13 years of age. We do not knowingly collect
				personal information from children under 13. If you believe we have collected such
				information, please contact us so we can promptly remove it.
			</p>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">10. Changes to This Policy</h2>
			<p class="text-muted-foreground mt-2 leading-relaxed">
				We may update this Privacy Policy from time to time. We will notify you of material changes
				by posting the updated policy on this page with a revised "Last updated" date. Your
				continued use of the Service after changes are posted constitutes acceptance of the updated
				policy.
			</p>
		</section>

		<section>
			<h2 class="text-foreground text-xl font-semibold">11. Contact Us</h2>
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
