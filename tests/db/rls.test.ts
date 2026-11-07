/**
 * Database authorization tests. They run real SQL against the local stack's PostgreSQL as the same
 * roles PostgREST uses (anon / authenticated with a JWT "sub"), so Row-Level Security is exercised exactly
 * as in production. Every test runs inside a transaction that is rolled back.
 * Requires: `npm run stack:start` and `npm run db:reset` (seeded fictional data).
 */
import { afterAll, describe, expect, it } from "vitest";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54322/waditech", max: 4 });
afterAll(() => pool.end());

const U = {
  superAdmin: "00000000-0000-4000-a000-000000000001",
  admin: "00000000-0000-4000-a000-000000000002",
  trainer: "00000000-0000-4000-a000-000000000003",
  trainer2: "00000000-0000-4000-a000-000000000004",
  omar: "00000000-0000-4000-a000-000000000005", // student, child of parent Huda
  sara: "00000000-0000-4000-a000-000000000006", // student at the *second* school
  parent: "00000000-0000-4000-a000-000000000007",
  coordinator: "00000000-0000-4000-a000-000000000008", // coordinator of demo-model-school
  yazan: "00000000-0000-4000-a000-000000000009", // student at demo-model-school
  parent2: "00000000-0000-4000-a000-000000000010", // parent with no linked child
};

type Q = (sql: string, params?: unknown[]) => Promise<pg.QueryResult>;

/** Run `fn` as a given user (or anon) inside a rolled-back transaction. */
async function as<T>(who: string | "anon", fn: (q: Q) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    if (who === "anon") {
      await c.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
      await c.query("set local role anon");
    } else {
      await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: who, role: "authenticated" })]);
      await c.query("set local role authenticated");
    }
    return await fn((sql, params) => c.query(sql, params as unknown[]));
  } finally {
    await c.query("rollback");
    c.release();
  }
}

/** Expect a statement to be refused (permission error or RLS violation), using a savepoint. */
async function refused(q: Q, sql: string, params?: unknown[]) {
  await q("savepoint s");
  try {
    await q(sql, params);
  } catch (e) {
    await q("rollback to savepoint s");
    return (e as Error).message;
  }
  await q("release savepoint s");
  throw new Error(`expected refusal but statement succeeded: ${sql}`);
}

const count = async (q: Q, sql: string, params?: unknown[]) => Number((await q(sql, params)).rows[0].n);

describe("anonymous visitors", () => {
  it("see published courses but not drafts", () =>
    as("anon", async (q) => {
      expect(await count(q, "select count(*) n from courses where status='published'")).toBeGreaterThan(0);
      expect(await count(q, "select count(*) n from courses where status<>'published'")).toBe(0);
    }));
  it("cannot read any private table", () =>
    as("anon", async (q) => {
      for (const t of ["profiles", "enrollments", "orders", "submissions", "notifications", "user_roles", "audit_logs", "contact_messages", "lesson_progress"]) {
        const n = await count(q, `select count(*) n from ${t}`).catch(() => 0);
        expect(n, t).toBe(0);
      }
    }));
  it("cannot write or read the contact inbox directly (the server inserts after validation + rate limiting)", () =>
    as("anon", async (q) => {
      await refused(q, "insert into contact_messages(name,email,message) values ('Visitor','v@example.com','Hello, I would like information about programs.')");
      expect(await count(q, "select count(*) n from contact_messages")).toBe(0);
    }));
  it("can verify a certificate and only receives minimal fields", () =>
    as("anon", async (q) => {
      const r = await q("select * from verify_certificate('WT-2026-DEMO0001')");
      expect(r.rows.length).toBe(1);
      const cols = Object.keys(r.rows[0]);
      expect(cols).not.toContain("student_id");
      expect(cols).not.toContain("email");
    }));
});

