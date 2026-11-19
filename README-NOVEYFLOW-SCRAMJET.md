# NOVEYFLOW browser proxy (free experiment)

Uses MercuryWorkshop Scramjet 2.0-alpha through a private access-cookie gate and the existing free Render web service. Different from ZenRows scraping: Scramjet runs a service worker and Wisp connection, rewriting traffic inside the user's Safari browser. Does not guarantee TikTok login, playback or that the original network block will be bypassed.

**Security:** ACCESS_TOKEN stored only in hosting environment. Requires invite link; the token is effectively a password and can be revoked by rotation. The app is intended for controlled testing and is not an official TikTok product. Do not sign in with TikTok credentials through an unaudited proxy.

**Costs:** Server configured for free Render tier, subject to free plan quotas and sleep/wake limitations. No payment required by code.

Open-source engine: https://github.com/MercuryWorkshop/scramjet/ (respect upstream AGPL terms). Architecture reference: https://docs.crllect.dev/guides/wiring.
