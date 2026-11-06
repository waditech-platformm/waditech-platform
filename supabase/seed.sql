-- =====================================================================
-- WadiTech Academy — DEVELOPMENT SEED (FICTIONAL TEST DATA ONLY)
-- Every person, price, date, article and event below is invented for testing.
-- Rows are flagged is_test_data = true and the UI shows a "Demo data" badge for them.
-- NEVER load this file into production.
-- Demo password for every account: Demo-Pass-2026!
-- =====================================================================
begin;

-- ---------- demo accounts ----------
with u(id, email, name, account_type) as (values
  ('00000000-0000-4000-a000-000000000001'::uuid, 'superadmin@demo.waditech.local', 'Demo Super Admin', 'student'),
  ('00000000-0000-4000-a000-000000000002'::uuid, 'admin@demo.waditech.local',      'Demo Admin', 'student'),
  ('00000000-0000-4000-a000-000000000003'::uuid, 'trainer@demo.waditech.local',    'Demo Trainer Lina', 'student'),
  ('00000000-0000-4000-a000-000000000004'::uuid, 'trainer2@demo.waditech.local',   'Demo Trainer Kareem', 'student'),
  ('00000000-0000-4000-a000-000000000005'::uuid, 'student@demo.waditech.local',    'Demo Student Omar', 'student'),
  ('00000000-0000-4000-a000-000000000006'::uuid, 'student2@demo.waditech.local',   'Demo Student Sara', 'student'),
  ('00000000-0000-4000-a000-000000000007'::uuid, 'parent@demo.waditech.local',     'Demo Parent Huda', 'parent'),
  ('00000000-0000-4000-a000-000000000008'::uuid, 'coordinator@demo.waditech.local','Demo School Coordinator', 'student'),
  ('00000000-0000-4000-a000-000000000009'::uuid, 'student3@demo.waditech.local',   'Demo Student Yazan', 'student'),
  ('00000000-0000-4000-a000-000000000010'::uuid, 'parent2@demo.waditech.local',    'Demo Parent (unlinked)', 'parent')
)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('Demo-Pass-2026!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', name, 'account_type', account_type),
  now(), now(), '', '', '', '', '', '', '', ''
from u;

insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select id::text, id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now()
from auth.users where email like '%@demo.waditech.local';

update public.profiles set is_test_data = true where id in (select id from auth.users where email like '%@demo.waditech.local');
update public.profiles set family_link_code = 'OMAR2026' where id = '00000000-0000-4000-a000-000000000005';
update public.profiles set family_link_code = 'SARA2026' where id = '00000000-0000-4000-a000-000000000006';

-- privileged roles are granted here directly by the trusted seed session (never through signup)
delete from public.user_roles where user_id in ('00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000002',
  '00000000-0000-4000-a000-000000000003','00000000-0000-4000-a000-000000000004','00000000-0000-4000-a000-000000000008');
insert into public.user_roles(user_id, role) values
  ('00000000-0000-4000-a000-000000000001','super_admin'),
  ('00000000-0000-4000-a000-000000000002','admin'),
  ('00000000-0000-4000-a000-000000000003','trainer'),
  ('00000000-0000-4000-a000-000000000004','trainer'),
  ('00000000-0000-4000-a000-000000000008','school_coordinator');

-- ---------- organization (fictional school) ----------
insert into public.organizations(id, name, name_ar, slug, type, city, contact_email, is_test_data) values
  ('0a000000-0000-4000-a000-000000000001','Demo Model School (fictional)','مدرسة تجريبية (وهمية)','demo-model-school','school','Amman','office@demo-school.example', true),
  ('0a000000-0000-4000-a000-000000000002','Second Demo School (fictional)','مدرسة تجريبية ثانية (وهمية)','second-demo-school','school','Irbid','office@demo-school2.example', true);
insert into public.organization_members(organization_id, user_id, member_role) values
  ('0a000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000008','coordinator'),
  ('0a000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000009','student'),
  ('0a000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000003','trainer'),
  ('0a000000-0000-4000-a000-000000000002','00000000-0000-4000-a000-000000000006','student');

insert into public.parent_student_links(parent_id, student_id, status, verified_at) values
  ('00000000-0000-4000-a000-000000000007','00000000-0000-4000-a000-000000000005','verified', now());

-- ---------- programs (tracks) ----------
insert into public.programs(id, slug, title_en, title_ar, summary_en, summary_ar, category, position, status, is_test_data, cover_url) values
 ('0b000000-0000-4000-a000-000000000001','robotics-track','Robotics Track','مسار الروبوتات','Design, build and program robots — from first motors to competition-grade machines.','صمّم وابنِ وبرمج الروبوتات من أول محرك حتى روبوتات المسابقات.','robotics',1,'published',true,'/media/photos/projects-42.webp'),
 ('0b000000-0000-4000-a000-000000000002','ai-track','Artificial Intelligence Track','مسار الذكاء الاصطناعي','Understand how machines learn and build your first AI projects responsibly.','افهم كيف تتعلم الآلات وابنِ أول مشاريعك في الذكاء الاصطناعي بمسؤولية.','ai',2,'published',true,'/media/photos/classroom-52.webp'),
 ('0b000000-0000-4000-a000-000000000003','programming-track','Programming Track','مسار البرمجة','Python, C++ and the web — real code, real problem solving.','بايثون و++C والويب: كود حقيقي وحل مشكلات حقيقي.','programming',3,'published',true,'/media/photos/projects-51.webp'),
 ('0b000000-0000-4000-a000-000000000004','makers-track','Electronics & Makers Track','مسار الإلكترونيات والصناعة','Arduino, IoT, drones and 3D printing for young makers.','أردوينو وإنترنت الأشياء والطائرات المسيّرة والطباعة ثلاثية الأبعاد.','electronics',4,'published',true,'/media/photos/projects-20.webp');

