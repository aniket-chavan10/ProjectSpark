import React, { useState } from "react";
import Sidebar from "./Sidebar";

const App = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleSectionClick = (sectionId) => {
    setActiveSection(sectionId);
  };

  const sections = [
    { id: "dashboard", name: "Dashboard" },
    { id: "teams", name: "Teams" },
    { id: "players", name: "Players" },
    { id: "tournaments", name: "Tournaments" }, // New "Tournaments" section
  ];

  return (
    <div className="flex">
      <Sidebar
        sections={sections}
        activeSection={activeSection}
        handleSectionClick={handleSectionClick}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <div className="flex-1 p-6">
        <h2>{`You are viewing the ${activeSection} section`}</h2>
      </div>
    </div>
  );
};

export default App;
