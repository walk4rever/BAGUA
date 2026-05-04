-- Normalize dynasty values in xz_du_authors to the canonical 10 classes:
-- 先秦, 秦, 汉, 魏晋, 南北朝, 隋唐, 宋, 元, 明, 清

-- 1) Normalize spacing and common punctuation variants.
update xz_du_authors
set dynasty = nullif(
  replace(
    replace(
      regexp_replace(coalesce(dynasty, ''), '\\s+', '', 'g'),
      '·',
      ''
    ),
    '、',
    ''
  ),
  ''
)
where dynasty is not null;

-- 2) Alias mapping from legacy buckets to canonical classes.
update xz_du_authors
set dynasty = case dynasty
  when '唐' then '隋唐'
  when '秦汉' then '汉'
  when '魏晋南北朝' then '南北朝'
  else dynasty
end
where dynasty in ('唐', '秦汉', '魏晋南北朝');

-- 3) Fill null dynasty by approx_year.
update xz_du_authors
set dynasty = case
  when approx_year <= -221 then '先秦'
  when approx_year <= -206 then '秦'
  when approx_year <= 220 then '汉'
  when approx_year <= 420 then '魏晋'
  when approx_year <= 589 then '南北朝'
  when approx_year <= 960 then '隋唐'
  when approx_year <= 1279 then '宋'
  when approx_year <= 1368 then '元'
  when approx_year <= 1644 then '明'
  else '清'
end
where dynasty is null and approx_year is not null;

-- 4) Safety check query (run manually after migration):
-- select dynasty, count(*) from xz_du_authors group by dynasty order by dynasty;
-- select source_origin, dynasty, approx_year from xz_du_authors
-- where dynasty is null or dynasty not in ('先秦','秦','汉','魏晋','南北朝','隋唐','宋','元','明','清')
-- order by source_origin;
