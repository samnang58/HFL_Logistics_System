<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class BillingSettingsController extends ApiController
{
    private array $allowedExtensions = ['png', 'jpg', 'jpeg', 'webp'];

    public function show(Request $request)
    {
        return $this->ok([
            'aba_khqr_url' => $this->assetUrl($request),
            'account_name' => 'SAMNANG PHAN',
            'khr_account' => '005 363 934',
            'usd_account' => '005 363 931',
        ], 'Billing settings retrieved');
    }

    public function uploadKhqr(Request $request)
    {
        $request->validate([
            'qr' => 'required|file|mimes:png,jpg,jpeg,webp|max:5120',
        ]);

        $file = $request->file('qr');
        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, $this->allowedExtensions, true)) {
            return $this->fail('Unsupported QR image format.', [], 422);
        }

        $dir = public_path('assets');
        File::ensureDirectoryExists($dir);

        // Keep the original uploaded image bytes and extension. The QR is never
        // generated, redrawn, recolored, cropped, or otherwise transformed.
        foreach ($this->allowedExtensions as $ext) {
            $old = $dir . '/aba-khqr.' . $ext;
            if (File::exists($old)) {
                File::delete($old);
            }
        }

        $filename = 'aba-khqr.' . $extension;
        $file->move($dir, $filename);

        return $this->ok([
            'aba_khqr_url' => $this->assetUrl($request, true),
        ], 'Original ABA KHQR asset updated');
    }

    private function assetUrl(Request $request, bool $fresh = false): ?string
    {
        $dir = public_path('assets');
        foreach ($this->allowedExtensions as $extension) {
            $path = $dir . '/aba-khqr.' . $extension;
            if (File::exists($path)) {
                $suffix = $fresh ? ('?v=' . filemtime($path)) : '';
                return rtrim($request->getSchemeAndHttpHost(), '/') . '/assets/aba-khqr.' . $extension . $suffix;
            }
        }

        return null;
    }
}
