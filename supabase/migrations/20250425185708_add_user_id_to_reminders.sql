alter table "public"."reminders"
  add column "user_id" uuid not null;

alter table "public"."reminders"
  add constraint "reminders_user_id_fkey" foreign key ("user_id") references "auth"."users" ("id") on update cascade on delete cascade;

create index if not exists reminders_user_id_idx on public.reminders using btree (user_id);
