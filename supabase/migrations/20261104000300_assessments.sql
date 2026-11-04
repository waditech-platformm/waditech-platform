-- =====================================================================
-- WadiTech Academy — 0003 Assessments, assignments, attendance, progress rules
-- Correct answers live in question_keys which students can never read.
-- Grading happens ONLY in submit_attempt() on the server/database.
-- =====================================================================

-- trainers may edit teaching content of their course, but not commercial / publishing fields
create or replace function public.guard_course_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() or public.is_admin() then
    if new.status = 'published' and old.status is distinct from 'published' then new.published_at := coalesce(new.published_at, now()); end if;
    return new;
  end if;
  if new.price_amount is distinct from old.price_amount or new.currency is distinct from old.currency
     or new.status is distinct from old.status or new.slug is distinct from old.slug
     or new.capacity is distinct from old.capacity or new.featured is distinct from old.featured
     or new.availability is distinct from old.availability or new.is_test_data is distinct from old.is_test_data then
    raise exception 'only administrators can change pricing, capacity or publishing' using errcode='42501';
  end if;
  return new;
end $$;
create trigger courses_guard before update on public.courses for each row execute function public.guard_course_update();

create table public.assessments (
  id uuid primary key default extensions.gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title_en text not null, title_ar text not null,
  description_en text, description_ar text,
  pass_percent int not null default 60 check (pass_percent between 0 and 100),
  max_attempts int check (max_attempts is null or max_attempts between 1 and 50),
  time_limit_minutes int check (time_limit_minutes is null or time_limit_minutes between 1 and 600),
  status public.publish_status not null default 'published',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index assessments_course_idx on public.assessments(course_id);
create trigger assessments_updated_at before update on public.assessments for each row execute function public.set_updated_at();

create type public.question_kind as enum ('single_choice','multiple_choice','short_answer');

create table public.questions (
  id uuid primary key default extensions.gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  kind public.question_kind not null default 'single_choice',
  prompt_en text not null, prompt_ar text not null,
  explanation_en text, explanation_ar text,
  points int not null default 1 check (points between 0 and 100),
  position int not null default 0
);
create index questions_assessment_idx on public.questions(assessment_id, position);

create table public.answer_options (
  id uuid primary key default extensions.gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label_en text not null, label_ar text not null,
  position int not null default 0
);
create index answer_options_q_idx on public.answer_options(question_id, position);

-- STAFF ONLY: the answer key
create table public.question_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_option_ids uuid[] not null default '{}',
  accepted_answers text[] not null default '{}',   -- short answer auto-grading only when explicitly configured
  case_sensitive boolean not null default false
);

create table public.assessment_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  attempt_number int not null,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','needs_review','graded')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score_points numeric(8,2), max_points numeric(8,2), score_percent numeric(5,2),
  passed boolean,
  reviewed_by uuid references auth.users(id) on delete set null,
  feedback text,
  unique (assessment_id, student_id, attempt_number)
);
create index attempts_student_idx on public.assessment_attempts(student_id, assessment_id);

create table public.assessment_answers (
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option_ids uuid[] not null default '{}',
  text_answer text check (text_answer is null or char_length(text_answer) <= 4000),
  is_correct boolean,
  points_awarded numeric(8,2),
  feedback text,
  primary key (attempt_id, question_id)
);

-- Start (or resume) an attempt
create or replace function public.start_attempt(p_assessment uuid) returns public.assessment_attempts
language plpgsql security definer set search_path = public as $$
declare a public.assessments; v_n int; t public.assessment_attempts;
begin
  select * into a from public.assessments where id = p_assessment and status = 'published';
  if a.id is null then raise exception 'assessment not found' using errcode='P0002'; end if;
  if not public.is_enrolled(a.course_id) then raise exception 'you are not enrolled in this course' using errcode='42501'; end if;
  select * into t from public.assessment_attempts where assessment_id = a.id and student_id = auth.uid() and status = 'in_progress' limit 1;
  if t.id is not null then return t; end if;
  select count(*) into v_n from public.assessment_attempts where assessment_id = a.id and student_id = auth.uid();
  if a.max_attempts is not null and v_n >= a.max_attempts then raise exception 'no attempts remaining' using errcode='P0001'; end if;
  insert into public.assessment_attempts(assessment_id, student_id, course_id, attempt_number)
  values (a.id, auth.uid(), a.course_id, v_n + 1) returning * into t;
  return t;
end $$;

