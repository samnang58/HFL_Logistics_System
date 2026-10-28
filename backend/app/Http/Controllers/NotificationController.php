<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends ApiController
{
    public function index(Request $request)
    {
        $q = Notification::with('package:id,tracking_number,customer_id')
            ->where('user_id', $request->user()->id)
            ->latest();

        if ($request->filled('customer_id')) {
            $q->where('customer_id', $request->input('customer_id'));
        }

        if ($request->boolean('unread_only')) {
            $q->whereNull('read_at');
        }

        return $this->ok(
            $q->paginate((int) $request->input('per_page', 25))
        );
    }

    public function unreadCount(Request $request)
    {
        $count = Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return $this->ok(['count' => $count]);
    }

    public function markRead(Request $request, $id)
    {
        $n = Notification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $n->update(['read_at' => now()]);

        return $this->ok(
            $n->fresh(),
            'Notification marked as read'
        );
    }
}