describe("students", () => {
  it("see only their own enrollments", () =>
    as(U.omar, async (q) => {
      expect(await count(q, "select count(*) n from enrollments where student_id=$1", [U.omar])).toBeGreaterThan(0);
      expect(await count(q, "select count(*) n from enrollments where student_id<>$1", [U.omar])).toBe(0);
    }));
  it("cannot read another student's profile", () =>
    as(U.omar, async (q) => {
      expect(await count(q, "select count(*) n from profiles where id=$1", [U.sara])).toBe(0);
    }));
  it("cannot grant themselves a privileged role", () =>
    as(U.omar, async (q) => {
      await refused(q, "insert into user_roles(user_id, role) values ($1, 'admin')", [U.omar]);
    }));
  it("cannot change their own account status", () =>
    as(U.omar, async (q) => {
      await q("savepoint s");
      const res = await q("update profiles set status='suspended' where id=$1", [U.omar]).catch((e: Error) => e);
      await q("rollback to savepoint s");
      if (!(res instanceof Error)) {
        const r = await q("select status from profiles where id=$1", [U.omar]);
        expect(r.rows[0].status).toBe("active");
      }
    }));
  it("cannot create an active enrollment directly (bypassing payment)", () =>
    as(U.omar, async (q) => {
      const course = (await q("select id from courses where slug='python-for-young-coders'")).rows[0].id;
      await refused(q, "insert into enrollments(course_id, student_id, status) values ($1,$2,'active')", [course, U.omar]);
    }));
  it("enrolling in a paid course creates a pending order priced by the server", () =>
    as(U.omar, async (q) => {
      const course = (await q("select id, price_amount from courses where slug='python-for-young-coders'")).rows[0];
      await q("select enroll_in_course($1)", [course.id]);
      const e = (await q("select id, status from enrollments where course_id=$1 and student_id=$2", [course.id, U.omar])).rows[0];
      expect(e.status).not.toBe("active");
      const o = await q("select * from create_order_for_enrollment($1)", [e.id]);
      const order = o.rows[0];
      expect(Number(order.total ?? order.amount ?? order.subtotal)).toBeCloseTo(Number(course.price_amount));
      await refused(q, "update orders set status='paid' where id=$1", [order.id]).catch(async () => {
        // if the update was silently filtered by RLS, the row must still be pending
        const s = (await q("select status from orders where id=$1", [order.id])).rows[0].status;
        expect(s).toBe("pending");
      });
    }));
  it("cannot read quiz answer keys", () =>
    as(U.omar, async (q) => {
      const n = await count(q, "select count(*) n from question_keys").catch(() => 0);
      expect(n).toBe(0);
    }));
  it("cannot issue a certificate", () =>
    as(U.yazan, async (q) => {
      const e = (await q("select e.id from enrollments e join courses c on c.id=e.course_id where c.slug='ai-explorers' and e.student_id=$1", [U.yazan])).rows[0];
      await refused(q, "select issue_certificate($1)", [e.id]);
    }));
  it("cannot read other users' notifications", () =>
    as(U.omar, async (q) => {
      expect(await count(q, "select count(*) n from notifications where user_id<>$1", [U.omar])).toBe(0);
    }));
});

describe("parents", () => {
  it("see their verified child's progress but no other child", () =>
    as(U.parent, async (q) => {
      expect(await count(q, "select count(*) n from enrollments where student_id=$1", [U.omar])).toBeGreaterThan(0);
      expect(await count(q, "select count(*) n from enrollments where student_id in ($1,$2)", [U.sara, U.yazan])).toBe(0);
    }));
  it("an unlinked parent sees no student records", () =>
    as(U.parent2, async (q) => {
      expect(await count(q, "select count(*) n from enrollments")).toBe(0);
      expect(await count(q, "select count(*) n from profiles where id<>$1", [U.parent2])).toBe(0);
    }));
  it("cannot self-verify a link to a child", () =>
    as(U.parent2, async (q) => {
      await refused(q, "insert into parent_student_links(parent_id, student_id, status) values ($1,$2,'verified')", [U.parent2, U.sara]);
    }));
});

