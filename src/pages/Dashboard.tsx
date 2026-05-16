import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, FileText, CheckCircle, Clock, ArrowUpRight, Play } from "lucide-react";
import { Card } from "@/src/components/ui/Base";
import { formatDate, cn } from "@/src/lib/utils";

export default function Dashboard() {
  const [stats, setStats] = useState({ templates: 0, jobs: 0, processed: 0 });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [tRes, jRes] = await Promise.all([
        fetch("/api/templates"),
        fetch("/api/jobs")
      ]);
      const templates = await tRes.json();
      const jobs = await jRes.json();

      setStats({
        templates: templates.length,
        jobs: jobs.length,
        processed: jobs.reduce((acc: number, job: any) => acc + (job.processed_files || 0), 0)
      });
      setRecentJobs(jobs.slice(0, 5));
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-black">Dashboard</h1>
        <p className="text-zinc-500">Welcome back. Here's a summary of your document automation.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-black">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Total Templates</p>
              <p className="text-2xl font-bold">{stats.templates}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-black">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Active Jobs</p>
              <p className="text-2xl font-bold">{stats.jobs}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Docs Generated</p>
              <p className="text-2xl font-bold">{stats.processed}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Jobs */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
            <h2 className="text-lg font-semibold">Recent Jobs</h2>
            <Link to="/history" className="text-sm font-medium text-zinc-500 hover:text-black flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex-1 divide-y divide-zinc-100 overflow-hidden">
            {recentJobs.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 py-12 text-center text-zinc-500 text-sm">
                No jobs processed yet.
              </div>
            ) : (
              recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between px-6 py-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-black">{job.template_name}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {formatDate(job.created_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      job.status === 'completed' ? "bg-green-100 text-green-700" : 
                      job.status === 'processing' ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-700"
                    )}>
                      {job.status}
                    </span>
                    <p className="mt-1 text-xs text-zinc-500">{job.processed_files} / {job.total_files} files</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="mb-6 text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-4">
            <Link to="/generate" className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white">
                  <Play className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium font-semibold">Generate Documents</p>
                  <p className="text-xs text-zinc-500">Process Excel to bulk DOCX</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-zinc-400" />
            </Link>
            <Link to="/templates" className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold font-medium">Manage Templates</p>
                  <p className="text-xs text-zinc-500">Upload and configure DOCX templates</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-zinc-400" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
