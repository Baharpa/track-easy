function loggedFoodTime(item = {}) {
  const directDate = item.loggedAt || item.createdAt;
  if (directDate) {
    const time = new Date(directDate).getTime();
    if (!Number.isNaN(time)) return time;
  }

  const id = String(item._id || '');
  if (/^[a-f\d]{24}$/i.test(id)) return parseInt(id.slice(0, 8), 16) * 1000;
  return 0;
}

export function sortLoggedFoodsNewestFirst(items = []) {
  return [...items].sort((a, b) => loggedFoodTime(b) - loggedFoodTime(a));
}
