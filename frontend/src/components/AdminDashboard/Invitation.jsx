import React, { useEffect, useState } from "react";
import tournamentApi from "../../api/tournamentApi";

function Invitation() {
  const [invitations, setInvitations] = useState([]);

  useEffect(() => {
    // Fetch tournament invitations on component mount
    const fetchInvitations = async () => {
      try {
        const data = await tournamentApi.getTournamentInvite();
        setInvitations(data.invitations); // Assuming the data contains an 'invitations' array
      } catch (error) {
        console.error("Error fetching invitations:", error);
      }
    };

    fetchInvitations();
  }, []);

  return (
    <div className="">
      <h1 className="text-center text-3xl font-extrabold text-gray-800 mb-10">
        Tournament Invitations
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {invitations.map((invitation) => (
          <div
            key={invitation.notificationId}
            className="bg-white shadow-lg rounded-lg p-6 transform transition duration-300 hover:scale-105 hover:shadow-xl"
          >
            <img
              src={`http://localhost:3000/${invitation.bannerImage}`}
              alt={invitation.tournamentName}
              className="w-full h-48 object-cover rounded-md mb-5"
            />
            <h2 className="text-2xl font-bold text-gray-800 mb-3 truncate">
              {invitation.tournamentName}
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              {invitation.message}
            </p>
            <p className="text-gray-500 text-sm mb-2">
              <span className="font-semibold text-gray-700">Created At:</span>{" "}
              {new Date(invitation.createdAt).toLocaleString()}
            </p>
            <p className="text-sm font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full inline-block mb-4">
              Available Slots: {invitation.availableSlots}
            </p>
            <a
              href={invitation.applyUrl}
              className="block w-full text-center bg-brand-600 text-white font-semibold py-3 rounded-md hover:bg-brand-700 transition duration-200"
            >
              Apply Now
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Invitation;
