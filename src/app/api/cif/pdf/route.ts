import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT = 54;
const INK = rgb(0.06, 0.16, 0.12);
const GOLD = rgb(0.78, 0.65, 0.36);
const MUTED = rgb(0.36, 0.39, 0.37);
const BORDER = rgb(0.78, 0.78, 0.75);
const WHITE = rgb(1, 1, 1);

function drawField(
  form: ReturnType<PDFDocument["getForm"]>,
  page: ReturnType<PDFDocument["addPage"]>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  name: string,
  label: string,
  x: number,
  top: number,
  width: number,
  height = 28,
  multiline = false,
) {
  page.drawText(label, { x, y: PAGE_HEIGHT - top - 11, size: 9, font, color: MUTED });
  const field = form.createTextField(name);
  if (multiline) field.enableMultiline();
  field.addToPage(page, {
    x,
    y: PAGE_HEIGHT - top - height - 17,
    width,
    height,
    borderWidth: 0.8,
    borderColor: BORDER,
    backgroundColor: WHITE,
    textColor: INK,
  });
  field.setFontSize(10);
}

function drawCheckbox(
  form: ReturnType<PDFDocument["getForm"]>,
  page: ReturnType<PDFDocument["addPage"]>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  name: string,
  label: string,
  x: number,
  top: number,
) {
  const size = 12;
  const checkbox = form.createCheckBox(name);
  checkbox.addToPage(page, {
    x,
    y: PAGE_HEIGHT - top - size,
    width: size,
    height: size,
    borderWidth: 0.8,
    borderColor: BORDER,
    backgroundColor: WHITE,
    textColor: INK,
  });
  page.drawText(label, {
    x: x + size + 7,
    y: PAGE_HEIGHT - top - 10,
    size: 9,
    font,
    color: INK,
  });
}

function drawPageHeading(
  page: ReturnType<PDFDocument["addPage"]>,
  regularFont: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  boldFont: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  title: string,
  subtitle: string,
) {
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 84,
    width: PAGE_WIDTH,
    height: 84,
    color: INK,
  });
  page.drawText("FERGUSON LAW  |  JAMAICA", {
    x: LEFT,
    y: PAGE_HEIGHT - 28,
    size: 9,
    font: boldFont,
    color: GOLD,
  });
  page.drawText(title, {
    x: LEFT,
    y: PAGE_HEIGHT - 54,
    size: 19,
    font: boldFont,
    color: WHITE,
  });
  page.drawText(subtitle, {
    x: LEFT,
    y: PAGE_HEIGHT - 71,
    size: 8,
    font: regularFont,
    color: WHITE,
  });
}