describe("school coordinators (tenant isolation)", () => {
  it("see students of their own school only", () =>
    as(U.coordinator, async (q) => {
      expect(await count(q, "select count(*) n from enrollments where student_id=$1", [U.yazan])).toBeGreaterThan(0);
      expect(await count(q, "select count(*) n from enrollments where student_id=$1", [U.sara])).toBe(0);
      expect(await count(q, "select count(*) n from organizations where slug='second-demo-school'")).toBe(0);
    }));
  it("can edit their school but cannot list it publicly (admin decision)", () =>
    as(U.coordinator, async (q) => {
      await q("update organizations set city='Amman' where slug='demo-model-school'");
      const msg = await refused(q, "update organizations set show_publicly = not show_publicly where slug='demo-model-school'");
      expect(msg).toMatch(/only administrators/);
    }));
});

describe("public partner schools (0011)", () => {
  it("anon sees only listed, active schools and only name/city/type fields", () =>
    as("anon", async (q) => {
      const r = await q("select * from public_partner_schools()");
      expect(r.rows.length).toBeGreaterThan(0);
      const cols = Object.keys(r.rows[0]);
      for (const c of ["contact_email", "contact_phone", "status"]) expect(cols).not.toContain(c);
      expect(await count(q, "select count(*) n from organizations")).toBe(0); // the table itself stays private
    }));
  it("an unlisted school disappears from the public list", () =>
    as(U.admin, async (q) => {
      const before = (await q("select count(*) n from public_partner_schools()")).rows[0].n;
      await q("update organizations set show_publicly=false where slug='second-demo-school'");
      const after = (await q("select count(*) n from public_partner_schools()")).rows[0].n;
      expect(Number(after)).toBe(Number(before) - 1);
    }));
});

describe("trainers", () => {
  it("cannot change commercial fields of a course", () =>
    as(U.trainer, async (q) => {
      const c = (await q("select course_id from course_instructors where trainer_id=$1 limit 1", [U.trainer])).rows[0];
      expect(c, "seed should assign the trainer a course").toBeTruthy();
      await refused(q, "update courses set price_amount = price_amount + 999 where id=$1", [c.course_id]);
      await refused(q, "update courses set status='archived' where id=$1", [c.course_id]);
    }));
  it("see enrollments only for courses they teach (not the same student's other courses)", () =>
    as(U.trainer2, async (q) => {
      const mine = await count(q, "select count(*) n from course_instructors where trainer_id=$1", [U.trainer2]);
      const visible = await count(q, "select count(*) n from enrollments e where not exists (select 1 from course_instructors ci where ci.course_id=e.course_id and ci.trainer_id=$1)", [U.trainer2]);
      expect(mine).toBeGreaterThanOrEqual(0);
      expect(visible).toBe(0);
    }));
});

describe("administrators", () => {
  it("an admin cannot grant super_admin; a super admin can", async () => {
    await as(U.admin, async (q) => {
      await refused(q, "insert into user_roles(user_id, role) values ($1,'super_admin')", [U.omar]);
    });
    await as(U.superAdmin, async (q) => {
      await q("insert into user_roles(user_id, role) values ($1,'trainer')", [U.omar]);
      expect(await count(q, "select count(*) n from user_roles where user_id=$1 and role='trainer'", [U.omar])).toBe(1);
    });
  });
  it("can read audit logs; students cannot", async () => {
    await as(U.admin, async (q) => {
      await q("select count(*) from audit_logs");
    });
    await as(U.omar, async (q) => {
      expect(await count(q, "select count(*) n from audit_logs")).toBe(0);
    });
  });
});

describe("sign-up bootstrap", () => {
  it("never assigns a privileged role even if requested in metadata", async () => {
    const c = await pool.connect();
    try {
      await c.query("begin");
      const id = "00000000-0000-4000-a000-0000000000ff";
      await c.query(
        `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
         values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', 'attacker@test.local', '', '{}', '{"account_type":"admin","full_name":"X"}', now(), now())`,
        [id],
      );
      const roles = (await c.query("select role::text from user_roles where user_id=$1", [id])).rows.map((r) => r.role);
      expect(roles).toEqual(["student"]);
    } finally {
      await c.query("rollback");
      c.release();
    }
  });
});

