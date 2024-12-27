import React, { useEffect, useState } from "react";
import adminApi from "../../api/adminApi"; // Import the adminApi to call the backend API

const Sidebar = ({
  sections,
  activeSection,
  handleSectionClick,
  toggleSidebar,
  isSidebarOpen,
}) => {
  const [teamName, setTeamName] = useState("Admin"); // Default fallback
  const [profileImage, setProfileImage] = useState(""); // State to hold the profile image URL
  const [loading, setLoading] = useState(true); // Track loading state for team name and profile image

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const response = await adminApi.getAllAdminsAndTeams(); // Fetch admins and teams
        const adminData = response.data[0]; // Assuming the first admin in the list is the logged-in admin

        setTeamName(adminData.team_name); // Set team name from the response
        // If the logo is a relative path (like 'uploads/team-logo.jpg'), construct the full URL
        const imageUrl = adminData.logo
          ? `http://localhost:3000/${adminData.logo}` // Assuming logo stores the relative path
          : "https://via.placeholder.com/150"; // Fallback image
        setProfileImage(imageUrl); // Set the profile image URL
      } catch (error) {
        console.error("Error fetching admin profile:", error);
        setProfileImage("https://via.placeholder.com/150"); // Fallback image on error
      } finally {
        setLoading(false); // Set loading to false after the request completes
      }
    };

    fetchAdminProfile(); // Call the function to fetch the admin profile
  }, []);

  return (
    <div
      className={`fixed z-20 top-0 left-0 h-full w-64 bg-gray-800 shadow-lg transition-transform transform ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-64"
      } md:relative md:translate-x-0`}
    >
      <div className="p-6 border-b border-gray-700 text-center">
        <h1 className="text-white text-2xl font-bold tracking-wide">
          Admin Dashboard
        </h1>
        <img
          src={profileImage}
          alt="Admin Profile"
          className="w-16 h-16 rounded-full mx-auto mt-4"
        />
        <p className="text-gray-400 mt-2">
          {loading ? "Loading team name..." : teamName}
        </p>
      </div>
      <nav className="px-4 py-6">
        <ul className="space-y-3">
          {sections.map((section) => (
            <li
              key={section.id}
              className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-300 cursor-pointer ${
                activeSection === section.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
              onClick={() => handleSectionClick(section.id)}
            >
              {section.name}
            </li>
          ))}
        </ul>
      </nav>
      <div className="px-6 py-4 border-t border-gray-700 text-center">
        <p className="text-sm text-gray-400">© 2024 Team Manager</p>
      </div>
    </div>
  );
};

export default Sidebar;
