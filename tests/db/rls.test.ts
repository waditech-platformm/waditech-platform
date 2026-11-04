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