-- ---------- courses ----------
insert into public.courses(id, program_id, slug, title_en, title_ar, summary_en, summary_ar, description_en, description_ar, category, level, delivery_mode, availability,
  age_min, age_max, duration_weeks, hours_total, price_amount, currency, capacity, thumbnail_url, cover_url, preview_video_url, outcomes_en, outcomes_ar, requirements_en, requirements_ar, faqs, featured, status, published_at, is_test_data) values
 ('0c000000-0000-4000-a000-000000000001','0b000000-0000-4000-a000-000000000001','robotics-foundations',
  'Robotics Foundations','أساسيات الروبوتات',
  'Build and program your first robot with sensors, motors and logic.','ابنِ وبرمج أول روبوت لك باستخدام الحساسات والمحركات والمنطق.',
  'A hands-on introduction to robotics. Students assemble a mobile robot, learn how sensors and motors work together, and program behaviours step by step — finishing with a mini challenge.',
  'مقدمة عملية في الروبوتات: يجمّع الطلاب روبوتًا متحركًا، ويتعلمون كيف تعمل الحساسات والمحركات معًا، ويبرمجون سلوكياته خطوة بخطوة، وينتهي البرنامج بتحدٍّ صغير.',
  'robotics','beginner','in_person','open',9,13,8,24,0,'JOD',20,'/media/photos/projects-42-sm.webp','/media/photos/projects-42.webp','/media/videos/clip-4.mp4',
  array['Explain how sensors, controllers and actuators interact','Assemble and wire a mobile robot safely','Program sequences, loops and conditions','Debug a robot that does not behave as expected'],
  array['شرح كيفية تفاعل الحساسات والمتحكمات والمحركات','تجميع روبوت متحرك وتوصيله بأمان','برمجة التسلسل والتكرار والشروط','اكتشاف أخطاء روبوت لا يعمل كما هو متوقع'],
  array['No prior experience needed','Curiosity and teamwork'], array['لا تحتاج خبرة سابقة','الفضول والعمل بروح الفريق'],
  '[{"q_en":"Do students need their own kit?","q_ar":"هل يحتاج الطالب إلى عدة خاصة؟","a_en":"No. Kits are provided during sessions (demo answer).","a_ar":"لا، توفَّر العدد أثناء الحصص (إجابة تجريبية)."}]',
  true,'published',now(),true),
 ('0c000000-0000-4000-a000-000000000002','0b000000-0000-4000-a000-000000000003','python-for-young-coders',
  'Python for Young Coders','بايثون للمبرمجين الصغار',
  'Learn real programming with Python through games, puzzles and mini projects.','تعلّم البرمجة الحقيقية ببايثون من خلال الألعاب والألغاز والمشاريع الصغيرة.',
  'Students write real Python from day one: variables, decisions, loops, functions and lists — then combine them into small projects they can show.',
  'يكتب الطلاب كود بايثون حقيقيًا من اليوم الأول: المتغيرات والقرارات والتكرار والدوال والقوائم، ثم يجمعونها في مشاريع صغيرة يعرضونها.',
  'programming','beginner','hybrid','open',11,16,10,30,85,'JOD',18,'/media/photos/projects-51-sm.webp','/media/photos/projects-51.webp',null,
  array['Write and run Python programs','Use variables, conditions and loops','Break problems into functions','Build and present a mini project'],
  array['كتابة برامج بايثون وتشغيلها','استخدام المتغيرات والشروط والتكرار','تقسيم المشكلات إلى دوال','بناء مشروع صغير وعرضه'],
  array['Basic computer use','A laptop for online sessions'], array['استخدام أساسي للحاسوب','حاسوب محمول للحصص عن بعد'],
  '[]', true,'published',now(),true),
 ('0c000000-0000-4000-a000-000000000003','0b000000-0000-4000-a000-000000000002','ai-explorers',
  'AI Explorers','مستكشفو الذكاء الاصطناعي',
  'Discover how AI sees, hears and decides — and train your own model.','اكتشف كيف يرى الذكاء الاصطناعي ويسمع ويقرر، ودرّب نموذجك الخاص.',
  'An age-appropriate introduction to machine learning: data, training, testing and fairness, using visual no-code tools before moving to simple Python.',
  'مقدمة مناسبة للعمر في تعلم الآلة: البيانات والتدريب والاختبار والعدالة، باستخدام أدوات مرئية بدون كود ثم بايثون بسيط.',
  'ai','beginner','in_person','open',12,17,6,18,95,'JOD',16,'/media/photos/classroom-52-sm.webp','/media/photos/classroom-52.webp',null,
  array['Describe what machine learning is','Collect and label a small dataset','Train and test an image classifier','Discuss responsible AI'],
  array['وصف مفهوم تعلم الآلة','جمع مجموعة بيانات صغيرة وتصنيفها','تدريب مصنّف صور واختباره','مناقشة الاستخدام المسؤول للذكاء الاصطناعي'],
  array['Comfortable reading English or Arabic instructions'], array['القدرة على قراءة التعليمات بالعربية أو الإنجليزية'],
  '[]', true,'published',now(),true),
 ('0c000000-0000-4000-a000-000000000004','0b000000-0000-4000-a000-000000000004','arduino-electronics',
  'Arduino & Electronics','أردوينو والإلكترونيات',
  'Circuits, sensors and microcontrollers — simulate in Wokwi, then build for real.','الدوائر والحساسات والمتحكمات الدقيقة: محاكاة في Wokwi ثم بناء حقيقي.',
  'Students learn safe circuit building, read sensors and control outputs with Arduino, practising first in an online simulator.',
  'يتعلم الطلاب بناء الدوائر بأمان وقراءة الحساسات والتحكم بالمخرجات باستخدام أردوينو، مع التدريب أولًا على محاكٍ إلكتروني.',
  'electronics','intermediate','in_person','waitlist',12,18,8,24,110,'JOD',14,'/media/photos/projects-20-sm.webp','/media/photos/projects-20.webp',null,
  array['Build circuits on a breadboard','Program Arduino inputs and outputs','Simulate projects in Wokwi'], array['بناء الدوائر على لوحة التجارب','برمجة مداخل ومخارج أردوينو','محاكاة المشاريع في Wokwi'],
  array['Robotics Foundations or equivalent'], array['أساسيات الروبوتات أو ما يعادلها'], '[]', false,'published',now(),true),
 ('0c000000-0000-4000-a000-000000000005','0b000000-0000-4000-a000-000000000004','drones-and-flight',
  'Drones & Flight Systems','الطائرات المسيّرة وأنظمة الطيران',
  'How drones fly, stay stable and stay safe — with supervised practice.','كيف تطير الطائرات المسيّرة وتحافظ على توازنها وسلامتها، مع تدريب تحت الإشراف.',
  'Physics of flight, flight controllers, safety rules and supervised simulator and indoor practice.',
  'فيزياء الطيران ووحدات التحكم وقواعد السلامة والتدريب على المحاكي وفي الأماكن المغلقة تحت الإشراف.',
  'drones','intermediate','in_person','coming_soon',14,18,6,18,150,'JOD',10,'/media/photos/projects-64-sm.webp','/media/photos/projects-64.webp',null,
  array['Explain lift, thrust and stability','Follow drone safety procedures'], array['شرح قوة الرفع والدفع والاتزان','اتباع إجراءات سلامة الطائرات المسيّرة'],
  array['Age 14+'], array['العمر 14 سنة فأكثر'], '[]', false,'published',now(),true),
 ('0c000000-0000-4000-a000-000000000006','0b000000-0000-4000-a000-000000000003','cyber-safety-ctf',
  'Cybersecurity Basics & CTF','أساسيات الأمن السيبراني وتحديات CTF',
  'Think like a defender: passwords, networks and safe capture-the-flag puzzles.','فكّر كمدافع: كلمات المرور والشبكات وألغاز CTF آمنة.',
  'Ethical, isolated exercises on digital safety, encryption basics and puzzle-style challenges. No attacks on real systems.',
  'تمارين أخلاقية ومعزولة عن السلامة الرقمية وأساسيات التشفير وتحديات على شكل ألغاز، دون أي هجوم على أنظمة حقيقية.',
  'cybersecurity','beginner','online','open',13,18,6,12,60,'USD',25,'/media/photos/projects-36-sm.webp','/media/photos/projects-36.webp',null,
  array['Create strong authentication habits','Explain basic encryption','Solve beginner CTF challenges ethically'], array['بناء عادات قوية للمصادقة','شرح أساسيات التشفير','حل تحديات CTF للمبتدئين بشكل أخلاقي'],
  array['Laptop with a modern browser'], array['حاسوب محمول ومتصفح حديث'], '[]', false,'published',now(),true),
 ('0c000000-0000-4000-a000-000000000007','0b000000-0000-4000-a000-000000000004','3d-design-printing',
  '3D Design & Printing','التصميم والطباعة ثلاثية الأبعاد',
  'From idea to object: model in Tinkercad and print your design.','من الفكرة إلى المجسم: صمّم في Tinkercad واطبع تصميمك.',
  'Students learn 3D modelling fundamentals and printing workflow, producing a functional part.',
  'يتعلم الطلاب أساسيات النمذجة ثلاثية الأبعاد ومراحل الطباعة، وينتجون قطعة وظيفية.',
  '3d_printing','beginner','in_person','open',10,16,4,12,0,'JOD',12,'/media/photos/projects-18-sm.webp','/media/photos/projects-18.webp',null,
  array['Model objects in Tinkercad','Prepare a model for printing'], array['نمذجة المجسمات في Tinkercad','تجهيز النموذج للطباعة'],
  array['None'], array['لا يوجد'], '[]', false,'published',now(),true),
 ('0c000000-0000-4000-a000-000000000008','0b000000-0000-4000-a000-000000000001','competition-robotics',
  'Competition Robotics (Sumo)','روبوتات المسابقات (سومو)',
  'Design, tune and test sumo robots for national-style competitions.','صمّم واضبط واختبر روبوتات السومو لمسابقات بأسلوب البطولات الوطنية.',
  'Advanced team-based programme preparing students for robot sumo: mechanical design, sensor strategy and match tactics.',
  'برنامج متقدم قائم على الفرق لإعداد الطلاب لمسابقات روبوتات السومو: التصميم الميكانيكي واستراتيجية الحساسات وتكتيكات المباراة.',
  'robotics','advanced','in_person','open',13,18,10,40,140,'JOD',12,'/media/photos/competition-29-sm.webp','/media/photos/competition-29.webp','/media/videos/clip-2.mp4',
  array['Design a competitive chassis','Program sensor-based strategies','Work as a competition team'], array['تصميم هيكل تنافسي','برمجة استراتيجيات قائمة على الحساسات','العمل كفريق مسابقات'],
  array['Robotics Foundations'], array['أساسيات الروبوتات'], '[]', true,'published',now(),true),
 ('0c000000-0000-4000-a000-000000000009','0b000000-0000-4000-a000-000000000002','draft-ml-lab',
  'Machine Learning Lab (draft)','مختبر تعلم الآلة (مسودة)', 'Unpublished draft course used for testing.','دورة غير منشورة لأغراض الاختبار.',
  null,null,'ai','advanced','online','closed',15,18,8,24,120,'USD',20,null,null,null,'{}','{}','{}','{}','[]',false,'draft',null,true);

