-- Seed: the prototype's 9 scholarships, their criteria, documents, steps and notes, plus sample
-- announcements and inquiries. All listings are SAMPLE data (is_sample = true): shown with a
-- "Sample listing" label and never presented as official. Day offsets from the prototype are
-- converted to real dates relative to the seed date (Philippine time).
--
-- No users are seeded. Create the first admin with `npm run seed:admin` (docs/SETUP.md).

set iskolar.skip_audit = 'on';

-- ---------- Providers ----------
insert into public.providers (name, short_name, abbr, color, type, website, is_sample) values
  ('Commission on Higher Education (CHED)', 'Commission on Higher Education', 'CHED', '#1D3E8A', 'government', 'https://ched.gov.ph', false),
  ('UniFAST', 'UniFAST', 'UF', '#6A2C91', 'government', 'https://unifast.gov.ph', false),
  ('DOST Science Education Institute', 'DOST Science Education Institute', 'DOST', '#0B6E8A', 'government', 'https://www.sei.dost.gov.ph', false),
  ('Overseas Workers Welfare Administration (OWWA)', 'Overseas Workers Welfare Administration', 'OWWA', '#B4410C', 'government', 'https://owwa.gov.ph', false),
  ('Bayani Foundation (sample private sponsor)', 'Bayani Foundation', 'BF', '#0F766E', 'private', null, true),
  ('City Scholarship Office (sample LGU)', 'City Scholarship Office', 'LGU', '#4D7C0F', 'local_government', null, true),
  ('Provincial Government (sample)', 'Provincial Government', 'PG', '#9F1239', 'local_government', null, true),
  ('Sample State University (sample school)', 'Sample State University', 'SSU', '#334155', 'school', null, true);

-- ---------- Helper: one scholarship with all its parts ----------
create function pg_temp.seed_scholarship(
  p_slug text, p_provider text, p_name text, p_amount text, p_amount_num integer,
  p_opens integer, p_closes integer, p_checked integer, p_posted integer, p_verified boolean,
  p_location text, p_source_label text, p_source_url text,
  p_summary text, p_duration text, p_renewal text, p_obligations text,
  p_benefits text[], p_notes text[], p_docs text[][], p_steps text[][]
) returns uuid language plpgsql as $$
declare
  today date := (now() at time zone 'Asia/Manila')::date;
  sid uuid;
begin
  insert into public.scholarships (
    slug, provider_id, name, summary, amount_text, amount_num, opens_on, closes_on, location_label,
    source_label, source_url, duration, renewal, obligations, listing_status, verification,
    last_verified_at, published_at, is_sample
  ) values (
    p_slug, (select id from public.providers where name = p_provider), p_name, p_summary, p_amount, p_amount_num,
    today + p_opens, today + p_closes, p_location, p_source_label, p_source_url, p_duration, p_renewal, p_obligations,
    'published', case when p_verified then 'verified' else 'unverified' end::public.verification_status,
    case when p_verified then (today + p_checked)::timestamptz + interval '10 hours' end,
    (today + p_posted)::timestamptz + interval '9 hours', true
  ) returning id into sid;

  insert into public.scholarship_benefits (scholarship_id, position, text)
    select sid, o - 1, b from unnest(p_benefits) with ordinality as t(b, o);
  insert into public.scholarship_notes (scholarship_id, position, text)
    select sid, o - 1, n from unnest(coalesce(p_notes, '{}')) with ordinality as t(n, o);
  if p_docs is not null then
    insert into public.scholarship_documents (scholarship_id, position, name, where_to_get)
      select sid, i - 1, p_docs[i][1], p_docs[i][2] from generate_subscripts(p_docs, 1) i;
  end if;
  if p_steps is not null then
    insert into public.scholarship_steps (scholarship_id, position, title, detail)
      select sid, i - 1, p_steps[i][1], p_steps[i][2] from generate_subscripts(p_steps, 1) i;
  end if;
  return sid;
end $$;

-- ---------- The nine sample scholarships (prototype BASE) ----------

