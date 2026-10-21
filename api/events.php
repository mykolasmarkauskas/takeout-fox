<?php
// Takeout Fox anonymous play stats. POST one event -> bumps daily counters; GET -> the last 30 days.
// No personal data: no IP, no IDs, only counts per day (Vilnius calendar day).
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$dir = dirname(__DIR__, 2) . '/takeout-fox-data';
if (!is_dir($dir) && !@mkdir($dir, 0700, true)) { $dir = __DIR__ . '/data'; @mkdir($dir, 0700, true); }
$file = $dir . '/stats.json';
$day = (new DateTime('now', new DateTimeZone('Europe/Vilnius')))->format('Y-m-d');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $raw = @file_get_contents($file);
  echo $raw ?: '{}';
  exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"error":"method"}'; exit; }

$in = json_decode(file_get_contents('php://input', false, null, 0, 1000), true);
$ok = ['e' => '/^(start|end|task|ach|buy|install)$/', 'k' => '/^[a-z0-9_]{0,24}$/'];
$e = (string)($in['e'] ?? ''); $k = (string)($in['k'] ?? '');
if (!preg_match($ok['e'], $e) || !preg_match($ok['k'], $k)) { http_response_code(400); echo '{"error":"invalid"}'; exit; }
$dist = max(0, min(100000, (int)($in['d'] ?? 0)));
$district = max(0, min(2, (int)($in['z'] ?? 0)));

$fh = fopen($file, 'c+');
if (!$fh) { http_response_code(500); echo '{"error":"storage"}'; exit; }
flock($fh, LOCK_EX);
$raw = stream_get_contents($fh);
$s = $raw ? json_decode($raw, true) : [];
if (!is_array($s)) $s = [];
$t = &$s[$day];
if (!is_array($t)) $t = [];
$inc = function (&$arr, $key, $by = 1) { $arr[$key] = ($arr[$key] ?? 0) + $by; };
$inc($t, $e);
if ($e === 'end') {
  // how far runs get (buckets of 250 m), what ends them, and in which district
  $inc($t['dist'], (string)(intdiv($dist, 250) * 250));
  $inc($t['cause'], $k ?: 'unknown');
  $inc($t['where'], ['roofs', 'harbour', 'garden'][$district]);
  $inc($t, 'metres', $dist);
} elseif ($k !== '') {
  $inc($t[$e . '_by'], $k);
}
ksort($s);
$s = array_slice($s, -30, null, true); // keep 30 days
ftruncate($fh, 0); rewind($fh);
fwrite($fh, json_encode($s));
fflush($fh); flock($fh, LOCK_UN); fclose($fh);
echo '{"ok":true}';
