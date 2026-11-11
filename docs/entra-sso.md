# Microsoft Entra ID (SSO) setup

The app already supports **Continue with Microsoft** on `/login`. It turns on
automatically when the Entra env vars are set in Vercel (or `.env.local`).

Until those vars exist, the Microsoft button stays hidden and password / passkey
login keeps working.

## 1. Register an app in Entra

1. Open [Microsoft Entra admin center](https://entra.microsoft.com) →
   **Identity** → **Applications** → **App registrations** → **New registration**.
2. Name it (e.g. `Sophos Firewall Sizer`).
3. Supported account types:
   - **Single tenant** (recommended for Sophos-only): *Accounts in this
     organizational directory only*.
   - Or multi-tenant if you intentionally need guests from other directories.
4. **Redirect URI** → platform **Web**:

   ```text
   https://sophos-firewall-sizer.vercel.app/api/auth/callback/microsoft-entra-id
   ```

   For local testing also add:

   ```text
   http://localhost:3000/api/auth/callback/microsoft-entra-id
   ```

5. Register, then note:
   - **Application (client) ID**
   - **Directory (tenant) ID**

## 2. Create a client secret

1. App → **Certificates & secrets** → **New client secret**.
2. Copy the **Value** immediately (not the Secret ID).

## 3. (Recommended) API permissions

Default OpenID scopes (`openid`, `profile`, `email`) are enough for sign-in.
If your tenant requires admin consent for Microsoft Graph profile reads, grant
**Microsoft Graph** → **Delegated** → `openid`, `profile`, `email`, `User.Read`
and click **Grant admin consent**.

## 4. Set Vercel environment variables

Production (and Preview if you want SSO there too):

| Variable | Value |
|----------|--------|
| `AUTH_URL` | `https://sophos-firewall-sizer.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | Same as `AUTH_URL` |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Application (client) ID |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Client secret **value** |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | `https://login.microsoftonline.com/<TENANT_ID>/v2.0` |
| *or* `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` | Directory (tenant) ID (issuer is built for you) |
| `AUTH_SSO_ALLOWED_DOMAINS` | `sophos.com` (recommended) |
| `AUTH_SSO_DEFAULT_ROLE` | `account_manager` (default) or `sales_engineer` |
| `AUTH_SSO_SE_EMAILS` | Optional comma-separated emails that become SE on **first** SSO login |

Optional once SSO is mandatory:

```env
AUTH_ALLOW_CREDENTIALS=false
```

Redeploy after saving env vars (Production).

## 5. Verify

1. Open `/login` — you should see **Continue with Microsoft**.
2. Sign in with a `@sophos.com` account (if domains are restricted).
3. First login **JIT-provisions** a user row (no password). Existing users with
   the same email keep their current role.
4. Admins can still create password accounts on **Users**, and can promote roles
   there / in the DB as needed.

## Callback URL cheat sheet

Pattern:

```text
{AUTH_URL}/api/auth/callback/microsoft-entra-id
```

The admin **Users** page also shows this URL when you are signed in as admin.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| No Microsoft button | Client ID/secret not set (or wrong env environment: Production vs Preview) |
| `AADSTS50011` redirect mismatch | Redirect URI in Entra must exactly match `{AUTH_URL}/api/auth/callback/microsoft-entra-id` |
| Access denied after Microsoft | Email domain not in `AUTH_SSO_ALLOWED_DOMAINS` |
| Wrong host / cookies | `AUTH_URL` / `NEXT_PUBLIC_APP_URL` missing `https://` or not the stable alias |