select pg_temp.seed_scholarship(
  'tulong-dunong-program', 'Commission on Higher Education (CHED)', 'Tulong Dunong Program',
  '₱15,000 a year', 15000, -21, 4, -2, -21, true, 'Nationwide', 'ched.gov.ph', 'https://ched.gov.ph',
  'Financial help for students in CHED-recognized schools whose families have limited income.',
  'One academic year', 'Re-apply every academic year. Keep passing grades in all subjects.',
  'No return service. You may be asked to submit grades each semester.',
  array['₱7,500 per semester, released through your school', 'Can be used for tuition, books or daily expenses'],
  array['Enrolled in a CHED-recognized school', 'Not receiving another government scholarship this year'],
  array[
    array['Certificate of Registration (COR)', 'Registrar’s office or your student portal'],
    array['Certificate of Grades for last semester', 'Registrar’s office'],
    array['Proof of income: parents’ ITR or Certificate of Indigency', 'ITR from BIR or the employer; Certificate of Indigency from your barangay hall'],
    array['PSA birth certificate', 'PSA outlet or psaserbilis.com.ph (allow 3 to 7 days for delivery)'],
    array['Valid school ID (photocopy, front and back)', 'Your own ID']
  ],
  array[
    array['Get the application form', 'Download it from the CHED regional office page or ask your school’s scholarship office.'],
    array['Prepare your documents', 'Use the checklist above. Get the Certificate of Indigency early, since barangay halls can be busy near deadlines.'],
    array['Submit to your school’s scholarship coordinator', 'Your school forwards complete applications to the CHED regional office.'],
    array['Watch for the list of qualified students', 'CHED posts results on its regional Facebook page and your school’s bulletin board.'],
    array['Sign the payroll when funds arrive', 'Bring your school ID. Funds are usually released within the semester.']
  ]
);

select pg_temp.seed_scholarship(
  'tertiary-education-subsidy', 'UniFAST', 'Tertiary Education Subsidy (TES)',
  '₱20,000 a year', 20000, -30, 18, -1, -30, true, 'Nationwide', 'unifast.gov.ph', 'https://unifast.gov.ph',
  'A grant for students from households listed in 4Ps or the DSWD Listahanan, studying in participating schools.',
  'Until you finish your first bachelor’s degree, within the normal program length',
  'Stays active while you’re enrolled and in good standing.',
  'No return service. Report changes in enrollment to your school.',
  array['₱20,000 a year for public schools, more for private schools', 'Extra allowance for students with disabilities'],
  array['Taking your first bachelor’s degree', 'Enrolled in a TES-participating school'],
  array[
    array['Certificate of Registration (COR)', 'Registrar’s office'],
    array['4Ps ID or DSWD Listahanan certification', 'Municipal or city DSWD office'],
    array['PSA birth certificate', 'PSA outlet or psaserbilis.com.ph'],
    array['Valid school ID', 'Your own ID']
  ],
  array[
    array['Check that your school participates', 'Your scholarship office has the list of TES schools.'],
    array['Submit your documents to the school', 'Your school encodes your application in the UniFAST portal.'],
    array['Wait for the billing list', 'UniFAST releases the list of grantees per semester.'],
    array['Claim your grant', 'Through your school’s cashier or a bank card.']
  ]
);

select pg_temp.seed_scholarship(
  'dost-sei-junior-level-science', 'DOST Science Education Institute', 'DOST-SEI Junior Level Science Scholarship',
  'Full tuition and ₱7,000 a month', 124000, 12, 45, -4, -4, true, 'Nationwide', 'sei.dost.gov.ph', 'https://www.sei.dost.gov.ph',
  'For students moving into 3rd year of a priority science or technology course who did well in their first two years.',
  'Until graduation (remaining years of the program)', 'Keep a passing GWA and carry a full load each semester.',
  'Serve in the Philippines for as many years as you received the scholarship, right after you graduate.',
  array['Tuition paid directly to your school', '₱7,000 monthly living allowance', 'Book and clothing allowance each year'],
  array['Pass the JLSS qualifying exam', 'Enrolled in a priority course at a recognized school'],
  array[
    array['Transcript of Records or certified grades', 'Registrar’s office (request 1 to 2 weeks ahead)'],
    array['Certificate of good moral character', 'Guidance office'],
    array['Two 2x2 ID photos', 'Any photo studio'],
    array['Exam permit', 'Printed from the DOST-SEI portal after you register']
  ],
  array[
    array['Register on the DOST-SEI portal', 'Create an account when applications open.'],
    array['Upload your documents', 'Scans must be clear and complete.'],
    array['Take the qualifying exam', 'Bring your printed exam permit and a valid ID.'],
    array['Check the results', 'Posted on the DOST-SEI website and Facebook page.'],
    array['Sign the scholarship agreement', 'Includes the return service agreement.']
  ]
);

