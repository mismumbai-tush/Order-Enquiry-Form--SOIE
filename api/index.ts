import express from "express";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import cookieSession from "cookie-session";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import { Readable } from "stream";

const app = express();

// OAuth Client Setup
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/auth/callback`;

let oauth2Client: OAuth2Client | null = null;
if (CLIENT_ID && CLIENT_SECRET) {
  oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "a-very-secret-key"],
    maxAge: 24 * 60 * 60 * 1000,
    secure: true,
    sameSite: "lax",
    proxy: true,
  })
);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    hasServiceKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    hasEmailConfig: !!(process.env.SMTP_USER && process.env.SMTP_PASS)
  });
});

// Auth Routes
app.get("/api/auth/url", (req, res) => {
  if (!oauth2Client) return res.status(500).json({ error: "OAuth not configured" });
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/userinfo.email", "profile"],
    prompt: "select_account",
  });
  res.json({ url });
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  if (!oauth2Client) return res.status(500).send("OAuth not initialized");
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const session = req as any;
    if (session.session) {
      session.session.user = {
        email: payload?.email,
        name: payload?.name,
        picture: payload?.picture,
      };
    }
    res.send(`<html><body><script>if(window.opener){window.opener.postMessage({type:'OAUTH_AUTH_SUCCESS'},'*');window.close();}else{window.location.href='/';}</script></body></html>`);
  } catch (error) {
    res.status(500).send("Auth failed");
  }
});

app.get("/api/auth/me", (req, res) => {
  const session = req as any;
  res.json({ user: session.session?.user || null });
});

app.post("/api/auth/logout", (req, res) => {
  const session = req as any;
  session.session = null;
  res.json({ success: true });
});

// Helper to extract Spreadsheet ID from URL if needed
function getSpreadsheetId(idOrUrl: string): string {
  if (!idOrUrl) return "";
  if (idOrUrl.includes("docs.google.com/spreadsheets/d/")) {
    const parts = idOrUrl.split("/d/");
    if (parts.length > 1) {
      return parts[1].split("/")[0];
    }
  }
  return idOrUrl.trim();
}

// Helper to send email
async function sendNotificationEmail(details: any, employeeEmail: string, enquiryId: string, tabName: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("Email configuration missing. Skipping email.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Use dynamic URL from env or fallback
  const baseUrl = process.env.APP_URL || "https://order-enquiry-form-soie.vercel.app";
  const supplierLink = `${baseUrl}/supplier-response/${enquiryId}`;
  const dashboardLink = "https://docs.google.com/spreadsheets/d/1JP1tkeyW314TC5wn8yAQ504D745yx5XwgnY72TqSTDo/edit";

  const htmlContent = `
    <h2>New Enquiry Details</h2>
    <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%;">
      <tr><th>Field</th><th>Value</th></tr>
      <tr><td>Date</td><td>${details.dateOfEnquiry}</td></tr>
      <tr><td>Employee Email</td><td>${employeeEmail}</td></tr>
      <tr><td>Supplier Name</td><td>${details.supplierName}</td></tr>
      <tr><td>Customer Name</td><td>${details.customerName}</td></tr>
      <tr><td>Article Number</td><td>${details.articleNumber}</td></tr>
      <tr><td>Color</td><td>${details.color}</td></tr>
      <tr><td>Quantity</td><td>${details.quantity}</td></tr>
      <tr><td>Width / Size</td><td>${details.widthSize}</td></tr>
      <tr><td>Composition</td><td>${details.composition}</td></tr>
      <tr><td>GSM</td><td>${details.gsm}</td></tr>
      <tr><td>Finish</td><td>${details.finish}</td></tr>
      <tr><td>Description</td><td>${details.description}</td></tr>
    </table>
    <p style="margin-top: 20px; padding: 15px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; text-align: center;">
      <strong style="display: block; margin-bottom: 10px; color: #166534;">ACTION REQUIRED: Supplier Response</strong>
      <a href="${supplierLink}" style="display: inline-block; padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; font-weight: bold; border-radius: 6px;">Open Response Form</a>
    </p>
    <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
      <strong>Dashboard Link:</strong> <a href="${dashboardLink}">${dashboardLink}</a>
    </p>
  `;

  await transporter.sendMail({
    from: `"${tabName} ${process.env.SMTP_USER}" <${process.env.SMTP_USER}>`,
    to: 'patilyog345@gmail.com',
    replyTo: employeeEmail,
    subject: `New Enquiry Submission - ${tabName}`,
    html: htmlContent,
  });
}

// Helper to parse Google Credentials safely
function getGoogleCredentials() {
  let authKeyStr = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!authKeyStr) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is missing. Please add it to Vercel environment variables.");
  }

  // Check if it's base64 encoded
  if (!authKeyStr.trim().startsWith('{')) {
    try {
      authKeyStr = Buffer.from(authKeyStr, 'base64').toString();
    } catch (e) {
      // Not base64, continue
    }
  }

  try {
    // Try parsing directly
    const credentials = JSON.parse(authKeyStr);
    
    // Fix private key newlines if they are escaped as literal "\n"
    if (credentials.private_key && typeof credentials.private_key === 'string') {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error("Credentials JSON is missing 'client_email' or 'private_key'.");
    }
    
    return credentials;
  } catch (e: any) {
    if (e.message.includes("Credentials JSON is missing")) throw e;
    
    // If direct parse fails, it might be a base64 encoded string or have other issues
    throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY: ${e.message}. Ensure it is a valid JSON string. If you are pasting from a file, make sure to include the curly braces {}.`);
  }
}

