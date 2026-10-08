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
