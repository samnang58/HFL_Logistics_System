<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$file = getenv('HOME') . '/Downloads/HFL Package.csv';

if (!is_readable($file)) {
    exit("STOP: Package CSV not found.\n");
}

foreach (['customers', 'packages'] as $table) {
    if (!Schema::hasTable($table)) {
        exit("STOP: Missing database table: {$table}\n");
    }
}

$normalize = static function ($value): string {
    $value = trim((string) ($value ?? ''));

    if (
        strlen($value) >= 2 &&
        str_starts_with($value, '"') &&
        str_ends_with($value, '"')
    ) {
        $value = trim(substr($value, 1, -1));
    }

    return $value;
};

$key = static fn ($value): string =>
    mb_strtolower($normalize($value), 'UTF-8');

$customers = [];

foreach (DB::table('customers')->pluck('customer_id') as $id) {
    $customers[$key($id)] = true;
}

$existingIds = [];

foreach (DB::table('packages')->pluck('package_id') as $id) {
    $existingIds[$key($id)] = true;
}

$handle = fopen($file, 'r');
$header = fgetcsv($handle);

if (!$header) {
    exit("STOP: CSV header is missing.\n");
}

$fields = [
    'ID', 'Customer', 'Tracking Number',
    'Shipping Mode', 'Status', 'Shipping Date',
    'Weight(kg)', 'Volume(cbm)',
    'Item Code', 'Item', 'Qty', 'Price'
];

$columns = [];

foreach ($header as $i => $name) {
    if (!array_key_exists($name, $columns)) {
        $columns[$name] = $i;
    }
}

foreach ($fields as $field) {
    if (!isset($columns[$field])) {
        exit("STOP: Missing CSV field: {$field}\n");
    }
}

$get = static function (array $row, string $field)
    use ($columns, $normalize): string {
    return $normalize(
        $row[$columns[$field]] ?? ''
    );
};

$stats = [
    'packages' => 0,
    'child_rows' => 0,
    'item_rows' => 0,
    'missing_customer' => 0,
    'duplicate_ids' => 0,
    'existing_id_matches' => 0,
    'tracking_yc' => 0,
    'tracking_other' => 0,
    'tracking_empty' => 0,
    'invalid_dates' => 0,
    'invalid_numbers' => 0,
    'unknown_modes' => 0,
];

$seenIds = [];
$statuses = [];

while (($row = fgetcsv($handle)) !== false) {

    $packageId = $get($row, 'ID');

    $hasItem = false;

    foreach (['Item Code', 'Item', 'Qty', 'Price'] as $field) {
        if ($get($row, $field) !== '') {
            $hasItem = true;
            break;
        }
    }

    if ($hasItem) {
        $stats['item_rows']++;
    }

    if ($packageId === '') {
        $stats['child_rows']++;
        continue;
    }

    $stats['packages']++;

    $idKey = $key($packageId);

    if (isset($seenIds[$idKey])) {
        $stats['duplicate_ids']++;
    }

    $seenIds[$idKey] = true;

    if (isset($existingIds[$idKey])) {
        $stats['existing_id_matches']++;
    }

    $customer = $key($get($row, 'Customer'));

    if (!isset($customers[$customer])) {
        $stats['missing_customer']++;
    }

    $tracking = $get($row, 'Tracking Number');

    if ($tracking === '') {
        $stats['tracking_empty']++;
    } elseif (preg_match('/^YC/i', $tracking)) {
        $stats['tracking_yc']++;
    } else {
        $stats['tracking_other']++;
    }

    $mode = strtoupper($get($row, 'Shipping Mode'));

    if (!in_array($mode, [
        'LAND',
        'SEA',
        'AIR - CHINA - CAMBODIA',
        'AIR - CAMBODIA - CHINA'
    ], true)) {
        $stats['unknown_modes']++;
    }

    $status = $get($row, 'Status');
    $statuses[$status] = true;

    $date = $get($row, 'Shipping Date');

    if (
        !preg_match(
            '/^\d{4}-\d{2}-\d{2}(?:$|\s)/',
            $date
        )
    ) {
        $stats['invalid_dates']++;
    }

    foreach (['Weight(kg)', 'Volume(cbm)'] as $field) {
        $value = $get($row, $field);

        if ($value !== '' && !is_numeric($value)) {
            $stats['invalid_numbers']++;
        }
    }
}

fclose($handle);

echo "\n======================================\n";
echo " HFL PACKAGE IMPORT FINAL DRY RUN\n";
echo "======================================\n";

echo "Current HFL customers: "
    . count($customers) . "\n";

echo "Current HFL packages: "
    . DB::table('packages')->count() . "\n";

foreach ($stats as $name => $value) {
    echo $name . ": " . $value . "\n";
}

echo "Unique source package IDs: "
    . count($seenIds) . "\n";

echo "Old status variants: "
    . count($statuses) . "\n";

echo "======================================\n";

if (
    $stats['packages'] === 12008 &&
    $stats['child_rows'] === 9633 &&
    $stats['missing_customer'] === 0 &&
    $stats['duplicate_ids'] === 0 &&
    $stats['invalid_dates'] === 0 &&
    $stats['invalid_numbers'] === 0 &&
    $stats['unknown_modes'] === 0
) {
    echo "PREFLIGHT PASSED\n";
} else {
    echo "REVIEW REQUIRED BEFORE IMPORT\n";
}

echo "READ ONLY: Database unchanged.\n";
