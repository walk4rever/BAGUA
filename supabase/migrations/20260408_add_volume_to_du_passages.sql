alter table xz_du_passages
add column if not exists volume integer;

create index if not exists idx_xz_du_passages_volume on xz_du_passages (volume);