insert into public.course_instructors(course_id, trainer_id, is_lead) values
 ('0c000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000003',true),
 ('0c000000-0000-4000-a000-000000000002','00000000-0000-4000-a000-000000000004',true),
 ('0c000000-0000-4000-a000-000000000003','00000000-0000-4000-a000-000000000004',true),
 ('0c000000-0000-4000-a000-000000000004','00000000-0000-4000-a000-000000000003',true),
 ('0c000000-0000-4000-a000-000000000008','00000000-0000-4000-a000-000000000003',true),
 ('0c000000-0000-4000-a000-000000000006','00000000-0000-4000-a000-000000000004',true),
 ('0c000000-0000-4000-a000-000000000007','00000000-0000-4000-a000-000000000003',true);

-- ---------- curriculum: Robotics Foundations (fully built) ----------
insert into public.course_modules(id, course_id, title_en, title_ar, position) values
 ('0d000000-0000-4000-a000-000000000001','0c000000-0000-4000-a000-000000000001','Meet your robot','تعرّف على روبوتك',1),
 ('0d000000-0000-4000-a000-000000000002','0c000000-0000-4000-a000-000000000001','Sensors & decisions','الحساسات واتخاذ القرار',2),
 ('0d000000-0000-4000-a000-000000000003','0c000000-0000-4000-a000-000000000002','Python basics','أساسيات بايثون',1),
 ('0d000000-0000-4000-a000-000000000004','0c000000-0000-4000-a000-000000000003','What is AI?','ما هو الذكاء الاصطناعي؟',1);

