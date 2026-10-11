export function summarizeRequests(legacy = [], print = []) {
  const requests = [...legacy, ...print];
  return {
    pending: requests.filter(request => request.status === 'pending').length,
    approved: requests.filter(request => request.status === 'approved').length,
    all: requests.length,
  };
}
