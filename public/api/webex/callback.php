<?php
declare(strict_types=1);

require __DIR__ . '/common.php';

webex_start_session();
$config = webex_config();
webex_require_config($config);

$state = $_GET['state'] ?? '';
$expectedState = $_SESSION['webex_oauth_state'] ?? '';
unset($_SESSION['webex_oauth_state']);

if (!$state || !$expectedState || !hash_equals((string) $expectedState, (string) $state)) {
    webex_redirect($config['app_url'] . '?webex_error=invalid_state');
}

if (!empty($_GET['error'])) {
    webex_redirect($config['app_url'] . '?webex_error=' . rawurlencode((string) $_GET['error']));
}

$code = $_GET['code'] ?? '';
if (!$code) {
    webex_redirect($config['app_url'] . '?webex_error=missing_code');
}

$token = webex_request_token([
    'grant_type' => 'authorization_code',
    'client_id' => $config['client_id'],
    'client_secret' => $config['client_secret'],
    'code' => $code,
    'redirect_uri' => $config['redirect_uri'],
]);

webex_store_token($token);
webex_redirect($config['app_url']);