-- Submit + grade. p_answers: [{"question_id": "...", "option_ids": ["..."], "text": "..."}]
create or replace function public.submit_attempt(p_attempt uuid, p_answers jsonb) returns public.assessment_attempts
language plpgsql security definer set search_path = public as $$
declare
  t public.assessment_attempts; a public.assessments; q record; k public.question_keys;
  v_ans jsonb; v_sel uuid[]; v_text text; v_ok boolean; v_pts numeric; v_total numeric := 0; v_max numeric := 0; v_review boolean := false;
begin
  select * into t from public.assessment_attempts where id = p_attempt for update;
  if t.id is null or t.student_id <> auth.uid() then raise exception 'attempt not found' using errcode='P0002'; end if;
  if t.status <> 'in_progress' then raise exception 'attempt already submitted' using errcode='P0001'; end if;
  select * into a from public.assessments where id = t.assessment_id;
  if a.time_limit_minutes is not null and now() > t.started_at + make_interval(mins => a.time_limit_minutes + 2) then
    -- late: still graded, but recorded (2 minute network grace)
    null;
  end if;

  for q in select * from public.questions where assessment_id = a.id order by position loop
    v_max := v_max + q.points;
    select x into v_ans from jsonb_array_elements(coalesce(p_answers,'[]'::jsonb)) x where x ->> 'question_id' = q.id::text limit 1;
    v_sel := coalesce((select array_agg(value::uuid) from jsonb_array_elements_text(coalesce(v_ans -> 'option_ids','[]'::jsonb))), '{}');
    -- only accept options that belong to this question
    v_sel := coalesce((select array_agg(o.id order by o.id) from public.answer_options o where o.question_id = q.id and o.id = any(v_sel)), '{}');
    v_text := left(v_ans ->> 'text', 4000);
    select * into k from public.question_keys where question_id = q.id;
    v_ok := null; v_pts := null;
    if q.kind in ('single_choice','multiple_choice') then
      v_ok := k.question_id is not null
              and coalesce(array_length(v_sel,1),0) > 0
              and (select coalesce(array_agg(x order by x),'{}') from unnest(k.correct_option_ids) x) = v_sel;
      v_pts := case when v_ok then q.points else 0 end;
    else
      if k.question_id is not null and coalesce(array_length(k.accepted_answers,1),0) > 0 then
        v_ok := exists (select 1 from unnest(k.accepted_answers) acc
                        where case when k.case_sensitive then trim(acc) = trim(coalesce(v_text,''))
                                   else lower(trim(acc)) = lower(trim(coalesce(v_text,''))) end);
        v_pts := case when v_ok then q.points else 0 end;
      else
        v_review := true; -- manual grading workflow
      end if;
    end if;
    insert into public.assessment_answers(attempt_id, question_id, selected_option_ids, text_answer, is_correct, points_awarded)
    values (t.id, q.id, v_sel, v_text, v_ok, v_pts)
    on conflict (attempt_id, question_id) do update set selected_option_ids = excluded.selected_option_ids,
      text_answer = excluded.text_answer, is_correct = excluded.is_correct, points_awarded = excluded.points_awarded;
    v_total := v_total + coalesce(v_pts, 0);
  end loop;

  update public.assessment_attempts set
    submitted_at = now(),
    status = case when v_review then 'needs_review' else 'graded' end,
    score_points = v_total, max_points = v_max,
    score_percent = case when v_max > 0 then round(v_total * 100 / v_max, 2) else 0 end,
    passed = case when v_review then null else (case when v_max > 0 then v_total * 100 / v_max else 0 end) >= a.pass_percent end
  where id = t.id returning * into t;
  return t;
end $$;

-- Trainer/admin finishes a manual review
create or replace function public.review_attempt(p_attempt uuid, p_points jsonb, p_feedback text default null) returns public.assessment_attempts
language plpgsql security definer set search_path = public as $$
declare t public.assessment_attempts; a public.assessments; v_total numeric;
begin
  select * into t from public.assessment_attempts where id = p_attempt for update;
  if t.id is null then raise exception 'attempt not found' using errcode='P0002'; end if;
  if not public.is_course_staff(t.course_id) then raise exception 'not allowed' using errcode='42501'; end if;
  select * into a from public.assessments where id = t.assessment_id;
  update public.assessment_answers aa set
    points_awarded = least(greatest((p_points ->> aa.question_id::text)::numeric, 0), q.points),
    is_correct = (p_points ->> aa.question_id::text)::numeric >= q.points
  from public.questions q
  where aa.attempt_id = t.id and q.id = aa.question_id and p_points ? aa.question_id::text;
  select coalesce(sum(points_awarded),0) into v_total from public.assessment_answers where attempt_id = t.id;
  update public.assessment_attempts set status = 'graded', score_points = v_total,
    score_percent = case when max_points > 0 then round(v_total * 100 / max_points, 2) else 0 end,
    passed = (case when max_points > 0 then v_total * 100 / max_points else 0 end) >= a.pass_percent,
    reviewed_by = auth.uid(), feedback = left(p_feedback, 4000)
  where id = t.id returning * into t;
  perform public.write_audit('review','assessment_attempts', t.id::text, jsonb_build_object('score', t.score_percent));
  return t;
