"use client";

import React from "react";
import ProfileTab from "../tabs/ProfileTab";

export default function ProfilePage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your personal profile and security</p>
      </div>
      <ProfileTab />
    </>
  );
}
