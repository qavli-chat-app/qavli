# QAVLI PRO Free-Only Audit

Branch: `qavli-pro-free-audit`
Base: `main`
Goal: improve QAVLI without deleting users, chats, messages, or changing the Firebase project.

## Confirmed from the current source

- The app initializes Firebase project `qavli-37983` and uses Firebase Authentication and Firestore.
- `js/app.js` still imports Firebase Storage and uploads chat attachments to `chatFiles/` and profile pictures to `avatars/`. Cloudinary is **not** wired into the current upload functions yet.
- The app has an unread-count listener that queries the latest 100 messages per chat and counts messages without the signed-in user's `readBy` field. This means the displayed count is bounded to the latest 100 messages.
- Read receipts are written to message `readBy` fields; the chat view renders a double-check when at least one other reader is present.
- The app uses the browser Notification API and service-worker notifications when a new message is observed by an active app listener. Source inspection did not find Firebase Cloud Messaging token registration or a server-side push sender. Therefore this is not yet verified as reliable background push when the app is closed.
- The service worker caches only the static app shell and has a notification-click handler.
- The signed-in user profile and username index are readable to signed-in users to support username discovery. Review this deliberately; Firestore rules cannot hide individual fields from a document read, so profile documents must not store secrets.
- Firebase rule files are in the repository, but editing the repository does not deploy rules to the live Firebase project.
- Existing app and data should be preserved. Do not run destructive database operations or deploy production rules without a separate reviewed step.

## Safe changes in this branch

- Remove the old grey duplicate “Talk to Admin” CTA from the home list while preserving the premium gold mobile CTA and the desktop center CTA.
- Include the mobile CTA in its busy/disabled state.
- Bump app and service-worker cache versions so the updated UI can load after deployment.

## Next work, in safe order

1. Run syntax checks and Firestore emulator tests on this branch.
2. Review and test unread-count behavior, especially >100 unread messages, listener errors, and switching chats.
3. Review all Firestore and Storage rules against the exact operations used by the app. Deploy only after emulator tests and explicit production-owner approval.
4. Migrate uploads to Cloudinary only after confirming a Cloudinary cloud name and an unsigned upload preset. Never commit API secrets. Preserve existing Firebase Storage URLs so old attachments continue to work.
5. Add reliable background push only if a free, supported architecture is available; browser Notification permission alone is not FCM push.
6. Improve user discovery, profile rendering, groups and invite flows with tests and no schema-breaking changes.
7. Check startup/network behavior, PWA installability, cache invalidation and deployment status.

## Free-only constraints

- No paid service or upgrade is assumed.
- Free tiers have usage limits and can pause or require a plan change when exceeded.
- Do not claim a feature is production-working until it has been tested against the deployed app with real accounts.
