import React, { useState, useEffect } from "react";
import { Download, RefreshCw, CheckCircle2, Clock, XCircle, FileText, Eye, X } from "lucide-react";
import { Card, Button } from "@/src/components/ui/Base";
import { formatDate, cn } from "@/src/lib/utils";

export default function History() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000); // Poll for progress
    return () => clearInterval(interval);
  }, []);

  const handlePreview = async (jobId: string) => {
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/preview`);
      const data = await res.json();
      setPreviewHtml(data.html);
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">Job History</h1>
          <p className="text-zinc-500">Monitor and download your bulk generation tasks.</p>
        </div>
        <Button variant="outline" onClick={fetchJobs} size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <th className="px-6 py-4">Job / Template</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Progress</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {jobs.map((job) => (
              <tr key={job.id} className="text-sm transition-colors hover:bg-zinc-50/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-black">{job.template_name}</p>
                      <p className="text-[11px] text-zinc-400 font-mono uppercase">{job.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {job.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {job.status === 'processing' && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
                    {job.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                    <span className={cn(
                      "capitalize font-medium",
                      job.status === 'completed' ? "text-green-700" :
                      job.status === 'processing' ? "text-blue-700" :
                      job.status === 'failed' ? "text-red-700" : "text-zinc-700"
                    )}>
                      {job.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="w-32">
                     <div className="flex justify-between mb-1">
                        <span className="text-[10px] text-zinc-500">{Math.round((job.processed_files / job.total_files) * 100) || 0}%</span>
                        <span className="text-[10px] text-zinc-500">{job.processed_files}/{job.total_files}</span>
                     </div>
                     <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                        <div 
                          className="h-full bg-black transition-all duration-500" 
                          style={{ width: `${(job.processed_files / job.total_files) * 100 || 0}%` }}
                        />
                     </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-500">
                  {formatDate(job.created_at)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {job.status === 'completed' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handlePreview(job.id)}
                          loading={previewLoading}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                        <a href={job.download_url} download>
                          <Button variant="outline" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            ZIP
                          </Button>
                        </a>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="py-24 text-center text-zinc-500">
                  No generation history found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Preview Modal */}
      {previewHtml !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
          <Card className="flex h-full max-h-[80vh] w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 p-4">
              <h3 className="font-semibold text-black">Document Preview (First Record)</h3>
              <Button variant="ghost" size="icon" onClick={() => setPreviewHtml(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-8">
              <div 
                className="prose prose-sm max-w-none text-zinc-800"
                dangerouslySetInnerHTML={{ __html: previewHtml }} 
              />
            </div>
            <div className="border-t border-zinc-100 p-4 text-right">
              <Button variant="secondary" onClick={() => setPreviewHtml(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
