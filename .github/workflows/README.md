# Supabase Free Keepalive Workflow

This GitHub Actions workflow (`supabase-keepalive.yml`) sends a lightweight authenticated HTTP request to one or more Supabase projects every 3 days to help keep Free-tier projects active.

> **Important Note:** A successful HTTP response (e.g. `200 OK`) indicates that the Supabase API gateway and PostgREST endpoint responded, **not** a guarantee that Supabase will never pause the project. Supabase's inactivity detection and pausing policies are controlled by Supabase and may change over time. Monitor your Supabase dashboard periodically.

---

## 1. Create the GitHub Repository

1. Sign in to [GitHub](https://github.com) and click **New** (or go to `https://github.com/new`).
2. Enter a repository name (for example, `supabase-keepalive` or your existing project repository).
3. Choose **Private** (recommended, though secrets are encrypted in both public and private repositories) or **Public**.
   - **GitHub Free note:** Public repositories get unlimited GitHub Actions minutes. Private repositories on GitHub Free include 2,000 minutes/month; this workflow uses `ubuntu-latest` without checking out code and typically finishes in a few seconds per run.
4. Push this `.github/workflows/` directory to the default branch (usually `main`).

> **Note on scheduled workflows:** GitHub Actions may automatically disable scheduled workflows in repositories with no activity for 60 days. If that happens, you can re-enable the workflow from the **Actions** tab.

---

## 2. Configure Supabase Project URLs and Keys

For each Supabase project you want to keep active:

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Project Settings** → **API** (or **API Keys**).
3. Copy:
   - **Project URL** (e.g. `https://your-project-ref.supabase.co`)
   - **Anon / Publishable Key** (`anon` public key or `sb_publishable_...` key)

> **Security Warning:** **Never** use your `service_role` or `sb_secret_...` key here. Always use the `anon` / publishable key.

Prepare a JSON array containing your projects:

```json
[
  {
    "name": "my-first-project",
    "url": "https://abcdefghijklmno.supabase.co",
    "anon_key": "your-anon-or-publishable-key-1"
  },
  {
    "name": "my-second-project",
    "url": "https://pqrstuvwxyzabcd.supabase.co",
    "anon_key": "your-anon-or-publishable-key-2"
  }
]
```

---

## 3. Add GitHub Repository Secrets

1. Open your repository on GitHub.
2. Navigate to **Settings** → **Secrets and variables** → **Actions**.
3. Click **New repository secret**.
4. Set **Name** to:
   ```text
   SUPABASE_PROJECTS
   ```
5. Paste your JSON array into **Secret**.
6. Click **Add secret**.

The workflow masks all extracted `url` and `anon_key` values using `::add-mask::` and only logs project names and HTTP status codes.

---

## 4. Manually Execute the Workflow

You can trigger a run at any time using `workflow_dispatch`:

1. Go to your repository's **Actions** tab on GitHub.
2. Select **Supabase Keepalive** from the left sidebar.
3. Click **Run workflow** → select the default branch → click **Run workflow**.
4. Click on the running workflow execution and open the **Ping Supabase Projects** job to inspect the status output for each project (`[OK]` or `[FAIL]`).

---

## 5. Verify Scheduled Executions

The workflow is scheduled to run every 3 days at `04:17 UTC` (`17 4 */3 * *`).

To verify scheduled runs:
1. Open the **Actions** tab in your GitHub repository.
2. Select **Supabase Keepalive** in the left sidebar.
3. Look for runs labeled with the **Scheduled** trigger (as opposed to **Manual**).
4. Note that GitHub Actions scheduled workflows may experience slight delays (typically a few minutes) during periods of high platform load.
5. If any project fails to respond with a `2xx` status code, the workflow exits with a non-zero status so GitHub marks the run as failed and notifies you according to your GitHub notification settings.