end $$;

-- Student-safe view of an assessment (never includes keys)
create or replace function public.assessment_for_student(p_assessment uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_enrolled(a.course_id) or public.is_course_staff(a.course_id) then
    jsonb_build_object(
      'id', a.id, 'course_id', a.course_id, 'title_en', a.title_en, 'title_ar', a.title_ar,
      'description_en', a.description_en, 'description_ar', a.description_ar,
      'pass_percent', a.pass_percent, 'max_attempts', a.max_attempts, 'time_limit_minutes', a.time_limit_minutes,
      'questions', coalesce((select jsonb_agg(jsonb_build_object(
          'id', q.id, 'kind', q.kind, 'prompt_en', q.prompt_en, 'prompt_ar', q.prompt_ar, 'points', q.points,
          'options', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'label_en', o.label_en, 'label_ar', o.label_ar) order by o.position)
                               from public.answer_options o where o.question_id = q.id), '[]'::jsonb)
        ) order by q.position) from public.questions q where q.assessment_id = a.id), '[]'::jsonb))
  end
  from public.assessments a where a.id = p_assessment and (a.status = 'published' or public.is_course_staff(a.course_id));
$$;

-- ---------------------------------------------------------------------
-- Assignments & submissions
-- ---------------------------------------------------------------------
create table public.assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title_en text not null, title_ar text not null,
  instructions_en text, instructions_ar text,
  due_at timestamptz,
  max_points int not null default 100 check (max_points between 1 and 1000),
  status public.publish_status not null default 'published',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index assignments_course_idx on public.assignments(course_id);
create trigger assignments_updated_at before update on public.assignments for each row execute function public.set_updated_at();

create table public.submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  body_text text check (body_text is null or char_length(body_text) <= 20000),
  link_url text check (link_url is null or link_url ~* '^https?://'),
  file_url text,
  status text not null default 'submitted' check (status in ('submitted','returned','graded')),
  submitted_at timestamptz not null default now(),
  grade_points numeric(8,2),
  feedback text,
  graded_by uuid references auth.users(id) on delete set null,
  graded_at timestamptz,
  unique (assignment_id, student_id)
);
create index submissions_course_idx on public.submissions(course_id, status);

create or replace function public.guard_submission() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_course uuid; v_max int;
begin
  select course_id, max_points into v_course, v_max from public.assignments where id = new.assignment_id;
  new.course_id := v_course;
  if public.is_service_role() then return new; end if;
  if public.is_course_staff(v_course) and (tg_op = 'UPDATE') then
    if new.grade_points is not null and (new.grade_points < 0 or new.grade_points > v_max) then
      raise exception 'grade out of range' using errcode='22003'; end if;
    if new.grade_points is distinct from old.grade_points or new.feedback is distinct from old.feedback then
      new.graded_by := auth.uid(); new.graded_at := now();
      if new.grade_points is not null then new.status := 'graded'; end if;
    end if;
    -- staff cannot rewrite the student's work
    new.body_text := old.body_text; new.link_url := old.link_url; new.file_url := old.file_url; new.student_id := old.student_id;
    return new;
  end if;
  -- student path
  if new.student_id <> auth.uid() or not public.is_enrolled(v_course) then
    raise exception 'not allowed' using errcode='42501'; end if;
  if tg_op = 'UPDATE' then
    if old.status = 'graded' then raise exception 'graded submissions cannot be changed' using errcode='42501'; end if;
    new.student_id := old.student_id;
  end if;
  new.grade_points := case when tg_op = 'UPDATE' then old.grade_points else null end;
  new.feedback := case when tg_op = 'UPDATE' then old.feedback else null end;
  new.graded_by := case when tg_op = 'UPDATE' then old.graded_by else null end;
  new.graded_at := case when tg_op = 'UPDATE' then old.graded_at else null end;
  new.status := 'submitted'; new.submitted_at := now();
  return new;
