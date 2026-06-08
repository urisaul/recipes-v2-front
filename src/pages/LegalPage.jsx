import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

const legalContent = {
  terms: {
    title: 'Terms of Service',
    updated: 'Last updated: June 2026',
    blocks: [
      { h: '', p: 'Welcome to RecipeBook. By accessing or using our service, you agree to be bound by these Terms of Service. Please read them carefully.' },
      { h: '1. Acceptance of Terms', p: 'By creating an account or using RecipeBook, you agree to these terms. If you do not agree, please do not use the service.' },
      { h: '2. Your Account', p: 'You are responsible for maintaining the security of your account and all activity that occurs under it. You must provide accurate information when registering and keep it up to date.' },
      { h: '3. Content You Share', p: 'You retain ownership of the recipes and content you post. By publishing a recipe publicly, you grant RecipeBook a non-exclusive license to display it on the platform. You are responsible for ensuring your content does not infringe third-party rights.' },
      { h: '4. Prohibited Conduct', ul: ['Do not post content that is harmful, misleading, or illegal.', "Do not attempt to access other users' accounts or data.", 'Do not use the service for spam or automated scraping.', "Do not reverse-engineer or attempt to compromise the platform's security."] },
      { h: '5. Service Availability', p: 'We strive to keep RecipeBook available at all times, but we cannot guarantee uninterrupted access. We reserve the right to modify or discontinue the service at any time with reasonable notice.' },
      { h: '6. Account Termination', p: 'We may suspend or terminate accounts that violate these terms. You may also request deletion of your account at any time by contacting us at support@recipebook.app.' },
      { h: '7. Limitation of Liability', p: 'RecipeBook is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.' },
      { h: '8. Changes to These Terms', p: 'We may update these terms from time to time. Continued use of the service after changes are posted constitutes your acceptance of the revised terms.' },
      { h: '9. Contact', p: 'For questions about these terms, email us at support@recipebook.app.' },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: June 2026',
    blocks: [
      { h: '', p: 'Your privacy matters to us. This policy explains what information RecipeBook collects, how we use it, and your rights regarding your data.' },
      { h: '1. Information We Collect', ul: ['Account information: Name, username, email address, and password (stored encrypted).', 'Profile content: Bio, website, social handles, and profile photo you choose to provide.', 'Recipe content: Recipes, ingredients, steps, and images you create or upload.', 'Usage data: Pages visited, features used, and general interaction data to improve the service.'] },
      { h: '2. How We Use Your Information', ul: ['To operate and improve the RecipeBook platform.', 'To display your public profile and recipes to other users.', 'To send service-related emails (account confirmation, password reset).', 'To send notifications you have opted into (e.g. recipe saves).'] },
      { h: '3. Data Sharing', p: 'We do not sell your personal data. We may share data with service providers that help us operate the platform (hosting, storage, email delivery) under strict confidentiality agreements. We may also disclose data when required by law.' },
      { h: '4. Public vs. Private Content', p: 'Recipes you mark as Public are visible to all visitors. Recipes marked Private are visible only to you. Your profile name and username are always public.' },
      { h: '5. Cookies & Local Storage', p: 'We use browser local storage to remember your theme preference and session state. We do not use third-party tracking cookies.' },
      { h: '6. Data Retention', p: 'We retain your data for as long as your account is active. You may request deletion of your account and all associated data at any time.' },
      { h: '7. Your Rights', ul: ['Access: You can view all your data through your profile and account pages.', 'Correction: You can update your information in your profile settings.', 'Deletion: You can request full account and data deletion by emailing support@recipebook.app.'] },
      { h: '8. Security', p: 'We use industry-standard security practices including encrypted passwords and HTTPS to protect your data. No system is 100% secure; please use a strong, unique password for your account.' },
      { h: '9. Changes to This Policy', p: 'We may update this policy as the service evolves. We will notify you of significant changes via email or an in-app notice.' },
      { h: '10. Contact', p: 'For any privacy-related questions or requests, contact us at support@recipebook.app.' },
    ],
  },
};

export default function LegalPage({ kind }) {
  const content = legalContent[kind] || legalContent.terms;

  return (
    <>
      <Navbar compact />
      <main>
        <div className="legal-body">
          <h1>{content.title}</h1>
          <p className="updated">{content.updated}</p>
          {content.blocks.map((block, i) => (
            <section key={`${content.title}-${i}`}>
              {block.h ? <h2>{block.h}</h2> : null}
              {block.p ? <p>{block.p}</p> : null}
              {block.ul ? (
                <ul>
                  {block.ul.map((line) => <li key={line}>{line}</li>)}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </main>
      <Footer showLegal activeLegal={kind} />
    </>
  );
}
