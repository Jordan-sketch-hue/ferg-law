-- ============================================================
-- Ferguson Law CMS — Case Management System
-- Workflow templates, milestones, 2-way messaging,
-- file uploads, KYC/AML onboarding
-- ============================================================

-- ── 1. Workflow type on fl_client_matters ──────────────────
alter table fl_client_matters
  add column if not exists workflow_type text
    check (workflow_type in ('property_purchase','property_sale','general')) default 'general',
  add column if not exists current_phase  int  not null default 1,
  add column if not exists kyc_status     text not null default 'pending'
    check (kyc_status in ('pending','submitted','approved','flagged'));

-- ── 2. KYC / AML per client ────────────────────────────────
create table if not exists fl_client_kyc (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references auth.users(id) on delete cascade,
  full_legal_name  text,
  date_of_birth    date,
  nationality      text,
  address          text,
  id_type          text check (id_type in ('passport','drivers_license','national_id')),
  id_number        text,
  id_doc_url       text,
  source_of_funds  text,
  is_pep           boolean default false,
  pep_details      text,
  submitted_at     timestamptz,
  reviewed_at      timestamptz,
  reviewer_notes   text,
  status           text not null default 'pending'
    check (status in ('pending','submitted','approved','flagged')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table fl_client_kyc enable row level security;

create policy "kyc_own_read"   on fl_client_kyc for select using (auth.uid() = client_id);
create policy "kyc_own_insert" on fl_client_kyc for insert with check (auth.uid() = client_id);
create policy "kyc_own_update" on fl_client_kyc for update using (auth.uid() = client_id);
create policy "kyc_service"    on fl_client_kyc for all   using (auth.role() = 'service_role');

create trigger fl_client_kyc_updated
  before update on fl_client_kyc
  for each row execute function fl_set_updated_at();

-- ── 3. Milestones ──────────────────────────────────────────
create table if not exists fl_matter_milestones (
  id           uuid primary key default gen_random_uuid(),
  matter_id    uuid not null references fl_client_matters(id) on delete cascade,
  phase_order  int  not null,
  phase_name   text not null,
  name         text not null,
  status       text not null default 'pending'
    check (status in ('pending','in_progress','done','blocked')),
  due_at       timestamptz,
  completed_at timestamptz,
  notes        text,
  created_at   timestamptz not null default now()
);

alter table fl_matter_milestones enable row level security;

create policy "milestone_client_read" on fl_matter_milestones for select
  using (exists (
    select 1 from fl_client_matters m
    where m.id = matter_id and m.client_id = auth.uid()
  ));

create policy "milestone_service" on fl_matter_milestones for all
  using (auth.role() = 'service_role');

-- ── 4. 2-way messages ──────────────────────────────────────
create table if not exists fl_matter_messages (
  id            uuid primary key default gen_random_uuid(),
  matter_id     uuid not null references fl_client_matters(id) on delete cascade,
  sender_id     uuid,
  sender_type   text not null check (sender_type in ('client','staff')),
  sender_label  text,
  body          text not null,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

alter table fl_matter_messages enable row level security;

create policy "msg_client_read" on fl_matter_messages for select
  using (exists (
    select 1 from fl_client_matters m
    where m.id = matter_id and m.client_id = auth.uid()
  ));

create policy "msg_client_insert" on fl_matter_messages for insert
  with check (
    sender_type = 'client' and
    exists (
      select 1 from fl_client_matters m
      where m.id = matter_id and m.client_id = auth.uid()
    )
  );

create policy "msg_service" on fl_matter_messages for all
  using (auth.role() = 'service_role');

-- ── 5. File uploads ────────────────────────────────────────
create table if not exists fl_matter_files (
  id             uuid primary key default gen_random_uuid(),
  matter_id      uuid not null references fl_client_matters(id) on delete cascade,
  uploader_id    uuid,
  uploader_type  text not null check (uploader_type in ('client','staff')),
  file_name      text not null,
  file_url       text not null,
  file_size      int,
  mime_type      text,
  created_at     timestamptz not null default now()
);

alter table fl_matter_files enable row level security;

create policy "file_client_read" on fl_matter_files for select
  using (exists (
    select 1 from fl_client_matters m
    where m.id = matter_id and m.client_id = auth.uid()
  ));

create policy "file_client_insert" on fl_matter_files for insert
  with check (
    uploader_type = 'client' and
    exists (
      select 1 from fl_client_matters m
      where m.id = matter_id and m.client_id = auth.uid()
    )
  );

create policy "file_service" on fl_matter_files for all
  using (auth.role() = 'service_role');

-- ── 6. Workflow templates (seeded) ─────────────────────────
create table if not exists fl_workflow_templates (
  id         uuid primary key default gen_random_uuid(),
  type       text not null unique check (type in ('property_purchase','property_sale','general')),
  name       text not null,
  phases     jsonb not null default '[]'
);

alter table fl_workflow_templates enable row level security;
create policy "template_public_read" on fl_workflow_templates for select using (true);
create policy "template_service"     on fl_workflow_templates for all   using (auth.role() = 'service_role');

insert into fl_workflow_templates (type, name, phases) values
('property_purchase', 'Property Purchase', '[
  {"order":1,"name":"Intake & KYC/AML","milestones":["Client intake form received","Identity documents verified","Source of funds confirmed","Engagement letter signed"]},
  {"order":2,"name":"Due Diligence","milestones":["Title search ordered","Title search report received","Survey ordered","Survey report received","Registered encumbrances confirmed"]},
  {"order":3,"name":"Agreement for Sale","milestones":["Agreement for Sale drafted","Agreement reviewed by buyer","Agreement signed by both parties","Deposit paid (10%)"]},
  {"order":4,"name":"Mortgage / Financing","milestones":["Mortgage application submitted","Valuation report received","Mortgage commitment letter issued","NHT approval (if applicable)"]},
  {"order":5,"name":"Closing","milestones":["Closing statement prepared","Transfer tax paid","Registration fees paid","Balance purchase price paid","Transfer documents lodged","Title issued in buyer name","Keys handed over"]}
]'),
('property_sale', 'Property Sale', '[
  {"order":1,"name":"Intake & KYC/AML","milestones":["Client intake form received","Identity documents verified","Source of funds confirmed","Property details confirmed","Engagement letter signed"]},
  {"order":2,"name":"Preparation","milestones":["Title search ordered","Title clear confirmed","Outstanding property taxes confirmed","Compliance certificate obtained (if required)"]},
  {"order":3,"name":"Agreement for Sale","milestones":["Agreement for Sale drafted","Agreement signed by seller","Agreement signed by buyer","Deposit received (10%)"]},
  {"order":4,"name":"Closing","milestones":["Transfer documents prepared","Transfer tax received from buyer","Balance purchase price received","Property transferred","File accounts settled"]},
  {"order":5,"name":"Post-Sale","milestones":["Title registered in buyer name","Formal receipt issued to buyer","Net proceeds disbursed to seller","File closed"]}
]')
on conflict (type) do nothing;

-- ── 7. Helper RPC: open a new matter with milestones ───────
create or replace function fl_open_matter(
  p_client_id    uuid,
  p_workflow_type text,
  p_title        text default null
) returns uuid language plpgsql security definer as $$
declare
  v_matter_id uuid;
  v_phase     jsonb;
  v_milestone text;
  v_phases    jsonb;
  v_order     int;
begin
  insert into fl_client_matters (client_id, matter_type, workflow_type, title, status)
  values (
    p_client_id,
    case when p_workflow_type = 'property_purchase' then 'buying'
         when p_workflow_type = 'property_sale'     then 'selling'
         else 'other' end,
    p_workflow_type,
    p_title,
    'intake'
  )
  returning id into v_matter_id;

  select phases into v_phases from fl_workflow_templates where type = p_workflow_type;

  if v_phases is not null then
    for v_phase in select * from jsonb_array_elements(v_phases) loop
      v_order := (v_phase->>'order')::int;
      for v_milestone in select jsonb_array_elements_text(v_phase->'milestones') loop
        insert into fl_matter_milestones (matter_id, phase_order, phase_name, name, status)
        values (v_matter_id, v_order, v_phase->>'name', v_milestone,
                case when v_order = 1 then 'in_progress' else 'pending' end);
      end loop;
    end loop;
  end if;

  return v_matter_id;
end;
$$;
