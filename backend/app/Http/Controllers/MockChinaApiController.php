<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MockChinaApiController extends ApiController
{
    private function mockDisabled(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'status' => 'disabled',
            'mode' => 'disabled',
            'configured' => false,
            'message' => 'Mock China API is disabled.',
            'error' => 'MOCK_API_DISABLED',
            'data' => null,
        ], 403);
    }

    public function status(): JsonResponse
    {
        return $this->mockDisabled();
    }

    public function data(Request $request): JsonResponse
    {
        return $this->mockDisabled();
    }

    public function packages(Request $request): JsonResponse
    {
        return $this->mockDisabled();
    }

    public function package(string $tracking): JsonResponse
    {
        return $this->mockDisabled();
    }

    public function containers(): JsonResponse
    {
        return $this->mockDisabled();
    }

    public function container(string $container): JsonResponse
    {
        return $this->mockDisabled();
    }

    public function sync(Request $request): JsonResponse
    {
        return $this->mockDisabled();
    }
}
