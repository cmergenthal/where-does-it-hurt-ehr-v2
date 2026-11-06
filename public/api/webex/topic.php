<?php
declare(strict_types=1);

require __DIR__ . '/common.php';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const EHR_TOPICS = ['overview', 'patients', 'labs', 'appointments', 'documents', 'billing', 'none'];

function openai_response_text(array $response): string
{
    if (!empty($response['output_text']) && is_string($response['output_text'])) {
        return $response['output_text'];
    }

    foreach ($response['output'] ?? [] as $output) {
        foreach ($output['content'] ?? [] as $content) {
            if (($content['type'] ?? '') === 'output_text' && is_string($content['text'] ?? null)) {
                return $content['text'];
            }
        }
    }

    return '';
}

function topic_router_request(array $config, array $messages, string $currentPage, array $labTargets): array
{
    $lines = [];
    foreach ($messages as $message) {
        $role = strtoupper(trim((string) ($message['role'] ?? 'TRANSCRIPT')));
        $content = trim((string) ($message['content'] ?? ''));
        if (!$content) {
            continue;
        }
        $lines[] = substr($role, 0, 20) . ': ' . substr($content, 0, 800);
    }

    $labTargetIds = ['none'];
    $labTargetLines = [];
    foreach ($labTargets as $target) {
        $labTargetIds[] = $target['id'];
        $analytes = $target['analytes'] ? '; analytes: ' . implode(', ', $target['analytes']) : '';
        $labTargetLines[] = '[' . $target['id'] . '] ' . $target['name'] . $analytes;
    }

    $systemPrompt = implode("\n", [
        'Classify the current operational topic of a healthcare contact-center conversation.',
        'Choose exactly one EHR page. Weight the newest statements most heavily.',
        'overview: symptoms, diagnoses, medications, allergies, history, or general clinical chart discussion.',
        'patients: identifying, finding, or switching the patient record.',
        'labs: laboratory orders, tests, specimens, values, or results.',
        'appointments: scheduling, rescheduling, canceling, availability, dates, times, or providers.',
        'documents: forms, letters, referrals, records, uploads, or document requests.',
        'billing: insurance, claims, coverage, charges, balances, invoices, or payments.',
        'none: greetings, unrelated conversation, or insufficient evidence.',
        'When the topic is labs, select a labTargetId only when the caller clearly names a listed panel or one of its analytes.',
        'Use labTargetId none and labConfidence 0 when no listed lab is clear or multiple listed panels are equally plausible.',
        'Do not infer a topic from names, contact details, or incidental words alone.',
    ]);
    $userPrompt = implode("\n", [
        "Current EHR page: {$currentPage}",
        'Available labs for this patient:',
        $labTargetLines ? implode("\n", $labTargetLines) : 'none',
        'Conversation, oldest to newest:',
        implode("\n", $lines),
    ]);
    $request = [
        'model' => $config['openai_model'] ?: 'gpt-5.6-luna',
        'store' => false,
        'reasoning' => ['effort' => 'none'],
        'max_output_tokens' => 120,
        'input' => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userPrompt],
        ],
        'text' => [
            'format' => [
                'type' => 'json_schema',
                'name' => 'ehr_topic',
                'strict' => true,
                'schema' => [
                    'type' => 'object',
                    'properties' => [
                        'topic' => ['type' => 'string', 'enum' => EHR_TOPICS],
                        'confidence' => ['type' => 'number'],
                        'labTargetId' => ['type' => 'string', 'enum' => $labTargetIds],
                        'labConfidence' => ['type' => 'number'],
                    ],
                    'required' => ['topic', 'confidence', 'labTargetId', 'labConfidence'],
                    'additionalProperties' => false,
                ],
            ],
        ],
    ];
    $encodedRequest = json_encode($request, JSON_UNESCAPED_SLASHES);
    if ($encodedRequest === false) {
        webex_json(['error' => 'TOPIC_REQUEST_ENCODING_FAILED'], 500);
    }

    $ch = curl_init(OPENAI_RESPONSES_URL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $config['openai_api_key'],
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => $encodedRequest,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
    ]);

    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($body === false) {
        webex_json([
            'error' => 'OPENAI_TOPIC_REQUEST_FAILED',
            'message' => $curlError ?: 'Unable to contact the topic service.',
        ], 502);
    }

    $decoded = json_decode((string) $body, true);
    if ($status < 200 || $status >= 300 || !is_array($decoded)) {
        webex_json([
            'error' => 'OPENAI_TOPIC_RESPONSE_FAILED',
            'status' => $status,
            'message' => is_array($decoded) ? ($decoded['error']['message'] ?? 'Topic classification failed.') : 'Topic classification failed.',
        ], 502);
    }

    $topicResult = json_decode(openai_response_text($decoded), true);
    if (!is_array($topicResult)) {
        webex_json(['error' => 'OPENAI_TOPIC_RESPONSE_INVALID'], 502);
    }

    return $topicResult;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    webex_json(['error' => 'METHOD_NOT_ALLOWED'], 405);
}

$origin = rtrim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
if ($origin && !hash_equals(webex_origin(), $origin)) {
    webex_json(['error' => 'ORIGIN_NOT_ALLOWED'], 403);
}

webex_start_session();
$config = webex_config();
if (!webex_current_token()) {
    webex_json(['error' => 'AGENT_SESSION_REQUIRED'], 401);
}
openai_require_config($config);

$rawBody = file_get_contents('php://input');
if ($rawBody === false || strlen($rawBody) > 30000) {
    webex_json(['error' => 'INVALID_REQUEST_SIZE'], 413);
}

$payload = json_decode($rawBody, true);
$messages = is_array($payload['messages'] ?? null) ? array_slice($payload['messages'], -12) : [];
$labTargets = [];
foreach (array_slice(is_array($payload['labTargets'] ?? null) ? $payload['labTargets'] : [], 0, 20) as $target) {
    $id = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($target['id'] ?? ''));
    $name = trim(substr((string) ($target['name'] ?? ''), 0, 120));
    if (!$id || !$name) {
        continue;
    }
    $analytes = array_values(array_filter(array_map(
        static function ($analyte): string {
            return trim(substr((string) $analyte, 0, 80));
        },
        array_slice(is_array($target['analytes'] ?? null) ? $target['analytes'] : [], 0, 30)
    )));
    $labTargets[] = ['id' => $id, 'name' => $name, 'analytes' => $analytes];
}
$currentPage = (string) ($payload['currentPage'] ?? 'overview');
if (!$messages || !in_array($currentPage, EHR_TOPICS, true) || $currentPage === 'none') {
    webex_json(['error' => 'INVALID_TOPIC_REQUEST'], 400);
}

$result = topic_router_request($config, $messages, $currentPage, $labTargets);
$topic = in_array($result['topic'] ?? '', EHR_TOPICS, true) ? $result['topic'] : 'none';
$confidence = max(0, min(1, (float) ($result['confidence'] ?? 0)));
$validLabTargetIds = array_column($labTargets, 'id');
$labTargetId = in_array($result['labTargetId'] ?? '', $validLabTargetIds, true) ? $result['labTargetId'] : 'none';
$labConfidence = $labTargetId === 'none' ? 0 : max(0, min(1, (float) ($result['labConfidence'] ?? 0)));

webex_json([
    'topic' => $topic,
    'confidence' => $confidence,
    'labTargetId' => $labTargetId,
    'labConfidence' => $labConfidence,
    'model' => $config['openai_model'] ?: 'gpt-5.6-luna',
]);
