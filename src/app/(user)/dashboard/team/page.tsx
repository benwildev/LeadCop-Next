"use client";

import React from "react";
import TeamTab from "../tabs/TeamTab";

export default function TeamPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Team</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage team members and seats</p>
      </div>
      <TeamTab />
    </>
  );
}
