<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ContainerLifecycleTest extends TestCase
{
    public function test_container_status_flow_is_in_the_expected_order(): void
    {
        $flow = [
            'Received at China Warehouse',
            'The Container Finish',
            'Customs declaration in progress',
            'Under inspection',
            'Customs Clearance cleared',
            'Cambodia Warehouse',
            'Delivered',
        ];

        $this->assertSame(0, array_search('Received at China Warehouse', $flow, true));
        $this->assertLessThan(
            array_search('Delivered', $flow, true),
            array_search('Cambodia Warehouse', $flow, true)
        );
    }

    public function test_received_is_separate_from_transport_flow(): void
    {
        $transportFlow = [
            'Received at China Warehouse',
            'The Container Finish',
            'Customs declaration in progress',
            'Under inspection',
            'Customs Clearance cleared',
            'Cambodia Warehouse',
            'Delivered',
        ];

        $this->assertNotContains('Received', $transportFlow);
    }
}
