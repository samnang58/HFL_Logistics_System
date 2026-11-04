<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$path = getenv('HOME')
    . '/Downloads/HFL Package History.csv';

$apply = in_array('--apply', $argv, true);
$confirm = in_array(
    '--confirm=IMPORT-HISTORY-112838',
    $argv,
    true
);

$limit = 0;

foreach ($argv as $arg) {
    if (str_starts_with($arg, '--limit=')) {
        $raw = substr($arg, 8);

        if (
            !ctype_digit($raw) ||
            (int)$raw < 1 ||
            (int)$raw > 112838
        ) {
            throw new RuntimeException(
                'Invalid --limit (1..112838).'
            );
        }

        $limit = (int)$raw;
    }
}

if ($apply && !$confirm) {
    throw new RuntimeException(
        'Missing --confirm=IMPORT-HISTORY-112838'
    );
}

if (!is_readable($path)) {
    throw new RuntimeException(
        'Missing HFL Package History.csv in Downloads.'
    );
}

foreach (
    ['legacy_packages', 'legacy_package_history']
    as $table
) {
    if (!Schema::hasTable($table)) {
        throw new RuntimeException(
            "Missing table: {$table}"
        );
    }
}

if (DB::table('legacy_packages')->count() !== 12008) {
    throw new RuntimeException(
        'Historical package count is not 12008.'
    );
}

$clean = static function ($value): string {
    $value = trim((string)($value ?? ''));

    if (
        strlen($value) >= 2 &&
        $value[0] === '"' &&
        substr($value, -1) === '"'
    ) {
        $value = trim(substr($value, 1, -1));
    }

    return $value;
};

$key = static fn ($value): string =>
    mb_strtolower(trim((string)$value), 'UTF-8');

$packageMap = [];

foreach (
    DB::table('legacy_packages')
        ->get(['id', 'legacy_package_id'])
    as $package
) {
    $k = $key($package->legacy_package_id);

    if ($k === '' || isset($packageMap[$k])) {
        throw new RuntimeException(
            'Archive package ID collision.'
        );
    }

    $packageMap[$k] = (int)$package->id;
}

$existing = [];

foreach (
    DB::table('legacy_package_history')
        ->pluck('source_history_id')
    as $id
) {
    $k = $key($id);

    if ($k === '' || isset($existing[$k])) {
        throw new RuntimeException(
            'History ID collision in destination.'
        );
    }

    $existing[$k] = true;
}

$parseDate = static function (
    string $value,
    bool $nullable = false
): ?string {
    if ($nullable && $value === '') {
        return null;
    }

    $date = DateTimeImmutable::createFromFormat(
        '!d-m-Y H:i:s',
        $value
    );

    if (
        !$date ||
        $date->format('d-m-Y H:i:s') !== $value
    ) {
        throw new RuntimeException(
            'Invalid history date format.'
        );
    }

    return $date->format('Y-m-d H:i:s');
};

