CREATE SEQUENCE wks_rank_seq
START WITH 1
INCREMENT BY 1
NO MINVALUE
NO MAXVALUE
CACHE 1;

ALTER TABLE wks ADD COLUMN rank integer NOT NULL DEFAULT nextval('wks_rank_seq');