select pg_temp.seed_scholarship(
  'owwa-ofw-dependents-scholarship', 'Overseas Workers Welfare Administration (OWWA)', 'OFW Dependents Scholarship Program',
  '₱20,000 a year', 20000, -14, 9, -3, -14, true, 'Nationwide', 'owwa.gov.ph', 'https://owwa.gov.ph',
  'For children of OWWA-member OFWs with modest monthly earnings.',
  'Until you finish your degree', 'Submit grades every semester and stay enrolled.', 'No return service.',
  array['₱20,000 a year, released per semester'],
  array['Your OFW parent earns US$600 a month or less', 'Parent’s OWWA membership is active'],
  array[
    array['Proof of active OWWA membership', 'OWWA regional office or the OWWA mobile app'],
    array['Parent’s employment contract or OEC', 'Your OFW parent or the DMW office'],
    array['PSA birth certificate', 'PSA outlet or psaserbilis.com.ph'],
    array['Certificate of Registration (COR)', 'Registrar’s office'],
    array['Certificate of Grades', 'Registrar’s office']
  ],
  array[
    array['Ask your OFW parent for their OWWA details', 'You’ll need their membership record and contract.'],
    array['Fill out the form at the OWWA regional office', 'Some offices accept online submission.'],
    array['Submit documents', 'Bring originals and photocopies.'],
    array['Wait for the list of grantees', 'OWWA contacts qualified students by text or email.']
  ]
);

select pg_temp.seed_scholarship(
  'ched-merit-scholarship', 'Commission on Higher Education (CHED)', 'CHED Merit Scholarship Program',
  'Up to ₱120,000 a year', 120000, 40, 75, -6, -6, true, 'Nationwide', 'ched.gov.ph', 'https://ched.gov.ph',
  'A merit scholarship for incoming and current 1st year students with high grades and limited family income.',
  'Until graduation', 'Keep the required GWA each semester.', 'No return service.',
  array['Full merit: up to ₱120,000 a year', 'Half merit: up to ₱60,000 a year'],
  array['Taking a CHED priority course'],
  array[
    array['Senior high school report card (Form 138)', 'Your senior high school'],
    array['Proof of income', 'BIR, employer or barangay hall'],
    array['PSA birth certificate', 'PSA outlet or psaserbilis.com.ph']
  ],
  array[
    array['Apply online when the period opens', 'CHED regional offices post the link.'],
    array['Submit documents', 'Upload clear scans.'],
    array['Wait for ranking results', 'Posted by the CHED regional office.']
  ]
);

select pg_temp.seed_scholarship(
  'bayani-foundation-engineering-grant', 'Bayani Foundation (sample private sponsor)', 'Bayani Foundation Engineering Grant',
  '₱30,000 a year', 30000, -5, 26, -2, -2, true, 'NCR, Central Luzon, CALABARZON', 'Foundation website (sample)', null,
  'A private grant for engineering and IT students in Luzon who keep good grades.',
  'One year, renewable', 'Keep a GWA of 2.25 or better.', 'Attend two foundation events a year.',
  array['₱30,000 a year', 'Summer internship with partner companies'],
  null,
  array[
    array['Certificate of Grades', 'Registrar’s office'],
    array['Essay: why you chose engineering (500 words)', 'Write your own'],
    array['Recommendation letter from a professor', 'Ask at least 2 weeks ahead']
  ],
  array[
    array['Fill out the online form', 'On the foundation’s website.'],
    array['Upload your essay and documents', ''],
    array['Attend a short interview', 'Online or at the foundation office.']
  ]
);

select pg_temp.seed_scholarship(
  'city-educational-assistance', 'City Scholarship Office (sample LGU)', 'City Educational Assistance',
  '₱5,000 a semester', 10000, -7, 2, 0, -3, false, 'Central Luzon (city residents)', 'Shared on a community Facebook page', null,
  'Cash assistance for college students who are residents of the city.',
  'One semester', 'Re-apply every semester.', 'None stated.',
  array['₱5,000 per semester'],
  array['Resident of the city for at least 2 years', 'Registered voter, or a parent is a registered voter'],
  array[
    array['Barangay certificate of residency', 'Your barangay hall'],
    array['Certificate of Registration (COR)', 'Registrar’s office'],
    array['Voter’s certification', 'COMELEC city office']
  ],
  array[
    array['Confirm the details with the City Scholarship Office', 'This listing hasn’t been verified yet.'],
    array['Submit documents at city hall', '']
  ]
);

