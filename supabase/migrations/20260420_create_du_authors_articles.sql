create table if not exists xz_du_authors (
  source_origin  text primary key,
  description    text not null,
  updated_at     timestamptz not null default now()
);

create table if not exists xz_du_articles (
  source_origin  text not null,
  base_title     text not null,
  background     text not null,
  updated_at     timestamptz not null default now(),
  primary key (source_origin, base_title)
);

grant select, insert, update, delete on xz_du_authors to anon, authenticated, service_role;
grant select, insert, update, delete on xz_du_articles to anon, authenticated, service_role;
