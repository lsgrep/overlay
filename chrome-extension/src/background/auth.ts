// Supabase authentication background script

// Storage keys for tokens
export const chromeStorageKeys = {
  supabaseAccessToken: 'supabaseAccessToken',
  supabaseRefreshToken: 'supabaseRefreshToken',
};

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('[AUTH] Background received message:', request.action, request.payload);

  switch (request.action) {
    case 'signInWithProvider': {
      // Remove any old listener if exists
      chrome.tabs.onUpdated.removeListener(setTokens);
      const url = request.payload.url;
      console.log('[AUTH] Opening auth URL:', url);

      // Create new tab with that url
      chrome.tabs.create({ url: url, active: true }, tab => {
        // Add listener to that url and watch for access_token and refresh_token query string params
        console.log('[AUTH] Created tab with ID:', tab.id);
        chrome.tabs.onUpdated.addListener(setTokens);
        sendResponse(request.action + ' executed');
      });

      break;
    }

    default:
      break;
  }

  return true;
});

// Function to extract and save tokens from the redirect URL
const setTokens = async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  console.log('[AUTH] Tab updated event:', {
    tabId,
    status: tab.status,
    url: tab.url?.substring(0, 50) + '...',
  });

  // Once the tab is loaded
  if (tab.status === 'complete') {
    if (!tab.url) {
      console.log('[AUTH] Tab URL is undefined, skipping');
      return;
    }

    console.log('[AUTH] Tab is complete, processing URL');
    const url = new URL(tab.url);
    console.log('[AUTH] Tab URL updated:', url.toString());
    console.log('[AUTH] URL origin:', url.origin);
    console.log('[AUTH] URL hash:', url.hash);
    console.log('[AUTH] URL search params:', url.search);

    // Check if this is our redirect URL (overlay.one)
    if (url.origin === 'https://overlay.one') {
      console.log('[AUTH] Detected overlay.one URL, checking for tokens');

      // First check if tokens are in the hash fragment
      const hashParams = new URLSearchParams(url.hash.substring(1));
      let accessToken = hashParams.get('access_token');
      let refreshToken = hashParams.get('refresh_token');

      // If not in hash, check if they're in the search params
      if (!accessToken || !refreshToken) {
        console.log('[AUTH] Tokens not found in hash, checking search params');
        const searchParams = new URLSearchParams(url.search.substring(1));
        accessToken = searchParams.get('access_token');
        refreshToken = searchParams.get('refresh_token');
      }

      console.log('[AUTH] Extracted tokens:', {
        accessToken: accessToken ? `Found (length: ${accessToken.length})` : 'Not found',
        refreshToken: refreshToken ? `Found (length: ${refreshToken.length})` : 'Not found',
      });

      // Log all URL parameters for debugging
      console.log('[AUTH] All URL hash parameters:');
      for (const [key, value] of hashParams.entries()) {
        console.log(`  ${key}: ${value.substring(0, 10)}...`);
      }

      console.log('[AUTH] All URL search parameters:');
      const searchParams = new URLSearchParams(url.search.substring(1));
      for (const [key, value] of searchParams.entries()) {
        console.log(`  ${key}: ${value.substring(0, 10)}...`);
      }

      if (accessToken && refreshToken) {
        if (!tab.id) {
          console.log('[AUTH] Tab ID is undefined, cannot proceed');
          return;
        }
        console.log('[AUTH] Valid tokens found, proceeding to store them');

        try {
          // We can close that tab now
          await chrome.tabs.remove(tab.id);
          console.log('[AUTH] Auth tab closed');

          // Store access_token and refresh_token in storage
          console.log('[AUTH] Storing access token...');
          await chrome.storage.local.set({
            [chromeStorageKeys.supabaseAccessToken]: accessToken,
          });

          console.log('[AUTH] Storing refresh token...');
          await chrome.storage.local.set({
            [chromeStorageKeys.supabaseRefreshToken]: refreshToken,
          });

          console.log('[AUTH] Tokens stored successfully');

          // Verify tokens were stored correctly
          chrome.storage.local.get(
            [chromeStorageKeys.supabaseAccessToken, chromeStorageKeys.supabaseRefreshToken],
            result => {
              console.log('[AUTH] Verification of stored tokens:', {
                accessToken: result[chromeStorageKeys.supabaseAccessToken]
                  ? `Present (length: ${result[chromeStorageKeys.supabaseAccessToken].length})`
                  : 'Missing',
                refreshToken: result[chromeStorageKeys.supabaseRefreshToken]
                  ? `Present (length: ${result[chromeStorageKeys.supabaseRefreshToken].length})`
                  : 'Missing',
              });
            },
          );

          // Notify all extension pages that authentication is complete
          console.log('[AUTH] Sending auth complete message');
          chrome.runtime.sendMessage({
            action: 'authComplete',
            payload: { success: true },
          });
          console.log('[AUTH] Auth complete message sent');

          // Remove tab listener as tokens are set
          chrome.tabs.onUpdated.removeListener(setTokens);
          console.log('[AUTH] Tab update listener removed');
        } catch (error) {
          console.error('[AUTH] Error storing tokens:', error);
        }
      } else {
        console.log('[AUTH] No tokens found in URL hash or search params');
      }
    } else {
      console.log('[AUTH] Not an overlay.one URL, ignoring');
    }
  }
};
