<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$apply = in_array('--apply', $argv, true);
$confirm = in_array('--confirm=FIX-682', $argv, true);

$fail = static function (string $message): never {
    exit("STOP: {$message}\n");
};

if ($apply && !$confirm) {
    $fail('Missing --confirm=FIX-682');
}

$customers = DB::table('customers')
    ->get(['id', 'customer_id', 'username', 'notes']);

$legacy = [];
$untouched = [];
$quotedOther = 0;

foreach ($customers as $row) {
    $old = (string) $row->customer_id;

    $isLegacy = str_starts_with(
        (string) $row->notes,
        'Imported from hfl.dierp.app'
    );

    if ($isLegacy) {
        $legacy[] = $row;
    } else {
        $untouched[] = $row;

        if (
            strlen($old) >= 2 &&
            str_starts_with($old, '"') &&
            str_ends_with($old, '"')
        ) {
            $quotedOther++;
        }
    }
}

$mapping = [];
$seenIds = [];
$seenUsernames = [];
$trimmedCount = 0;

foreach ($customers as $row) {
    $username = trim((string) $row->username);

    if ($username !== '') {
        $key = mb_strtolower($username);

        $seenUsernames[$key] = (int) $row->id;
    }
}

foreach ($untouched as $row) {
    $id = mb_strtolower((string) $row->customer_id);
    $seenIds[$id] = true;
}

foreach ($legacy as $row) {
    $old = (string) $row->customer_id;

    if (
        strlen($old) < 2 ||
        !str_starts_with($old, '"') ||
        !str_ends_with($old, '"')
    ) {
        $fail('A legacy ID has an unexpected format.');
    }

    // Remove one surrounding pair of literal quotes.
    $withoutQuotes = substr($old, 1, -1);

    // Remove accidental surrounding whitespace.
    $new = trim($withoutQuotes);

    if ($new !== $withoutQuotes) {
        $trimmedCount++;
    }

    if ($new === '' || strlen($new) > 255) {
        $fail('An ID is empty or exceeds 255 bytes.');
    }

    $key = mb_strtolower($new);

    if (isset($seenIds[$key])) {
        $fail('Duplicate Customer ID after normalization.');
    }

    if (
        isset($seenUsernames[$key]) &&
        $seenUsernames[$key] !== (int) $row->id
    ) {
        $fail('New Customer ID conflicts with a username.');
    }

    $seenIds[$key] = true;

    $mapping[] = [
        'db_id' => (int) $row->id,
        'old' => $old,
        'new' => $new,
    ];
}

echo "\n====================================\n";
echo " HFL LEGACY ID CORRECTION\n";
echo "====================================\n";
echo "Mode: " . ($apply ? 'APPLY' : 'DRY RUN') . "\n";
echo "Current customers: " . count($customers) . "\n";
echo "Legacy records: " . count($legacy) . "\n";
echo "Other customers: " . count($untouched) . "\n";
echo "IDs with surrounding spaces: {$trimmedCount}\n";
echo "Other quoted IDs: {$quotedOther}\n";

if (
    count($customers) !== 700 ||
    count($legacy) !== 682 ||
    count($untouched) !== 18 ||
    count($mapping) !== 682 ||
    $trimmedCount !== 1 ||
    $quotedOther !== 0
) {
    $fail('Preflight counts do not match expectations.');
}

// Check references in known customer_id columns.
$tables = DB::select(
    "SELECT TABLE_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND COLUMN_NAME = 'customer_id'"
);

$oldIds = array_column($mapping, 'old');
$referenceCount = 0;

foreach ($tables as $tableInfo) {
    $table = $tableInfo->TABLE_NAME;

    if ($table === 'customers') {
        continue;
    }

    foreach (array_chunk($oldIds, 150) as $chunk) {
        $referenceCount += DB::table($table)
            ->whereIn('customer_id', $chunk)
            ->count();
    }
}

echo "Existing references: {$referenceCount}\n";

if ($referenceCount !== 0) {
    $fail('Legacy IDs already have related records.');
}

echo "Preflight: PASSED\n";

if (!$apply) {
    exit("DRY RUN: Database unchanged.\n");
}

// Backup before any database update.
$driver = config('database.default');

