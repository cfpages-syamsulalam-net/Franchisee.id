# Debugging Quick Guide

Last updated: 2026-04-04 (Asia/Jakarta)

## 1) Fast Personal Debug Mode (`?dev=1`)
- Open `/daftar`.
- First, reveal the hidden debug emoji toggle with shortcut: `Ctrl + Alt + D`.
- Then click the bottom-right debug emoji (`🧪`) to toggle debug mode.
- When `dev=1` is active:
  - `/css/form-franchise.css` gets a cache-busting query param (`_dbg=<timestamp>`).
  - All modular form CSS files under `/css/form-franchise/*.css` are loaded directly with `_dbg=<timestamp>` to bypass stale `@import` caches during debug.
  - `/js/form-utils.js` and `/js/form-franchise.js` also get cache-busting query params.
- Click `🧪` again to disable debug mode (`dev` param removed).

This only affects the URL/session you open and does not change behavior for other users.

### Hidden Toggle Behavior
- The debug emoji is hidden by default for all users.
- Press `Ctrl + Alt + D` to show/hide the debug emoji on your browser profile.
- Visibility is stored in localStorage key: `debug_toggle_enabled`.
- If you change browser/profile/laptop, you need to press the shortcut once again.

## 2) DevTools Disable Cache (Most Reliable for Testing)
Use this when you need zero-cache behavior while debugging:

1. Open browser DevTools (`F12`).
2. Go to `Network` tab.
3. Check `Disable cache`.
4. Keep DevTools open.
5. Reload page with hard refresh (`Ctrl + Shift + R`).

Note:
- `Disable cache` only applies while DevTools is open.
- This method is local to your browser session and does not affect production users.

## 3) Optional Sanity Check
- In DevTools Network, click `form-franchise.css` / `form-franchise.js`.
- Confirm request URL includes `_dbg=` when `dev=1` is active.
