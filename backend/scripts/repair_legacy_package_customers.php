<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$write = in_array('--write', $argv, true);

$home = getenv('HOME');

$csvPath = $home . '/Downloads/HFL Package.csv';

$inputPath = $home
    . '/Documents/HFL_Migration_Private/'
    . 'legacy_packages_prepared.jsonl';

$outputPath = $home
    . '/Documents/HFL_Migration_Private/'
    . 'legacy_packages_customer_fixed.jsonl';

$clean = static function ($value): string {
    $value = trim((string) $value);

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
    mb_strtolower(trim((string) $value), 'UTF-8');

$csv = null;
$input = null;
$output = null;
$temp = null;

try {
    if (!is_readable($csvPath) || !is_readable($inputPath)) {
        throw new RuntimeException(
            'Source CSV or prepared JSONL missing.'
        );
    }

    if ($write && file_exists($outputPath)) {
        throw new RuntimeException(
            'Fixed JSONL already exists. Refusing overwrite.'
        );
    }

    $dbCustomers = DB::table('customers')
        ->pluck('customer_id');

    if ($dbCustomers->count() !== 700) {
        throw new RuntimeException(
            'Customer count changed from 700.'
        );
    }

    $known = [];

    foreach ($dbCustomers as $id) {
        $normalized = $key($id);

        if ($normalized === '' || isset($known[$normalized])) {
            throw new RuntimeException(
                'Customer ID normalization collision.'
            );
        }

        $known[$normalized] = (string) $id;
    }

    $csv = fopen($csvPath, 'r');
    $input = fopen($inputPath, 'r');

    if (!$csv || !$input) {
        throw new RuntimeException(
            'Could not open migration inputs.'
        );
    }

    $header = fgetcsv($csv);

    if (!$header) {
        throw new RuntimeException('CSV header missing.');
    }

    $idIndex = array_search('ID', $header, true);
    $customerIndex = array_search(
        'Customer',
        $header,
        true
    );

    if ($idIndex === false || $customerIndex === false) {
        throw new RuntimeException(
            'ID or Customer CSV column missing.'
        );
    }

    if ($write) {
        $directory = dirname($outputPath);
        $temp = tempnam($directory, 'hfl_customer_fix_');

        if ($temp === false) {
            throw new RuntimeException(
                'Could not create temporary file.'
            );
        }

        chmod($temp, 0600);
        $output = fopen($temp, 'w');

        if (!$output) {
            throw new RuntimeException(
                'Could not open temporary file.'
            );
        }
    }

    $packages = 0;
    $childRows = 0;
    $items = 0;
    $missingBefore = 0;
    $rewritten = 0;

    while (($csvRow = fgetcsv($csv)) !== false) {

        $rawId = trim(
            (string) ($csvRow[$idIndex] ?? '')
        );

        if ($rawId === '') {
            $childRows++;
            continue;
        }

        $line = fgets($input);

        if ($line === false) {
            throw new RuntimeException(
                'JSONL has fewer packages than CSV.'
            );
        }

        $record = json_decode(
            $line,
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        if (!is_array($record)) {
            throw new RuntimeException(
                'Invalid JSONL package.'
            );
        }

        $packages++;

        // Verify both files refer to the same package.
        $csvId = $key($clean($rawId));

        $preparedId = $key(
            $record['legacy_package_id'] ?? ''
        );

        if ($csvId === '' || $csvId !== $preparedId) {
            throw new RuntimeException(
                "Package ID mismatch at record {$packages}."
            );
        }

        // Use the same PHP CSV interpretation that
        // successfully matched all 12,008 customers.
        $rawCustomer = $clean(
            $csvRow[$customerIndex] ?? ''
        );

        $customerKey = $key($rawCustomer);

        if (!isset($known[$customerKey])) {
            throw new RuntimeException(
                "CSV Customer not found at package {$packages}."
            );
        }

        $canonicalId = $known[$customerKey];

        $previous = (string) (
            $record['customer_id'] ?? ''
        );

        $previousKey = $key($previous);

        if (!isset($known[$previousKey])) {
            $missingBefore++;
        } elseif ($known[$previousKey] !== $canonicalId) {
            throw new RuntimeException(
                "Conflicting customer mapping at package {$packages}."
            );
        }

        if ($previous !== $canonicalId) {
            $rewritten++;
        }

        // Change only the customer_id reference.
        $record['customer_id'] = $canonicalId;

        if (!isset($record['items']) ||
            !is_array($record['items'])) {
            throw new RuntimeException(
                "Missing package items at record {$packages}."
            );
        }

        $items += count($record['items']);

        if ($write) {
            $encoded = json_encode(
                $record,
                JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES |
                JSON_THROW_ON_ERROR
            ) . "\n";

            if (fwrite($output, $encoded) !== strlen($encoded)) {
                throw new RuntimeException(
                    'Failed to write complete JSONL record.'
                );
            }
        }
    }

    if (fgets($input) !== false) {
        throw new RuntimeException(
            'Prepared JSONL has extra packages.'
        );
    }

    if (
        $packages !== 12008 ||
        $childRows !== 9633 ||
        $items !== 21631 ||
        $missingBefore !== 154
    ) {
        throw new RuntimeException(
            'Expected counts do not match. No output accepted.'
        );
    }

    echo "\n========================================\n";
    echo " HFL PACKAGE CUSTOMER REPAIR\n";
    echo "========================================\n";
    echo "Mode: " . ($write ? 'WRITE NEW FILE' : 'DRY RUN') . "\n";
    echo "Packages checked: {$packages}\n";
    echo "Extra/child CSV rows: {$childRows}\n";
    echo "Items preserved: {$items}\n";
    echo "Customer refs missing before: {$missingBefore}\n";
    echo "Customer refs rewritten: {$rewritten}\n";
    echo "Customer refs valid after: {$packages}\n";

    if ($write) {
        fclose($output);
        $output = null;

        if (!rename($temp, $outputPath)) {
            throw new RuntimeException(
                'Could not finalize fixed JSONL.'
            );
        }

        chmod($outputPath, 0600);
        $temp = null;

        echo "Fixed file: {$outputPath}\n";
    }

    echo "========================================\n";
    echo "SUCCESS: Validation passed.\n";
    echo "DATABASE UNCHANGED.\n";

} catch (Throwable $e) {
    fwrite(
        STDERR,
        "STOP: " . $e->getMessage() . "\n"
    );

    exit(1);

} finally {
    if (is_resource($csv)) {
        fclose($csv);
    }

    if (is_resource($input)) {
        fclose($input);
    }

    if (is_resource($output)) {
        fclose($output);
    }

    if ($temp !== null && is_file($temp)) {
        unlink($temp);
    }
}
