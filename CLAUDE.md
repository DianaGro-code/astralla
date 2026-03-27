# Astralla – Project Notes for Claude

## ⚠️ iOS Build Reminder
**Always use `npm run cap:sync` (not `npm run build`) when changes need to appear in the iOS app.**

Regular `npm run build` does NOT include the Railway API URL — the app will appear empty on device.

```bash
cd frontend
npm run cap:sync   # builds with --mode capacitor + syncs to Xcode
```

Then rebuild in Xcode with ▶ Run (Cmd+R).

## Architecture
- **Frontend**: React + Vite + Capacitor (iOS native wrapper)
- **Backend**: Express on Railway (`https://astralla-production.up.railway.app`)
- **iOS**: Capacitor bundles the frontend locally; API calls go to Railway via `VITE_API_URL` in `.env.capacitor`

## Key commands
| Task | Command |
|---|---|
| Deploy web changes | `git push` (Railway auto-deploys) |
| Update iOS app | `cd frontend && npm run cap:sync` → Xcode ▶ Run |
| Open Xcode | `cd frontend && npx cap open ios` |
