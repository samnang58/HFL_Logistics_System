<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$source = getenv('HOME')
    . '/Documents/HFL_Migration_Private/'
    . 'legacy_packages_customer_fixed.jsonl';

$apply = in_array('--apply', $argv, true);
$confirmed = in_array('--confirm=IMPORT-LEGACY', $argv, true);
$limit = 0;

$stop = static function (string $msg): never {
    exit("STOP: {$msg}\n");
};

foreach ($argv as $arg) {
    if (str_starts_with($arg, '--limit=')) {
        $value = substr($arg, 8);

        if (
            !ctype_digit($value) ||
            (int) $value < 1 ||
            (int) $value > 12008
        ) {
            $stop('--limit must be 1..12008');
        }

        $limit = (int) $value;
    }
}

if ($apply && !$confirmed) {
    $stop('Missing --confirm=IMPORT-LEGACY');
}

if (!is_readable($source)) {
    $stop('Prepared JSONL not found');
}

if (!Schema::hasTable('legacy_packages')) {
    $stop('Run legacy_packages migration first');
}

if (!Schema::hasColumn('legacy_packages', 'source_payload')) {
    $stop('Archive schema is incomplete');
}

if (DB::table('customers')->count() !== 700) {
    $stop('Customer count differs from 700');
}

$key = static fn ($value): string =>
    mb_strtolower(trim((string) $value), 'UTF-8');

$customerIds = [];

foreach (
    DB::table('customers')->pluck('customer_id') as $id
) {
    $k = $key($id);

    if ($k === '' || isset($customerIds[$k])) {
        $stop('Duplicate or empty Customer ID');
    }

    $customerIds[$k] = (string) $id;
}

$existing = [];

foreach (
    DB::table('legacy_packages')
        ->get(['legacy_package_id', 'customer_id'])
    as $old
) {
    $k = $key($old->legacy_package_id);

    if ($k === '' || isset($existing[$k])) {
        $stop('Duplicate existing archive ID');
    }

    $existing[$k] = (string) $old->customer_id;
}

$decode = static function (string $line) use ($stop): array {
    try {
        $p = json_decode(
            $line,
            true,
            512,
            JSON_THROW_ON_ERROR
        );
    } catch (Throwable $e) {
        $stop('Invalid JSONL: ' . $e->getMessage());
    }

    if (!is_array($p)) {
        $stop('Invalid package JSON object');
    }

    return $p;
};

$decimal = static function ($value) use ($stop): ?string {
    $v = trim((string) ($value ?? ''));

    if ($v === '') {
        return null;
    }

    if (
        !is_numeric($v) ||
        !is_finite((float) $v) ||
        (float) $v < 0 ||
        (float) $v >= 1e14
    ) {
        $stop('Invalid weight or CBM');
    }

    return number_format((float) $v, 6, '.', '');
};

$makeRow = static function (array $p)
    use ($key, $customerIds, $decimal, $stop): array {

    $legacyId = trim(
        (string) ($p['legacy_package_id'] ?? '')
    );

    $customerKey = $key($p['customer_id'] ?? '');
    $items = $p['items'] ?? null;

    if (
        $legacyId === '' ||
        mb_strlen($legacyId) > 255
    ) {
        $stop('Invalid historical Package ID');
    }

    if (!isset($customerIds[$customerKey])) {
        $stop('Unmatched Customer in corrected JSONL');
    }

    if (!is_array($items)) {
        $stop('Invalid Package Items');
    }

    $date = (string) ($p['shipping_date'] ?? '');
    $datetime = (string) ($p['shipping_datetime'] ?? '');

    $d = DateTimeImmutable::createFromFormat(
        '!Y-m-d',
        $date
    );

    $dt = DateTimeImmutable::createFromFormat(
        '!Y-m-d H:i:s',
        $datetime
    );

    if (!$d || $d->format('Y-m-d') !== $date) {
        $stop('Invalid shipping date');
    }

    if (
        !$dt ||
        $dt->format('Y-m-d H:i:s') !== $datetime
    ) {
        $stop('Invalid shipping datetime');
    }

    $mode = (string) (
        $p['source_shipping_mode'] ?? ''
    );

    $status = (string) ($p['source_status'] ?? '');
    $code = trim((string) ($p['source_code'] ?? ''));

    if (!in_array($mode, [
        'LAND',
        'SEA',
        'AIR - CHINA - CAMBODIA',
        'AIR - CAMBODIA - CHINA',
    ], true)) {
        $stop('Unknown shipping mode');
    }

    if (
        $status === '' ||
        mb_strlen($status) > 100 ||
        mb_strlen($mode) > 100 ||
        mb_strlen($code) > 255
    ) {
        $stop('Invalid package status or code');
    }

    try {
        $itemsJson = json_encode(
            $items,
            JSON_UNESCAPED_UNICODE |
            JSON_UNESCAPED_SLASHES |
            JSON_THROW_ON_ERROR
        );

        $payloadJson = json_encode(
            $p,
            JSON_UNESCAPED_UNICODE |
            JSON_UNESCAPED_SLASHES |
            JSON_THROW_ON_ERROR
        );
    } catch (Throwable $e) {
        $stop('JSON encoding failed');
    }

    return [
        'legacy_package_id' => $legacyId,
        'customer_id' => $customerIds[$customerKey],
        'customer_name' => ($p['customer_name'] ?? '') ?: null,
        'source_code' => $code ?: null,
        'tracking_raw' =>
            ($p['source_tracking_number'] ?? '') ?: null,
        'shipping_date' => $date,
        'shipping_datetime' => $datetime,
        'shipping_mode' => $mode,
        'source_status' => $status,
        'weight_kg' => $decimal($p['weight_raw'] ?? ''),
        'volume_cbm' => $decimal($p['cbm_raw'] ?? ''),
        'item_count' => count($items),
        'items' => $itemsJson,
        'source_payload' => $payloadJson,
        'created_at' => now(),
        'updated_at' => now(),
    ];
};

