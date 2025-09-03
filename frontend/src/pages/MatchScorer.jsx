import React from "react";
import FirstInningsDetails from "../components/MatchScorer/FirstInningDetails";
import SecondInningDetails from "../components/MatchScorer/SecondInningDetails";
import BatsmanOneDetails from "../components/MatchScorer/BatsmanOneDetails";
import BatsmanTwoDetails from "../components/MatchScorer/BatsmanTwoDetails";
import BowlerDetails from "../components/MatchScorer/BowlerDetails";
import ControlButtons from "../components/MatchScorer/ControlButtons";
import ScoringInterface from "../components/MatchScorer/ScoringInterface";
import InningsDetails from "../components/MatchScorer/InningsDetails";
import Partnership from "../components/MatchScorer/Partnership";
import WicketDetails from "../components/MatchScorer/WicketDetails";
import ShowMatchDetails from "../components/MatchScorer/ShowMatchDetails";
import RightSide from "../components/MatchScorer/RightSide";

const CricketScorecardManager = () => {
  return (
    <div className="flex flex-col md:flex-row border-2 border-gray-300 w-full">
      {/* Left Section */}
      <div className="flex-1 border border-gray-300 md:mr-2">
        {/* Top Row */}
        <div className="grid grid-cols-3 gap-2">
          <FirstInningsDetails />
          <InningsDetails />
          <SecondInningDetails />
        </div>

        {/* Middle Section */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          {/* Left Column */}
          <div className="flex flex-col gap-2">
            <BatsmanOneDetails />
            <BatsmanTwoDetails />
            <BowlerDetails />
            <Partnership />
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-2">
            <WicketDetails />
            <div className="flex gap-2">
              <div className="flex-1">
                <ScoringInterface />
              </div>
              <div className="w-1/4">
                <ControlButtons />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-2">
          <ShowMatchDetails />
        </div>
      </div>

      {/* Right Section */}
      <div className="w-full md:w-1/3 border border-gray-300 md:ml-2">
        <RightSide />
      </div>
    </div>
  );
};

export default CricketScorecardManager;
