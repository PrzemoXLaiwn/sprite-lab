"use client";

import { OnboardingWizard, useOnboarding } from "./OnboardingWizard";
import { GeneratorTutorial, useGeneratorTutorial } from "./GeneratorTutorial";

// Wrapper version with children (for wrapping content)
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { showOnboarding, isChecking, completeOnboarding, skipOnboarding } = useOnboarding();

  // Don't render anything while checking (prevents flash)
  if (isChecking) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
        />
      )}
    </>
  );
}

// Standalone version (just renders the wizard if needed)
export function OnboardingOverlay() {
  const { showOnboarding, isChecking, completeOnboarding, skipOnboarding } = useOnboarding();

  // Don't render while checking
  if (isChecking || !showOnboarding) {
    return null;
  }

  return (
    <OnboardingWizard
      onComplete={completeOnboarding}
      onSkip={skipOnboarding}
    />
  );
}

// Tutorial overlay (shows after onboarding is complete)
export function TutorialOverlay() {
  const { showTutorial, isChecking, completeTutorial, skipTutorial } = useGeneratorTutorial();

  // Don't render while checking
  if (isChecking || !showTutorial) {
    return null;
  }

  return (
    <GeneratorTutorial
      onComplete={completeTutorial}
      onSkip={skipTutorial}
    />
  );
}
