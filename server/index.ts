import "dotenv/config";
import express, { Request } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import multer from "multer";
import * as fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { randomUUID } from "crypto";
import mammoth from "mammoth";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const TEMPLATES_DIR = path.join(process.cwd(), "templates");
const GENERATED_DIR = path.join(process.cwd(), "generated");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "docuflow";

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

function describeSupabaseStorageError(error: unknown) {
  if (!error || typeof error !== "object") return error;

  const maybeError = error as { statusCode?: string; status?: number; message?: string };
  if (maybeError.statusCode === "403" || maybeError.status === 403) {
    return {
      ...maybeError,
      hint: "Supabase rejected the storage write. Use the project service_role/secret key on the server, or add Storage RLS policies for this bucket.",
    };
  }

  return error;
}

console.log(
  supabase
    ? `Supabase Storage enabled: bucket "${SUPABASE_STORAGE_BUCKET}"`
    : "Supabase Storage disabled: using local file storage"
);

function normalizeDisplayedDate(value: unknown) {
  if (typeof value !== 'string') return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!match) return "";

  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${day}-${month}-${year}`;
}

function formatExcelSerialDate(value: number) {
  const date = XLSX.SSF.parse_date_code(value);
  if (!date) return String(value);

  const day = String(date.d).padStart(2, '0');
  const month = String(date.m).padStart(2, '0');
  const year = date.y;
  return `${day}-${month}-${year}`;
}

function normalizeTemplateObjectPath(filename: string) {
  return filename.includes("/") ? filename : `templates/${filename}`;
}

async function uploadToStorage(objectPath: string, buffer: Buffer, contentType: string) {
  if (!supabase) return false;

  const { error } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(objectPath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) throw describeSupabaseStorageError(error);
  return true;
}

async function downloadFromStorage(objectPath: string) {
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .download(objectPath);

  if (error) throw describeSupabaseStorageError(error);
  return Buffer.from(await data.arrayBuffer());
}

async function removeFromStorage(objectPaths: string[]) {
  if (!supabase || objectPaths.length === 0) return;

  const { error } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .remove(objectPaths);

  if (error) throw describeSupabaseStorageError(error);
}

async function readTemplateBuffer(filename: string) {
  if (supabase) {
    try {
      return await downloadFromStorage(normalizeTemplateObjectPath(filename));
    } catch (error) {
      console.warn("Supabase template download failed, falling back to local file:", error);
    }
  }

  return fs.readFileSync(path.join(TEMPLATES_DIR, path.basename(filename)));
}

async function readGeneratedZipBuffer(jobId: string) {
  if (supabase) {
    try {
      return await downloadFromStorage(`generated/${jobId}.zip`);
    } catch (error) {
      console.warn("Supabase generated ZIP download failed, falling back to local file:", error);
    }
  }

  const zipPath = path.join(GENERATED_DIR, `${jobId}.zip`);
  if (!fs.existsSync(zipPath)) return null;
  return fs.readFileSync(zipPath);
}

// Ensure directories exist
[UPLOADS_DIR, TEMPLATES_DIR, GENERATED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Database Setup
const db = new Database("docuflow.db");
db.pragma("foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    placeholders TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    template_name TEXT NOT NULL,
    status TEXT NOT NULL,
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    download_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE CASCADE
  );
`);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.post("/api/auth/login", (req, res) => {
    const { email } = req.body;
    res.json({ token: "mock-token", user: { email, name: email.split("@")[0] } });
  });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  });
  const upload = multer({ storage });

  // --- API Routes ---

  // Auth (Mock)
  app.post("/api/auth/login", (req, res) => {
    const { email } = req.body;
    res.json({ token: "mock-token", user: { email, name: email.split("@")[0] } });
  });

  // Templates
  app.get("/api/templates", (req, res) => {
    const templates = db.prepare("SELECT * FROM templates ORDER BY created_at DESC").all();
    res.json(templates.map(t => {
      const parsed = JSON.parse(t.placeholders as string);
      // Support old format (array) and new format (object)
      const placeholders = Array.isArray(parsed) ? parsed : (parsed.tags || []);
      return { ...t, placeholders };
    }));
  });

  app.post("/api/templates/upload", upload.single("template"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = req.file.path;
    const content = fs.readFileSync(filePath);
    const zip = new PizZip(content);
    
    try {
      // Extract and normalize placeholders from all XML files in the zip to standard {{tag}} format
      const placeholders = new Set<string>();
      // Broad regex to catch split tags and different delimiter styles
      const broadRegex = /(\{\{|\[|<<|«)([\s\S]*?)(\}\}|\]|>>|»)/g;

      Object.keys(zip.files).forEach(fileName => {
        if (fileName.endsWith(".xml")) {
          let text = zip.files[fileName].asText();
          let modified = false;

          text = text.replace(broadRegex, (match, start, rawContent, end) => {
            // Check if delimiters match correctly
            const isMatch = (start === "{{" && end === "}}") || 
                            (start === "[" && end === "]") || 
                            (start === "<<" && end === ">>") || 
                            (start === "«" && end === "»");
            
            if (isMatch) {
              // Strip all XML tags from the captured content to get the clean placeholder name
              const cleanContent = rawContent.replace(/<[^>]+>/g, "").trim();
              
              if (cleanContent && !cleanContent.includes("<") && !cleanContent.includes(">")) {
                placeholders.add(cleanContent);
                modified = true;
                // Standardize to {{tag}} format which is most robust for Docxtemplater
                return `{{${cleanContent}}}`;
              }
            }
            return match;
          });

          if (modified) {
            zip.file(fileName, text);
          }
        }
      });

      const id = randomUUID();
      const name = (req.file as Express.Multer.File).originalname.replace(".docx", "");
      const objectPath = `templates/${id}.docx`;
      const newPath = path.join(TEMPLATES_DIR, `${id}.docx`);
      
      // Save the standardized zip
      const buffer = zip.generate({ type: "nodebuffer" });
      if (supabase) {
        await uploadToStorage(
          objectPath,
          buffer,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
      } else {
        fs.writeFileSync(newPath, buffer);
      }
      
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      db.prepare("INSERT INTO templates (id, name, filename, placeholders) VALUES (?, ?, ?, ?)")
        .run(id, name, supabase ? objectPath : `${id}.docx`, JSON.stringify(Array.from(placeholders)));

      res.json({ id, name, placeholders: Array.from(placeholders) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to process template" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const template = db.prepare("SELECT * FROM templates WHERE id = ?").get(id) as any;
      if (!template) return res.status(404).json({ error: "Template not found" });

      // Delete file
      const filePath = path.join(TEMPLATES_DIR, path.basename(template.filename));
      if (supabase) {
        await removeFromStorage([normalizeTemplateObjectPath(template.filename)]);
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from DB (foreign key should handle jobs if ON DELETE CASCADE, but let's check)
      db.prepare("DELETE FROM templates WHERE id = ?").run(id);
      
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Generate
  app.post("/api/generate", upload.single("data"), async (req, res) => {
    const { templateId, mapping } = req.body; // mapping: { placeholder: excelColumn }
    const file = req.file as Express.Multer.File;
    if (!file || !templateId) return res.status(400).json({ error: "Missing data" });

    const parsedMapping = JSON.parse(mapping);
    const template = db.prepare("SELECT * FROM templates WHERE id = ?").get(templateId) as any;
    if (!template) return res.status(404).json({ error: "Template not found" });

    const jobId = randomUUID();
    db.prepare("INSERT INTO jobs (id, template_id, template_name, status) VALUES (?, ?, ?, ?)")
      .run(jobId, templateId, template.name, "processing");

    // Start background processing
    (async () => {
      try {
        console.log(`Starting job ${jobId} for template ${templateId}`);
        const fileContent = fs.readFileSync(file.path);
        const workbook = XLSX.read(fileContent, { type: 'buffer', cellDates: false, dateNF: 'dd-mm-yyyy' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);
        const displayRows = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'dd-mm-yyyy' });
        
        console.log(`Excel parsed: ${rows.length} rows found`);
        db.prepare("UPDATE jobs SET total_files = ? WHERE id = ?").run(rows.length, jobId);

        const templateContentRaw = await readTemplateBuffer(template.filename);
        const zipStandardizer = new PizZip(templateContentRaw);
        const broadRegex = /(\{\{|\[|<<|«)([\s\S]*?)(\}\}|\]|>>|»)/g;
        let modifiedInGeneration = false;
        
        // Ensure the template is standardized to {{tag}} format before rendering
        Object.keys(zipStandardizer.files).forEach(fileName => {
          if (fileName.endsWith(".xml")) {
            let text = zipStandardizer.files[fileName].asText();
            if (broadRegex.test(text)) {
              text = text.replace(broadRegex, (match, start, rawContent, end) => {
                const isMatch = (start === "{{" && end === "}}") || 
                                (start === "[" && end === "]") || 
                                (start === "<<" && end === ">>") || 
                                (start === "«" && end === "»");
                                
                if (isMatch) {
                  const cleanContent = rawContent.replace(/<[^>]+>/g, "").trim();
                  if (cleanContent && !cleanContent.includes("<") && !cleanContent.includes(">")) {
                    modifiedInGeneration = true;
                    return `{{${cleanContent}}}`;
                  }
                }
                return match;
              });
              zipStandardizer.file(fileName, text);
            }
          }
        });

        const templateContent = modifiedInGeneration ? zipStandardizer.generate({ type: "nodebuffer" }) : templateContentRaw;
        const jobZip = new JSZip();

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i] as any;
          const displayRow = displayRows[i] as any;
          const zip = new PizZip(templateContent);
          const doc = new Docxtemplater(zip, { 
            paragraphLoop: true, 
            linebreaks: true,
            delimiters: { start: "{{", end: "}}" }, // Always use standardized delimiters
            nullGetter() {
              return "";
            }
          });

          const data: any = {};
          Object.entries(parsedMapping).forEach(([placeholder, column]) => {
            if (column) {
              const val = row[column as string];
              const displayVal = displayRow?.[column as string];
              const displayedDate = normalizeDisplayedDate(displayVal);
              if (displayedDate) {
                data[placeholder] = displayedDate;
              } else if (typeof val === 'number' && val > 30000 && val < 60000) {
                // Handle Excel serial dates that weren't automatically converted to Date objects
                try {
                  data[placeholder] = formatExcelSerialDate(val);
                } catch (e) {
                  data[placeholder] = val;
                }
              } else {
                data[placeholder] = val ?? "";
              }
            } else {
              data[placeholder] = "";
            }
          });

          if (i === 0) console.log(`Rendering first row with mapped data:`, JSON.stringify(data, null, 2));
          
          try {
            doc.render(data);
          } catch (error: any) {
             console.error("Docxtemplater Render Error:", JSON.stringify(error, null, 2));
             // Don't stop the whole job if one fails, but log it
          }
          const buf = doc.getZip().generate({ type: "nodebuffer" });
          
          // Generate a filename based on the first mapping or row index
          const firstVal = Object.values(data)[0] || `doc_${i+1}`;
          jobZip.file(`${firstVal}_${i + 1}.docx`, buf);

          db.prepare("UPDATE jobs SET processed_files = ? WHERE id = ?").run(i + 1, jobId);
        }

        const zipPath = path.join(GENERATED_DIR, `${jobId}.zip`);
        const content = await jobZip.generateAsync({ type: "nodebuffer" });
        if (supabase) {
          await uploadToStorage("generated/" + `${jobId}.zip`, content, "application/zip");
        } else {
          fs.writeFileSync(zipPath, content);
        }

        db.prepare("UPDATE jobs SET status = 'completed', download_url = ? WHERE id = ?")
          .run(`/api/jobs/${jobId}/download`, jobId);
        
        // Clean up upload
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error(err);
        db.prepare("UPDATE jobs SET status = 'failed' WHERE id = ?").run(jobId);
      }
    })();

    res.json({ jobId });
  });

  // Jobs
  app.get("/api/jobs", (req, res) => {
    const jobs = db.prepare("SELECT * FROM jobs ORDER BY created_at DESC").all();
    res.json(jobs);
  });

  app.get("/api/jobs/:id/download", (req, res) => {
    readGeneratedZipBuffer(req.params.id)
      .then((buffer) => {
        if (!buffer) return res.status(404).send("File not found");

        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename="DocuFlow_Batch_${req.params.id}.zip"`);
        res.send(buffer);
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Download failed");
      });
  });

  app.get("/api/jobs/:id/preview", async (req, res) => {
    try {
      const data = await readGeneratedZipBuffer(req.params.id);
      if (!data) return res.status(404).send("Job not found");

      const zip = await JSZip.loadAsync(data);
      const firstFile = Object.values(zip.files).find(f => f.name.endsWith(".docx"));
      
      if (!firstFile) return res.status(404).send("No docx found in job");

      const buffer = await firstFile.async("nodebuffer");
      const result = await mammoth.convertToHtml({ buffer });
      res.json({ html: result.value });
    } catch (err) {
      console.error(err);
      res.status(500).send("Preview failed");
    }
  });

  // --- Vite Middleware ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