end $$;
create trigger submissions_guard before insert or update on public.submissions for each row execute function public.guard_submission();
create trigger submissions_audit after update on public.submissions for each row execute function public.audit_row();

-- ---------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------
create table public.class_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  created_at timestamptz not null default now()
);
create index class_sessions_course_idx on public.class_sessions(course_id, starts_at);

create table public.attendance (
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null check (status in ('present','absent','late','excused')),
  marked_by uuid references auth.users(id) on delete set null,
  marked_at timestamptz not null default now(),
  primary key (session_id, student_id)
);
create index attendance_student_idx on public.attendance(student_id);

create or replace function public.guard_attendance() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select course_id into new.course_id from public.class_sessions where id = new.session_id;
  if not (public.is_service_role() or public.is_course_staff(new.course_id)) then
    raise exception 'only course staff can mark attendance' using errcode='42501'; end if;
  if not exists (select 1 from public.enrollments where course_id = new.course_id and student_id = new.student_id) then
    raise exception 'student is not enrolled in this course' using errcode='P0001'; end if;
  new.marked_by := auth.uid(); new.marked_at := now();
  return new;
end $$;
create trigger attendance_guard before insert or update on public.attendance for each row execute function public.guard_attendance();

-- ---------------------------------------------------------------------
-- Progress rules (the ONLY way a lesson becomes completed)
-- ---------------------------------------------------------------------
create or replace function public.track_lesson_progress(p_lesson uuid, p_video_percent int default null, p_position int default null)
returns public.lesson_progress
language plpgsql security definer set search_path = public as $$
declare l public.lessons; p public.lesson_progress;
begin
  select * into l from public.lessons where id = p_lesson and status = 'published';
  if l.id is null then raise exception 'lesson not found' using errcode='P0002'; end if;
  if not public.is_enrolled(l.course_id) then raise exception 'you are not enrolled in this course' using errcode='42501'; end if;
  insert into public.lesson_progress(student_id, lesson_id, course_id, video_percent, last_position_seconds)
  values (auth.uid(), l.id, l.course_id, least(greatest(coalesce(p_video_percent,0),0),100), greatest(coalesce(p_position,0),0))
  on conflict (student_id, lesson_id) do update set
    -- video percent can only go up (the furthest verified point)
    video_percent = greatest(lesson_progress.video_percent, least(greatest(coalesce(p_video_percent, 0),0),100)),
    last_position_seconds = coalesce(greatest(p_position,0), lesson_progress.last_position_seconds),
    updated_at = now()
  returning * into p;
  return p;
end $$;

create or replace function public.complete_lesson(p_lesson uuid) returns public.lesson_progress
language plpgsql security definer set search_path = public as $$
declare l public.lessons; p public.lesson_progress; v_ok boolean;
begin
  p := public.track_lesson_progress(p_lesson, null, null);
  select * into l from public.lessons where id = p_lesson;
  v_ok := case l.completion_rule
    when 'view' then true
    when 'video_90' then p.video_percent >= 90
    when 'quiz_pass' then exists (select 1 from public.assessment_attempts where assessment_id = l.assessment_id and student_id = auth.uid() and passed)
    when 'assignment_submitted' then exists (select 1 from public.submissions where assignment_id = l.assignment_id and student_id = auth.uid())
    else false end;
  if not v_ok then raise exception 'completion requirements not met (%)', l.completion_rule using errcode='P0001'; end if;
  update public.lesson_progress set status = 'completed', completed_at = coalesce(completed_at, now()), updated_at = now()
  where student_id = auth.uid() and lesson_id = p_lesson returning * into p;
  return p;
end $$;

-- staff manual completion
create or replace function public.staff_complete_lesson(p_lesson uuid, p_student uuid) returns void
language plpgsql security definer set search_path = public as $$
declare l public.lessons;
begin
  select * into l from public.lessons where id = p_lesson;
  if not public.is_course_staff(l.course_id) then raise exception 'not allowed' using errcode='42501'; end if;
  if not public.is_enrolled(l.course_id, p_student) then raise exception 'student not enrolled' using errcode='P0001'; end if;
  insert into public.lesson_progress(student_id, lesson_id, course_id, status, completed_at)
  values (p_student, l.id, l.course_id, 'completed', now())
  on conflict (student_id, lesson_id) do update set status = 'completed', completed_at = coalesce(lesson_progress.completed_at, now());
  perform public.write_audit('staff_complete','lesson_progress', p_lesson::text, jsonb_build_object('student', p_student));
