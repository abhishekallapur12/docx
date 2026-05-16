import React, { useState, useEffect } from "react";
import { Upload, Plus, Trash2, FileText, Check } from "lucide-react";
import { Card, Button, Input } from "@/src/components/ui/Base";
import { formatDate } from "@/src/lib/utils";

export default function Templates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    const res = await fetch("/api/templates");
    const data = await res.json();
    setTemplates(data);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this template?")) return;
    
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("template", file);

    try {
      const res = await fetch("/api/templates/upload", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">Templates</h1>
          <p className="text-zinc-500">Upload and manage your DOCX document templates.</p>
        </div>
        <div className="relative">
          <input
            type="file"
            accept=".docx"
            onChange={handleUpload}
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            disabled={uploading}
          />
          <Button variant="primary" loading={uploading}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Template
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="group relative overflow-hidden">
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 group-hover:bg-black group-hover:text-white transition-colors">
                  <FileText className="h-6 w-6" />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-zinc-400 hover:text-red-500"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <h3 className="font-semibold text-black">{template.name}</h3>
              <p className="mt-1 text-xs text-zinc-500">Uploaded on {formatDate(template.created_at)}</p>
              
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Placeholders</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {template.placeholders.slice(0, 4).map((p: string) => (
                    <span key={p} className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-700">
                      {p}
                    </span>
                  ))}
                  {template.placeholders.length > 4 && (
                    <span className="text-[10px] text-zinc-500">+{template.placeholders.length - 4} more</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}

        {templates.length === 0 && !uploading && (
           <Card className="flex flex-col items-center justify-center p-12 py-24 text-center border-dashed border-2">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50">
                <FileText className="h-10 w-10 text-zinc-300" />
              </div>
              <h3 className="text-lg font-semibold">No templates found</h3>
              <p className="mt-2 text-sm text-zinc-500 max-w-[240px]">
                Upload your first .docx template to start generating documents.
              </p>
           </Card>
        )}
      </div>
    </div>
  );
}
