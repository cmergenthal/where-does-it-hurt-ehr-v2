# Where Does It Hurt EHR v2

This is an independent hard fork of `where-does-it-hurt-ehr-v1`, maintained in the public repository [cmergenthal/where-does-it-hurt-ehr-v2](https://github.com/cmergenthal/where-does-it-hurt-ehr-v2).

## Development

```bash
git clone https://github.com/cmergenthal/where-does-it-hurt-ehr-v2.git
cd where-does-it-hurt-ehr-v2
npm ci
cp .env.example .env
npm start
```

Local environment files, server credentials, runtime databases, installed dependencies, and generated builds are excluded from Git.

## Production build

```bash
npm run build
```

The production homepage uses `/wdihehr-v2` on your hosting domain. For example:

`https://ehr.example.com/wdihehr-v2`

Replace example domains in OAuth settings and server configuration with your own deployment domain. The appointments iframe defaults to `/calendarfrontend/` on the same origin; set `REACT_APP_CALENDAR_URL` in an untracked `.env` file to use a different calendar URL.

## Webex Contact Center

The EHR is a standalone Webex Contact Center agent application powered by
`@webex/contact-center`. Agents authenticate, select a team and calling device,
log into their station, and enter Available state before the clinical workspace
opens.

### Requirements

- Node.js 20 or newer
- A Webex OAuth integration
- A Webex Contact Center licensed agent
- An assigned agent profile, team, and multimedia profile
- Browser WebRTC enabled for the agent profile when using browser audio

### OAuth configuration

Production authentication uses a small PHP token service so the Webex client
secret never ships in the browser bundle. Configure the Webex integration
redirect URI to exactly:

`https://ehr.example.com/wdihehr-v2/api/webex/callback.php`

Then build the React app with PHP auth mode:

```bash
REACT_APP_WEBEX_AUTH_MODE=php \
npm run build
```

The build copies the PHP endpoints into:

`build/api/webex/`

The build intentionally removes `config.local.php` so Webex and OpenAI secrets
cannot enter the deployable bundle. Preserve the server's existing
`api/webex/config.local.php` when uploading a new build, or upload that file
separately through the server's secure configuration channel.

To create a deployment folder that explicitly includes the local server config,
run `npm run build:deploy`. Treat that build directory as sensitive and upload
it only to a PHP-enabled server.

For local configuration, copy `public/api/webex/config.example.php` to
`public/api/webex/config.local.php` and fill in your own values. On the web
server, create `api/webex/config.local.php` beside the copied PHP files:

```php
<?php
return [
    'client_id' => 'your-webex-client-id',
    'client_secret' => 'your-webex-client-secret',
    'redirect_uri' => 'https://ehr.example.com/wdihehr-v2/api/webex/callback.php',
    'app_url' => 'https://ehr.example.com/wdihehr-v2/',
];
```

Do not commit or expose `config.local.php`. If your host supports environment
variables instead, set `WEBEX_CLIENT_ID`, `WEBEX_CLIENT_SECRET`,
`WEBEX_REDIRECT_URI`, and `WEBEX_APP_URL`.

### Transcript topic navigation

During an active Webex call, the EHR sends a bounded rolling transcript window
to a same-origin PHP endpoint. `gpt-5.6-luna` classifies the current topic as
Chart overview, Patients, Labs, Appointments, Documents, Billing, or none. The
app waits two seconds for transcript activity to settle, requires at least 90% confidence,
respects manual-navigation and automatic-navigation cooldowns, and offers Undo
after switching pages.

When Labs is the current topic, the same structured result can identify one of
the current patient's lab panels by panel name or analyte. The app requires 90%
confidence for the lab target, validates the returned ID against that patient's
available panels, selects it, and scrolls its card into view.

Add the OpenAI key and optional model to the server-only `config.local.php`:

```php
'openai_api_key' => 'your-openai-api-key',
'openai_model' => 'gpt-5.6-luna',
```

Alternatively, set `OPENAI_API_KEY` and `OPENAI_TOPIC_MODEL` as server
environment variables. Never expose the key through a `REACT_APP_*` variable.
The topic endpoint requires the authenticated Webex PHP session and accepts
same-origin POST requests only. OpenAI Responses are created with `store: false`.

For local experimentation only, the legacy browser implicit mode is still
available with:

```bash
REACT_APP_WEBEX_AUTH_MODE=implicit \
REACT_APP_WEBEX_CLIENT_ID=your-client-id \
REACT_APP_WEBEX_REDIRECT_URI=https://ehr.example.com/wdihehr-v2/ \
npm start
```

The application requests these scopes:

- `cjp:config_read`
- `cjp:config_write`
- `cjp:config`
- `cjp:user`
- `spark:webrtc_calling`
- `spark:calls_read`
- `spark:calls_write`
- `spark:xsi`
- `spark:kms`

For automatic patient matching, include at least one of these interaction CAD
fields:

- `patientId`
- `MRN`
- `phone`

ANI matching is also supported. Phone values are normalized to their final ten
digits before matching.

Outbound calling uses the outdial entry point assigned to the authenticated
agent's Contact Center profile.

### Real-time assistance trial

The app pins `@webex/contact-center` to `3.12.0-next.105` to test the prerelease
`getRealTimeAssistance()` API. During an active interaction, use **Get
assistance** to request a recommendation or add context and use **Refine
assistance**. The tenant and agent profile must have suggested responses
enabled. Raw acknowledgment, response, and error payloads are labeled
`[Webex AI Assistant]` in the browser developer console.
