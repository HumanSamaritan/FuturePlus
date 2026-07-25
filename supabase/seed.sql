-- Initial demo college/course data. Replace with verified partner college sheet before production use.

insert into public.colleges (name, city, state, country, partner_status, commission_based, hostel_available, source_url)
values
  ('UPES', 'Dehradun', 'Uttarakhand', 'India', 'preferred_partner', true, true, 'https://www.upes.ac.in'),
  ('Future Plus Sample Institute of Management', 'Bhubaneswar', 'Odisha', 'India', 'preferred_partner', true, true, null),
  ('National Private University Sample', 'Bengaluru', 'Karnataka', 'India', 'pipeline_partner', false, true, null),
  ('Independent Benchmark College', 'Pune', 'Maharashtra', 'India', 'non_partner', false, true, null)
on conflict (name, city, state) do update set
  partner_status = excluded.partner_status,
  commission_based = excluded.commission_based,
  hostel_available = excluded.hostel_available,
  source_url = excluded.source_url;

insert into public.courses (college_id, course_name, subject_area, duration, total_fee, placement_count, highest_package, average_package, currency)
select id, 'BBA (All Streams)', 'Business Administration', '3 years', 1114000, 613, 1230000, 860000, 'INR'
from public.colleges where name = 'UPES'
union all
select id, 'B.Tech Computer Science and AI', 'Artificial Intelligence', '4 years', 1450000, 450, 2200000, 980000, 'INR'
from public.colleges where name = 'UPES'
union all
select id, 'BBA Future Work and Entrepreneurship', 'Management', '3 years', 600000, 120, 900000, 520000, 'INR'
from public.colleges where name = 'Future Plus Sample Institute of Management'
union all
select id, 'B.Sc Data Science', 'Data Science', '3 years', 750000, 180, 1400000, 700000, 'INR'
from public.colleges where name = 'National Private University Sample'
union all
select id, 'B.Pharm', 'B-Pharma', '4 years', 820000, 160, 1100000, 620000, 'INR'
from public.colleges where name = 'Independent Benchmark College'
on conflict (college_id, course_name) do update set
  subject_area = excluded.subject_area,
  duration = excluded.duration,
  total_fee = excluded.total_fee,
  placement_count = excluded.placement_count,
  highest_package = excluded.highest_package,
  average_package = excluded.average_package,
  currency = excluded.currency;
