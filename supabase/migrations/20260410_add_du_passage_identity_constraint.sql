alter table xz_du_passages
add constraint xz_du_passages_identity_unique
unique (source_book, source_origin, title, content);
