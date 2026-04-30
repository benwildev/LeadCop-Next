"use client";

import React from "react";
import AuditLogTab from "../tabs/AuditLogTab";

export default function AuditLogPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Review your API request history</p>
      </div>
      <AuditLogTab />
    </>
  );
}