// Submit Enquiry
app.post("/api/submit-enquiry", async (req, res) => {
  const { 
    dateOfEnquiry, description, customerName, email: manualEmail, 
    articleNumber, quantity, enquiryType, supplierName, color, 
    widthSize, composition, gsm, finish, attachments 
  } = req.body;
  
  const session = req as any;
  const user = session.session?.user;
  const emailToLog = (manualEmail || user?.email || "Anonymous").trim().toLowerCase();
  const rawSpreadsheetId = process.env.GOOGLE_SHEET_ID || "1JP1tkeyW314TC5wn8yAQ504D745yx5XwgnY72TqSTDo";
  const spreadsheetId = getSpreadsheetId(rawSpreadsheetId);
  const enquiryId = uuidv4();

  try {
    const credentials = getGoogleCredentials();

    const auth = new google.auth.GoogleAuth({ 
      credentials, 
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
      ] 
    });
    const sheets = google.sheets({ version: "v4", auth });
    const drive = google.drive({ version: "v3", auth });

    // Upload attachments to Google Drive
    const uploadedLinks = [];
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        try {
          const fileMetadata = {
            name: `${enquiryId}_${file.name}`,
            parents: ['189Pija_UUwKB5vbda2xMhzKPXvqVuF5F'], // Specific folder ID
          };
          const media = {
            mimeType: file.type,
            body: Readable.from(Buffer.from(file.content, 'base64')),
          };
          const driveFile = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
            supportsAllDrives: true,
          } as any);
          
          // Make file public
          try {
            await drive.permissions.create({
              fileId: driveFile.data.id!,
              requestBody: {
                role: 'reader',
                type: 'anyone',
              },
            });
          } catch (permErr) {
            console.warn("Could not set public permissions:", permErr);
          }
          
          uploadedLinks.push(driveFile.data.webViewLink || `https://drive.google.com/file/d/${driveFile.data.id}/view`);
        } catch (uploadErr: any) {
          console.error("File upload failed:", uploadErr);
          uploadedLinks.push(`Error: ${file.name} (${uploadErr.message})`);
        }
      }
    }

    // Routing Logic
    let tabName = "";
    const exportEmails = [
      "thanu.pillai@ginzalimited.com", "shakti.bhandari@ginzalimited.com", "lalit.jain@ginzalimited.com",
      "merch1.apparel@ginzalimited.com", "merch2.apparel@ginzalimited.com", "merch3.apparel@ginzalimited.com",
      "merch5.apparel@ginzalimited.com", "merch6.apparel@ginzalimited.com"
    ];
    const sguEmails = ["merch1.soie@ginzalimited.com", "merch2.soie@ginzalimited.com"];

    if (exportEmails.includes(emailToLog)) {
      tabName = enquiryType === "New" ? "Export Enquiry" : "Export Order";
    } else if (sguEmails.includes(emailToLog)) {
      tabName = enquiryType === "New" ? "SGU Enquiry" : "SGU Order";
    } else if (emailToLog === "mohit.maloo@ginzalimited.com") {
      tabName = "VAU";
    } else if (emailToLog === "amrit.daga@ginzalimited.com") {
      tabName = "Eye N Hook";
    } else {
      tabName = "General Enquiry";
    }

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = spreadsheet.data.sheets?.some(s => s.properties?.title === tabName);

    const headers = [
      "ID", "Timestamp", "Date", "Email Address", "Type of Enquiry", "Name of Supplier", 
      "Customer Name", "Article Number", "Color", "Quantity", "Width / Size", 
      "Composition", "GSM", "Finish", "Description", "Attachment", 
      "Supplier Response Link", 
      "Supplier Name", "Article Number", "Composition", "GSM", "MOQ", "MCQ", "Finish", "Width / Size", "Price", "Delivery Time", "Remark"
    ];

    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${tabName}'!A1:AB1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [headers] }
      });
    }

    const istTimestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const attachmentLinks = uploadedLinks.map(link => {
      if (link.startsWith('http')) {
        return `=HYPERLINK("${link}", "View Attachment")`;
      }
      return link;
    }).join(", ") || "";
    
    const baseUrl = process.env.APP_URL || "https://order-enquiry-form-soie.vercel.app";
    const supplierLink = `${baseUrl}/supplier-response/${enquiryId}`;

    const rowData = [
      enquiryId, 
      istTimestamp, 
      dateOfEnquiry, 
      emailToLog, 
      enquiryType, 
      supplierName, 
      customerName, 
      articleNumber, 
      color, 
      quantity, 
      widthSize, 
      composition, 
      gsm, 
      finish, 
      description, 
      attachmentLinks,
      `=HYPERLINK("${supplierLink}", "Open Response Form")`
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${tabName}'!A:Q`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowData] },
    });

    // Send Email
    try {
      await sendNotificationEmail(req.body, emailToLog, enquiryId, tabName);
    } catch (emailError) {
      console.error("Email failed but data saved:", emailError);
    }

    res.json({ success: true, message: `Saved in tab: ${tabName}`, enquiryId });
  } catch (error: any) {
    console.error("Submission error:", error);
    let msg = error.message;
    if (msg.includes("Requested entity was not found")) {
      msg = "Spreadsheet ID not found or inaccessible. Please verify GOOGLE_SHEET_ID in Settings and ensure the Service Account has 'Editor' access to the sheet.";
    }
    res.status(500).json({ success: false, message: msg });
  }
});