$readRows = static function (callable $visit) use (
    $path,
    $clean,
    $key,
    $packageMap,
    $parseDate
): void {
    $f = fopen($path, 'r');

    if (!$f) {
        throw new RuntimeException(
            'Cannot open history CSV.'
        );
    }

    try {
        $headers = fgetcsv($f);

        if (!$headers) {
            throw new RuntimeException(
                'CSV header missing.'
            );
        }

        $fields = [
            'ID',
            'Package ID',
            'Date',
            'Status',
            'Created On',
            'Created By',
            'Is Return',
            'Return Date',
            'Amended From',
        ];

        $ix = [];

        foreach ($fields as $field) {
            $i = array_search(
                $field,
                $headers,
                true
            );

            if ($i === false) {
                throw new RuntimeException(
                    "Missing CSV field: {$field}"
                );
            }

            $ix[$field] = $i;
        }

        $get = static fn (
            array $row,
            string $name
        ): string =>
            $clean($row[$ix[$name]] ?? '');

        while (($raw = fgetcsv($f)) !== false) {
            if (!array_filter(
                $raw,
                static fn ($v) =>
                    trim((string)$v) !== ''
            )) {
                continue;
            }

            if (count($raw) !== count($headers)) {
                throw new RuntimeException(
                    'Unexpected CSV column count.'
                );
            }

            $historyId = $get($raw, 'ID');
            $packageId = $get($raw, 'Package ID');
            $status = $get($raw, 'Status');
            $createdBy = $get($raw, 'Created By');
            $returnFlag = $get($raw, 'Is Return');
            $returnRaw = $get($raw, 'Return Date');

            if (
                $historyId === '' ||
                mb_strlen($historyId) > 255 ||
                $packageId === '' ||
                mb_strlen($packageId) > 255 ||
                $status === '' ||
                mb_strlen($status) > 255 ||
                mb_strlen($createdBy) > 255 ||
                !in_array(
                    $returnFlag,
                    ['0', '1'],
                    true
                )
            ) {
                throw new RuntimeException(
                    'Invalid history ID, package, status, creator or return flag.'
                );
            }

            $returnAt = $parseDate(
                $returnRaw,
                true
            );

            if (
                ($returnFlag === '1') !==
                ($returnAt !== null)
            ) {
                throw new RuntimeException(
                    'Is Return does not match Return Date.'
                );
            }

            $sourcePayload = json_encode(
                array_combine($headers, $raw),
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES |
                JSON_THROW_ON_ERROR
            );

            $linkedPackageId = $packageMap[
                $key($packageId)
            ] ?? null;

            $record = [
                'source_history_id' => $historyId,
                'legacy_package_id' => $packageId,
                'legacy_package_row_id' =>
                    $linkedPackageId,
                'event_at' => $parseDate(
                    $get($raw, 'Date')
                ),
                'status' => $status,
                'is_return' => (int)$returnFlag,
                'return_at' => $returnAt,
                'created_on_raw' =>
                    $get($raw, 'Created On') ?: null,
                'created_by' =>
                    $createdBy ?: null,
                'source_payload' => $sourcePayload,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            $visit($record);
        }

    } finally {
        fclose($f);
    }
};

$stats = [
    'rows' => 0,
    'linked' => 0,
    'orphans' => 0,
    'returns' => 0,
    'already' => 0,
    'new' => 0,
];

$seen = [];
$sourceHash = hash_file('sha256', $path);

$readRows(static function ($record) use (
    &$stats,
    &$seen,
    $key,
    $existing
): void {
    $stats['rows']++;

    $k = $key($record['source_history_id']);

    if (isset($seen[$k])) {
        throw new RuntimeException(
            'Duplicate source history ID.'
        );
    }

    $seen[$k] = true;

    if ($record['legacy_package_row_id'] === null) {
        $stats['orphans']++;
    } else {
        $stats['linked']++;
    }

    if ($record['is_return']) {
        $stats['returns']++;
    }

    if (isset($existing[$k])) {
        $stats['already']++;
    } else {
        $stats['new']++;
    }
});

if (
    $stats['rows'] !== 112838 ||
    $stats['linked'] !== 112818 ||
    $stats['orphans'] !== 20 ||
    $stats['returns'] !== 3166 ||
    count($seen) !== 112838
) {
    throw new RuntimeException(
        'Preflight counts differ. Import blocked.'
    );
}

echo "\n====================================\n";
echo " HFL PACKAGE HISTORY IMPORT\n";
echo "====================================\n";
echo "Mode: " . ($apply ? 'APPLY' : 'DRY RUN') . "\n";

foreach ($stats as $name => $number) {
    echo "{$name}: {$number}\n";
}

echo "Limit: " . ($limit ?: 'ALL') . "\n";
echo "====================================\n";

if (!$apply) {
    exit(
        "DRY RUN PASSED. No database changes.\n"
    );
}

$backup = __DIR__
    . '/backup_legacy_package_migration.php';

if (!is_readable($backup)) {
    throw new RuntimeException(
        'Backup script missing.'
    );
}

$log = [];
$exitCode = 0;

exec(
    escapeshellarg(PHP_BINARY)
    . ' '
    . escapeshellarg($backup)
    . ' 2>&1',
    $log,
    $exitCode
);

if (
    $exitCode !== 0 ||
    !str_contains(
        implode("\n", $log),
        'BACKUP SUCCESS'
    )
) {
    throw new RuntimeException(
        'Backup failed. No history imported. '
        . implode(' | ', $log)
    );
}

echo implode("\n", $log) . "\n";

if (
    hash_file('sha256', $path) !== $sourceHash
) {
    throw new RuntimeException(
        'Source CSV changed. Import blocked.'
    );
}

$batch = [];
$inserted = 0;

$flush = static function () use (
    &$batch,
    &$inserted
): void {
    if (!$batch) {
        return;
    }

    DB::transaction(
        static fn () =>
            DB::table('legacy_package_history')
                ->insert($batch)
    );

    $inserted += count($batch);
    $batch = [];
};

$readRows(static function ($record) use (
    $key,
    $existing,
    $limit,
    &$batch,
    &$inserted,
    $flush
): void {
    if (
        isset($existing[
            $key($record['source_history_id'])
        ])
    ) {
        return;
    }

    if (
        $limit &&
        $inserted + count($batch) >= $limit
    ) {
        return;
    }

    $batch[] = $record;

    if (count($batch) >= 200) {
        $flush();
    }
});

$flush();

echo "\nSUCCESS: Imported {$inserted} history records.\n";
echo "History archive total: "
    . DB::table('legacy_package_history')->count()
    . "\n";
echo "Operational packages: "
    . DB::table('packages')->count()
    . "\n";
