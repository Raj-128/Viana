import { downloadFormats, planLimitLabel } from './download-plans.js';

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const date = value => value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not started';

export function createPlanOrderSummary(order) {
  const card = element('article', 'admin-plan-order');
  const header = element('header', 'admin-plan-order-header');
  const customer = element('div', 'admin-plan-customer');
  customer.append(element('h3', '', order.name), element('p', '', order.email),
    element('small', '', `Request: ${order.reference || order.id}`));
  const badge = element('span', 'approval-badge', order.status);
  badge.dataset.status = order.status;
  header.append(customer, badge);

  const fields = element('dl', 'admin-plan-fields');
  const payment = order.paymentStatus === 'paid' ? 'Paid · confirmed by admin'
    : order.paymentStatus === 'complimentary' ? 'Complimentary · studio granted' : 'Not confirmed';
  for (const [label, value] of [
    ['Plan', order.plan.name],
    ['Plan price', new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(order.plan.price)],
    ['Validity', `${order.plan.days} days`],
    ['Download allowance', planLimitLabel(order.plan)],
    ['Model access', order.plan.access],
    ['Payment', payment],
    ['Requested (IST)', date(order.created_at)],
    ['Expires (IST)', date(order.expires_at)],
  ]) {
    const field = element('div');
    field.append(element('dt', '', label), element('dd', '', value));
    fields.append(field);
  }
  card.append(header, fields);
  if (order.plan.formatLimits) {
    const details = element('details', 'admin-plan-formats');
    const limits = element('dl', 'admin-format-limits');
    for (const format of downloadFormats) {
      const field = element('div');
      const limit = order.plan.formatLimits[format.id];
      field.append(element('dt', '', format.label), element('dd', '', limit === undefined ? 'Not specified' : `${limit} / day`));
      limits.append(field);
    }
    details.append(element('summary', '', 'Daily limits by file format'), limits);
    card.append(details);
  }
  return card;
}