describe("email queue", () => {
  it("queues an email for every new notification", async () => {
    const c = await pool.connect();
    try {
      await c.query("begin");
      const r = await c.query("insert into notifications(user_id, kind, title_en, title_ar) values ($1,'test','T','ت') returning email_status, email_next_attempt_at", [U.omar]);
      expect(r.rows[0].email_status).toBe("queued");
      expect(r.rows[0].email_next_attempt_at).not.toBeNull();
    } finally {
      await c.query("rollback");
      c.release();
    }
  });
  it("only the service role can claim or report emails (users and admins cannot)", async () => {
    for (const who of [U.omar, U.admin, "anon"]) {
      await as(who, async (q) => {
        await refused(q, "select * from claim_notification_emails(5)");
        await refused(q, "select report_notification_email('00000000-0000-4000-a000-000000000001', true)");
      });
    }
  });
  it("admins can read analytics; others cannot", async () => {
    await as(U.admin, async (q) => {
      const a = (await q("select admin_analytics() a")).rows[0].a;
      expect(a.enrollments_by_week).toHaveLength(12);
      expect(a.revenue_by_month).toHaveLength(6);
      expect(Array.isArray(a.courses)).toBe(true);
    });
    await as(U.trainer, async (q) => {
      await refused(q, "select admin_analytics()");
    });
  });
});

describe("trainer profiles", () => {
  it("the public sees only published profiles, with real teaching counts", () =>
    as("anon", async (q) => {
      const rows = (await q("select slug, courses, learners from public_trainers()")).rows;
      expect(rows.map((r) => r.slug)).toEqual(["demo-lina"]); // Kareem's profile is still pending
      expect(rows[0].courses).toBe(4);
      expect(await count(q, "select count(*) n from trainer_profiles")).toBe(0); // raw table is private
    }));
  it("a trainer's edit goes back to review and cannot publish itself", () =>
    as(U.trainer, async (q) => {
      await q("update trainer_profiles set bio_en = 'Updated bio', status = 'published' where trainer_id = $1", [U.trainer]);
      expect((await q("select status from trainer_profiles where trainer_id = $1", [U.trainer])).rows[0].status).toBe("pending");
      expect((await q("select count(*) n from public_trainers()")).rows[0].n).toBe("0");
    }));
  it("a trainer cannot edit another trainer's profile; students cannot create one", async () => {
    await as(U.trainer, async (q) => {
      const r = await q("update trainer_profiles set bio_en = 'x' where trainer_id = $1", [U.trainer2]);
      expect(r.rowCount).toBe(0);
    });
    await as(U.omar, (q) => refused(q, "insert into trainer_profiles(trainer_id, slug, display_name_en, display_name_ar) values ($1,'omar','Omar','عمر')", [U.omar]));
  });
  it("an admin can publish a pending profile", () =>
    as(U.admin, async (q) => {
      await q("update trainer_profiles set status = 'published' where trainer_id = $1", [U.trainer2]);
      const r = (await q("select status, reviewed_by from trainer_profiles where trainer_id = $1", [U.trainer2])).rows[0];
      expect(r).toEqual({ status: "published", reviewed_by: U.admin });
    }));
});