insert into public.assessments(id, course_id, title_en, title_ar, description_en, description_ar, pass_percent, max_attempts) values
 ('0e000000-0000-4000-a000-000000000001','0c000000-0000-4000-a000-000000000001','Robot parts check','اختبار أجزاء الروبوت','Five quick questions about how robots sense and act.','خمسة أسئلة سريعة عن كيف تستشعر الروبوتات وتتحرك.',60,3),
 ('0e000000-0000-4000-a000-000000000002','0c000000-0000-4000-a000-000000000002','Python warm-up quiz','اختبار تمهيدي في بايثون','Variables and printing.','المتغيرات والطباعة.',50,null);

insert into public.questions(id, assessment_id, kind, prompt_en, prompt_ar, explanation_en, explanation_ar, points, position) values
 ('0f000000-0000-4000-a000-000000000001','0e000000-0000-4000-a000-000000000001','single_choice','Which part lets a robot measure distance to an obstacle?','أي جزء يسمح للروبوت بقياس المسافة إلى عائق؟','Ultrasonic sensors send sound pulses and time the echo.','الحساس فوق الصوتي يرسل نبضات صوتية ويقيس زمن الصدى.',1,1),
 ('0f000000-0000-4000-a000-000000000002','0e000000-0000-4000-a000-000000000001','single_choice','What is the job of the microcontroller?','ما وظيفة المتحكم الدقيق؟','It runs the program that reads sensors and controls motors.','يشغّل البرنامج الذي يقرأ الحساسات ويتحكم بالمحركات.',1,2),
 ('0f000000-0000-4000-a000-000000000003','0e000000-0000-4000-a000-000000000001','multiple_choice','Which of these are actuators? (choose all)','أي مما يلي يُعدّ مشغلات (محركات)؟ (اختر كل ما ينطبق)','Motors and servos create movement; a light sensor only measures.','المحركات والسيرفو تُحدث الحركة، أما حساس الضوء فيقيس فقط.',2,3),
 ('0f000000-0000-4000-a000-000000000004','0e000000-0000-4000-a000-000000000001','short_answer','Type the name of the loop that repeats forever in Arduino code.','اكتب اسم الدالة التي تتكرر إلى الأبد في كود أردوينو.','Arduino sketches use setup() once and loop() repeatedly.','يستخدم أردوينو setup مرة واحدة و loop بشكل متكرر.',1,4),
 ('0f000000-0000-4000-a000-000000000005','0e000000-0000-4000-a000-000000000002','single_choice','What does print("Hi") do?','ماذا يفعل print("Hi")؟',null,null,1,1),
 ('0f000000-0000-4000-a000-000000000006','0e000000-0000-4000-a000-000000000002','short_answer','In one sentence: why do we use variables?','في جملة واحدة: لماذا نستخدم المتغيرات؟',null,null,1,2);

insert into public.answer_options(id, question_id, label_en, label_ar, position) values
 ('1a000000-0000-4000-a000-000000000001','0f000000-0000-4000-a000-000000000001','Ultrasonic sensor','حساس فوق صوتي',1),
 ('1a000000-0000-4000-a000-000000000002','0f000000-0000-4000-a000-000000000001','Battery','البطارية',2),
 ('1a000000-0000-4000-a000-000000000003','0f000000-0000-4000-a000-000000000001','Wheel','العجلة',3),
 ('1a000000-0000-4000-a000-000000000004','0f000000-0000-4000-a000-000000000002','Stores electricity','يخزن الكهرباء',1),
 ('1a000000-0000-4000-a000-000000000005','0f000000-0000-4000-a000-000000000002','Runs the program and makes decisions','يشغّل البرنامج ويتخذ القرارات',2),
 ('1a000000-0000-4000-a000-000000000006','0f000000-0000-4000-a000-000000000002','Measures light','يقيس الضوء',3),
 ('1a000000-0000-4000-a000-000000000007','0f000000-0000-4000-a000-000000000003','DC motor','محرك تيار مستمر',1),
 ('1a000000-0000-4000-a000-000000000008','0f000000-0000-4000-a000-000000000003','Servo motor','محرك سيرفو',2),
 ('1a000000-0000-4000-a000-000000000009','0f000000-0000-4000-a000-000000000003','Light sensor','حساس الضوء',3),
 ('1a000000-0000-4000-a000-000000000010','0f000000-0000-4000-a000-000000000005','Shows Hi on the screen','يعرض Hi على الشاشة',1),
 ('1a000000-0000-4000-a000-000000000011','0f000000-0000-4000-a000-000000000005','Deletes a file','يحذف ملفًا',2);

insert into public.question_keys(question_id, correct_option_ids, accepted_answers) values
 ('0f000000-0000-4000-a000-000000000001', array['1a000000-0000-4000-a000-000000000001'::uuid], '{}'),
 ('0f000000-0000-4000-a000-000000000002', array['1a000000-0000-4000-a000-000000000005'::uuid], '{}'),
 ('0f000000-0000-4000-a000-000000000003', array['1a000000-0000-4000-a000-000000000007'::uuid,'1a000000-0000-4000-a000-000000000008'::uuid], '{}'),
 ('0f000000-0000-4000-a000-000000000004', '{}', array['loop','loop()','void loop()']),
 ('0f000000-0000-4000-a000-000000000005', array['1a000000-0000-4000-a000-000000000010'::uuid], '{}');
