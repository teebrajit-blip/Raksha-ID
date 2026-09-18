"use client";

import { useEffect, useState } from "react";
import { currentSession } from "@/lib/api";

export default function IdentityPage() {
  const [wallet, setWallet] = useState("");
  useEffect(() => { currentSession().then((session) => setWallet(session.walletAddress)).catch(() => setWallet("")); }, []);
  const shortWallet = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "Not connected";
  return <div className="page-body"><div className="page-title"><div><p className="eyebrow">Your identity</p><h1>Raksa Identity</h1><p className="lede">A portable profile anchored to your connected wallet.</p></div><span className={`verified-badge ${wallet ? "" : "inactive"}`}>{wallet ? "✓ Active" : "Connect wallet"}</span></div><div className="identity-layout"><section className="identity-card"><div className="identity-orb">AS</div><h2>Arjun Sharma</h2><p className="identity-id">RID-7A4C-91E2</p><div className="identity-rule" /><div className="identity-row"><span>Wallet</span><strong>{shortWallet}</strong></div><div className="identity-row"><span>Network</span><strong>Polygon Amoy</strong></div><div className="identity-row"><span>Account state</span><strong>{wallet ? "Authenticated" : "Awaiting wallet"}</strong></div></section><section className="settings-panel"><p className="eyebrow">Privacy controls</p><h2>What others can see</h2><p className="panel-copy">You decide which parts of your profile are shared alongside a credential.</p>{[["Display name", "Public", true], ["Email address", "Private", false], ["Phone number", "Private", false], ["Wallet address", "Controlled", true]].map(([label, value, checked]) => <div className="privacy-row" key={label as string}><div><strong>{label as string}</strong><p>{value as string}</p></div><span className={`toggle ${checked ? "on" : ""}`}><i /></span></div>)}<button className="secondary-button">Edit profile <span>→</span></button></section></div><div className="security-strip"><span className="status-symbol">✓</span><div><strong>Wallet authentication is enabled</strong><p>Every sign-in requires a fresh signature challenge. Your private keys never leave your wallet.</p></div></div></div>;
}
