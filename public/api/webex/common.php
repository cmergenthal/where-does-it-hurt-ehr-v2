<?php
declare(strict_types=1);

const WEBEX_AUTH_URL = 'https://webexapis.com/v1/authorize';
const WEBEX_TOKEN_URL = 'https://webexapis.com/v1/access_token';

function webex_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function webex_config(): array
{
    $localConfigPath = __DIR__ . '/config.local.php';
    $localConfig = file_exists($localConfigPath) ? require $localConfigPath : [];

    $config = array_merge([
        'client_id' => getenv('WEBEX_CLIENT_ID') ?: '',
        'client_secret' => getenv('WEBEX_CLIENT_SECRET') ?: '',
        'redirect_uri' => getenv('WEBEX_REDIRECT_URI') ?: '',
        'app_url' => getenv('WEBEX_APP_URL') ?: '',
        'openai_api_key' => getenv('OPENAI_API_KEY') ?: '',
        'openai_model' => getenv('OPENAI_TOPIC_MODEL') ?: 'gpt-5.6-luna',
        'scopes' => getenv('WEBEX_SCOPES') ?: implode(' ', [
            'cjp:config_read',
            'cjp:config_write',
            'cjp:config',
            'cjp:user',
            'spark:webrtc_calling',
            'spark:calls_read',
            'spark:calls_write',
            'spark:xsi',
            'spark:kms',
        ]),
    ], is_array($localConfig) ? $localConfig : []);

    if (!$config['redirect_uri']) {
        $config['redirect_uri'] = webex_origin() . '/wdihehr-v2/api/webex/callback.php';
    }

    if (!$config['app_url']) {
        $config['app_url'] = webex_origin() . '/wdihehr-v2/';
    }

    return $config;
}

function webex_origin(): string
{
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';

    return $scheme . '://' . $host;
}

function webex_require_config(array $config): void
{
    if (!$config['client_id'] || !$config['client_secret'] || !$config['redirect_uri']) {
        webex_json([
            'error' => 'WEBEX_TOKEN_SERVICE_NOT_CONFIGURED',
            'message' => 'Set WEBEX_CLIENT_ID, WEBEX_CLIENT_SECRET, and WEBEX_REDIRECT_URI for the PHP token service.',
        ], 500);
    }
}

function openai_require_config(array $config): void
{
    if (empty($config['openai_api_key'])) {
        webex_json([
            'error' => 'OPENAI_TOPIC_ROUTER_NOT_CONFIGURED',
            'message' => 'Set OPENAI_API_KEY for transcript topic routing.',
        ], 500);
    }
}

function webex_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function webex_redirect(string $url): void
{
    header('Cache-Control: no-store');
    header('Location: ' . $url, true, 302);
    exit;
}

function webex_random_state(): string
{
    return bin2hex(random_bytes(24));
}

function webex_request_token(array $fields): array
{
    $ch = curl_init(WEBEX_TOKEN_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_POSTFIELDS => http_build_query($fields),
        CURLOPT_TIMEOUT => 20,
    ]);

    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($body === false) {
        webex_json([
            'error' => 'WEBEX_TOKEN_REQUEST_FAILED',
            'message' => $curlError ?: 'Unable to contact Webex token endpoint.',
        ], 502);
    }

    $decoded = json_decode((string) $body, true);
    if ($status < 200 || $status >= 300 || !is_array($decoded)) {
        webex_json([
            'error' => 'WEBEX_TOKEN_EXCHANGE_FAILED',
            'status' => $status,
            'response' => is_array($decoded) ? $decoded : $body,
        ], 502);
    }

    return $decoded;
}

function webex_store_token(array $token): void
{
    $now = time();
    $token['obtained_at'] = $now;
    $token['expires_at'] = $now + (int) ($token['expires_in'] ?? 0);
    $_SESSION['webex_token'] = $token;
}

function webex_current_token(): ?array
{
    $token = $_SESSION['webex_token'] ?? null;
    return is_array($token) ? $token : null;
}

function webex_refresh_if_needed(array $config): ?array
{
    $token = webex_current_token();
    if (!$token) {
        return null;
    }

    $expiresAt = (int) ($token['expires_at'] ?? 0);
    if ($expiresAt > time() + 120) {
        return $token;
    }

    $refreshToken = $token['refresh_token'] ?? '';
    if (!$refreshToken) {
        unset($_SESSION['webex_token']);
        return null;
    }

    $refreshed = webex_request_token([
        'grant_type' => 'refresh_token',
        'client_id' => $config['client_id'],
        'client_secret' => $config['client_secret'],
        'refresh_token' => $refreshToken,
    ]);

    if (empty($refreshed['refresh_token'])) {
        $refreshed['refresh_token'] = $refreshToken;
    }

    webex_store_token($refreshed);
    return webex_current_token();
}
