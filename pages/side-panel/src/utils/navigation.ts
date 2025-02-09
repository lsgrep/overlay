export const navigateTo = async (url: string) => {
  await chrome.tabs.create({ url });
};
