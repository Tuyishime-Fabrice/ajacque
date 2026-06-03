/* ═══════════════════════════════════════════════════════════
   AJACQUE FUNERAL SERVICES — admin-api (Netlify Function)

   This runs on the SERVER. It holds the Supabase service_role key,
   which must NEVER be placed in any browser-facing file.

   Required Netlify environment variables (Site → Settings →
   Environment variables):
     SUPABASE_URL          e.g. https://xxxx.supabase.co
     SUPABASE_SERVICE_KEY  the service_role key from Supabase
     ADMIN_PASSWORD        the password you'll type to log in

   Every request must include the correct ADMIN_PASSWORD, so the
   public anon key can stay read-only and random visitors cannot
   write to the database.
═══════════════════════════════════════════════════════════ */

const ALLOWED_TABLES = ['products', 'gallery'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const SUPABASE_URL   = process.env.SUPABASE_URL;
  const SERVICE_KEY    = process.env.SUPABASE_SERVICE_KEY;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!SUPABASE_URL || !SERVICE_KEY || !ADMIN_PASSWORD) {
    return json(500, {
      error: 'Server not configured. Set SUPABASE_URL, SUPABASE_SERVICE_KEY and ADMIN_PASSWORD in Netlify.',
    });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid request body' }); }

  // Gate every action behind the admin password.
  if (!body.password || body.password !== ADMIN_PASSWORD) {
    return json(401, { error: 'Unauthorized' });
  }

  const svcHeaders = {
    apikey: SERVICE_KEY,
    Authorization: 'Bearer ' + SERVICE_KEY,
    'Content-Type': 'application/json',
  };

  try {
    switch (body.action) {

      // Verify password only (used by the login screen).
      case 'login':
        return json(200, { ok: true });

      // Issue a one-time signed URL so the browser can upload a file
      // directly to Supabase Storage without ever seeing the service key.
      case 'sign-upload': {
        const bucket = sanitizeSegment(body.bucket || 'product-images');
        const path   = sanitizePath(body.path || '');
        if (!path) return json(400, { error: 'Missing path' });

        const r = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/${bucket}/${path}`, {
          method: 'POST',
          headers: svcHeaders,
          body: JSON.stringify({}),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          return json(r.status, {
            error: data.message || data.error || `Could not sign upload (status ${r.status})`,
          });
        }

        return json(200, {
          token: data.token,
          path,
          bucket,
          publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`,
        });
      }

      // Insert a row into an allowed table.
      case 'insert': {
        if (!ALLOWED_TABLES.includes(body.table)) return json(400, { error: 'Table not allowed' });
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${body.table}`, {
          method: 'POST',
          headers: { ...svcHeaders, Prefer: 'return=representation' },
          body: JSON.stringify(body.row || {}),
        });
        const data = await r.json().catch(() => ([]));
        if (!r.ok) return json(r.status, { error: (data && data.message) || 'Insert failed' });
        return json(200, { ok: true, data });
      }

      // Delete a row by id from an allowed table.
      case 'delete': {
        if (!ALLOWED_TABLES.includes(body.table)) return json(400, { error: 'Table not allowed' });
        const id = encodeURIComponent(String(body.id || ''));
        if (!id) return json(400, { error: 'Missing id' });
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${body.table}?id=eq.${id}`, {
          method: 'DELETE',
          headers: svcHeaders,
        });
        if (!r.ok) {
          const t = await r.text();
          return json(r.status, { error: t || 'Delete failed' });
        }
        return json(200, { ok: true });
      }

      default:
        return json(400, { error: 'Unknown action' });
    }
  } catch (e) {
    return json(500, { error: String((e && e.message) || e) });
  }
};

// Allow only safe characters in a single path segment (bucket name).
function sanitizeSegment(s) {
  return String(s).replace(/[^a-zA-Z0-9._-]/g, '');
}
// Allow folder/file paths but strip anything unusual.
function sanitizePath(s) {
  return String(s).replace(/[^a-zA-Z0-9._/-]/g, '').replace(/\.\.+/g, '');
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(obj),
  };
}