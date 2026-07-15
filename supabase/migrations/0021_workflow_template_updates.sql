-- ============================================================
-- Ferguson Law CMS — Workflow template corrections (July 2026)
-- Updates buyer + seller step lists per attorney review
-- ============================================================

-- ── BUYER (property_purchase) ──────────────────────────────
update fl_workflow_templates
set phases = '[
  {"order":1,"name":"Intake & KYC/AML","milestones":["Client intake form received","Identity documents verified","Source of funds confirmed","Engagement letter signed"]},
  {"order":2,"name":"Due Diligence","milestones":["Title search ordered","Title search report received","Survey ordered","Survey report received","Registered encumbrances confirmed","Valuation Report ordered","Valuation Report received"]},
  {"order":3,"name":"Agreement for Sale","milestones":["Agreement for Sale received for signing","Agreement reviewed by buyer","Agreement signed by Purchaser","Agreement signed by Vendor","Down payment paid"]},
  {"order":4,"name":"Mortgage / Financing","milestones":["Mortgage application submitted","Valuation report received","Mortgage application approved","Letter of Undertaking issued","NHT approval (if applicable)","Half-costs paid"]},
  {"order":5,"name":"Closing","milestones":["Closing statement received","Balance purchase price paid","Keys handed over"]}
]'::jsonb
where type = 'property_purchase';

-- ── SELLER (property_sale) ─────────────────────────────────
update fl_workflow_templates
set phases = '[
  {"order":1,"name":"Intake & KYC/AML","milestones":["Client intake form received","Identity documents verified","Source of funds confirmed","Property details confirmed","Engagement letter signed"]},
  {"order":2,"name":"Due Diligence","milestones":["Offer to Purchase received","Copy of Title obtained","Confirm mortgage balance (if any)"]},
  {"order":3,"name":"Agreement for Sale","milestones":["Agreement for Sale received for signing","Agreement signed by Vendor","Agreement signed by Purchaser","Down payment received"]},
  {"order":4,"name":"Payments","milestones":["Transfer tax paid","Stamp duty paid","Outstanding property taxes paid (if any)","Outstanding NWC bill paid (if any)","Outstanding maintenance paid (if applicable)"]},
  {"order":5,"name":"Closing","milestones":["Instrument of transfer prepared","Transfer signed by buyer","Transfer signed by seller","Letter of Undertaking received","Transfer filed","Property transferred","Possession granted"]},
  {"order":6,"name":"Post-Sale","milestones":["Seller'\''s real estate commission paid (if applicable)","Final statement issued to Seller","Net proceeds disbursed to Seller","File closed"]}
]'::jsonb
where type = 'property_sale';
