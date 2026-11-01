import React, { useState } from 'react';
import playersApi from '../../api/playerApi'; // Assuming the API file is in the same directory

const Profile = () => {
  const [player, setPlayer] = useState({
    id: '12345',
    name: 'John Doe',
    mobile: '9876543210',
    email: 'john.doe@example.com',
    profilePhoto: 'https://via.placeholder.com/150',
  });

  const [newProfilePhoto, setNewProfilePhoto] = useState(player.profilePhoto);
  const [selectedFile, setSelectedFile] = useState(null);

  // Handle profile photo preview
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setNewProfilePhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle profile update
  const handleProfileUpdate = async () => {
    try {
      const updatedData = {
        name: player.name,
        email: player.email,
        mobile: player.mobile,
      };

      await playersApi.createPlayer(updatedData, selectedFile);

      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          {/* Profile Image */}
          <img
            src={newProfilePhoto}
            alt="Profile"
            className="w-24 h-24 rounded-full"
          />
          <div>
            {/* Player Info */}
            <p className="text-lg font-semibold">Name: {player.name}</p>
            <p>Email: {player.email}</p>
            <p>Mobile: {player.mobile}</p>
            <p>ID: {player.id}</p>
          </div>
        </div>

        {/* Change Profile Picture */}
        <div className="mt-4">
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="block text-sm text-gray-600"
          />
        </div>

        {/* Update Profile Button */}
        <button
          onClick={handleProfileUpdate}
          className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
        >
          Update Profile
        </button>
      </div>
    </div>
  );
};

export default Profile;