-- q6 has no key on purpose -> manual review workflow

insert into public.assignments(id, course_id, title_en, title_ar, instructions_en, instructions_ar, due_at, max_points) values
 ('1b000000-0000-4000-a000-000000000001','0c000000-0000-4000-a000-000000000001','Design an obstacle-avoiding behaviour','صمّم سلوكًا لتفادي العوائق',
  'Describe (or paste your code for) a robot behaviour that stops and turns when an obstacle is closer than 15 cm. Add a link to a photo or video if you have one.',
  'صف (أو الصق الكود الخاص بـ) سلوك روبوت يتوقف ويستدير عندما يقترب العائق لأقل من 15 سم. أضف رابطًا لصورة أو فيديو إن وجد.',
  now() + interval '21 days', 20);

insert into public.labs(id, slug, category, title_en, title_ar, summary_en, summary_ar, instructions_en, instructions_ar, provider, launch_url, embed_allowed, level, status, position) values
 ('1c000000-0000-4000-a000-000000000001','arduino-blink-wokwi','electronics','Arduino Blink & Traffic Light','أردوينو: وميض وإشارة مرور','Simulate an Arduino Uno and build a traffic light.','حاكِ أردوينو أونو وابنِ إشارة مرور.',
  '1. Launch Wokwi and create a new Arduino Uno project. 2. Add three LEDs with resistors. 3. Program the red–yellow–green sequence. 4. Save the project and submit its share link.',
  '١. افتح Wokwi وأنشئ مشروع Arduino Uno جديدًا. ٢. أضف ثلاثة مصابيح LED مع مقاومات. ٣. برمج تسلسل الأحمر ثم الأصفر ثم الأخضر. ٤. احفظ المشروع وأرسل رابط المشاركة.',
  'wokwi','https://wokwi.com/projects/new/arduino-uno',false,'beginner','published',1),
 ('1c000000-0000-4000-a000-000000000002','robot-logic-challenges','robotics','Robot Logic Challenges','تحديات منطق الروبوت','Plan robot paths with sequences and conditions.','خطّط مسارات الروبوت بالتسلسل والشروط.',
  'Work through the challenge sheet from your trainer, then submit a link to your solution (document, video or code).',
  'حلّ تحديات ورقة العمل من المدرب، ثم أرسل رابط حلك (مستند أو فيديو أو كود).','internal',null,false,'beginner','published',2),
 ('1c000000-0000-4000-a000-000000000003','python-playground','programming','Python Playground','ساحة بايثون','Practise Python in your browser.','تدرّب على بايثون في المتصفح.',
  'Open the online Python environment, solve the exercise from your lesson, and submit a share link.','افتح بيئة بايثون على الإنترنت، وحلّ تمرين الدرس، ثم أرسل رابط المشاركة.',
  'python_online','https://www.online-python.com/',false,'beginner','published',3),
 ('1c000000-0000-4000-a000-000000000004','teachable-machine-intro','ai','Train an Image Classifier','درّب مصنّف صور','Use Teachable Machine to train a model with your own examples.','استخدم Teachable Machine لتدريب نموذج بأمثلتك الخاصة.',
  'Create an image project with at least two classes, train it, test it with new images, and export the shareable link.','أنشئ مشروع صور بصنفين على الأقل، ودرّبه، واختبره بصور جديدة، ثم صدّر رابط المشاركة.',
  'teachable_machine','https://teachablemachine.withgoogle.com/',false,'beginner','published',4),
 ('1c000000-0000-4000-a000-000000000005','cyber-ctf-starter','cybersecurity','CTF Starter Puzzles','ألغاز CTF للمبتدئين','Safe, offline-style puzzles on encoding and passwords.','ألغاز آمنة عن الترميز وكلمات المرور.',
  'Solve the puzzles your trainer assigns in the isolated exercise environment. Never test techniques on real systems.','حلّ الألغاز التي يحددها المدرب داخل بيئة التمارين المعزولة. لا تجرّب أي أسلوب على أنظمة حقيقية.',
  'internal',null,false,'beginner','published',5),
 ('1c000000-0000-4000-a000-000000000006','tinkercad-keychain','3d_design','Design a 3D Keychain','صمّم ميدالية ثلاثية الأبعاد','Model a printable keychain in Tinkercad.','صمّم ميدالية قابلة للطباعة في Tinkercad.',
  'Sign in to Tinkercad with your class code, design a keychain under 5 cm, and share the design link.','ادخل إلى Tinkercad برمز الصف، وصمّم ميدالية أقل من 5 سم، وشارك رابط التصميم.',
  'tinkercad','https://www.tinkercad.com/',false,'beginner','published',6);

