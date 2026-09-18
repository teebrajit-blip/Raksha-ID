"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useEffect } from "react";
import { currentSession, logout, requestNonce, verifyWallet } from "@/lib/api";

type EthereumProvider = { request: (args: { method: string; params?: string[] }) => Promise<string | string[]> };
declare global { interface Window { ethereum?: EthereumProvider } }

const navItems = [
  ["Overview", "/", "icon-0"],
  ["Identity", "/identity", "icon-1"],
  ["Assets", "/assets", "icon-2"],
  ["Verification", "/verification", "icon-3"],
  ["Access", "/access", "icon-4"],
] as const;

const breadcrumbs: Record<string, string> = { "/": "Overview", "/identity": "Identity", "/assets": "Assets", "/verification": "Verification", "/access": "Access" };

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletError, setWalletError] = useState("");
  const current = breadcrumbs[pathname] ?? "Overview";
  useEffect(() => { currentSession().then((session) => setWalletAddress(session.walletAddress)).catch(() => undefined); }, []);

  async function connectWallet() {
    setWalletError("");
    if (!window.ethereum) { setWalletError("Install a browser wallet to connect."); return; }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      const address = accounts[0];
      if (!address) throw new Error("No wallet account was selected.");
      const challenge = await requestNonce(address);
      const signature = await window.ethereum.request({ method: "personal_sign", params: [challenge.message, address] }) as string;
      const session = await verifyWallet(address, signature);
      setWalletAddress(session.walletAddress);
    } catch (error) { setWalletError(error instanceof Error ? error.message : "Wallet connection failed."); }
  }

  async function disconnectWallet() { await logout(); setWalletAddress(""); }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/"><span className="brand-mark">R</span><span>raksa<span className="brand-light">id</span></span></Link>
        <div className="sidebar-label">Workspace</div>
        <nav aria-label="Main navigation">
          {navItems.map(([label, href, icon]) => <Link className={`nav-item ${pathname === href ? "active" : ""}`} href={href} key={label}><span className={`nav-icon ${icon}`} />{label}{label === "Access" && <span className="nav-count">2</span>}</Link>)}
        </nav>
        <div className="sidebar-spacer" />
        <Link className="nav-item" href="/identity"><span className="nav-icon icon-settings" />Settings</Link>
        <div className="network-card"><div className="online-dot" />Polygon Amoy <span>Connected</span></div>
      </aside>
      <section className="content">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> {current}</div><div className="top-actions"><button className="icon-button" aria-label="Toggle notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><span className="bell" /><i /></button>{walletAddress ? <><div className="avatar">AS</div><button className="profile-name profile-button" onClick={disconnectWallet}>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}<span>Connected · Sign out</span></button></> : <button className="connect-button" onClick={connectWallet}>Connect wallet</button>}<span className="chevron" /></div>{walletError && <div className="wallet-error" role="alert">{walletError}</div>}{notificationsOpen && <div className="notification-popover"><strong>Notifications</strong><p>Your certificate was registered on Polygon Amoy.</p><p>2 access requests need review.</p></div>}</header>
        {children}
      </section>
    </main>
  );
}
