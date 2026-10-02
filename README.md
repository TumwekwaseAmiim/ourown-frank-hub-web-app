# OurOwn Hub — Firebase Ready

## Core design
- Yellow background
- Red header
- Black navigation
- Songs are the main focus and appear first

## Public without account
- Songs: Play / Download / Share
- Audios: Play / Download / Share
- Photos: Preview / Request Original
- Community: post photo or audio immediately
- About

## Account required
- Text-only Chat

## Admin
- Upload songs, audios, photos
- Manage photo requests
- Moderate community posts
- Manage chat users
- Reset selected system data

## Firebase services used
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Hosting
- PWA service worker

## Files to configure
1. js/firebase-config.js
2. firestore.rules
3. storage.rules

## Collections
- media
- photoRequests
- communityPosts
- users
- chatMessages

## Admin role
After creating the admin Authentication account, create:
users/{ADMIN_UID}

Example fields:
displayName: "Admin"
role: "admin"
status: "active"

## Storage folders
- songs/
- audios/
- covers/
- photo-previews/
- photos-private/
- community/
- profiles/

## Important photo rule
`photos-private/` is admin-only.
The current starter marks approved requests in Firestore, but a secure temporary original-photo download URL should be created later using a trusted backend such as a Firebase Cloud Function. Do not expose permanent original-photo URLs in the browser.

## Setup order
1. Create Firebase project.
2. Register Web app.
3. Copy firebaseConfig into js/firebase-config.js.
4. Enable Email/Password Authentication.
5. Create Firestore.
6. Deploy firestore.rules.
7. Enable Storage and deploy storage.rules.
8. Create admin Auth user and corresponding users/{uid} document with role=admin.
9. Test locally with Live Server.
10. Deploy with Firebase Hosting.

## Local test
Use VS Code Live Server. Do not open the HTML files directly with file://.
