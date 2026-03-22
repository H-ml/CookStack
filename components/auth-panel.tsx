"use client";

import { useMemo, useState } from "react";
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

  const buttonLabel = useMemo(() => {
    if (!isConfigured) {
      return "Auth 未配置";
    }

    if (!isReady) {
      return "连接中...";
    }

    if (user?.email) {
      return user.email;
    }

    return "登录同步";
  }, [isConfigured, isReady, user?.email]);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      toast.error("请输入邮箱和密码");
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

        toast.success("登录成功，已切换到你的云端厨房");
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

      toast.success(result.needsEmailConfirmation ? "注册成功，请先去邮箱完成确认" : "注册成功，已自动登录");
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

    toast.success("已退出登录，当前回到本地模式");
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
          退出
        </button>
        {dialogOpen ? (
          <div className="modal">
            <div className="modal__backdrop" onClick={() => setDialogOpen(false)} />
            <div className="modal__panel auth-modal">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Cloud Account</p>
                  <h2>当前已登录</h2>
                </div>
                <button className="icon-button" onClick={() => setDialogOpen(false)} type="button">
                  <X size={16} />
                </button>
              </div>
              <div className="auth-account-card">
                <strong>{user.email}</strong>
                <p>你的库存、食谱和周计划现在会按账号隔离同步。</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <button className="button button--ghost auth-button" onClick={() => setDialogOpen(true)} type="button">
        {isReady ? <LogIn size={16} /> : <LoaderCircle className="spin" size={16} />}
        {buttonLabel}
      </button>

      {dialogOpen ? (
        <div className="modal">
          <div className="modal__backdrop" onClick={() => setDialogOpen(false)} />
          <div className="modal__panel auth-modal">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Cloud Sync</p>
                <h2>{mode === "sign-in" ? "登录你的厨房账户" : "创建厨房账户"}</h2>
              </div>
              <button className="icon-button" onClick={() => setDialogOpen(false)} type="button">
                <X size={16} />
              </button>
            </div>

            <div className="auth-switcher">
              <button className={`tag-pill ${mode === "sign-in" ? "tag-pill--active" : ""}`} onClick={() => setMode("sign-in")} type="button">
                登录
              </button>
              <button className={`tag-pill ${mode === "sign-up" ? "tag-pill--active" : ""}`} onClick={() => setMode("sign-up")} type="button">
                注册
              </button>
            </div>

            <div className="auth-form">
              <input className="field" onChange={(event) => setEmail(event.target.value)} placeholder="邮箱" type="email" value={email} />
              <input className="field" onChange={(event) => setPassword(event.target.value)} placeholder="密码（至少 6 位）" type="password" value={password} />
            </div>

            <p className="auth-helper">
              {mode === "sign-in" ? "登录后会切换到你自己的云端库存和周计划。" : "注册后如果启用了邮箱确认，请先去邮箱完成验证。"}
            </p>

            <div className="inline-actions">
              <button className="button button--ghost" onClick={() => setDialogOpen(false)} type="button">
                取消
              </button>
              <button className="button button--primary" disabled={isSubmitting} onClick={handleSubmit} type="button">
                {mode === "sign-in" ? <LogIn size={16} /> : <UserPlus size={16} />}
                {isSubmitting ? "提交中..." : mode === "sign-in" ? "登录" : "注册"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