insert into public.lessons(id, module_id, course_id, title_en, title_ar, type, body_en, body_ar, video_url, duration_minutes, position, is_preview, completion_rule, assessment_id, assignment_id, lab_id) values
 ('1d000000-0000-4000-a000-000000000001','0d000000-0000-4000-a000-000000000001','0c000000-0000-4000-a000-000000000001','Welcome: what is a robot?','مرحبًا: ما هو الروبوت؟','text',
  E'A robot is a machine that can **sense**, **think** and **act**.\n\n- **Sense**: sensors measure the world (distance, light, touch).\n- **Think**: a microcontroller runs your program.\n- **Act**: motors and servos move the robot.\n\nIn this course you will build all three.',
  E'الروبوت آلة تستطيع أن **تستشعر** و**تفكر** و**تتحرك**.\n\n- **الاستشعار**: الحساسات تقيس العالم (المسافة، الضوء، اللمس).\n- **التفكير**: المتحكم الدقيق يشغّل برنامجك.\n- **الحركة**: المحركات والسيرفو تحرك الروبوت.\n\nفي هذه الدورة ستبني الأجزاء الثلاثة.',
  null,10,1,true,'view',null,null,null),
 ('1d000000-0000-4000-a000-000000000002','0d000000-0000-4000-a000-000000000001','0c000000-0000-4000-a000-000000000001','Robots in action (video)','الروبوتات أثناء العمل (فيديو)','video',
  'Watch students test robots in the lab. Notice what each robot senses before it moves.','شاهد الطلاب وهم يختبرون الروبوتات في المختبر. لاحظ ما يستشعره كل روبوت قبل أن يتحرك.',
  '/media/videos/clip-1.mp4',3,2,false,'video_90',null,null,null),
 ('1d000000-0000-4000-a000-000000000003','0d000000-0000-4000-a000-000000000001','0c000000-0000-4000-a000-000000000001','Simulate your first circuit','حاكِ أول دائرة لك','lab',
  'Open the Wokwi lab and blink an LED. Submit your share link from the Labs page.','افتح مختبر Wokwi واجعل مصباح LED يومض. أرسل رابط المشاركة من صفحة المختبرات.',
  null,20,3,false,'view',null,null,'1c000000-0000-4000-a000-000000000001'),
 ('1d000000-0000-4000-a000-000000000004','0d000000-0000-4000-a000-000000000002','0c000000-0000-4000-a000-000000000001','How sensors decide','كيف تساعد الحساسات في اتخاذ القرار','text',
  E'Robots make decisions with **if / else**:\n\n```\nif distance < 15:\n    stop()\n    turn_left()\nelse:\n    forward()\n```\n\nThe robot checks the sensor many times per second.',
  E'تتخذ الروبوتات قراراتها باستخدام **if / else**:\n\n```\nif distance < 15:\n    stop()\n    turn_left()\nelse:\n    forward()\n```\n\nيفحص الروبوت الحساس مرات كثيرة في الثانية.',
  null,15,1,false,'view',null,null,null),
 ('1d000000-0000-4000-a000-000000000005','0d000000-0000-4000-a000-000000000002','0c000000-0000-4000-a000-000000000001','Quiz: robot parts','اختبار: أجزاء الروبوت','quiz',
  'Pass with 60% or more to complete this lesson.','اجتز الاختبار بنسبة 60% أو أكثر لإكمال هذا الدرس.',null,10,2,false,'quiz_pass','0e000000-0000-4000-a000-000000000001',null,null),
 ('1d000000-0000-4000-a000-000000000006','0d000000-0000-4000-a000-000000000002','0c000000-0000-4000-a000-000000000001','Assignment: avoid the obstacle','واجب: تفادي العائق','assignment',
  'Submit your design. Your trainer will review it.','أرسل تصميمك وسيراجعه المدرب.',null,30,3,false,'assignment_submitted',null,'1b000000-0000-4000-a000-000000000001',null),
 ('1d000000-0000-4000-a000-000000000007','0d000000-0000-4000-a000-000000000003','0c000000-0000-4000-a000-000000000002','Your first program','برنامجك الأول','text',
  E'Open the Python playground and type:\n\n```python\nname = "WadiTech"\nprint("Hello", name)\n```','افتح ساحة بايثون واكتب:\n\n```python\nname = "WadiTech"\nprint("Hello", name)\n```',null,15,1,true,'view',null,null,null),
 ('1d000000-0000-4000-a000-000000000008','0d000000-0000-4000-a000-000000000003','0c000000-0000-4000-a000-000000000002','Warm-up quiz','الاختبار التمهيدي','quiz','Pass with 50%.','اجتز بنسبة 50%.',null,5,2,false,'quiz_pass','0e000000-0000-4000-a000-000000000002',null,null),
 ('1d000000-0000-4000-a000-000000000009','0d000000-0000-4000-a000-000000000004','0c000000-0000-4000-a000-000000000003','Machines that learn','آلات تتعلم','text',
  'AI systems learn patterns from examples (data). Better, fairer data usually means better results.','تتعلم أنظمة الذكاء الاصطناعي الأنماط من الأمثلة (البيانات). البيانات الأفضل والأكثر عدالة تعني غالبًا نتائج أفضل.',null,10,1,true,'view',null,null,null);

insert into public.lesson_resources(lesson_id, title, url, kind, position) values
 ('1d000000-0000-4000-a000-000000000004','Sample obstacle-avoidance pseudocode','https://wokwi.com/projects/new/arduino-uno','link',1);

insert into public.class_sessions(id, course_id, title, starts_at, ends_at, location) values
 ('1e000000-0000-4000-a000-000000000001','0c000000-0000-4000-a000-000000000001','Session 1 (demo)', now() - interval '7 days', now() - interval '7 days' + interval '2 hours','Lab A (demo)'),
 ('1e000000-0000-4000-a000-000000000002','0c000000-0000-4000-a000-000000000001','Session 2 (demo)', now() + interval '2 days', now() + interval '2 days' + interval '2 hours','Lab A (demo)');

-- enrollments (bypass the function in the trusted seed session)
insert into public.enrollments(id, course_id, student_id, status, source, activated_at, organization_id) values
 ('1f000000-0000-4000-a000-000000000001','0c000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000005','active','self', now() - interval '10 days', null),
 ('1f000000-0000-4000-a000-000000000002','0c000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000006','active','self', now() - interval '10 days', '0a000000-0000-4000-a000-000000000002'),
 ('1f000000-0000-4000-a000-000000000003','0c000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000009','active','school', now() - interval '9 days', '0a000000-0000-4000-a000-000000000001'),
 ('1f000000-0000-4000-a000-000000000004','0c000000-0000-4000-a000-000000000003','00000000-0000-4000-a000-000000000009','completed','school', now() - interval '60 days', '0a000000-0000-4000-a000-000000000001');
update public.enrollments set completed_at = now() - interval '5 days' where id = '1f000000-0000-4000-a000-000000000004';

