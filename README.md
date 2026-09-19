# Video Editor Portfolio

A two-page site: a public portfolio (`/`) and a password-protected admin dashboard (`/admin`),
backed by Firebase (Firestore + Storage + Authentication) and built to deploy on Vercel.

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com → **Add project** → name it anything → finish setup.
2. In the left sidebar, click **Build → Firestore Database → Create database**. Start in
   **production mode**, pick any region close to you.
3. Click **Build → Storage → Get started**. Start in production mode, same region.
4. Click **Build → Authentication → Get started**. Under **Sign-in method**, enable
   **Email/Password**.
5. Still in Authentication, go to the **Users** tab → **Add user** → enter the email and
   password you want to use to log into `/admin`. This is your one admin account — there is no
   public sign-up form, by design.

## 2. Get your web app config

1. In Firebase Console, click the gear icon → **Project settings**.
2. Under "Your apps", click the **</>** (web) icon to register a new web app (any nickname).
3. Copy the `firebaseConfig` values it gives you (apiKey, authDomain, projectId, etc.).
4. Rename `.env.local.example` to `.env.local` and paste each value in, e.g.:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

## 3. Apply the security rules

These rules make sure only your logged-in admin account can write data, while visitors can
still read the public content and submit offer requests / reviews.

**Firestore:** Console → Firestore Database → **Rules** tab → paste the contents of
`firestore.rules` → **Publish**.

**Storage:** Console → Storage → **Rules** tab → paste the contents of `storage.rules` →
**Publish**.

(If you'd rather use the CLI: `npm i -g firebase-tools`, then `firebase login`,
`firebase init` — select Firestore + Storage, point it at this project — then
`firebase deploy --only firestore:rules,storage:rules`.)

## 4. Run it locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` for the public site and `http://localhost:3000/admin` to log in
with the admin account you created in step 1.

## 5. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com → **Add New → Project** → import that repo.
3. Before deploying, open **Environment Variables** and add the same six `NEXT_PUBLIC_FIREBASE_*`
   keys from your `.env.local`.
4. Click **Deploy**. Your public site will be live at the Vercel URL, and `/admin` is the
   dashboard.

## Notes

- The admin password isn't stored anywhere in this code — it's real Firebase Authentication,
  and you can change it any time from **Profile → Change Admin Password** inside `/admin`, or
  reset it via the "Forgot password?" link on the login screen.
- Video files and thumbnails uploaded from the admin dashboard go to Firebase Storage — there's
  no meaningful size ceiling like there was in earlier prototypes, though very large files will
  take longer to upload and cost more in Storage bandwidth on Firebase's free tier.
- To add a second admin, just add another user under Authentication → Users in the Firebase
  Console — no code changes needed.
