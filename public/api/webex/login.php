<?php
declare(strict_types=1);

require __DIR__ . '/common.php';

webex_start_session();
$config = webex_config();
webex_require_config($config);

$state = webex_random_state();
$_SESSION['webex_oauth_state'] = $state;

$authorizeUrl = WEBEX_AUTH_URL . '?' . http_build_query([
    'response_type' => 'code',
    'client_id' => $config['client_id'],
    'redirect_uri' => $config['redirect_uri'],
    'scope' => $config['scopes'],
    'state' => $state,
]);

webex_redirect($authorizeUrl);
