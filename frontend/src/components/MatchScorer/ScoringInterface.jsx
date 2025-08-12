import React, { useState } from "react";

const ScoringInterface = () => {
  const [selectedValues, setSelectedValues] = useState({
    lb: null,
    bye: null,
    run: null,
    wide: null,
    noBall: null,
  });

  const handleSelection = (type, value) => {
    setSelectedValues((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

  // Inline Button Component
  const Button = ({ children, className, ...props }) => {
    return (
      <button
        className={`px-4 py-2 rounded-md font-medium transition focus:outline-none hover:opacity-80 ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="w-full mx-auto p-4 space-y-3">
      {/* Top Section - LB & Bye */}
      <div className="grid grid-cols-2 gap-2">
        {/* LB Column */}
        <div className="bg-orange-600 p-3 rounded-lg shadow-md">
          <h3 className="text-white font-semibold text-sm mb-2">LB</h3>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((num) => (
              <Button
                key={`lb-${num}`}
                className={`h-10 ${selectedValues.lb === num ? "bg-gray-300" : "bg-white"} text-black font-semibold`}
                onClick={() => handleSelection("lb", num)}
              >
                {num}
              </Button>
            ))}
          </div>
        </div>

        {/* Bye Column */}
        <div className="bg-orange-300 p-3 rounded-lg shadow-md">
          <h3 className="text-white font-semibold text-sm mb-2">Bye</h3>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((num) => (
              <Button
                key={`bye-${num}`}
                className={`h-10 ${selectedValues.bye === num ? "bg-gray-300" : "bg-white"} text-black font-semibold`}
                onClick={() => handleSelection("bye", num)}
              >
                {num}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Run Section */}
      <div className="bg-teal-600 p-3 rounded-lg shadow-md">
        <h3 className="text-white font-semibold text-sm mb-2">Run</h3>
        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-3 grid grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 6].map((num) => (
              <Button
                key={`run-${num}`}
                className={`h-10 ${selectedValues.run === num ? "bg-gray-300" : "bg-white"} text-black font-semibold`}
                onClick={() => handleSelection("run", num)}
              >
                {num}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Button className="h-10 bg-red-600 text-white font-bold" onClick={() => handleSelection("run", "RUN OUT")}>
              RUN OUT
            </Button>
            <Button className="h-10 bg-red-600 text-white font-bold" onClick={() => handleSelection("run", "OUT")}>
              OUT
            </Button>
          </div>
        </div>
      </div>

      {/* Wide Section */}
      <div className="bg-gray-200 p-3 rounded-lg shadow-md">
        <h3 className="text-gray-700 font-semibold text-sm mb-2">Wide</h3>
        <div className="grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map((num) => (
            <Button
              key={`wide-${num}`}
              className={`h-10 ${selectedValues.wide === num ? "bg-gray-300" : "bg-white"} text-black font-semibold`}
              onClick={() => handleSelection("wide", num)}
            >
              {num}
            </Button>
          ))}
        </div>
      </div>

      {/* No Ball Section */}
      <div className="bg-red-600 p-3 rounded-lg shadow-md">
        <h3 className="text-white font-semibold text-sm mb-2">No Ball</h3>
        <div className="grid grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 6].map((num) => (
            <Button
              key={`noball-${num}`}
              className={`h-10 ${selectedValues.noBall === num ? "bg-gray-300" : "bg-white"} text-black font-semibold`}
              onClick={() => handleSelection("noBall", num)}
            >
              {num}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScoringInterface;