describe("course reviews", () => {
  const AI = "0c000000-0000-4000-a000-000000000003"; // Yazan completed this course
  const ROBOTICS = "0c000000-0000-4000-a000-000000000001"; // Omar is active (not completed)
  it("only a student who completed the course can review it, and it starts pending", async () => {
    await as(U.omar, (q) => refused(q, "insert into course_reviews(course_id, author_id, student_id, author_role, rating, body) values ($1,$2,$2,'student',5,'Great course, loved it')", [ROBOTICS, U.omar]));
    await as(U.omar, (q) => refused(q, "insert into course_reviews(course_id, author_id, student_id, author_role, rating, body) values ($1,$2,$3,'student',5,'Pretending to be Yazan')", [AI, U.omar, U.yazan]));
    await as(U.yazan, async (q) => {
      await q("delete from course_reviews where author_id = $1", [U.yazan]);
      await q("insert into course_reviews(course_id, author_id, student_id, author_role, rating, body, status, featured) values ($1,$2,$2,'student',4,'Really enjoyed the projects',  'approved', true)", [AI, U.yazan]);
      expect((await q("select status, featured from course_reviews where author_id = $1", [U.yazan])).rows[0]).toEqual({ status: "pending", featured: false });
    });
  });
  it("a verified parent can review their child's completed course; an unlinked parent cannot", async () => {
    await as(U.admin, async (q) => {
      await q("update enrollments set status = 'completed', completed_at = now() where course_id = $1 and student_id = $2", [ROBOTICS, U.omar]);
      await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: U.parent, role: "authenticated" })]);
      await q("insert into course_reviews(course_id, author_id, student_id, author_role, rating, body) values ($1,$2,$3,'student',5,'My son built his first robot')", [ROBOTICS, U.parent, U.omar]);
      expect((await q("select author_role, status from course_reviews where author_id = $1", [U.parent])).rows[0]).toEqual({ author_role: "parent", status: "pending" });
      await q("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: U.parent2, role: "authenticated" })]);
      await refused(q, "insert into course_reviews(course_id, author_id, student_id, author_role, rating, body) values ($1,$2,$3,'parent',1,'Not my child at all')", [ROBOTICS, U.parent2, U.omar]);
    });
  });
  it("the public sees approved reviews only, with first name and no account ids", () =>
    as("anon", async (q) => {
      expect(await count(q, "select count(*) n from course_reviews")).toBe(0);
      const rows = (await q("select * from public_reviews($1)", [AI])).rows;
      expect(rows).toHaveLength(1);
      expect(rows[0].author_first_name).toBe("Yazan");
      expect(Object.keys(rows[0])).not.toContain("author_id");
      const s = (await q("select learners, rating, reviews from public_course_stats() where course_id = $1", [AI])).rows[0];
      expect(s).toEqual({ learners: 1, rating: "5.0", reviews: 1 });
    }));
});

describe("resource library", () => {
  it("anonymous visitors see locked items without their link", () =>
    as("anon", async (q) => {
      const rows = (await q("select title_en, access, unlocked, url from library_items()")).rows;
      expect(rows.map((r) => r.access)).toEqual(["public", "registered", "enrolled"]); // the draft is hidden
      expect(rows.filter((r) => r.unlocked).map((r) => r.access)).toEqual(["public"]);
      expect(rows.filter((r) => !r.unlocked).every((r) => r.url === null)).toBe(true);
      expect(await count(q, "select count(*) n from resources")).toBe(0);
    }));
  it("enrolled students unlock their course's resources; others do not", async () => {
    await as(U.omar, async (q) => expect((await q("select bool_and(unlocked) ok from library_items()")).rows[0].ok).toBe(true));
    await as(U.yazan, async (q) => {
      const r = (await q("select access, unlocked from library_items() where access = 'enrolled'")).rows[0];
      expect(r.unlocked).toBe(true); // Yazan is active in Robotics Foundations
    });
    await as(U.parent2, async (q) => {
      const r = (await q("select unlocked, url from library_items() where access = 'enrolled'")).rows[0];
      expect(r).toEqual({ unlocked: false, url: null });
    });
  });
  it("filters by track and grade, and only admins can write", async () => {
    await as("anon", async (q) => {
      expect((await q("select count(*) n from library_items('electronics')")).rows[0].n).toBe("1");
      expect((await q("select count(*) n from library_items(null, 2)")).rows[0].n).toBe("0");
    });
    await as(U.trainer, (q) => refused(q, "insert into resources(title_en, title_ar, kind, url) values ('Trainer file','ملف','link','https://example.org')"));
    await as(U.admin, async (q) => { await q("insert into resources(title_en, title_ar, kind, url) values ('Admin file','ملف','link','https://example.org')"); });
  });
});