if (!in_array($driver, ['mysql', 'mariadb'], true)) {
    $fail('This backup requires MySQL or MariaDB.');
}

$db = config('database.connections.' . $driver);

$binary = trim((string) shell_exec(
    'command -v mysqldump 2>/dev/null || ' .
    'command -v mariadb-dump 2>/dev/null'
));

if ($binary === '') {
    $fail('mysqldump or mariadb-dump not found.');
}

$directory = storage_path(
    'app/private/customer-migration-backups'
);

if (!is_dir($directory) &&
    !mkdir($directory, 0700, true)) {
    $fail('Cannot create private backup directory.');
}

chmod($directory, 0700);

$suffix = date('Ymd_His') . '_' . bin2hex(random_bytes(4));

$backup = $directory . '/before_id_fix_' . $suffix . '.sql';
$mapFile = $directory . '/customer_id_map_' . $suffix . '.csv';

$optionsFile = tempnam(sys_get_temp_dir(), 'hfl_dump_');

if ($optionsFile === false) {
    $fail('Cannot create temporary database options.');
}

chmod($optionsFile, 0600);

$escape = static function ($value): string {
    return '"' . str_replace(
        ["\\", '"', "\n", "\r"],
        ["\\\\", '\\"', "\\n", "\\r"],
        (string) $value
    ) . '"';
};

$options = "[client]\n";

foreach ([
    'host' => $db['host'] ?? '127.0.0.1',
    'port' => $db['port'] ?? 3306,
    'user' => $db['username'] ?? '',
    'password' => $db['password'] ?? '',
] as $key => $value) {
    $options .= $key . '=' . $escape($value) . "\n";
}

if (!empty($db['unix_socket'])) {
    $options .= 'socket='
        . $escape($db['unix_socket']) . "\n";
}

try {
    if (file_put_contents($optionsFile, $options) === false) {
        $fail('Could not write temporary DB options.');
    }

    $cmd =
        escapeshellarg($binary) .
        ' --defaults-extra-file=' . escapeshellarg($optionsFile) .
        ' --single-transaction --quick' .
        ' --routines --triggers --events --no-tablespaces' .
        ' --result-file=' . escapeshellarg($backup) .
        ' ' . escapeshellarg((string) $db['database']) .
        ' 2>&1';

    $output = [];
    $exitCode = 0;
    exec($cmd, $output, $exitCode);

    if (
        $exitCode !== 0 ||
        !is_file($backup) ||
        filesize($backup) < 1024
    ) {
        if (is_file($backup)) {
            unlink($backup);
        }

        $fail(
            'Backup failed. No IDs changed. ' .
            implode(' ', $output)
        );
    }

    chmod($backup, 0600);
} finally {
    if (is_file($optionsFile)) {
        unlink($optionsFile);
    }
}

echo "Database backup: SUCCESS\n";

// Preserve the full old-to-new ID mapping privately.
$fp = fopen($mapFile, 'x');

if ($fp === false) {
    $fail('Cannot create mapping backup.');
}

fputcsv($fp, ['database_row_id', 'old_id', 'new_id']);

foreach ($mapping as $item) {
    fputcsv($fp, [
        $item['db_id'],
        $item['old'],
        $item['new'],
    ]);
}

fclose($fp);
chmod($mapFile, 0600);

// Update only existing legacy Customer records.
DB::transaction(function () use ($mapping, $fail) {
    $locked = DB::table('customers')
        ->lockForUpdate()
        ->count();

    if ($locked !== 700) {
        $fail('Customer count changed. Nothing updated.');
    }

    foreach ($mapping as $item) {
        $affected = DB::table('customers')
            ->where('id', $item['db_id'])
            ->where('customer_id', $item['old'])
            ->update([
                'customer_id' => $item['new'],
            ]);

        if ($affected !== 1) {
            throw new RuntimeException(
                'Customer changed during update. Rollback.'
            );
        }
    }
});

$after = DB::table('customers')->count();

if ($after !== 700) {
    $fail('Post-update customer count mismatch.');
}

echo "====================================\n";
echo "SUCCESS: Fixed 682 Customer IDs.\n";
echo "Final customers: {$after}\n";
echo "Database backup saved privately.\n";
echo "Old-to-new ID mapping saved privately.\n";
echo "====================================\n";
