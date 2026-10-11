<?php
// Takeout Fox shared leaderboard. GET -> top 20, POST {name, score, dist, tips} -> saves, returns top 20 + rank.
// Data lives outside the web root when possible (survives deploys), else in ./data (blocked by .htaccess).
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$dir = dirname(__DIR__, 2) . '/takeout-fox-data';
if (!is_dir($dir) && !@mkdir($dir, 0700, true)) { $dir = __DIR__ . '/data'; @mkdir($dir, 0700, true); }
$file = $dir . '/scores.json';
$KEEP = 100; $SHOW = 20;

function load($file) {
  $raw = @file_get_contents($file);
  $j = $raw ? json_decode($raw, true) : null;
  return is_array($j) ? $j + ['scores' => [], 'ips' => []] : ['scores' => [], 'ips' => []];
}
function top($scores, $n) {
  return array_map(fn($e) => ['name' => $e['name'], 'score' => $e['score'], 'dist' => $e['dist'], 'tips' => $e['tips']], array_slice($scores, 0, $n));
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $d = load($file);
  echo json_encode(['top' => top($d['scores'], $SHOW)]);
  exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"error":"method"}'; exit; }

$in = json_decode(file_get_contents('php://input', false, null, 0, 2000), true);
$name = preg_replace('/[^\p{L}\p{N} _.\-]/u', '', (string)($in['name'] ?? ''));
$name = mb_substr(trim($name), 0, 14) ?: 'Courier';
$score = (int)($in['score'] ?? -1); $dist = (int)($in['dist'] ?? -1); $tips = (int)($in['tips'] ?? -1);
// plausibility: score = dist * (1 + tips * 0.02), coins can't outnumber metres
if ($score < 0 || $dist < 0 || $tips < 0 || $dist > 200000 || $tips > $dist || abs($score - floor($dist * (1 + $tips * 0.02))) > $dist * 0.05 + 5) {
  http_response_code(400); echo '{"error":"invalid"}'; exit;
}

$fh = fopen($file, 'c+');
if (!$fh) { http_response_code(500); echo '{"error":"storage"}'; exit; }
flock($fh, LOCK_EX);
$raw = stream_get_contents($fh);
$d = $raw ? json_decode($raw, true) : null;
if (!is_array($d)) $d = ['scores' => [], 'ips' => []];
$d += ['scores' => [], 'ips' => []];

// gentle rate limit: one save per 8 s per (hashed) address
$ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'tf-salt');
$now = time();
foreach ($d['ips'] as $k => $t) if ($now - $t > 600) unset($d['ips'][$k]);
if (isset($d['ips'][$ip]) && $now - $d['ips'][$ip] < 8) { flock($fh, LOCK_UN); fclose($fh); http_response_code(429); echo '{"error":"slow down"}'; exit; }
$d['ips'][$ip] = $now;

$id = bin2hex(random_bytes(6));
$d['scores'][] = ['id' => $id, 'name' => $name, 'score' => $score, 'dist' => $dist, 'tips' => $tips, 't' => $now];
usort($d['scores'], fn($a, $b) => $b['score'] <=> $a['score']);
$d['scores'] = array_slice($d['scores'], 0, $KEEP);
$rank = -1;
foreach ($d['scores'] as $i => $e) if ($e['id'] === $id) { $rank = $i; break; }

ftruncate($fh, 0); rewind($fh);
fwrite($fh, json_encode($d));
fflush($fh); flock($fh, LOCK_UN); fclose($fh);

echo json_encode(['top' => top($d['scores'], $SHOW), 'rank' => ($rank >= 0 && $rank < $SHOW) ? $rank : -1]);
