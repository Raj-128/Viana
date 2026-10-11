export const downloadFormats = [
  { id: 'max', label: '3ds Max', extensions: ['max'], basicLimit: 9 },
  { id: 'c4d', label: 'Cinema 4D', extensions: ['c4d'], basicLimit: 2 },
  { id: 'blend', label: 'Blender', extensions: ['blend'], basicLimit: 3 },
  { id: 'unreal', label: 'Unreal', extensions: ['uproject', 'uasset'], basicLimit: 1 },
  { id: 'fbx', label: 'FBX', extensions: ['fbx'], basicLimit: 4 },
  { id: 'obj', label: 'OBJ', extensions: ['obj'], basicLimit: 4 },
  { id: 'materials', label: 'Archmaterials', extensions: ['mat', 'matlib', 'sbsar'], basicLimit: 5 },
  { id: 'stl', label: 'STL', extensions: ['stl'], basicLimit: 4 },
];

export const downloadPlans = [
  { id: 'basic', name: 'Basic - No Ads', price: 399, days: 30, totalLimit: 100, maxTier: 0, access: 'Free models only, no ads' },
  { id: 'vip-weekly', name: 'VIP 7 Days', price: 599, days: 7, dailyLimit: 50, maxTier: 1, access: 'Free + VIP models' },
  { id: 'vip-monthly', name: 'VIP Monthly', price: 1199, days: 30, dailyLimit: 150, maxTier: 1, access: 'Free + VIP models, no ads' },
  { id: 'pro', name: 'Pro', price: 3999, days: 180, dailyLimit: 300, maxTier: 2, access: 'Free + VIP + Pro models' },
  { id: 's-pro', name: 'S-Pro Yearly', price: 7199, days: 365, dailyLimit: 500, maxTier: 3, access: 'Free + VIP + Pro + S-Pro models' },
].map((plan, index) => ({ ...plan, formatLimits: Object.fromEntries(downloadFormats.map(format => [format.id, format.basicLimit + index * 3])) }));

export const planLimitLabel = plan => plan.totalLimit
  ? `${plan.totalLimit} files / ${plan.days} days`
  : `${plan.dailyLimit} files / day`;