select pg_temp.seed_scholarship(
  'provincial-allied-health-grant', 'Provincial Government (sample)', 'Provincial Allied Health Grant',
  '₱25,000 a year', 25000, -1, 33, -1, -1, true, 'Province residents', 'Provincial Capitol announcement (sample)', null,
  'For nursing and allied health students who will work in the province after graduating.',
  'Until graduation', 'Passing grades in all subjects.',
  'Work in a provincial hospital or health center for 2 years after passing the board exam.',
  array['₱25,000 a year', 'Board exam review support'],
  array['Resident of the province'],
  array[
    array['Certificate of Grades', 'Registrar’s office'],
    array['Barangay certificate of residency', 'Your barangay hall'],
    array['Proof of income', 'BIR, employer or barangay hall']
  ],
  array[
    array['Get the form from the Provincial Capitol', 'Or your school’s scholarship office.'],
    array['Submit documents', ''],
    array['Attend orientation', 'Includes signing the return service agreement.']
  ]
);

select pg_temp.seed_scholarship(
  'presidents-academic-award', 'Sample State University (sample school)', 'President’s Academic Award',
  '50% to 100% tuition discount', 40000, -40, -10, -10, -40, true, 'Sample State University', 'University scholarship office', null,
  'A tuition discount for students with the highest grades in each college.',
  'One semester', 'Automatic each semester if you keep the GWA.', 'None.',
  array['100% tuition discount for a GWA of 1.25 or better', '50% discount for a GWA of 1.50 or better'],
  array['No failing or incomplete grades'],
  array[array['Certificate of Grades', 'Registrar’s office']],
  array[
    array['Your college nominates qualified students', ''],
    array['Confirm your slot at the scholarship office', '']
  ]
);

-- ---------- Criteria (prototype K builders) ----------
insert into public.scholarship_criteria (scholarship_id, income_max, gwa_max, year_levels, fields, regions, requires_ofw, requires_four_ps)
select s.id, c.income_max, c.gwa_max, c.year_levels, c.fields, c.regions, c.ofw, c.four_ps
from (values
  ('tulong-dunong-program', 400000, 3.00, null::smallint[], null::public.course_field[], null::public.region[], false, false),
  ('tertiary-education-subsidy', null, null, null, null, null, false, true),
  ('dost-sei-junior-level-science', null, 2.00, '{2,3}', '{science_math,engineering,it_cs,agriculture_fisheries}', null, false, false),
  ('owwa-ofw-dependents-scholarship', null, null, null, null, null, true, false),
  ('ched-merit-scholarship', 400000, 1.75, '{1}', null, null, false, false),
  ('bayani-foundation-engineering-grant', 400000, 2.25, null, '{engineering,it_cs}', '{ncr,central_luzon,calabarzon}', false, false),
  ('city-educational-assistance', null, null, null, null, '{central_luzon}', false, false),
  ('provincial-allied-health-grant', 400000, 2.50, null, '{health_sciences}', null, false, false),
  ('presidents-academic-award', null, 1.50, '{2,3,4,5}', null, null, false, false)
) as c(slug, income_max, gwa_max, year_levels, fields, regions, ofw, four_ps)
join public.scholarships s on s.slug = c.slug;

-- TES deadline moved yesterday (prototype `change: {from: 11, at: -1}`).
insert into public.deadline_changes (scholarship_id, old_opens_on, new_opens_on, old_closes_on, new_closes_on, changed_at)
select id, opens_on, opens_on, public.today_ph() + 11, closes_on, now() - interval '1 day'
from public.scholarships where slug = 'tertiary-education-subsidy';

-- ---------- Announcements and inquiries ----------
insert into public.announcements (title, body, posted_as, published_at) values
  ('TDP forms available at the registrar',
   'Pick up printed Tulong Dunong forms at the Registrar, window 3, weekdays 8 AM to 4 PM.',
   'Sample State University scholarship office', now() - interval '1 day'),
  ('Scholarship orientation on Friday',
   'Join the online orientation on government scholarships this Friday at 3 PM. The link will be posted here.',
   'Sample State University scholarship office', now() - interval '3 days');

insert into public.inquiries (question, student_context, scholarship_id, created_at) values
  ('Can I apply for TDP if I already get the city allowance?', 'BSEd, 2nd year',
   (select id from public.scholarships where slug = 'tulong-dunong-program'), now() - interval '1 day'),
  ('Is the DOST JLSS exam online this year?', 'BS Biology, 3rd year',
   (select id from public.scholarships where slug = 'dost-sei-junior-level-science'), now() - interval '2 days');

reset iskolar.skip_audit;
