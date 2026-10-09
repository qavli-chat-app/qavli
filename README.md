# QAVLI

QAVLI is a mobile-first private messaging web app powered by Firebase and hosted on GitHub Pages.

## QAVLI 2.0

- Email/password authentication with local persistence
- Username search and direct messaging
- Groups with invite links and creator-only member management
- Image and document sharing through Firebase Storage
- Profile pictures
- Online/offline and last-seen presence
- Typing indicator
- Read receipts
- Reply, edit, soft-delete, copy and reactions
- In-chat message search
- Responsive premium UI with dark-mode support
- Password reset flow and persistent authentication
- Toast-based app feedback and safer attachment validation
- Deep-link support for shared/in-app chat navigation
- Persistent PWA service worker with versioned shell caching
- PWA manifest and service worker


## Free install options

### Install the PWA
Open https://qavli-chat-app.github.io/qavli/ in Chrome on Android. Use the **Install QAVLI app** button if shown, or Chrome's menu and choose **Install app** / **Add to Home screen**. The PWA uses the same live Firebase project as the website.

### Android APK
The GitHub Actions workflow at `.github/workflows/android-apk.yml` builds a free Android APK when Android project files change and publishes the latest APK as a GitHub Release.

- Latest APK: https://github.com/qavli-chat-app/qavli/releases/download/qavli-apk-latest/app-debug.apk
- Build history: https://github.com/qavli-chat-app/qavli/actions/workflows/android-apk.yml

The APK is a lightweight Android WebView wrapper that opens the live QAVLI website; it does not create a second database. It uses the existing Firebase authentication, Firestore, and Storage backend. This is a debug-signed direct-download build, not a Play Store release. Keep the device's install-from-browser permission enabled only when needed, and install APKs only from the official QAVLI repository.

## Firebase deployment

The repository keeps Firebase Security Rules under version control:

- `firestore.rules`
- `storage.rules`
- `firebase.json`
- `.firebaserc`

After signing in to the Firebase CLI with an account that owns or can deploy to project `qavli-37983`, deploy only the rules with:

```bash
firebase deploy --only firestore:rules,storage
```

This is required before protected reactions, read receipts, typing, chat files, and profile uploads can work against the production Firebase project.

## Live app

GitHub Pages:
https://qavli-chat-app.github.io/qavli/
