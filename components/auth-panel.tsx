"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, LogIn, LogOut, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-store";

type AuthMode = "sign-in" | "sign-up";

export function AuthPanel() {
  const { isConfigured, isReady, signInWithPassword, signOut, signUpWithPassword, user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function renderDialog(content: ReactNode) {
    if (typeof document === "undefined") {
      return null;
    }

    return createPortal(content, document.body);
  }

  const buttonLabel = useMemo(() => {
    if (!isConfigured) {
      return "Auth \u672a\u914d\u7f6e";
    }

    if (!isReady) {
      return "\u8fde\u63a5\u4e2d...";
    }

    if (user?.email) {
      return user.email;
    }

    return "\u767b\u5f55\u540c\u6b65";
  }, [isConfigured, isReady, user?.email]);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      toast.error("\u8bf7\u8f93\u5165\u90ae\u7bb1\u548c\u5bc6\u7801");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "sign-in") {
        const result = await signInWithPassword({
          email: email.trim(),
          password,
        });

        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success("\u767b\u5f55\u6210\u529f\uff0c\u5df2\u5207\u6362\u5230\u4f60\u7684\u4e91\u7aef\u53a8\u623f");
        setDialogOpen(false);
        return;
      }

      const result = await signUpWithPassword({
        email: email.trim(),
        password,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.needsEmailConfirmation
          ? "\u6ce8\u518c\u6210\u529f\uff0c\u8bf7\u5148\u53bb\u90ae\u7bb1\u5b8c\u6210\u786e\u8ba4"
          : "\u6ce8\u518c\u6210\u529f\uff0c\u5df2\u81ea\u52a8\u767b\u5f55",
      );
      if (!result.needsEmailConfirmation) {
        setDialogOpen(false);
      }
      setMode("sign-in");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    const result = await signOut();

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("\u5df2\u9000\u51fa\u767b\u5f55\uff0c\u5f53\u524d\u56de\u5230\u672c\u5730\u6a21\u5f0f");
  }

  if (!isConfigured) {
    return (
      <button className="button button--ghost auth-button" disabled type="button">
        <LogIn size={16} />
        {buttonLabel}
      </button>
    );
  }

  if (user) {
    return (
      <div className="auth-cluster">
        <button className="button button--ghost auth-button" onClick={() => setDialogOpen(true)} type="button">
          <LogIn size={16} />
          {buttonLabel}
        </button>
        <button className="button button--secondary auth-button" onClick={handleSignOut} type="button">
          <LogOut size={16} />
          {"\u9000\u51fa"}
        </button>
        {dialogOpen
          ? renderDialog(
              <div className="modal">
                <div className="modal__backdrop" onClick={() => setDialogOpen(false)} />
                <div className="modal__panel auth-modal">
                  <div className="panel-heading">
                    <div>
                      <p className="section-kicker">Cloud Account</p>
                      <h2>{"\u5f53\u524d\u5df2\u767b\u5f55"}</h2>
                    </div>
                    <button className="icon-button" onClick={() => setDialogOpen(false)} type="button">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="auth-account-card">
                    <strong>{user.email}</strong>
                    <p>{"\u4f60\u7684\u5e93\u5b58\u3001\u98df\u8c31\u548c\u5468\u8ba1\u5212\u73b0\u5728\u4f1a\u6309\u8d26\u53f7\u9694\u79bb\u540c\u6b65\u3002"}</p>
                  </div>
                </div>
              </div>,
            )
          : null}
      </div>
    );
  }

  return (
    <>
      <button className="button button--ghost auth-button" onClick={() => setDialogOpen(true)} type="button">
        {isReady ? <LogIn size={16} /> : <LoaderCircle className="spin" size={16} />}
        {buttonLabel}
      </button>

      {dialogOpen
        ? renderDialog(
            <div className="modal">
              <div className="modal__backdrop" onClick={() => setDialogOpen(false)} />
              <div className="modal__panel auth-modal">
                <div className="panel-heading">
                  <div>
                    <p className="section-kicker">Cloud Sync</p>
                    <h2>{mode === "sign-in" ? "\u767b\u5f55\u4f60\u7684\u53a8\u623f\u8d26\u6237" : "\u521b\u5efa\u53a8\u623f\u8d26\u6237"}</h2>
                  </div>
                  <button className="icon-button" onClick={() => setDialogOpen(false)} type="button">
                    <X size={16} />
                  </button>
                </div>

                <div className="auth-switcher">
                  <button className={`tag-pill ${mode === "sign-in" ? "tag-pill--active" : ""}`} onClick={() => setMode("sign-in")} type="button">
                    {"\u767b\u5f55"}
                  </button>
                  <button className={`tag-pill ${mode === "sign-up" ? "tag-pill--active" : ""}`} onClick={() => setMode("sign-up")} type="button">
                    {"\u6ce8\u518c"}
                  </button>
                </div>

                <div className="auth-form">
                  <input className="field" onChange={(event) => setEmail(event.target.value)} placeholder={"\u90ae\u7bb1"} type="email" value={email} />
                  <input
                    className="field"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={"\u5bc6\u7801\uff08\u81f3\u5c11 6 \u4f4d\uff09"}
                    type="password"
                    value={password}
                  />
                </div>

                <p className="auth-helper">
                  {mode === "sign-in"
                    ? "\u767b\u5f55\u540e\u4f1a\u5207\u6362\u5230\u4f60\u81ea\u5df1\u7684\u4e91\u7aef\u5e93\u5b58\u548c\u5468\u8ba1\u5212\u3002"
                    : "\u6ce8\u518c\u540e\u5982\u679c\u542f\u7528\u4e86\u90ae\u7bb1\u786e\u8ba4\uff0c\u8bf7\u5148\u53bb\u90ae\u7bb1\u5b8c\u6210\u9a8c\u8bc1\u3002"}
                </p>

                <div className="inline-actions">
                  <button className="button button--ghost" onClick={() => setDialogOpen(false)} type="button">
                    {"\u53d6\u6d88"}
                  </button>
                  <button className="button button--primary" disabled={isSubmitting} onClick={handleSubmit} type="button">
                    {mode === "sign-in" ? <LogIn size={16} /> : <UserPlus size={16} />}
                    {isSubmitting ? "\u63d0\u4ea4\u4e2d..." : mode === "sign-in" ? "\u767b\u5f55" : "\u6ce8\u518c"}
                  </button>
                </div>
              </div>
            </div>,
          )
        : null}
    </>
  );
}