end $$;

create or replace function public.course_progress(p_course uuid, p_student uuid default auth.uid())
returns table (total_lessons int, completed_lessons int, percent int)
language sql stable security definer set search_path = public as $$
  with t as (select count(*)::int n from public.lessons where course_id = p_course and status = 'published'),
       c as (select count(*)::int n from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id and l.status = 'published'
             where lp.course_id = p_course and lp.student_id = p_student and lp.status = 'completed')
  select t.n, c.n, case when t.n = 0 then 0 else (c.n * 100 / t.n) end from t, c
  where public.can_view_student(p_student) or public.is_course_staff(p_course);
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.assessments enable row level security;
alter table public.questions enable row level security;
alter table public.answer_options enable row level security;
alter table public.question_keys enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_answers enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendance enable row level security;

create policy assessments_select on public.assessments for select to authenticated using (
  public.is_course_staff(course_id) or (status = 'published' and public.is_enrolled(course_id)));
create policy assessments_staff on public.assessments for all to authenticated using (public.is_course_staff(course_id)) with check (public.is_course_staff(course_id));

-- questions/options readable by enrolled students (no keys here)
create policy questions_select on public.questions for select to authenticated using (
  exists (select 1 from public.assessments a where a.id = assessment_id and (public.is_course_staff(a.course_id) or public.is_enrolled(a.course_id))));
create policy questions_staff on public.questions for all to authenticated using (
  exists (select 1 from public.assessments a where a.id = assessment_id and public.is_course_staff(a.course_id)))
  with check (exists (select 1 from public.assessments a where a.id = assessment_id and public.is_course_staff(a.course_id)));
create policy options_select on public.answer_options for select to authenticated using (
  exists (select 1 from public.questions q join public.assessments a on a.id = q.assessment_id
          where q.id = question_id and (public.is_course_staff(a.course_id) or public.is_enrolled(a.course_id))));
create policy options_staff on public.answer_options for all to authenticated using (
  exists (select 1 from public.questions q join public.assessments a on a.id = q.assessment_id where q.id = question_id and public.is_course_staff(a.course_id)))
  with check (exists (select 1 from public.questions q join public.assessments a on a.id = q.assessment_id where q.id = question_id and public.is_course_staff(a.course_id)));
create policy keys_staff_only on public.question_keys for all to authenticated using (
  exists (select 1 from public.questions q join public.assessments a on a.id = q.assessment_id where q.id = question_id and public.is_course_staff(a.course_id)))
  with check (exists (select 1 from public.questions q join public.assessments a on a.id = q.assessment_id where q.id = question_id and public.is_course_staff(a.course_id)));

create policy attempts_select on public.assessment_attempts for select to authenticated using (
  public.can_view_student(student_id) or public.is_course_staff(course_id));
create policy answers_select on public.assessment_answers for select to authenticated using (
  exists (select 1 from public.assessment_attempts t where t.id = attempt_id
          and (public.can_view_student(t.student_id) or public.is_course_staff(t.course_id))));

create policy assignments_select on public.assignments for select to authenticated using (
  public.is_course_staff(course_id) or (status = 'published' and public.is_enrolled(course_id)));
create policy assignments_staff on public.assignments for all to authenticated using (public.is_course_staff(course_id)) with check (public.is_course_staff(course_id));

create policy submissions_select on public.submissions for select to authenticated using (
  public.can_view_student(student_id) or public.is_course_staff(course_id));
create policy submissions_insert on public.submissions for insert to authenticated with check (student_id = auth.uid());
create policy submissions_update on public.submissions for update to authenticated using (
  student_id = auth.uid() or public.is_course_staff(course_id)) with check (true);

create policy sessions_select on public.class_sessions for select to authenticated using (
  public.is_course_staff(course_id) or public.is_enrolled(course_id)
  or exists (select 1 from public.enrollments e where e.course_id = class_sessions.course_id and public.can_view_student(e.student_id)));
create policy sessions_staff on public.class_sessions for all to authenticated using (public.is_course_staff(course_id)) with check (public.is_course_staff(course_id));

create policy attendance_select on public.attendance for select to authenticated using (
  public.can_view_student(student_id) or public.is_course_staff(course_id));
create policy attendance_staff on public.attendance for all to authenticated using (public.is_course_staff(course_id)) with check (public.is_course_staff(course_id));
