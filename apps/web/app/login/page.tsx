"use client";
import { useFormState, useFormStatus } from "react-dom";
import { Bot } from "lucide-react";
import { loginAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, action] = useFormState<LoginState, FormData>(loginAction, {});
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#0a1120] p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white">
            <Bot className="h-6 w-6" />
          </span>
          <div>
            <div className="text-lg font-bold text-white">AI AGENT OFFICE</div>
            <div className="text-xs text-slate-400">Smart Work, Better Results</div>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <h1 className="mb-1 text-base font-semibold text-white">เข้าสู่ระบบ</h1>
            <p className="mb-5 text-xs text-slate-400">จัดการบริษัท AI Agent ของคุณ</p>
            <form action={action} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">อีเมล</Label>
                <Input id="email" name="email" type="email" autoComplete="email" placeholder="owner@demo.local" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              {state.error ? (
                <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {state.error}
                </p>
              ) : null}
              <SubmitButton />
            </form>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-[11px] text-slate-500">Demo: owner@demo.local / demo1234</p>
      </div>
    </main>
  );
}
