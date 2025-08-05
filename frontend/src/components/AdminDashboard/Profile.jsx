import React, { useState } from "react";
import adminApi from "../../api/adminApi";


const Profile = ({ profilePhoto, setProfilePhoto }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProfilePhoto(reader.result); // Display the selected image before upload
      };
      reader.readAsDataURL(file);
      uploadTeamLogo(file); // Call the upload function
    }
  };

  const uploadTeamLogo = async (file) => {
    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);

    const token = localStorage.getItem("authToken"); // Get the token from localStorage

    try {
      const response = await adminApi.updateTeamLogo(file, token);

      if (response.status === 200) {
        setSuccessMessage("Team logo updated successfully!");
        console.log("Updated team logo:", response.data);
      } else {
        setError("Failed to update team logo.");
      }
    } catch (err) {
      console.error("Error during logo update:", err);
      setError("An error occurred while updating the team logo.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="bg-white p-4 rounded-lg shadow">
        <img
          src={profilePhoto}
          alt="Profile"
          className="w-24 h-24 rounded-full mb-4"
        />
        <input
          type="file"
          onChange={handlePhotoUpload}
          className="block text-sm text-gray-600 mb-4"
        />
        {isUploading && <p>Uploading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {successMessage && <p className="text-green-500">{successMessage}</p>}
        <p className="mt-4">Name: Team Manager</p>
        <p>Email: manager@example.com</p>
      </div>
    </div>
  );
};

export default Profile;
