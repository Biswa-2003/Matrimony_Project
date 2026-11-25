// Creates two demo members for manual testing (Priya & Arjun).
//   node scripts/seed-demo-couple.cjs          → create (skips if they exist)
//   node scripts/seed-demo-couple.cjs remove   → delete them and everything they created
// Emails use the reserved .invalid domain, so no real email is ever sent to them.
const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const PEOPLE = [
  {
    email: "priya.test@example.invalid", password: "Priya@12345", first: "Priya", last: "Mohanty", gender: "Female",
    dob: "1997-03-14", city: 1, height: 160, weight: 54, edu: 7, prof: 3, star: "Rohini", rashi: "Vrishabh (Taurus)", manglik: "No",
    about: "I'm a software engineer in Bhubaneswar who loves Odissi dance, reading and weekend trips to Puri. Family means everything to me.",
    family: "We are a close-knit family of four. My father is a retired teacher and my mother is a homemaker. My younger brother is studying engineering.",
  },
  {
    email: "arjun.test@example.invalid", password: "Arjun@12345", first: "Arjun", last: "Das", gender: "Male",
    dob: "1994-08-22", city: 2, height: 177, weight: 72, edu: 7, prof: 3, star: "Uttara Phalguni", rashi: "Kanya (Virgo)", manglik: "No",
    about: "Software engineer from Cuttack, now working in Bhubaneswar. I enjoy cricket, cooking Odia food and long drives.",
    family: "Traditional yet modern family. My father runs a small business and my mother is a school principal. I have an elder sister who is married.",
  },
];

(async () => {
  const c = new Client({ user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT });
  await c.connect();
  const emails = PEOPLE.map((p) => p.email);

  if (process.argv[2] === "remove") {
    const ids = (await c.query("SELECT id FROM users WHERE email = ANY($1)", [emails])).rows.map((r) => r.id);
    if (ids.length) {
      const del = (sql) => c.query(sql, [ids]).catch(() => {});
      await del("DELETE FROM conversations WHERE user_a = ANY($1) OR user_b = ANY($1)");
      await del("DELETE FROM interests WHERE from_profile = ANY($1) OR to_profile = ANY($1)");
      await del("DELETE FROM profile_views WHERE viewer_id = ANY($1) OR viewed_id = ANY($1)");
      await del("DELETE FROM user_sessions WHERE user_id = ANY($1)");
      await del("DELETE FROM email_log WHERE user_id = ANY($1)");
      await del("DELETE FROM content_flags WHERE user_id = ANY($1)");
      await del("DELETE FROM matrimony_profiles WHERE user_id = ANY($1)");
      await del("DELETE FROM users WHERE id = ANY($1)");
    }
    console.log(`removed ${ids.length} demo member(s)`);
    return c.end();
  }

  const out = [];
  for (const p of PEOPLE) {
    const found = await c.query("SELECT u.id, mp.matri_id FROM users u LEFT JOIN matrimony_profiles mp ON mp.user_id = u.id WHERE u.email = $1", [p.email]);
    if (found.rows[0]) { out.push({ ...p, id: found.rows[0].id, matri: found.rows[0].matri_id, existed: true }); continue; }
    const id = crypto.randomUUID();
    const matri = `DU${crypto.randomInt(100000, 999999)}`;
    await c.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, is_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
      [id, p.email, await bcrypt.hash(p.password, 10), p.first, p.last]
    );
    await c.query(
      `INSERT INTO matrimony_profiles
         (id, user_id, matri_id, first_name, last_name, gender, marital_status, dob, height_cm, weight_kg,
          religion_id, country_id, state_id, city_id, education_id, profession_id, mother_tongue_id,
          star, rashi, manglik, about_me, about_family, is_verified, is_active, email_visible, phone_visible, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'Never Married', $7, $8, $9, 1, 1, 19, $10, $11, $12, 1,
               $13, $14, $15, $16, $17, true, true, true, true, NOW(), NOW())`,
      [crypto.randomUUID(), id, matri, p.first, p.last, p.gender, p.dob, p.height, p.weight, p.city, p.edu, p.prof,
        p.star, p.rashi, p.manglik, p.about, p.family]
    );
    out.push({ ...p, id, matri });
  }
  console.log(JSON.stringify(out.map(({ email, password, first, id, matri, existed }) => ({ name: first, email, password, id, matri, existed: !!existed }))));
  await c.end();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
