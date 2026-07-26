import { useState, useCallback } from 'react';
import { isAiFeatureEnabled, registerAiSecretTap } from '@/lib/utils';

export function useAiFeatureEnabled() {
  const [aiEnabled, setAiEnabled] = useState(() => isAiFeatureEnabled());

  const registerSecretTap = useCallback(() => {
    if (aiEnabled) return;
    const unlocked = registerAiSecretTap();
    if (unlocked) setAiEnabled(true);
  }, [aiEnabled]);

  const handleAiButtonClick = useCallback((onChooseAi) => {
    if (aiEnabled) onChooseAi();
  }, [aiEnabled]);

  return { aiEnabled, registerSecretTap, handleAiButtonClick };
}
