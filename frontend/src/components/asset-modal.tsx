"use client";

import { useState } from "react";

export function AssetModal({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string, type: string, file: File) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Certificate");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !file) { setError("Add a name and choose a document to continue."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Documents must be smaller than 10 MB."); return; }
    onCreated(name.trim(), type, file);
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal" onSubmit={submit}><div className="modal-heading"><div><p className="eyebrow">New record</p><h2>Add a digital asset</h2></div><button type="button" className="close-button" onClick={onClose} aria-label="Close">×</button></div><label>Asset name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. B.Tech Certificate" /></label><label>Asset type<select value={type} onChange={(event) => setType(event.target.value)}><option>Certificate</option><option>License</option><option>Transcript</option><option>Credential</option></select></label><label>Document<span className="file-input"><input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />{file ? file.name : "Choose a PDF or image"}</span></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Continue to registration <span>→</span></button></div><p className="modal-note">Your file will be stored privately and hashed before blockchain registration.</p></form></div>;
}
