import React from "react";
import "./styles/AppHeader.css";
import UserMenu from "./UserMenu";

export default function AppHeader() {
  return (
    <header className="header">
      <h1 className="app-title">HAL-TEST</h1>
      <UserMenu />
    </header>
  );
}
