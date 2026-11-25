"use client";

import { useEffect, useState } from "react";

export default function PhotoRequestButton({ matriId, locked }) {
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/photo-request?matri_id=${encodeURIComponent(matriId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => j.requested && setState("sent"))
      .catch(() => {});
  }, [matriId]);

  const send = async () => {
    setState("sending");
    try {
      const r = await fetch("/api/photo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matri_id: matriId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Could not send request.");
      setState("sent");
    } catch (e) {
      setState("error");
      setMsg(e.message);
    }
  };

  return (
    <div className="pd-photo-req">
      <button type="button" className="btn btn-sm btn-gold rounded-pill px-3 shadow-sm" onClick={send} disabled={state === "sending" || state === "sent"}
        title={state === "error" ? msg : undefined}>
        {state === "sent" ? <><i className="bi bi-check2 me-1" />Photo requested</>
          : state === "sending" ? "Sending…"
            : <><i className="bi bi-camera me-1" />{locked ? "Request access" : "Request photo"}</>}
      </button>
    </div>
  );
}