insert into public.lesson_progress(student_id, lesson_id, course_id, status, completed_at) values
 ('00000000-0000-4000-a000-000000000005','1d000000-0000-4000-a000-000000000001','0c000000-0000-4000-a000-000000000001','completed', now() - interval '9 days'),
 ('00000000-0000-4000-a000-000000000009','1d000000-0000-4000-a000-000000000009','0c000000-0000-4000-a000-000000000003','completed', now() - interval '20 days');

insert into public.attendance(session_id, student_id, course_id, status) values
 ('1e000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000005','0c000000-0000-4000-a000-000000000001','present'),
 ('1e000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000006','0c000000-0000-4000-a000-000000000001','late'),
 ('1e000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000009','0c000000-0000-4000-a000-000000000001','present');

insert into public.submissions(assignment_id, course_id, student_id, body_text, link_url) values
 ('1b000000-0000-4000-a000-000000000001','0c000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000006',
  'If the ultrasonic reading is below 15 cm the robot stops, reverses for half a second and turns right. (demo submission)', null);

insert into public.certificates(certificate_number, enrollment_id, student_id, course_id, student_name, course_title_en, course_title_ar, hours_total, completion_date, issued_by, is_test_data) values
 ('WT-2026-DEMO0001','1f000000-0000-4000-a000-000000000004','00000000-0000-4000-a000-000000000009','0c000000-0000-4000-a000-000000000003','Demo Student Yazan','AI Explorers','مستكشفو الذكاء الاصطناعي',18, current_date - 5,'00000000-0000-4000-a000-000000000004', true);

-- ---------- news / events / competitions / scholarships ----------
insert into public.news_articles(slug, title_en, title_ar, excerpt_en, excerpt_ar, body_en, body_ar, cover_url, category, status, published_at, featured, is_breaking, is_test_data) values
 ('demo-sumo-championship-recap','[Demo] Students compete in a national sumo robot championship','[تجريبي] طلابنا يشاركون في بطولة وطنية لروبوتات السومو',
  'Sample article: a recap of a robot sumo competition day.','مقال تجريبي: ملخص يوم مسابقة روبوتات السومو.',
  E'This is placeholder text for a news article. Replace it with the approved WadiTech story before publishing.\n\nTeams prepared their robots for weeks, tested sensor strategies and learned how to adapt between rounds.',
  E'هذا نص تجريبي لمقال إخباري. استبدله بالقصة المعتمدة من وادي تك قبل النشر.\n\nجهّزت الفرق روبوتاتها لأسابيع، واختبرت استراتيجيات الحساسات، وتعلمت كيف تتكيف بين الجولات.',
  '/media/photos/competition-29.webp','achievement','published', now() - interval '3 days', true, false, true),
 ('demo-new-ai-programme','[Demo] New AI Explorers programme opens for registration','[تجريبي] فتح باب التسجيل في برنامج مستكشفي الذكاء الاصطناعي',
  'Sample announcement for the AI Explorers course.','إعلان تجريبي عن دورة مستكشفي الذكاء الاصطناعي.',
  'Placeholder announcement body. Dates and prices shown on the platform are demo values.','نص إعلان تجريبي. التواريخ والأسعار المعروضة قيم تجريبية.',
  '/media/photos/classroom-52.webp','announcement','published', now() - interval '1 day', false, true, true),
 ('demo-drone-showcase','[Demo] Student drone projects showcased at a university exhibition','[تجريبي] عرض مشاريع طلابية للطائرات المسيّرة في معرض جامعي',
  'Sample article about student drone projects.','مقال تجريبي عن مشاريع الطائرات المسيّرة الطلابية.',
  'Placeholder body text for the drone showcase article.','نص تجريبي لمقال معرض الطائرات المسيّرة.',
  '/media/photos/competition-61.webp','news','published', now() - interval '8 days', false, false, true),
 ('demo-draft-article','[Demo] Draft article (not public)','[تجريبي] مقال مسودة (غير منشور)','Draft.','مسودة.','Draft body.','نص المسودة.',null,'article','draft',null,false,false,true);

insert into public.events(slug, title_en, title_ar, description_en, description_ar, starts_at, ends_at, location_en, location_ar, capacity, status, cover_url, course_id, is_test_data) values
 ('demo-open-lab-day','[Demo] Open Lab Day','[تجريبي] يوم المختبر المفتوح','Families visit the lab, try robots and meet trainers (sample event).','تزور العائلات المختبر وتجرب الروبوتات وتلتقي المدربين (فعالية تجريبية).',
  date_trunc('day', now()) + interval '12 days' + interval '10 hours', date_trunc('day', now()) + interval '12 days' + interval '13 hours','WadiTech Lab, Amman (demo)','مختبر وادي تك، عمّان (تجريبي)',3,'published','/media/brand/lab-entrance.webp',null,true),
 ('demo-python-workshop','[Demo] Python Taster Workshop','[تجريبي] ورشة تعريفية في بايثون','A two-hour taster for ages 11–16 (sample event).','ورشة تعريفية لمدة ساعتين للأعمار 11–16 (فعالية تجريبية).',
  date_trunc('day', now()) + interval '20 days' + interval '16 hours', date_trunc('day', now()) + interval '20 days' + interval '18 hours','Online (demo)','عن بعد (تجريبي)',40,'published','/media/photos/projects-51.webp','0c000000-0000-4000-a000-000000000002',true),
 ('demo-past-exhibition','[Demo] Student Projects Exhibition','[تجريبي] معرض مشاريع الطلاب','A past sample event.','فعالية سابقة تجريبية.',
  now() - interval '30 days', now() - interval '30 days' + interval '4 hours','Amman (demo)','عمّان (تجريبي)',null,'completed','/media/photos/competition-65.webp',null,true);

