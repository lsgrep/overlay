export const performSearch = async (query: string) => {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  await chrome.tabs.create({ url: searchUrl });
};
