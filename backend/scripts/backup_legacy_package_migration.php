<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$driver = (string) config('database.default');

if (!in_array($driver, ['mysql', 'mariadb'], true)) {
    exit("STOP: Expected MySQL/MariaDB.\n");
}

$db = config("database.connections.{$driver}");

$binary = trim((string) shell_exec(
    'command -v mysqldump 2>/dev/null || ' .
    'command -v mariadb-dump 2>/dev/null'
));

if (!$binary) {
    exit("STOP: mysqldump not found.\n");
}

$dir = storage_path(
    'app/private/customer-migration-backups'
);

if (!is_dir($dir) && !mkdir($dir, 0700, true)) {
    exit("STOP: Cannot create backup directory.\n");
}

chmod($dir, 0700);

$file = $dir . '/before_legacy_packages_' .
    date('Ymd_His') . '_' .
    bin2hex(random_bytes(4)) . '.sql';

$options = tempnam(
    sys_get_temp_dir(),
    'hfl_legacy_dump_'
);

if (!$options) {
    exit("STOP: Cannot create temporary options.\n");
}

chmod($options, 0600);

$quote = static fn ($v) =>
    '"' . str_replace(
        ["\\", '"', "\n", "\r"],
        ["\\\\", '\\"', "\\n", "\\r"],
        (string) $v
    ) . '"';

try {
    $cfg = "[client]\n";

    foreach ([
        'host' => $db['host'] ?? '127.0.0.1',
        'port' => $db['port'] ?? 3306,
        'user' => $db['username'] ?? '',
        'password' => $db['password'] ?? '',
    ] as $k => $v) {
        $cfg .= $k . '=' . $quote($v) . "\n";
    }

    if (!empty($db['unix_socket'])) {
        $cfg .= 'socket=' .
            $quote($db['unix_socket']) . "\n";
    }

    if (file_put_contents($options, $cfg) === false) {
        exit("STOP: Cannot write database options.\n");
    }

    $cmd = escapeshellarg($binary) .
        ' --defaults-extra-file=' .
        escapeshellarg($options) .
        ' --single-transaction --quick' .
        ' --routines --triggers --events --no-tablespaces' .
        ' --result-file=' . escapeshellarg($file) .
        ' ' . escapeshellarg((string) $db['database']) .
        ' 2>&1';

    $output = [];
    $result = 0;

    exec($cmd, $output, $result);

    if (
        $result !== 0 ||
        !is_file($file) ||
        filesize($file) < 1024
    ) {
        if (is_file($file)) {
            unlink($file);
        }

        fwrite(
            STDERR,
            "BACKUP FAILED: " .
            implode(' ', $output) . "\n"
        );

        exit(1);
    }

    chmod($file, 0600);

    echo "BACKUP SUCCESS\n";
    echo "Path: {$file}\n";
    echo "Bytes: " . filesize($file) . "\n";

} finally {
    if (is_file($options)) {
        unlink($options);
    }
}