insert into public.competitions(slug, title_en, title_ar, description_en, description_ar, category, eligibility_en, eligibility_ar, team_min, team_max, age_min, age_max, registration_deadline, event_date, status, cover_url, is_test_data) values
 ('demo-sumo-challenge','[Demo] WadiTech Sumo Challenge','[تجريبي] تحدي وادي تك للسومو','Teams build autonomous sumo robots (sample competition).','تبني الفرق روبوتات سومو ذاتية التشغيل (مسابقة تجريبية).','robotics',
  'Ages 12–18, teams of 2–4.','الأعمار 12–18، فرق من 2 إلى 4.',2,4,12,18, now() + interval '25 days', (now() + interval '40 days')::date,'open','/media/photos/competition-22.webp',true),
 ('demo-ai-for-good','[Demo] AI for Good Mini-Hackathon','[تجريبي] هاكاثون مصغر: الذكاء الاصطناعي من أجل الخير','Propose an AI idea that helps your community (sample).','اقترح فكرة ذكاء اصطناعي تخدم مجتمعك (تجريبي).','ai',
  'Ages 13–18, teams of 1–3.','الأعمار 13–18، فرق من 1 إلى 3.',1,3,13,18, now() + interval '45 days', (now() + interval '60 days')::date,'open','/media/photos/classroom-49.webp',true);

insert into public.scholarships(slug, title_en, title_ar, description_en, description_ar, criteria_en, criteria_ar, coverage_percent, course_id, deadline, status, is_test_data) values
 ('demo-future-innovators','[Demo] Future Innovators Scholarship','[تجريبي] منحة مبتكري المستقبل','Sample scholarship covering part of a programme fee.','منحة تجريبية تغطي جزءًا من رسوم البرنامج.',
  'Motivated students aged 11–17; short statement required.','طلاب متحمسون بعمر 11–17؛ مطلوب بيان قصير.',50,'0c000000-0000-4000-a000-000000000002', now() + interval '30 days','open',true);

insert into public.discount_codes(code, percent_off, max_uses) values ('DEMO10', 10, 100);

insert into public.student_projects(student_id, course_id, title, description, cover_url, visibility, approval_status, is_test_data) values
 ('00000000-0000-4000-a000-000000000009','0c000000-0000-4000-a000-000000000003','[Demo] Recycling sorter classifier','A sample project: an image classifier that sorts plastic, paper and metal.','/media/photos/projects-14.webp','public','approved',true),
 ('00000000-0000-4000-a000-000000000005','0c000000-0000-4000-a000-000000000001','[Demo] Line-following robot','Sample project for portfolio testing.','/media/photos/projects-44.webp','public','approved',true),
 ('00000000-0000-4000-a000-000000000006',null,'[Demo] Smart plant monitor (pending review)','Sample project awaiting approval.','/media/photos/projects-16.webp','public','pending',true);

insert into public.notifications(user_id, kind, title_en, title_ar, body_en, body_ar, link) values
 ('00000000-0000-4000-a000-000000000005','announcement','Welcome to the demo environment','مرحبًا بك في بيئة التجربة','All data you see here is fictional test data.','جميع البيانات هنا بيانات اختبار وهمية.','/dashboard');


-- ---------- 0010: grades, trainer profiles, reviews, library (fictional test data) ----------
update public.courses set grade_min = greatest(1, age_min - 5), grade_max = least(12, age_max - 5) where age_min is not null and age_max is not null;

insert into public.trainer_profiles(trainer_id, slug, display_name_en, display_name_ar, headline_en, headline_ar, bio_en, bio_ar, specialties, years_experience, status, is_test_data) values
 ('00000000-0000-4000-a000-000000000003','demo-lina','Lina (demo)','لينا (تجريبي)','Robotics & electronics trainer (demo)','مدرّبة روبوتات وإلكترونيات (تجريبي)',
  'Fictional demo profile used for testing. Real trainer profiles are written by the trainers and approved by the academy.',
  'ملف تجريبي وهمي لأغراض الاختبار. ملفات المدربين الحقيقية يكتبها المدربون وتوافق عليها الأكاديمية.', '{robotics,electronics,3d_printing}', 6, 'published', true),
 ('00000000-0000-4000-a000-000000000004','demo-kareem','Kareem (demo)','كريم (تجريبي)','Programming & AI trainer (demo)','مدرّب برمجة وذكاء اصطناعي (تجريبي)',
  'Fictional demo profile used for testing.', 'ملف تجريبي وهمي لأغراض الاختبار.', '{programming,ai,cybersecurity}', 4, 'pending', true);

insert into public.course_reviews(course_id, author_id, student_id, author_role, rating, body, locale, status, featured, is_test_data) values
 ('0c000000-0000-4000-a000-000000000003','00000000-0000-4000-a000-000000000009','00000000-0000-4000-a000-000000000009','student',5,
  '[Demo] Fictional test review: the projects were fun and I trained my first image model.','en','approved', true, true);

insert into public.resources(title_en, title_ar, description_en, description_ar, kind, url, category, grade_min, grade_max, course_id, access, status, position, is_test_data) values
 ('[Demo] Arduino pin-out cheat sheet','[تجريبي] ورقة مرجعية لمنافذ أردوينو','Fictional test resource.','مورد تجريبي وهمي.','pdf','https://docs.arduino.cc/hardware/uno-rev3/','electronics',5,12,null,'public','published',1,true),
 ('[Demo] Python practice in the browser','[تجريبي] تدرّب على بايثون في المتصفح','Fictional test resource.','مورد تجريبي وهمي.','link','https://www.python.org/shell/','programming',4,12,null,'registered','published',2,true),
 ('[Demo] Robotics Foundations worksheet','[تجريبي] ورقة عمل أساسيات الروبوتات','Only for students enrolled in Robotics Foundations.','للطلاب المسجّلين في أساسيات الروبوتات فقط.','worksheet','/media/brand/lab-classroom.webp','robotics',4,8,'0c000000-0000-4000-a000-000000000001','enrolled','published',3,true),
 ('[Demo] Draft resource','[تجريبي] مورد مسودة','Not published.','غير منشور.','link','https://example.org/','ai',null,null,null,'public','draft',4,true);

commit;
