"use client";

import { useEffect, useState } from "react";
import { confirmRegistration, createAsset, listAssets, verifyAsset, type ApiAsset } from "@/lib/api";
import { registerAssetOnWallet } from "@/lib/wallet-registration";

export default function VerificationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [assets, setAssets] = useState<ApiAsset[]>([]);
  const [assetId, setAssetId] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof verifyAsset>> | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    listAssets()
      .then((items) => {
        setAssets(items);
        setAssetId(items[0]?.id ?? "");
      })
      .catch(() => setError("Connect your wallet to verify an asset from your vault."));
  }, []);

  async function runVerification() {
    if (!file || !assetId) return;
    setChecking(true);
    setError("");
    setResult(null);
    setSaved(false);
    try {
      setResult(await verifyAsset(assetId, file));
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "Verification failed.");
    } finally {
      setChecking(false);
    }
  }

  async function saveVerifiedAsset() {
    if (!file || !result || result.integrity !== "MATCHED" || saved) return;
    setSaving(true);
    setError("");
    try {
      const name = file.name.replace(/\.[^/.]+$/, "") || "Verified document";
      const asset = await createAsset({ name, type: "Certificate", file });
      setAssets((current) => [asset, ...current]);
      try {
        const transactionHash = await registerAssetOnWallet(asset.id, asset.hash ?? result.submittedHash);
        const registered = await confirmRegistration(asset.id, transactionHash);
        setAssets((current) => current.map((item) => (item.id === asset.id ? registered : item)));
        setSaved(true);
      } catch (registrationError) {
        setError(
          `Asset saved, but blockchain registration is still pending: ${
            registrationError instanceof Error ? registrationError.message : "complete the Register action in Assets."
          }`
        );
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The verified asset could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-body">
      <div className="page-title">
        <div>
          <p className="eyebrow">Trust layer</p>
          <h1>Verify an asset</h1>
          <p className="lede">Check a document against its registered SHA-256 fingerprint.</p>
        </div>
      </div>
      <div className="verification-layout">
        <section className="verify-form">
          <label className="field-label">
            Asset to verify
            <select value={assetId} onChange={(event) => setAssetId(event.target.value)}>
              <option value="" disabled>
                Select an asset
              </option>
              {assets.map((asset) => (
                <option value={asset.id} key={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </label>
          <label className="drop-zone">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
                setSaved(false);
              }}
            />
            <span className="upload-icon">↑</span>
            <strong>{file ? file.name : "Drop a document here"}</strong>
            <p>PDF, JPG, or PNG up to 10 MB</p>
          </label>
          <button
            className="primary-button verify-button"
            disabled={!file || !assetId || checking}
            onClick={runVerification}
          >
            {checking ? "Checking integrity..." : "Run verification"} <span>→</span>
          </button>
          {error && <p className="form-error">{error}</p>}
          <p className="form-footnote">The submitted document is hashed for comparison and is not stored.</p>
        </section>
        <section className={`verification-result ${result ? "complete" : ""}`}>
          <div className="result-heading">
            <span className="result-icon">
              {result ? (result.integrity === "MATCHED" ? "✓" : "!") : "⌁"}
            </span>
            <div>
              <p className="eyebrow">Verification result</p>
              <h2>
                {result
                  ? result.integrity === "MATCHED"
                    ? "Integrity matched"
                    : "Integrity mismatch"
                  : "Ready to check"}
              </h2>
            </div>
          </div>
          {result ? (
            <>
              <p className="result-copy">
                {result.integrity === "MATCHED"
                  ? "This document matches the registered artifact."
                  : "The uploaded bytes do not match the registered artifact."}
              </p>
              {[
                ["Document integrity", result.integrity === "MATCHED" ? "Matched" : "Mismatch"],
                ["Blockchain registration", result.blockchainRegistration],
                ["Issuer authenticity", result.issuerAuthenticity],
                ["Revocation status", result.revocationStatus],
                ["Network", result.network],
                ["SHA-256", result.submittedHash.slice(0, 18) + "..."],
              ].map(([label, value]) => (
                <div className="result-row" key={label}>
                  <span>{label}</span>
                  <strong className={result.integrity === "MISMATCH" && label === "Document integrity" ? "result-failure" : ""}>
                    {value}
                  </strong>
                </div>
              ))}
              {result.integrity === "MATCHED" && (
                <button
                  className="secondary-button save-asset-button"
                  disabled={saving || saved}
                  onClick={saveVerifiedAsset}
                >
                  {saved ? "Registered and added" : saving ? "Adding and registering..." : "Add and register asset"}{" "}
                  <span>→</span>
                </button>
              )}
            </>
          ) : (
            <p className="result-copy">
              Choose one of your assets and upload a document to compare its fingerprint with the registered record.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
