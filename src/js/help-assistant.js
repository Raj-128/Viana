export const helpTopics = [
  { title: 'Find wallpapers', answer: 'Browse mural wallpapers, open a design and choose your size. Wallpaper orders and 3D plans are separate.', label: 'Explore wallpapers', href: 'work.html?mode=wallpaper#catalogue' },
  { title: 'Find 3D assets', answer: 'Browse the 3D library by software format. Open an asset to check its formats and access requirements. Empty categories offer a WhatsApp request.', label: 'Explore 3D assets', href: 'work.html?mode=3d#catalogue' },
  { title: 'Plans and expiry', answer: 'Your current 3D plan appears in the header. During its final 7 days, the badge shows how soon it expires. View plans to compare allowances or request renewal. Access starts after studio approval.', label: 'View plans and my plan requests', href: 'plans.html' },
  { title: 'Track my requests', answer: 'Sign in to the account you used for your request. Open My requests and print files for wallpaper requests, or the Plans page for 3D plan requests. Your private information stays in your signed-in account.', label: 'Open my account', href: 'login.html#account', secondary: { label: '3D plan requests', href: 'plans.html#order-heading' } },
  { title: 'Help with downloads', answer: 'For wallpaper print files, wait for studio approval and the finished file. Confirm receipt only after you have saved and checked it. For 3D downloads, check your active plan and format allowance. If a download fails, contact the studio with the request reference.', label: 'Open my account', href: 'login.html#account', secondary: { label: 'Recent 3D downloads', href: 'plans.html#recent-downloads-heading' } },
];

let dialog;
export function openHelp() {
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'studio-help-dialog';
    dialog.setAttribute('aria-labelledby', 'studio-help-title');
    const header = document.createElement('header');
    const title = document.createElement('h2');
    title.id = 'studio-help-title'; title.textContent = 'How can we help?';
    const close = document.createElement('button');
    close.type = 'button'; close.textContent = 'Close';
    close.addEventListener('click', () => dialog.close());
    header.append(title, close);
    const intro = document.createElement('p');
    intro.textContent = 'A quick guide to Studio Viana. Choose a topic below.';
    const choices = document.createElement('div');
    choices.className = 'studio-help-topics';
    for (const topic of helpTopics) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = topic.title;
      const answer = document.createElement('p'); answer.textContent = topic.answer;
      const links = document.createElement('nav');
      links.setAttribute('aria-label', topic.title);
      for (const action of [topic, topic.secondary].filter(Boolean)) {
        const link = document.createElement('a');
        link.href = action.href; link.textContent = action.label;
        links.append(link);
      }
      details.append(summary, answer, links); choices.append(details);
    }
    const contact = document.createElement('a');
    contact.className = 'studio-help-contact';
    contact.textContent = 'Still need help? Contact the studio on WhatsApp';
    contact.href = 'https://wa.me/919737711570?text=Hello%20Studio%20Viana%2C%20I%20need%20help%20with%20the%20website.';
    contact.target = '_blank'; contact.rel = 'noopener noreferrer';
    dialog.append(header, intro, choices, contact);
    document.body.append(dialog);
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
  }
  if (!dialog.open) dialog.showModal();
}
