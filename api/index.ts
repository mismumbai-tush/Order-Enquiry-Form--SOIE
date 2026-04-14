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
import crypto from "crypto";

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

app.get("/api/test-google-auth", async (req, res) => {
  try {
    const credentials = getGoogleCredentials();
    const spreadsheetId = getSpreadsheetId(process.env.GOOGLE_SHEET_ID || "");
    
    if (!spreadsheetId) {
      return res.json({ success: false, message: "GOOGLE_SHEET_ID is missing" });
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });
    
    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    
    res.json({ 
      success: true, 
      message: "Google Auth successful!", 
      spreadsheetTitle: response.data.properties?.title,
      emailUsed: credentials.client_email
    });
  } catch (error: any) {
    console.error("[Test Auth Error]", error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
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
      <strong style="display: block; margin-bottom: 10px; color: #166534;">ACTION REQUIRED: Response Form </strong>
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
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyVar = process.env.GOOGLE_PRIVATE_KEY;
  const fullKeyVar = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  const cleanKey = (key: string) => {
    if (!key) return "";
    let cleaned = key.trim();
    
    // 1. Remove surrounding quotes (handle multiple layers)
    while ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.substring(1, cleaned.length - 1).trim();
    }

    // 2. Handle escaped characters (literal \n, \r, \t)
    cleaned = cleaned.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
    
    // 3. Handle potential base64 encoded input (JSON or PEM)
    if (!cleaned.includes('-----BEGIN') && !cleaned.includes('\n') && !cleaned.includes(' ') && cleaned.length > 100) {
      try {
        const decoded = Buffer.from(cleaned, 'base64').toString('utf8');
        if (decoded.includes('-----BEGIN') || decoded.trim().startsWith('{')) {
          cleaned = decoded.trim();
        }
      } catch (e) { /* Not base64 */ }
    }

    // 4. If it's a JSON string, try to extract the private_key field
    if (cleaned.startsWith('{')) {
      try {
        const json = JSON.parse(cleaned);
        if (json.private_key) cleaned = json.private_key;
        else if (json.key) cleaned = json.key;
      } catch (e) { /* ignore */ }
    }

    // 5. Extract the PEM part if there's extra text around it
    const pemMatch = cleaned.match(/-----BEGIN [^-]+-----[\s\S]+-----END [^-]+-----/);
    if (pemMatch) {
      cleaned = pemMatch[0];
    }

    // 6. Normalize headers and body (Wrap at 64 chars for maximum compatibility)
    if (cleaned.includes('-----BEGIN')) {
      const headerMatch = cleaned.match(/-----BEGIN [^-]+-----/);
      const footerMatch = cleaned.match(/-----END [^-]+-----/);
      
      if (headerMatch && footerMatch) {
        const header = headerMatch[0];
        const footer = footerMatch[0];
        const startIndex = cleaned.indexOf(header) + header.length;
        const endIndex = cleaned.indexOf(footer);
        
        if (endIndex > startIndex) {
          // Remove all whitespace from the body part
          const body = cleaned.substring(startIndex, endIndex).replace(/\s/g, '');
          // Wrap body at 64 characters
          const wrappedBody = body.match(/.{1,64}/g)?.join('\n') || body;
          cleaned = `${header}\n${wrappedBody}\n${footer}`;
        }
      }
    } else if (cleaned.length > 100) {
      // No headers, assume it's just the base64 body
      const body = cleaned.replace(/\s/g, '');
      const wrappedBody = body.match(/.{1,64}/g)?.join('\n') || body;
      cleaned = `-----BEGIN PRIVATE KEY-----\n${wrappedBody}\n-----END PRIVATE KEY-----`;
    }
    
    return cleaned;
  };

  // Method 1: Individual environment variables (Preferred for Vercel)
  if (clientEmail || privateKeyVar) {
    if (clientEmail && privateKeyVar) {
      const cleanedKey = cleanKey(privateKeyVar);
      
      // Validate key format early
      try {
        crypto.createPrivateKey(cleanedKey);
      } catch (e: any) {
        console.error(`[Google Auth] Private key validation failed (Method 1): ${e.message}`);
      }

      return {
        client_email: clientEmail.trim(),
        private_key: cleanedKey,
      };
    }
    console.warn(`[Google Auth] Partial credentials provided. Email: ${!!clientEmail}, Key: ${!!privateKeyVar}. Falling back to GOOGLE_SERVICE_ACCOUNT_KEY.`);
  }

  // Method 2: Full JSON string
  if (!fullKeyVar) {
    throw new Error("Google credentials missing. Please provide GOOGLE_SERVICE_ACCOUNT_KEY (JSON) OR GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.");
  }

  let authKeyStr = fullKeyVar.trim();
  
  // Remove any potential Byte Order Mark (BOM) or non-printable characters at the start
  authKeyStr = authKeyStr.replace(/^\uFEFF/, '').replace(/^[^\x20-\x7E]+/, '');

  // Handle base64 encoded JSON
  if (!authKeyStr.startsWith('{')) {
    try {
      const decoded = Buffer.from(authKeyStr, 'base64').toString('utf8');
      if (decoded.trim().startsWith('{')) {
        authKeyStr = decoded.trim();
      }
    } catch (e) {
      // Not base64, continue
    }
  }

  try {
    // If it's still not JSON but we have an email, maybe the key itself is the private key
    if (!authKeyStr.startsWith('{') && clientEmail) {
      return {
        client_email: clientEmail.trim(),
        private_key: cleanKey(authKeyStr),
      };
    }

    const credentials = JSON.parse(authKeyStr);
    
    if (credentials.private_key && typeof credentials.private_key === 'string') {
      credentials.private_key = cleanKey(credentials.private_key);
      
      // Validate key format early
      try {
        crypto.createPrivateKey(credentials.private_key);
      } catch (e: any) {
        console.error(`[Google Auth] Private key validation failed: ${e.message}`);
        // We don't throw here to allow Method 1 to try its own validation if this was Method 2
      }
    }
    
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error("Credentials JSON is missing 'client_email' or 'private_key'.");
    }
    
    // Log basic info for debugging (safe)
    const key = credentials.private_key;
    console.log(`[Google Auth] Email: ${credentials.client_email}, Key Length: ${key.length}, Key Shape: ${key.substring(0, 27)}...${key.substring(key.length - 25)}`);

    return credentials;
  } catch (e: any) {
    if (e.message.includes("Credentials JSON is missing")) throw e;
    
    const firstChars = authKeyStr.substring(0, 30).replace(/\n/g, '\\n');
    throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY: ${e.message}. The key starts with: "${firstChars}...". Ensure you pasted the FULL JSON content.`);
  }
}

// Submit Enquiry
app.post("/api/submit-enquiry", async (req, res) => {
  const { 
    dateOfEnquiry, description, customerName, email: manualEmail, 
    articleNumber, enquiryType, supplierName, composition, gsm, 
    finish, remark, items 
  } = req.body;
  
  const session = req as any;
  const user = session.session?.user;
  const emailToLog = (manualEmail || user?.email || "Anonymous").trim().toLowerCase();
  const rawSpreadsheetId = process.env.GOOGLE_SHEET_ID || "1JP1tkeyW314TC5wn8yAQ504D745yx5XwgnY72TqSTDo";
  const spreadsheetId = getSpreadsheetId(rawSpreadsheetId);
  const baseEnquiryId = uuidv4();

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

    // Process each item
    const rowsToAppend = [];
    const istTimestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const baseUrl = process.env.APP_URL || "https://order-enquiry-form-soie.vercel.app";

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const enquiryId = items.length > 1 ? `${baseEnquiryId}-${i + 1}` : baseEnquiryId;
      const uploadedLinks = [];

      // Upload attachments for this item
      if (item.attachments && item.attachments.length > 0) {
        for (const file of item.attachments) {
          try {
            const fileMetadata = {
              name: `${enquiryId}_${file.name}`,
              parents: ['1s7CfBnpuuxQ2cIzLqAZ9ss9Z5goMCZ_4'],
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
            
            try {
              await drive.permissions.create({
                fileId: driveFile.data.id!,
                requestBody: { role: 'reader', type: 'anyone' },
                supportsAllDrives: true,
              } as any);
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

      const attachmentLinks = uploadedLinks.map(link => {
        if (link.startsWith('http')) return `=HYPERLINK("${link}", "View Attachment")`;
        return link;
      }).join(", ") || "";

      // Use baseEnquiryId for the link so all rows in a submission share one form
      const supplierLink = `${baseUrl}/supplier-response/${baseEnquiryId}`;

      rowsToAppend.push([
        enquiryId, 
        istTimestamp, 
        dateOfEnquiry, 
        emailToLog, 
        enquiryType, 
        supplierName, 
        customerName, 
        articleNumber, 
        description, // New Description field after Article Number
        item.color, 
        item.quantity, 
        item.widthSize, 
        composition, 
        gsm, 
        finish, 
        remark, // Renamed from description
        attachmentLinks,
        `=HYPERLINK("${supplierLink}", "Open Response Form")`
      ]);
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
      "Customer Name", "Article Number", "Description", "Color", "Quantity", "Width / Size", 
      "Composition", "GSM", "Finish", "Remark", "Attachment", 
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
        range: `'${tabName}'!A1:AC1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [headers] }
      });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${tabName}'!A:R`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rowsToAppend },
    });

    // Send Email
    try {
      await sendNotificationEmail(req.body, emailToLog, baseEnquiryId, tabName);
    } catch (emailError) {
      console.error("Email failed but data saved:", emailError);
    }

    res.json({ success: true, message: `Saved ${items.length} items in tab: ${tabName}`, enquiryId: baseEnquiryId });
  } catch (error: any) {
    console.error(`[Submission Error] Error: ${error.message}`);
    let msg = error.message;
    if (msg.includes("Requested entity was not found")) {
      msg = "Spreadsheet ID not found or inaccessible. Please verify GOOGLE_SHEET_ID in Settings and ensure the Service Account has 'Editor' access to the sheet.";
    } else if (msg.includes("unsupported")) {
      msg = "Google Authentication Error: The private key format is unsupported. Please ensure you have pasted the FULL private key including headers and newlines in GOOGLE_PRIVATE_KEY. If you are on Vercel, try adding NODE_OPTIONS=--openssl-legacy-provider to your environment variables.";
    } else if (msg.toLowerCase().includes("permission denied") || msg.toLowerCase().includes("insufficient permissions")) {
      msg = `Access Denied: Please ensure you have shared the Google Sheet with the Service Account email: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'your service account email'} and given it 'Editor' permissions.`;
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
    const auth = new google.auth.GoogleAuth({ 
      credentials, 
      scopes: ["https://www.googleapis.com/auth/spreadsheets"] 
    });
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetsList = spreadsheet.data.sheets || [];

    for (const sheet of sheetsList) {
      const title = sheet.properties?.title;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${title}'!A:AC`,
      });
      const rows = response.data.values || [];
      
      // Find all rows that match the base ID or have the base ID as a prefix
      const matchingRows = rows.filter(row => row[0] === id || row[0]?.startsWith(`${id}-`));
      
      if (matchingRows.length > 0) {
        const firstRow = matchingRows[0];
        const items = matchingRows.map(row => ({
          id: row[0],
          color: row[9],
          quantity: row[10],
          widthSize: row[11],
          attachments: row[16]
        }));

        return res.json({
          id: id,
          timestamp: firstRow[1],
          date: firstRow[2],
          email: firstRow[3],
          enquiryType: firstRow[4],
          supplierName: firstRow[18] || firstRow[5],
          customerName: firstRow[6],
          articleNumber: firstRow[19] || firstRow[7],
          description: firstRow[8],
          composition: firstRow[20] || firstRow[12],
          gsm: firstRow[21] || firstRow[13],
          finish: firstRow[24] || firstRow[14],
          remark: firstRow[15],
          moq: firstRow[22] || "",
          mcq: firstRow[23] || "",
          price: firstRow[26] || "",
          deliveryTime: firstRow[27] || "",
          supplierRemark: firstRow[28] || "",
          tabName: title,
          items: items
        });
      }
    }
    res.status(404).json({ error: "Enquiry not found" });
  } catch (error: any) {
    console.error(`[Enquiry Error] ID: ${id}, Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Update Enquiry with Supplier Response
app.post("/api/update-enquiry", async (req, res) => {
  const { 
    id, tabName, supplierName, articleNumber, 
    composition, gsm, moq, mcq, finish, widthSize, 
    price, deliveryTime, remark 
  } = req.body;
  
  const rawSpreadsheetId = process.env.GOOGLE_SHEET_ID || "1JP1tkeyW314TC5wn8yAQ504D745yx5XwgnY72TqSTDo";
  const spreadsheetId = getSpreadsheetId(rawSpreadsheetId);

  try {
    const credentials = getGoogleCredentials();
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    const sheets = google.sheets({ version: "v4", auth });

    // Find all rows to update
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${tabName}'!A:A`,
    });
    const rows = response.data.values || [];
    const indicesToUpdate = [];
    
    for (let i = 0; i < rows.length; i++) {
      const rowId = rows[i][0];
      if (rowId === id || rowId?.startsWith(`${id}-`)) {
        indicesToUpdate.push(i + 1);
      }
    }

    if (indicesToUpdate.length === 0) {
      return res.status(404).json({ error: "No matching rows found to update" });
    }

    // Update each row
    const supplierData = [
      supplierName, articleNumber, composition, gsm, 
      moq, mcq, finish, widthSize, price, deliveryTime, remark
    ];

    for (const rowIndex of indicesToUpdate) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${tabName}'!S${rowIndex}:AC${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [supplierData] }
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error(`[Update Error] ID: ${id}, Error: ${error.message}`);
    res.status(500).json({ error: error.message });
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
