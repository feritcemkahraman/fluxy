import { useEffect } from 'react';
import electronAPI from '../utils/electronAPI';
import { useAuth } from '../context/AuthContext';

const DesktopNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!electronAPI.isElectron()) {
      return;
    }

    // Request notification permission
    electronAPI.requestNotificationPermission();

    // Handle app focus/blur for notification management
    const handleAppFocus = () => {
      console.log('🔔 App focused - notifications may be suppressed');
    };

    const handleAppBlur = () => {
      console.log('🔔 App blurred - notifications enabled');
    };

    // Handle deep links (fluxy://)
    const handleDeepLink = (event, url) => {
      console.log('🔗 Deep link received:', url);
      // Handle deep link navigation here
      // Example: fluxy://join/channel/123
    };

    // Handle theme changes
    const handleThemeChanged = (event, isDark) => {
      console.log('🎨 System theme changed:', isDark ? 'dark' : 'light');
      // Update app theme based on system preference
      document.documentElement.classList.toggle('dark', isDark);
    };

    // Handle updates
    const handleUpdateAvailable = () => {
      // Update notification removed as requested
    };

    const handleUpdateDownloaded = () => {
      // Update notification removed as requested
    };

    // Add event listeners
    electronAPI.onAppFocus(handleAppFocus);
    electronAPI.onAppBlur(handleAppBlur);
    electronAPI.onDeepLink(handleDeepLink);
    electronAPI.onThemeChanged(handleThemeChanged);
    electronAPI.onUpdateAvailable(handleUpdateAvailable);
    electronAPI.onUpdateDownloaded(handleUpdateDownloaded);

    // Show welcome notification
    if (user) {
      // Welcome notification removed as requested
    }

    // Cleanup on unmount
    return () => {
      electronAPI.removeAllListeners();
    };
  }, [user]);

  // This component doesn't render anything
  return null;
};

export default DesktopNotifications;
