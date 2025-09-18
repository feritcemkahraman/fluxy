import audioManager from '../utils/audioManager';

export const useAudio = () => {
  const playVoiceJoin = async () => await audioManager.playVoiceJoin();
  const playVoiceLeave = async () => await audioManager.playVoiceLeave();

  return {
    playVoiceJoin,
    playVoiceLeave
  };
};