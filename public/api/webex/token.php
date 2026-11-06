<?php
declare(strict_types=1);

require __DIR__ . '/common.php';

webex_start_session();
$config = webex_config();
webex_require_config($config);

$token = webex_refresh_if_needed($config);
if (!$token || empty($token['access_token'])) {
    webex_json([
        'authenticated' => false,
        'loginUrl' => './api/webex/login.php',
    ], 401);
}

webex_json([
    'authenticated' => true,
    'access_token' => $token['access_token'],
    'token_type' => $token['token_type'] ?? 'Bearer',
    'scope' => $token['scope'] ?? '',
    'expires_at' => $token['expires_at'] ?? null,
]);
