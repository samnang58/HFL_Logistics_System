<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || strtolower(trim((string) $user->role)) !== 'super admin') {
            return response()->json([
                'message' => 'Only Super Admin can manage staff.',
            ], 403);
        }

        return $next($request);
    }
}
