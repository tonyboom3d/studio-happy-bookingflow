import { useCallback } from 'react';
import { isAiFeatureEnabled } from '@/lib/utils';

export function useAiFeatureEnabled() {
  const aiEnabled = isAiFeatureEnabled();

  const handleAiButtonClick = useCallback((onChooseAi) => {
    if (aiEnabled) onChooseAi();
  }, [aiEnabled]);

  return { aiEnabled, handleAiButtonClick };
}
