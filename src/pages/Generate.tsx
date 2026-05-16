import React, { useState, useEffect } from "react";
import { Upload, ChevronRight, FileSpreadsheet, FileText, CheckCircle2, Play } from "lucide-react";
import { Card, Button, Input } from "@/src/components/ui/Base";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { cn } from "@/src/lib/utils";

export default function Generate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/templates")
      .then(res => res.json())
      .then(data => setTemplates(data));
  }, []);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const headers = data[0] as string[];
      setExcelColumns(headers);
      
      // Auto mapping
      const initialMap: Record<string, string> = {};
      selectedTemplate.placeholders.forEach((p: string) => {
        const found = headers.find((h: string) => h.toLowerCase() === p.toLowerCase());
        if (found) initialMap[p] = found;
      });
      setMapping(initialMap);
      setStep(3);
    };
    reader.readAsBinaryString(file);
  };

  const handleGenerate = async () => {
    if (!excelFile || !selectedTemplate) return;
    setGenerating(true);

    const formData = new FormData();
    formData.append("data", excelFile);
    formData.append("templateId", selectedTemplate.id);
    formData.append("mapping", JSON.stringify(mapping));

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        navigate("/history");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-black">Generate Documents</h1>
        <p className="text-zinc-500">Follow the steps to generate bulk documents from Excel.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-4 py-4">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold",
              step >= s ? "border-black bg-black text-white" : "border-zinc-200 text-zinc-400"
            )}>
              {s}
            </div>
            {s < 3 && <div className={cn("h-0.5 flex-1", step > s ? "bg-black" : "bg-zinc-200")} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="grid gap-6 sm:grid-cols-2">
          {templates.map((t) => (
            <Card 
              key={t.id} 
              className={cn(
                "cursor-pointer p-6 transition-all hover:border-black",
                selectedTemplate?.id === t.id ? "border-black bg-zinc-50" : ""
              )}
              onClick={() => { setSelectedTemplate(t); setStep(2); }}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="text-xs text-zinc-500">{t.placeholders.length} placeholders</p>
                </div>
              </div>
            </Card>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <p className="text-zinc-500">No templates available. Please upload one first.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/templates")}>Go to Templates</Button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <Card className="p-12 py-24 text-center border-dashed border-2">
          <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} id="excel-upload" className="hidden" />
          <label htmlFor="excel-upload" className="cursor-pointer">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50 mx-auto">
              <FileSpreadsheet className="h-10 w-10 text-zinc-300" />
            </div>
            <h3 className="text-lg font-semibold">Upload Excel Data</h3>
            <p className="mt-2 text-sm text-zinc-500 max-w-[240px] mx-auto">
                Drag and drop your spreadsheet or click to browse.
            </p>
            <Button variant="outline" className="mt-6 pointer-events-none">
              Choose File
            </Button>
          </label>
        </Card>
      )}

      {step === 3 && selectedTemplate && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-semibold">Map Columns to Placeholders</h3>
              <p className="text-xs text-zinc-500">Selected Template: {selectedTemplate.name}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStep(2)}>Change Dataset</Button>
          </div>

          <div className="space-y-4">
            {selectedTemplate.placeholders.map((p: string) => (
              <div key={p} className="grid grid-cols-2 items-center gap-8">
                <span className="text-sm font-medium text-zinc-600 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-zinc-400" /> {"{{" + p + "}}"}
                </span>
                <select
                  value={mapping[p] || ""}
                  onChange={(e) => setMapping({ ...mapping, [p]: e.target.value })}
                  className="h-9 px-3 text-sm rounded-md border border-zinc-200 bg-white"
                >
                  <option value="">Select Column...</option>
                  {excelColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button 
               variant="primary" 
               loading={generating} 
               onClick={handleGenerate} 
               disabled={selectedTemplate.placeholders.length > 0 && Object.keys(mapping).length === 0}
            >
              <Play className="mr-2 h-4 w-4" />
              Generate {excelColumns.length > 0 ? "Documents" : ""}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
