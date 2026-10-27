<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class AuthController extends ApiController
{
    public function login(Request $r)
    {
        $data = $r->validate([
            'login' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        // Support the new "login" field and legacy "email" clients.
        $identifier = trim((string) ($data['login'] ?? $data['email'] ?? ''));

        if ($identifier === '') {
            return $this->fail('Email or phone is required.', [], 422);
        }

        if (str_contains($identifier, '@')) {
            $user = User::where('email', $identifier)->first();
        } elseif (Schema::hasColumn('users', 'phone')) {
            $user = User::where('phone', $identifier)->first();
        } else {
            // Phone login becomes available after the phone column exists.
            $user = null;
        }

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return $this->fail('Invalid credentials', [], 401);
        }

        $token = $user->createToken('hfl-web')->plainTextToken;

        return $this->ok([
            'token' => $token,
            'user' => $user,
        ], 'Login successful');
    }

    public function me(Request $r)
    {
        return $this->ok($r->user());
    }

    public function logout(Request $r)
    {
        $r->user()?->currentAccessToken()?->delete();

        return $this->ok(null, 'Logged out');
    }
}
