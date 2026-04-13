import express from "express";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import { Readable } from "stream";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

function getSpreadsheetId(idOrUrl: string): string {
  if (!idOrUrl) return "";
  if (idOrUrl.includes("docs.google.com/spreadsheets/d/")) {
    const parts = idOrUrl.split("/d/");
    return parts.length > 1 ? parts[1].split("/")[0] : idOrUrl;
  }
  return idOrUrl;
}

app.post("/api/submit-enquiry", async (req, res) => {
  const { dateOfEnquiry, email: emailToLog, enquiryType, supplierName, customerName, articleNumber, color, quantity, widthSize, composition, gsm, finish, description, attachments } = req.body;
  const enquiryId = uuidv4().substring(0, 8);
  const rawSpreadsheetId = process.env.GOOGLE_SHEET_ID || "1JP1tkeyW314TC5wn8yAQ504D745yx5XwgnY72TqSTDo";
  const spreadsheetId = getSpreadsheetId(rawSpreadsheetId);

  try {
    const authKeyStr = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!authKeyStr) throw new Error("Key missing");
    const credentials = JSON.parse(authKeyStr);
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"] });
    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    const uploadedLinks = [];
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        try {
          const media = { mimeType: file.type, body: Readable.from(Buffer.from(file.content, 'base64')) };
          const driveFile = await drive.files.create({
            requestBody: { name: `${enquiryId}_${file.name}`, parents: ['189Pija_UUwKB5vbda2xMhzKPXvqVuF5F'] },
            media: media, fields: 'id, webViewLink',
          });
          await drive.permissions.create({ fileId: driveFile.data.id!, requestBody: { role: 'reader', type: 'anyone' } });
          uploadedLinks.push(driveFile.data.webViewLink || `https://drive.google.com/file/d/${driveFile.data.id}/view`);
        } catch (e) { uploadedLinks.push(`Error: ${file.name}`); }
      }
    }

    const istTimestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const attachmentLinks = uploadedLinks.map(link => link.startsWith('http') ? `=HYPERLINK("${link}", "View Attachment")` : link).join(", ");
    
    // Determine Tab Name
    let tabName = "General Enquiry";
    const exportEmails = ["thanu.pillai@ginzalimited.com", "shakti.bhandari@ginzalimited.com", "lalit.jain@ginzalimited.com"];
    if (exportEmails.includes(emailToLog)) tabName = enquiryType === "New" ? "Export Enquiry" : "Export Order";

    const rowData = [enquiryId, istTimestamp, dateOfEnquiry, emailToLog, enquiryType, supplierName, customerName, articleNumber, color, quantity, widthSize, composition, gsm, finish, description, attachmentLinks];
    await sheets.spreadsheets.values.append({ spreadsheetId, range: `'${tabName}'!A:P`, valueInputOption: "USER_ENTERED", requestBody: { values: [rowData] } });

    // Send Email
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    const baseUrl = "https://order-enquiry-form-soie.vercel.app";
    const supplierLink = `${baseUrl}/supplier-response/${enquiryId}`;
    await transporter.sendMail({
      from: process.env.SMTP_USER, to: 'patilyog345@gmail.com',
      subject: `New Enquiry: ${enquiryId}`,
      html: `<p>Supplier Link: <a href="${supplierLink}">${supplierLink}</a></p>`
    });

    res.json({ success: true, message: "Enquiry submitted successfully!" });
  } catch (error: any) { res.status(500).json({ message: error.message }); }
});

app.get("/api/enquiry/:id", async (req, res) => {
  const { id } = req.params;
  const rawSpreadsheetId = process.env.GOOGLE_SHEET_ID || "1JP1tkeyW314TC5wn8yAQ504D745yx5XwgnY72TqSTDo";
  const spreadsheetId = getSpreadsheetId(rawSpreadsheetId);
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    for (const sheet of spreadsheet.data.sheets || []) {
      const title = sheet.properties?.title;
      const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${title}'!A:AB` });
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === id);
      if (rowIndex !== -1) {
        const row = rows[rowIndex];
        return res.json({ id: row[0], date: row[2], enquiryType: row[4], supplierName: row[17] || row[5], customerName: row[6], articleNumber: row[18] || row[7], color: row[8], quantity: row[9], widthSize: row[24] || row[10], composition: row[19] || row[11], gsm: row[20] || row[12], finish: row[23] || row[13], description: row[14], attachments: row[15], moq: row[21], mcq: row[22], price: row[25], deliveryTime: row[26], remark: row[27], tabName: title, rowIndex: rowIndex + 1 });
      }
    }
    res.status(404).json({ error: "Not found" });
  } catch (e) { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/update-enquiry", async (req, res) => {
  const { id, tabName, rowIndex, supplierName, articleNumber, composition, gsm, moq, mcq, finish, widthSize, price, deliveryTime, remark } = req.body;
  const rawSpreadsheetId = process.env.GOOGLE_SHEET_ID || "1JP1tkeyW314TC5wn8yAQ504D745yx5XwgnY72TqSTDo";
  const spreadsheetId = getSpreadsheetId(rawSpreadsheetId);
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    const sheets = google.sheets({ version: "v4", auth });
    const values = [supplierName, articleNumber, composition, gsm, moq, mcq, finish, widthSize, price, deliveryTime, remark];
    await sheets.spreadsheets.values.update({ spreadsheetId, range: `'${tabName}'!R${rowIndex}:AB${rowIndex}`, valueInputOption: "USER_ENTERED", requestBody: { values: [values] } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Update failed" }); }
});

export default app;