// Validate every package before any database writes.
$lines = 0;
$itemCount = 0;
$already = 0;
$new = 0;
$seen = [];

$f = fopen($source, 'r');

if ($f === false) {
    $stop('Cannot open JSONL');
}

while (($line = fgets($f)) !== false) {
    $row = $makeRow($decode($line));

    $lines++;
    $itemCount += $row['item_count'];

    $idKey = $key($row['legacy_package_id']);

    if (isset($seen[$idKey])) {
        $stop('Duplicate source Package ID');
    }

    $seen[$idKey] = true;

    if (isset($existing[$idKey])) {
        if (
            $existing[$idKey] !== $row['customer_id']
        ) {
            $stop('Conflicting archived Customer ID');
        }

        $already++;
    } else {
        $new++;
    }
}

fclose($f);

if (
    $lines !== 12008 ||
    $itemCount !== 21631 ||
    count($seen) !== 12008
) {
    $stop('Expected package/item counts differ');
}

$currentPackages = DB::table('packages')->count();

if ($currentPackages < 80) {
    $stop('Operational Package count unexpectedly decreased');
}

echo "\n====================================\n";
echo " HFL HISTORICAL PACKAGE IMPORT\n";
echo "====================================\n";
echo "Mode: " . ($apply ? 'APPLY' : 'DRY RUN') . "\n";
echo "Source packages: {$lines}\n";
echo "Source item entries: {$itemCount}\n";
echo "Already archived (skip): {$already}\n";
echo "New historical packages: {$new}\n";
echo "Import limit: " . ($limit ?: 'ALL') . "\n";
echo "Operational packages: {$currentPackages}\n";
echo "====================================\n";

if (!$apply) {
    exit("DRY RUN PASSED. Database unchanged.\n");
}

// Every real import requires a fresh backup first.
$backup = __DIR__ .
    '/backup_legacy_package_migration.php';

if (!is_readable($backup)) {
    $stop('Database backup script missing');
}

$command = escapeshellarg(PHP_BINARY) .
    ' ' . escapeshellarg($backup) . ' 2>&1';

$output = [];
$exitCode = 0;

exec($command, $output, $exitCode);

if ($exitCode !== 0) {
    $stop(
        'Database backup failed: ' .
        implode(' | ', $output)
    );
}

echo implode("\n", $output) . "\n";

// Insert in batches, transaction protects the whole run.
$added = DB::transaction(
    static function () use (
        $source, $decode, $makeRow,
        $key, $existing, $limit
    ): int {

        $input = fopen($source, 'r');

        if (!$input) {
            throw new RuntimeException(
                'Cannot reopen JSONL for importing'
            );
        }

        $batch = [];
        $inserted = 0;

        while (($line = fgets($input)) !== false) {
            $row = $makeRow($decode($line));

            $idKey = $key($row['legacy_package_id']);

            if (isset($existing[$idKey])) {
                continue;
            }

            $batch[] = $row;

            if (count($batch) === 100) {
                DB::table('legacy_packages')->insert($batch);
                $inserted += count($batch);
                $batch = [];
            }

            if (
                $limit > 0 &&
                $inserted + count($batch) >= $limit
            ) {
                break;
            }
        }

        if ($batch) {
            DB::table('legacy_packages')->insert($batch);
            $inserted += count($batch);
        }

        fclose($input);

        return $inserted;
    }
);

echo "====================================\n";
echo "SUCCESS: Added {$added} historical packages.\n";
echo "Archive total: " .
    DB::table('legacy_packages')->count() . "\n";
echo "Operational packages: " .
    DB::table('packages')->count() . "\n";
echo "====================================\n";
