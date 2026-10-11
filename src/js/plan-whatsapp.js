import { downloadFormats, planLimitLabel } from './download-plans.js';

export function planWhatsAppUrl(order, email) {
  const { plan } = order;
  const message = [
    'Hello Studio Viana, I would like to order this download plan.',
    `Request ID: ${order.reference || order.id}`,
    `Login email: ${email}`,
    `Plan: ${plan.name}`,
    `Price: ₹${plan.price.toLocaleString('en-IN')}`,
    `Validity: ${plan.days} days from admin approval`,
    `Download allowance: ${planLimitLabel(plan)}`,
    `Access: ${plan.access}`,
    ...(plan.formatLimits ? ['', 'Daily format limits:', ...downloadFormats.map(format => `${format.label}: ${plan.formatLimits[format.id]} files/day`)] : []),
    '', 'Daily limits reset at midnight India time.',
    `The plan automatically expires ${plan.days} days after admin approval.`,
    'Please review my request and approve this selected plan from the admin account.',
    'Downloads remain locked until admin approval.',
  ].join('\n');
  return `https://web.whatsapp.com/send?phone=919737711570&text=${encodeURIComponent(message)}`;
}
