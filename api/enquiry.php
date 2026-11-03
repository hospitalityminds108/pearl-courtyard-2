<?php
/**
 * Pearl Courtyard — enquiry endpoint
 * Receives JSON (or standard form POST) from any [data-enquiry] form and emails
 * the reservations desk. Returns JSON so main.js can show an inline status.
 *
 * Deployment notes:
 *  - Set PC_MAIL_TO / PC_MAIL_FROM below (or via environment variables).
 *  - Requires a working mail transport on the host (sendmail / postfix / SMTP relay).
 *  - If mail is unavailable the endpoint still returns a "queued" response and the
 *    front-end offers the WhatsApp fallback, so no enquiry is silently lost.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');

const PC_MAIL_TO   = 'reservations@pearlcourtyard.com';
const PC_MAIL_CC   = 'info@pearlcourtyard.com';
const PC_MAIL_FROM = 'website@pearlcourtyard.com';
const PC_LOG       = __DIR__ . '/enquiries.log';

function respond(int $code, array $payload): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'Method not allowed.']);
}

/* ---------------------------------------------------------------- input */
$raw = file_get_contents('php://input') ?: '';
$data = [];
if ($raw !== '' && str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $data = $decoded;
    }
}
if (!$data) {
    $data = $_POST;
}

$clean = static function ($v, int $max = 2000): string {
    $v = is_scalar($v) ? (string) $v : '';
    $v = strip_tags($v);
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    return trim(mb_substr($v, 0, $max));
};

$name    = $clean($data['name'] ?? '', 120);
$email   = $clean($data['email'] ?? '', 160);
$phone   = $clean($data['phone'] ?? '', 40);
$message = $clean($data['message'] ?? ($data['notes'] ?? ''), 4000);
$consent = !empty($data['consent']);
$kind    = $clean($data['kind'] ?? ($data['form'] ?? 'Enquiry'), 60);

/* honeypot — silently accept and discard bot submissions */
if (!empty($data['company'])) {
    respond(200, ['ok' => true, 'message' => 'Thank you.']);
}

if ($name === '' || $message === '') {
    respond(422, ['ok' => false, 'error' => 'Please tell us your name and a short message.']);
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, ['ok' => false, 'error' => 'That email address does not look right.']);
}
if ($email === '' && $phone === '') {
    respond(422, ['ok' => false, 'error' => 'Please leave an email address or a phone number.']);
}
if (!$consent) {
    respond(422, ['ok' => false, 'error' => 'Please tick the consent box so we may reply.']);
}

/* ---------------------------------------------------------------- compose */
$skip = ['consent', 'company', 'kind', 'form'];
$lines = ["New {$kind} from pearlcourtyard.com", str_repeat('-', 52)];
foreach ($data as $k => $v) {
    if (in_array($k, $skip, true) || !is_scalar($v)) {
        continue;
    }
    $label = ucwords(str_replace(['_', '-'], ' ', (string) $k));
    $lines[] = $label . ': ' . $clean($v, 2000);
}
$lines[] = str_repeat('-', 52);
$lines[] = 'Received: ' . gmdate('Y-m-d H:i:s') . ' UTC';
$lines[] = 'IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$lines[] = 'Page: ' . $clean($_SERVER['HTTP_REFERER'] ?? '', 400);

$body = implode("\n", $lines);
$subject = sprintf('[Website] %s — %s', $kind, $name);

$headers = [
    'From: Pearl Courtyard Website <' . PC_MAIL_FROM . '>',
    'Reply-To: ' . ($email !== '' ? $email : PC_MAIL_FROM),
    'Cc: ' . PC_MAIL_CC,
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . PHP_VERSION,
];

/* keep a local audit trail even if mail transport fails */
@file_put_contents(PC_LOG, $body . "\n\n", FILE_APPEND | LOCK_EX);

$sent = @mail(PC_MAIL_TO, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers));

if (!$sent) {
    error_log('[pearl-courtyard] mail() failed for enquiry from ' . $name);
    respond(200, [
        'ok' => true,
        'queued' => true,
        'message' => 'Thank you — your enquiry has been recorded. If you do not hear from us within a few hours, please WhatsApp us on +91 89310 65047.',
    ]);
}

respond(200, [
    'ok' => true,
    'message' => 'Thank you, ' . $name . '. Your enquiry is with our reservations desk — we reply within a few hours.',
]);
