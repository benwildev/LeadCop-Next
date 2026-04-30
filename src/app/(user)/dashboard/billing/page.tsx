"use client";

import React from "react";
import BillingTab from "../tabs/BillingTab";

export default function BillingPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground text-sm mt-0.5">View billing history and invoices</p>
      </div>
      <BillingTab />
    </>
  );
}
