import { useState, useCallback, useRef, useEffect } from 'react';
import { MAX_MESSAGE_LENGTH, MESSAGE_ERRORS, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from '../constants';

/**
 * Message Input Hook - Discord Style
 * Manages message input state, file attachments, and validation
 */
export const useMessageInput = (onSend, options = {}) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const {
    maxLength = MAX_MESSAGE_LENGTH,
    allowAttachments = true,
    placeholder = 'Mesaj yazın...',
    autoFocus = false
  } = options;

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  // Handle content change
  const handleContentChange = useCallback((e) => {
    const newContent = e.target.value;
    
    if (newContent.length <= maxLength) {
      setContent(newContent);
      setError(null);
    } else {
      setError(MESSAGE_ERRORS.TOO_LONG);
    }
    
    adjustTextareaHeight();
  }, [maxLength, adjustTextareaHeight]);

  // Handle file selection
  const handleFileSelect = useCallback((files) => {
    if (!allowAttachments) return;

    const validFiles = [];
    const errors = [];

    Array.from(files).forEach(file => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: ${MESSAGE_ERRORS.FILE_TOO_LARGE}`);
        return;
      }

      // Check file type
      const extension = file.name.split('.').pop()?.toLowerCase();
      const isSupported = Object.values(SUPPORTED_FILE_TYPES)
        .flat()
        .includes(extension);

      if (!isSupported) {
        errors.push(`${file.name}: ${MESSAGE_ERRORS.UNSUPPORTED_FILE}`);
        return;
      }

      validFiles.push({
        id: `file_${Date.now()}_${Math.random()}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      });
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
    } else {
      setError(null);
    }

    setAttachments(prev => [...prev, ...validFiles]);
  }, [allowAttachments]);

  // Remove attachment
  const removeAttachment = useCallback((attachmentId) => {
    setAttachments(prev => {
      const updated = prev.filter(att => att.id !== attachmentId);
      // Clean up preview URLs
      const removed = prev.find(att => att.id === attachmentId);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  }, []);

  // Handle send
  const handleSend = useCallback(async () => {
    // Prevent double-send but don't block typing
    if (isSending) {
      console.log('⏳ Already sending, ignoring duplicate send request');
      return;
    }

    const trimmedContent = content.trim();
    
    // Validate content
    if (!trimmedContent && attachments.length === 0) {
      setError(MESSAGE_ERRORS.EMPTY);
      return;
    }

    if (trimmedContent.length > maxLength) {
      setError(MESSAGE_ERRORS.TOO_LONG);
      return;
    }

    setIsSending(true);
    setError(null);

    // Clear input IMMEDIATELY for instant feedback (optimistic UI)
    setContent('');
    setAttachments([]);
    setReplyTo(null);
    adjustTextareaHeight();

    try {
      const result = await onSend({
        content: trimmedContent,
        attachments: attachments.map(att => att.file),
        replyTo
      });

      if (result.success) {
        // Input already cleared above
        // Focus back to input immediately
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      } else {
        // Restore content on failure
        setContent(trimmedContent);
        setError(result.error || MESSAGE_ERRORS.SEND_FAILED);
      }
    } catch (error) {
      console.error('Send message error:', error);
      // Restore content on error
      setContent(trimmedContent);
      setError(MESSAGE_ERRORS.NETWORK_ERROR);
    } finally {
      setIsSending(false);
    }
  }, [content, attachments, replyTo, isSending, maxLength, onSend, adjustTextareaHeight]);

  // Handle key press
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Set reply
  const setReplyToMessage = useCallback((message) => {
    setReplyTo(message);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Clear reply
  const clearReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  // Focus input
  const focusInput = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Auto-focus on mount only
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      attachments.forEach(att => {
        if (att.preview) {
          URL.revokeObjectURL(att.preview);
        }
      });
    };
  }, []);

  const canSend = (content.trim() || attachments.length > 0) && !error;
  const remainingChars = maxLength - content.length;

  return {
    // State
    content,
    attachments,
    replyTo,
    isSending,
    error,
    canSend,
    remainingChars,
    
    // Refs
    textareaRef,
    fileInputRef,
    
    // Handlers
    handleContentChange,
    handleFileSelect,
    handleKeyPress,
    handleSend,
    removeAttachment,
    setReplyToMessage,
    clearReply,
    focusInput,
    clearError: () => setError(null),
    
    // Config
    placeholder,
    maxLength
  };
};
