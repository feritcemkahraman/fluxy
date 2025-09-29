// Messages Feature Module - Discord Style
// Centralized exports for all messaging functionality

// Components
export { default as DirectMessageChat } from './components/DirectMessageChat';
export { default as MessageInput } from './components/MessageInput';
export { default as MessageItem } from './components/MessageItem';

// Hooks
export { useMessages } from './hooks/useMessages';
export { useDirectMessages } from './hooks/useDirectMessages';
export { useMessageInput } from './hooks/useMessageInput';
export { useTypingIndicator } from './hooks/useTypingIndicator';

// Services
export { messageService } from './services/messageService';

// Types & Constants
export * from './types';
export * from './constants';
