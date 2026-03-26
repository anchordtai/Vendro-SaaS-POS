# Onyxx License System (Offline)

This repo uses **signed license keys** that can be verified **fully offline** in Electron.

## 1) Generate signing keys (one time)

Run:

```bash
node tools/license/gen-keys.js
```

This creates:
- `tools/license/keys/license-private.pem` (**keep secret**, never commit)
- `tools/license/keys/license-public.pem`
- `electron/license-public.pem` (embedded in the app for offline verification)

## 2) Generate a customer license

Examples:

```bash
node tools/license/generate-license.js --customer "Acme Bar" --months 12
node tools/license/generate-license.js --customer "VIP Lounge" --years 2
node tools/license/generate-license.js --customer "Branch 1" --months 6 --bind true --seats 3 --plan pro
```

Output is a license key like:

`ONYXX1.<payload>.<signature>`

Give that string to the customer. They paste it into the Electron app activation screen.

## 3) Expiry & subscription length

- `--months 12` → 1 year
- `--years 2` → 2 years
- Use any combo of `--years`, `--months`, `--days`.

## 4) Device binding

- `--bind true` (default) → license binds to the first activated device fingerprint.
- `--bind false` → license can be used on multiple devices (not recommended for commercial use).

