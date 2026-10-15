import React, { useState } from "react";

import Navbar from "./components/common/Navbar";
import Sidebar from "./components/common/Sidebar";

import DashboardPage from "./pages/DashboardPage";
import IntakePage from "./pages/IntakePage";
import CaseDetailPage from "./pages/CaseDetailPage";
import VaspDirectoryPage from "./pages/VaspDirectoryPage";
import VerificationPage from "./pages/VerificationPage";

export default function App() {
  const [activeTab, setActiveTab] = useState("case");

  const [activeCase, setActiveCase] = useState(null);

  const handleStartTracing = (savedCase) => {
    setActiveCase(savedCase);
    setActiveTab("case");
  };

  const handleOpenCase = (savedCase) => {
    setActiveCase(savedCase);
    setActiveTab("case");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "intake":
        return (
          <IntakePage
            onStartTracing={handleStartTracing}
          />
        );

      case "dashboard":
        return (
          <DashboardPage
            onOpenCase={handleOpenCase}
          />
        );

      case "case":
        return (
          <CaseDetailPage
            activeCase={activeCase}
          />
        );

      case "vasp":
        return <VaspDirectoryPage />;

      case "verify":
        return <VerificationPage />;

      default:
        return (
          <CaseDetailPage
            activeCase={activeCase}
          />
        );
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="main-content">
        <Navbar />
        {renderContent()}
      </div>
    </div>
  );
}