export async function GET() {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Client Intake Form (CIF) — Ferguson Law");
  pdf.setAuthor("Ferguson Law, Jamaica");
  pdf.setSubject("Fillable client identity and source-of-funds intake form");

  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const form = pdf.getForm();
  const pageOne = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  drawPageHeading(
    pageOne,
    regularFont,
    boldFont,
    "Client Intake Form (CIF)",
    "Confidential client information — complete both pages and sign the declaration.",
  );
  pageOne.drawText(
    "Please complete this form accurately. Submit it to Ferguson Law through an approved secure channel.",
    { x: LEFT, y: PAGE_HEIGHT - 111, size: 9, font: regularFont, color: MUTED },
  );
  pageOne.drawText("1. CLIENT DETAILS", {
    x: LEFT,
    y: PAGE_HEIGHT - 139,
    size: 10,
    font: boldFont,
    color: INK,
  });

  drawField(form, pageOne, regularFont, "full_legal_name", "Full legal name (as shown on ID)", LEFT, 153, 504);
  drawField(form, pageOne, regularFont, "date_of_birth", "Date of birth (DD/MM/YYYY)", LEFT, 201, 242);
  drawField(form, pageOne, regularFont, "nationality", "Nationality", LEFT + 262, 201, 242);
  drawField(form, pageOne, regularFont, "trn", "TRN (Tax Registration Number)", LEFT, 249, 242);
  drawField(form, pageOne, regularFont, "address", "Residential address", LEFT, 297, 504, 48, true);

  pageOne.drawText("2. IDENTITY DOCUMENT", {
    x: LEFT,
    y: PAGE_HEIGHT - 388,
    size: 10,
    font: boldFont,
    color: INK,
  });
  pageOne.drawText("ID type — select one", {
    x: LEFT,
    y: PAGE_HEIGHT - 407,
    size: 9,
    font: regularFont,
    color: MUTED,
  });
  drawCheckbox(form, pageOne, regularFont, "id_type_national_id", "National ID", LEFT, 420);
  drawCheckbox(form, pageOne, regularFont, "id_type_passport", "Passport", LEFT + 145, 420);
  drawCheckbox(form, pageOne, regularFont, "id_type_drivers_license", "Driver's Licence", LEFT + 270, 420);
  drawField(form, pageOne, regularFont, "id_number", "ID number", LEFT, 452, 504);
  drawCheckbox(form, pageOne, regularFont, "id_copy_included", "Copy of ID supplied separately through a secure channel", LEFT, 500);
  pageOne.drawText("Do not send identity documents in an unsecured email.", {
    x: LEFT,
    y: PAGE_HEIGHT - 535,
    size: 8,
    font: regularFont,
    color: MUTED,
  });

  const pageTwo = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageHeading(
    pageTwo,
    regularFont,
    boldFont,
    "Client Intake Form (CIF)",
    "Page 2 of 2  |  Source of funds and declarations",
  );
  pageTwo.drawText("3. SOURCE OF FUNDS", {
    x: LEFT,
    y: PAGE_HEIGHT - 119,
    size: 10,
    font: boldFont,
    color: INK,
  });
  drawField(form, pageTwo, regularFont, "source_of_funds", "Describe the source of funds for this matter", LEFT, 132, 504, 56, true);

  pageTwo.drawText("4. POLITICALLY EXPOSED PERSON (PEP)", {
    x: LEFT,
    y: PAGE_HEIGHT - 225,
    size: 10,
    font: boldFont,
    color: INK,
  });
  pageTwo.drawText(
    "Are you, or have you been, a senior government official, politician, judge, or close associate of one?",
    { x: LEFT, y: PAGE_HEIGHT - 244, size: 9, font: regularFont, color: MUTED },
  );
  drawCheckbox(form, pageTwo, regularFont, "pep_yes", "Yes", LEFT, 258);
  drawCheckbox(form, pageTwo, regularFont, "pep_no", "No", LEFT + 100, 258);
  drawField(form, pageTwo, regularFont, "pep_details", "If yes, provide details", LEFT, 286, 504, 50, true);

  pageTwo.drawText("5. AML DECLARATION", {
    x: LEFT,
    y: PAGE_HEIGHT - 366,
    size: 10,
    font: boldFont,
    color: INK,
  });
  pageTwo.drawText(
    "I declare that all funds used in this transaction are from lawful sources and are not the proceeds of crime or any unlawful activity. I authorize Ferguson Law to verify the source of these funds where required by law.",
    {
      x: LEFT,
      y: PAGE_HEIGHT - 389,
      size: 9,
      font: regularFont,
      color: INK,
      maxWidth: 504,
      lineHeight: 14,
    },
  );
  drawCheckbox(form, pageTwo, regularFont, "aml_declaration_accepted", "I agree to the declaration above", LEFT, 439);

  pageTwo.drawText("6. SIGNATURE", {
    x: LEFT,
    y: PAGE_HEIGHT - 476,
    size: 10,
    font: boldFont,
    color: INK,
  });
  drawField(form, pageTwo, regularFont, "client_signature", "Client signature (type full legal name)", LEFT, 491, 332);
  drawField(form, pageTwo, regularFont, "signature_date", "Date (DD/MM/YYYY)", LEFT + 352, 491, 152);

  pageTwo.drawLine({
    start: { x: LEFT, y: 82 },
    end: { x: PAGE_WIDTH - LEFT, y: 82 },
    thickness: 0.6,
    color: BORDER,
  });
  pageTwo.drawText("Ferguson Law  ·  Jamaica  ·  contact@fergusonlawja.com", {
    x: LEFT,
    y: 64,
    size: 8,
    font: regularFont,
    color: MUTED,
  });
  pageTwo.drawText("Confidential — handle this completed form securely.", {
    x: LEFT,
    y: 50,
    size: 8,
    font: regularFont,
    color: MUTED,
  });

  form.updateFieldAppearances(regularFont);
  const bytes = await pdf.save();
  const body = new Uint8Array(bytes.length);
  body.set(bytes);
  return new Response(body.buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Ferguson-Law-Client-Intake-Form.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
