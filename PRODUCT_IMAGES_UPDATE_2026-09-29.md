# Product images from the China API

- Sync China now saves every image URL found in a China row into `packages.product_images` (JSON).
- Any row field whose name contains img / image / pic / photo is scanned. Values may be one URL,
  a list separated by `, ; |` or new lines, or an array. Relative paths are completed with
  `CHINA_API_IMAGE_BASE` (or `CHINA_API_URL`).
- If a later sync brings no image, the old images are kept.
- Shown in 03 Packages (thumbnail beside the product, click = full view) and in the package details
  page (Product Photos card).
- After the first sync, check `backend/storage/logs/laravel.log` for "China API sample row keys" to see
  the real field names. If the image field has an unusual name, tell the developer.

Run: `php artisan migrate`, then Sync China again to fill images for existing packages.

## Test with the FAKE China API first

1. In `backend/.env`: `CHINA_API_MODE=mock` and `APP_URL=http://127.0.0.1:8000` (same address as the backend).
2. `php artisan migrate` then `php artisan config:clear`, restart `php artisan serve`.
3. In the app press Sync China. It returns 30 fake waybills (`YCFAKE00001…`, containers `YCLFAKE01…03`)
   with photos in 5 different formats (single URL, comma list, relative path, JSON array, none).
4. Open 03 Packages: thumbnails appear; click one to view; open a package to see the Product Photos card.
5. Remove the fake data any time: `php artisan china:mock-clean`.
6. Connect the real API later: `CHINA_API_MODE=real`, set `CHINA_API_URL` and `CHINA_API_TOKEN`.
   Nothing else changes; the fake is disabled automatically when `APP_ENV=production`.

## Existing mock packages (Mock Customer …, tracking 777777777xxx) have no photos

These come from the old "Mock API Endpoint" on page 01 China API Sync, which did not carry photos.
Add fake photos to them without touching status or billing:

    cd backend
    php artisan migrate
    php artisan china:mock-images

A new run of that mock sync now includes photos as well, but it also resets package status, so avoid
re-running it on packages you already invoiced.
