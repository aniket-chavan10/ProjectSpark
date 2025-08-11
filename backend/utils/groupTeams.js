/**
 * Auto-group 32 teams into 4 groups (A, B, C, D) with 8 teams each.
 * 
 * @param {Array} participants - Array of participant objects from `tournament_participants`.
 *        Each must minimally include { id } (primary key of participant record).
 * @param {number} totalGroups - Number of groups to create (default 4).
 * @param {Array} groupNames - Array of names for groups (default ['A', 'B', 'C', 'D']).
 * @returns {Array} Array of assignment objects: { participantId, groupName }
 * 
 * Example usage:
 * const assignments = autoGroupTeams(appliedParticipants);
 */
function autoGroupTeams(participants, totalGroups = 4, groupNames = ['A', 'B', 'C', 'D']) {
  if (!Array.isArray(participants)) {
    throw new Error('Participants must be an array');
  }

  if (participants.length !== totalGroups * 8) {
    throw new Error(
      `Expected exactly ${totalGroups * 8} participants for grouping, but received ${participants.length}`
    );
  }

  if (groupNames.length < totalGroups) {
    throw new Error(`Not enough group names provided for ${totalGroups} groups`);
  }

  // 1. Shuffle participants randomly for fair distribution
  const shuffled = [...participants].sort(() => 0.5 - Math.random());

  // 2. Assign groups in round-robin, ensuring 8 per group
  const assignments = [];
  for (let i = 0; i < shuffled.length; i++) {
    const participant = shuffled[i];
    const groupIndex = Math.floor(i / 8); // 8 teams per group
    assignments.push({
      participantId: participant.id,
      groupName: groupNames[groupIndex]
    });
  }

  return assignments;
}

module.exports = { autoGroupTeams };
