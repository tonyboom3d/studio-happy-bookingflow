import { useState, useCallback } from 'react';
import { isAiFeatureEnabled, registerAiSecretTap } from '@/lib/utils';

export function useAiFeatureEnabled() {
  const [aiEnabled, setAiEnabled] = useState(() => isAiFeatureEnabled());

  const handleAiButtonClick = useCallback((onChooseAi) => {
    if (aiEnabled) {
      onChooseAi();
      return;
    }
    const unlocked = registerAiSecretTap();
    if (unlocked) {
      setAiEnabled(true);
      onChooseAi();
    }
  }, [aiEnabled]);

  return { aiEnabled, handleAiButtonClick };
}
