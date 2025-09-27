// Radical Electron performance optimizer
export const initElectronOptimizations = () => {
  // Force immediate rendering
  if (typeof requestAnimationFrame !== 'undefined') {
    const originalRAF = requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      // Execute immediately instead of waiting for next frame
      return setTimeout(callback, 0);
    };
  }

  // Disable all smooth scrolling
  const style = document.createElement('style');
  style.textContent = `
    * {
      scroll-behavior: auto !important;
      -webkit-overflow-scrolling: auto !important;
      overflow-scrolling: auto !important;
    }
  `;
  document.head.appendChild(style);

  // Force GPU acceleration on all elements
  const forceGPU = () => {
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      el.style.transform = 'translateZ(0)';
      el.style.willChange = 'transform';
    });
  };

  // Run immediately and on DOM changes
  forceGPU();
  
  // Observer for new elements
  const observer = new MutationObserver(() => {
    forceGPU();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Disable all animations during scroll
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    document.body.style.pointerEvents = 'none';
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      document.body.style.pointerEvents = 'auto';
    }, 50);
  }, { passive: true });

  console.log('🚀 Radical Electron optimizations applied');
};
