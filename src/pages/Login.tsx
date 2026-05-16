import React, { useState } from "react";
import { Button, Input, Card } from "@/src/components/ui/Base";
import { Lock, Mail } from "lucide-react";

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      onLogin(data.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white mb-4">
             <span className="text-2xl font-bold">D</span>
          </div>
          <h1 className="text-2xl font-bold text-black tracking-tight">DocuFlow AI</h1>
          <p className="text-sm text-zinc-500 mt-2">Enterprise-grade document automation</p>
        </div>

        <Card className="p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input 
                  type="email" 
                  placeholder="name@company.com" 
                  className="pl-10" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input type="password" placeholder="••••••••" className="pl-10" required />
              </div>
            </div>
            <Button className="w-full" variant="primary" loading={loading} type="submit">
              Sign In
            </Button>
          </form>
          <div className="mt-8 text-center space-y-4">
            <p className="text-xs text-zinc-400">
              Having trouble loading? 
              <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="ml-1 text-black underline">
                Open in New Tab
              </a>
            </p>
            <p className="text-xs text-zinc-400">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
