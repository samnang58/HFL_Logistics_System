<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$apply = in_array('--apply', $argv, true);
$confirmed = in_array('--confirm=IMPORT-682', $argv, true);
$file = getenv('HOME') . '/Downloads/Customer.csv';

if ($apply && !$confirmed) {
    exit("STOP: Database backup required before import.\n");
}

if (!is_readable($file)) {
    exit("ERROR: Customer.csv not found.\n");
}

if (!Schema::hasTable('customers')) {
    exit("ERROR: customers table missing.\n");
}

$columns = [
    'customer_id',
    'full_name',
    'username',
    'password',
    'phone',
    'email',
    'customer_group',
    'status',
    'registration_date',
    'notes',
    'created_at',
    'updated_at',
];

foreach ($columns as $column) {
    if (!Schema::hasColumn('customers', $column)) {
        exit("ERROR: Missing DB column {$column}.\n");
    }
}

$handle = fopen($file, 'r');
$header = fgetcsv($handle);

$header[0] = preg_replace(
    '/^\xEF\xBB\xBF/',
    '',
    (string) ($header[0] ?? '')
);

$position = static function (string $label) use ($header): ?int {
    $p = array_search($label, $header, true);
    return $p === false ? null : $p;
};

if (
    $position('ID') === null ||
    $position('Customer Name') === null
) {
    exit("ERROR: Required CSV columns missing.\n");
}

$records = [];
$childRows = 0;
$duplicates = 0;
$invalidRows = 0;
$invalidEmails = 0;

while (($row = fgetcsv($handle)) !== false) {

    $get = static function (string $field) use ($row, $position): string {
        $i = $position($field);

        return $i === null
            ? ''
            : trim((string) ($row[$i] ?? ''));
    };

    // First ID column is the parent Customer record.
    $id = $get('ID');
    $name = $get('Customer Name');

    // Ignore ERPNext child-table rows.
    if ($id === '' || $id === 'ID') {
        $childRows++;
        continue;
    }

    if (
        $name === '' ||
        strlen($id) > 255 ||
        strlen($name) > 255
    ) {
        $invalidRows++;
        continue;
    }

    if (isset($records[strtolower($id)])) {
        $duplicates++;
        continue;
    }

    $phone = $get('Mobile No') ?: $get('Phone No');
    $email = $get('Email Id');
    $group = $get('Customer Group');
    $erpName = $get('Name');
    $created = $get('Created On');

    if (
        strlen($phone) > 50 ||
        strlen($email) > 255 ||
        strlen($group) > 255
    ) {
        $invalidRows++;
        continue;
    }

    if (
        $email !== '' &&
        !filter_var($email, FILTER_VALIDATE_EMAIL)
    ) {
        $invalidEmails++;
        $email = '';
    }

    $date = preg_match(
        '/^\d{4}-\d{2}-\d{2}/',
        $created
    )
        ? substr($created, 0, 10)
        : null;

    // Only valid username formats are copied.
    $username = preg_match(
        '/^[A-Za-z0-9._-]{3,50}$/D',
        $id
    )
        ? $id
        : null;

    $disabled = strtolower($get('Disabled'));

    $status = in_array(
        $disabled,
        ['1', 'yes', 'true', 'disabled'],
        true
    )
        ? 'Inactive'
        : 'Active';

    // Preserve extra ERP Name when different from ID.
    $notes = 'Imported from hfl.dierp.app';

    if ($erpName !== '' && $erpName !== $id) {
        $notes .= '; ERP Name: ' . $erpName;
    }

    $records[strtolower($id)] = [
        'customer_id' => $id,
        'full_name' => $name,
        'username' => $username,
        'password' => null,
        'phone' => $phone ?: null,
        'email' => $email ?: null,
        'customer_group' => $group ?: null,
        'status' => $status,
        'registration_date' => $date,
        'notes' => substr($notes, 0, 255),
    ];
}

fclose($handle);

// Compare records with existing HFL database.
$existing = DB::table('customers')
    ->get(['customer_id', 'username']);

$existingIds = [];
$existingUsernames = [];

foreach ($existing as $customer) {

    if ($customer->customer_id !== null) {
        $existingIds[
            strtolower($customer->customer_id)
        ] = true;
    }

    if ($customer->username !== null) {
        $existingUsernames[
            strtolower($customer->username)
        ] = true;
    }
}

$matched = 0;
$usernameConflicts = 0;

foreach ($records as $record) {

    $id = strtolower($record['customer_id']);

    if (isset($existingIds[$id])) {
        $matched++;
        continue;
    }

    if (
        $record['username'] !== null &&
        isset(
            $existingUsernames[
                strtolower($record['username'])
            ]
        )
    ) {
        $usernameConflicts++;
    }
}

$ready = count($records)
    - $matched
    - $usernameConflicts;

echo "\n====================================\n";
echo " HFL LEGACY CUSTOMER IMPORT\n";
echo "====================================\n";

echo "Mode: " . ($apply ? "APPLY" : "DRY RUN") . "\n";
echo "Valid unique customers: " . count($records) . "\n";
echo "Non-customer rows: {$childRows}\n";
echo "Duplicate CSV IDs: {$duplicates}\n";
echo "Invalid customer rows: {$invalidRows}\n";
echo "Invalid emails omitted: {$invalidEmails}\n";
echo "Current HFL customers: " . count($existing) . "\n";
echo "Existing matching IDs: {$matched}\n";
echo "Username conflicts: {$usernameConflicts}\n";
echo "Ready to import: {$ready}\n";

echo "====================================\n";

// Strict safety validation.
if (
    count($records) !== 682 ||
    $duplicates > 0 ||
    $invalidRows > 0 ||
    $usernameConflicts > 0
) {
    exit("STOP: Validation mismatch. Nothing imported.\n");
}

// Default mode: only preview, never insert.
if (!$apply) {
    exit("DRY RUN ONLY. Database unchanged.\n");
}

// Import in one transaction.
// Any database error rolls back the batch.
$inserted = DB::transaction(
    static function () use ($records): int {

        $added = 0;

        foreach ($records as $record) {

            $already = DB::table('customers')
                ->where(
                    'customer_id',
                    $record['customer_id']
                )
                ->exists();

            if ($already) {
                continue;
            }

            if (
                $record['username'] !== null &&
                DB::table('customers')
                    ->where(
                        'username',
                        $record['username']
                    )
                    ->exists()
            ) {
                throw new RuntimeException(
                    'Username conflict. Import rolled back.'
                );
            }

            $record['created_at'] = now();
            $record['updated_at'] = now();

            DB::table('customers')->insert($record);

            $added++;
        }

        return $added;
    }
);

echo "SUCCESS: Imported {$inserted} customers.\n";

echo "Final HFL customers: "
    . DB::table('customers')->count()
    . "\n";
