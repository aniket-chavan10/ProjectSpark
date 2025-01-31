import React, { useState, useEffect } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";

const ProgressTracker = ({ currentStepFromDB, onStepChange }) => {
  const [currentStep, setCurrentStep] = useState(currentStepFromDB || 1); // Track current step
  const totalSteps = 6; // Total number of steps

  // Step labels (customize as needed)
  const stepLabels = ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "Step 6"];

  // Sync with database step
  useEffect(() => {
    if (currentStepFromDB && currentStepFromDB !== currentStep) {
      setCurrentStep(currentStepFromDB);
    }
  }, [currentStepFromDB]);

  // Function to handle step change
  const handleStepChange = (step) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
      if (onStepChange) {
        onStepChange(step); // Notify parent component or update database
      }
    }
  };

  // Calculate progress width
  const progressWidth = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full p-4">
      {/* Progress container */}
      <div className="max-w-2xl mx-auto relative">
        {/* Background line */}
        <div className="h-1 bg-gray-200 absolute top-1/2 left-0 right-0 -translate-y-1/2" />

        {/* Progress line */}
        <div
          className="h-1 bg-green-500 absolute top-1/2 left-0 -translate-y-1/2 transition-all duration-500 ease-in-out"
          style={{ width: `${progressWidth}%` }}
        />

        {/* Steps */}
        <div className="flex justify-between relative w-full">
          {[...Array(totalSteps)].map((_, i) => {
            const step = i + 1;
            const isCompleted = step < currentStep; // Step is completed if it's before the current step
            const isActive = step === currentStep; // Step is active if it's the current step

            return (
              <div
                key={step}
                className="relative z-10"
                style={{ width: `${100 / (totalSteps - 1)}%` }}
              >
                {/* Circle indicator */}
                <button
                  onClick={() => handleStepChange(step)}
                  className={`absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2
                  w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                  ${
                    isCompleted
                      ? "bg-green-500 border-green-500"
                      : isActive
                      ? "bg-white border-2 border-green-500"
                      : "bg-white border-2 border-gray-300"
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-4 h-4 text-white" />
                  ) : (
                    <span
                      className={`${
                        isActive ? "text-green-500" : "text-gray-400"
                      }`}
                    >
                      {step}
                    </span>
                  )}
                </button>

                {/* Step label */}
                <div className="absolute top-full left-0 -translate-x-1/2 mt-2 text-center">
                  <span
                    className={`text-xs font-medium ${
                      isCompleted || isActive
                        ? "text-green-500"
                        : "text-gray-400"
                    }`}
                  >
                    {stepLabels[i]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;



