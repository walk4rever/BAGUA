alter table xz_du_authors
  add column if not exists dynasty      text check (dynasty in (
    '先秦','秦','汉','魏晋','南北朝','隋唐','宋','元','明','清'
  )),
  add column if not exists approx_year  int,
  add column if not exists article_count int,
  add column if not exists total_chars   int;
