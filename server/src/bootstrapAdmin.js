const bcrypt = require('bcryptjs');
const { prisma } = require('./db');

// Creates (or promotes) the owner account from environment variables at boot.
//
// This exists because the first admin can't be made through the UI — promoting
// a user is itself an admin-only action. The alternative, scripts/make-admin.js,
// needs a direct connection to the database, which Render's Postgres refuses
// from outside its own network unless your IP is allowlisted. The API already
// runs inside that network, so seeding from here always works.
//
// Idempotent and safe to run on every boot:
//   - no ADMIN_EMAIL set        -> does nothing
//   - account missing           -> creates it as an admin, using ADMIN_PASSWORD
//   - account exists, not admin -> promotes it, password untouched
//   - account exists, is admin  -> does nothing
//
// An existing account's password is never silently reset — that would revert a
// password changed in-app on the next restart, and would be surprising. Set
// ADMIN_FORCE_PASSWORD=true to deliberately reset it (useful if you're locked
// out); unset it again afterwards.
//
// Never throws: a seeding problem must not stop the API from serving traffic.
async function bootstrapAdmin() {
  const rawEmail = (process.env.ADMIN_EMAIL || '').trim();
  if (!rawEmail) return;

  // Registration and login both lowercase the address, so the seeded row has to
  // match that or the account would exist but be unreachable at login.
  const email = rawEmail.toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const forcePassword = String(process.env.ADMIN_FORCE_PASSWORD || '').toLowerCase() === 'true';

  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (!existing) {
      // Mirrors the minimum enforced by POST /api/auth/register.
      if (password.length < 8) {
        console.error(
          `[bootstrapAdmin] ${email} does not exist and ADMIN_PASSWORD is missing or shorter ` +
            'than 8 characters, so the account was not created.'
        );
        return;
      }
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.create({ data: { email, passwordHash, role: 'admin' } });
      console.log(`[bootstrapAdmin] created ${email} as an admin.`);
      return;
    }

    if (forcePassword) {
      if (password.length < 8) {
        console.error(
          '[bootstrapAdmin] ADMIN_FORCE_PASSWORD is set but ADMIN_PASSWORD is missing or shorter ' +
            'than 8 characters — password left unchanged.'
        );
      } else {
        await prisma.user.update({
          where: { email },
          data: { passwordHash: await bcrypt.hash(password, 12) },
        });
        console.warn(`[bootstrapAdmin] reset the password for ${email}. Unset ADMIN_FORCE_PASSWORD now.`);
      }
    }

    if (existing.role !== 'admin') {
      await prisma.user.update({ where: { email }, data: { role: 'admin' } });
      console.log(`[bootstrapAdmin] promoted ${email} from "${existing.role}" to admin.`);
    } else if (!forcePassword) {
      console.log(`[bootstrapAdmin] ${email} is already an admin — nothing to do.`);
    }
  } catch (err) {
    console.error('[bootstrapAdmin] failed:', err.message);
  }
}

module.exports = { bootstrapAdmin };
