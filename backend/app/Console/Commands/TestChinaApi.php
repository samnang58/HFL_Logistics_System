<?php

namespace App\Console\Commands;

use App\Services\ChinaWayBillService;
use Illuminate\Console\Command;
use Throwable;

class TestChinaApi extends Command
{
    protected $signature = 'china:test
                            {--container= : Container number such as YCL269171柜}
                            {--page=1 : Page number}
                            {--limit=20 : Records per page}';

    protected $description = 'Test connection to China WayBill API';

    public function handle(ChinaWayBillService $china)
    {
        $container = $this->option('container');

        $page = (int) $this->option('page');
        $limit = (int) $this->option('limit');

        $this->info('Connecting to China API...');
        $this->info('Page: ' . $page);
        $this->info('Limit: ' . $limit);

        if ($container) {
            $this->info('InsideNO: ' . $container);
        }

        try {
            $result = $china->query(
                $page,
                $limit,
                $container
            );

            $this->newLine();

            $this->info('China API connection: SUCCESS');

            $this->line(
                'Code: ' . ($result['code'] ?? 'N/A')
            );

            $this->line(
                'Count: ' . ($result['count'] ?? 'N/A')
            );

            $this->line(
                'Message: ' . ($result['msg'] ?? 'NULL')
            );

            $data = $result['data'] ?? [];

            $this->line(
                'Records returned: ' .
                (is_array($data) ? count($data) : 0)
            );

            $this->newLine();

            $this->info('Response keys:');

            $this->line(
                implode(', ', array_keys($result))
            );

            $this->newLine();

            if (is_array($data) && count($data) > 0) {
                $first = $data[0];

                $this->info('First record:');

                $this->line(
                    'Number: ' .
                    ($first['Number'] ?? 'N/A')
                );

                $this->line(
                    'InsideNO: ' .
                    ($first['InsideNO'] ?? 'N/A')
                );

                $this->line(
                    'ExternalNO: ' .
                    ($first['ExternalNO'] ?? 'N/A')
                );

                $this->line(
                    'CustomerId: ' .
                    ($first['CustomerId'] ?? 'N/A')
                );

                $this->line(
                    'CustomerNumber: ' .
                    ($first['CustomerNumber'] ?? 'N/A')
                );

                $this->line(
                    'CustomerName: ' .
                    ($first['CustomerName'] ?? 'N/A')
                );

                $this->line(
                    'Marks: ' .
                    ($first['Marks'] ?? 'N/A')
                );

                $this->line(
                    'CustomerVolume: ' .
                    ($first['CustomerVolume'] ?? 'N/A')
                );

                $this->line(
                    'GoodsName: ' .
                    ($first['GoodsName'] ?? 'N/A')
                );

                $this->line(
                    'CreateDate: ' .
                    ($first['CreateDate'] ?? 'N/A')
                );

                $this->line(
                    'ModifyDate: ' .
                    ($first['ModifyDate'] ?? 'N/A')
                );
            }

            $this->newLine();

            $this->info('Full response:');

            $this->line(
                json_encode(
                    $result,
                    JSON_PRETTY_PRINT |
                    JSON_UNESCAPED_UNICODE
                )
            );

            return self::SUCCESS;

        } catch (Throwable $e) {

            $this->error(
                'China API connection: FAILED'
            );

            $this->error(
                $e->getMessage()
            );

            return self::FAILURE;
        }
    }
}