// Get Enquiry for Supplier Response
app.get("/api/enquiry/:id", async (req, res) => {
  const { id } = req.params;
  const rawSpreadsheetId = process.env.GOOGLE_SHEET_ID || "1JP1tkeyW314TC5wn8yAQ504D745yx5XwgnY72TqSTDo";
  const spreadsheetId = getSpreadsheetId(rawSpreadsheetId);
  
  try {
    const credentials = getGoogleCredentials();
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetsList = spreadsheet.data.sheets || [];

    for (const sheet of sheetsList) {
      const title = sheet.properties?.title;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${title}'!A:AB`,
      });
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === id);
      
      if (rowIndex !== -1) {
        const row = rows[rowIndex];
        return res.json({
          id: row[0],
          timestamp: row[1],
          date: row[2],
          email: row[3],
          enquiryType: row[4],
          supplierName: row[17] || row[5], // Use supplier response name if exists, else original
          customerName: row[6],
          articleNumber: row[18] || row[7],
          color: row[8],
          quantity: row[9],
          widthSize: row[24] || row[10],
          composition: row[19] || row[11],
          gsm: row[20] || row[12],
          finish: row[23] || row[13],
          description: row[14],
          attachments: row[15],
          moq: row[21] || "",
          mcq: row[22] || "",
          price: row[25] || "",
          deliveryTime: row[26] || "",
          remark: row[27] || "",
          tabName: title,
          rowIndex: rowIndex + 1
        });
      }
    }
    res.status(404).json({ error: "Enquiry not found" });
  } catch (error: any) {
    let msg = error.message;
    if (msg.includes("Requested entity was not found")) {
      msg = "Spreadsheet ID not found or inaccessible. Please verify GOOGLE_SHEET_ID in Settings.";
    }
    res.status(500).json({ error: msg });
  }
});

// Update Enquiry with Supplier Response
app.post("/api/update-enquiry", async (req, res) => {
  const { id, tabName, rowIndex, supplierName, articleNumber, composition, gsm, moq, mcq, finish, widthSize, price, deliveryTime, remark } = req.body;
  const rawSpreadsheetId = process.env.GOOGLE_SHEET_ID || "1JP1tkeyW314TC5wn8yAQ504D745yx5XwgnY72TqSTDo";
  const spreadsheetId = getSpreadsheetId(rawSpreadsheetId);

  try {
    const credentials = getGoogleCredentials();
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    const sheets = google.sheets({ version: "v4", auth });

    // Update the row
    // Original fields: A-P
    // Supplier Response fields: R-AB
    // R: supplierName, S: articleNumber, T: composition, U: gsm, V: moq, W: mcq, X: finish, Y: widthSize, Z: price, AA: deliveryTime, AB: remark
    
    const supplierData = [
      supplierName || "", 
      articleNumber || "", 
      composition || "", 
      gsm || "", 
      moq || "", 
      mcq || "", 
      finish || "", 
      widthSize || "", 
      price || "", 
      deliveryTime || "", 
      remark || ""
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${tabName}'!R${rowIndex}:AB${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [supplierData] }
    });

    res.json({ success: true });
  } catch (error: any) {
    let msg = error.message;
    if (msg.includes("Requested entity was not found")) {
      msg = "Spreadsheet ID not found or inaccessible. Please verify GOOGLE_SHEET_ID in Settings.";
    }
    res.status(500).json({ error: msg });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
