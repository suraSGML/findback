import bcrypt from 'bcryptjs';

export async function getSeedData(demoPassword: string) {
  if (demoPassword.length < 12) {
    throw new Error('SEED_DEMO_PASSWORD must contain at least 12 characters.');
  }
  const hashedDemoPassword = await bcrypt.hash(demoPassword, 12);

  const users = [
    {
      name: 'Dr. Eleanor Vance',
      email: 'admin@findback.org',
      password: hashedDemoPassword,
      phone: '+251 91 100 2001',
      country: 'Ethiopia',
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      role: 'ADMIN',
      verificationStatus: 'VERIFIED',
      bio: 'FindBack Platform Administrator and Trust & Safety Lead.',
      reputation: { ratingAverage: 5.0, ratingCount: 15, itemsReturned: 12, itemsRecovered: 0 },
    },
    {
      name: 'Amina Kebede',
      email: 'user@findback.org', // Primary demo user
      password: hashedDemoPassword,
      phone: '+251 91 234 5671',
      country: 'Ethiopia',
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      role: 'USER',
      verificationStatus: 'VERIFIED',
      bio: 'Resident in Bole. Passionate about community honesty and helping items find their way home.',
      reputation: { ratingAverage: 4.9, ratingCount: 10, itemsReturned: 4, itemsRecovered: 2 },
    },
    {
      name: 'Dawit Mengistu',
      email: 'dawit@findback.org',
      password: hashedDemoPassword,
      phone: '+251 92 345 6782',
      country: 'Ethiopia',
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      role: 'USER',
      verificationStatus: 'VERIFIED',
      bio: 'Civil engineer and daily commuter in Addis Ababa.',
      reputation: { ratingAverage: 5.0, ratingCount: 8, itemsReturned: 6, itemsRecovered: 1 },
    },
    {
      name: 'Chloe Tremblay',
      email: 'chloe@findback.org',
      password: hashedDemoPassword,
      phone: '+251 93 456 7893',
      country: 'Ethiopia',
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      role: 'USER',
      verificationStatus: 'VERIFIED',
      bio: 'Graphic designer living in Arat Kilo.',
      reputation: { ratingAverage: 4.8, ratingCount: 6, itemsReturned: 3, itemsRecovered: 1 },
    },
    {
      name: 'Robel Bekele',
      email: 'robel@findback.org',
      password: hashedDemoPassword,
      phone: '+251 94 567 8904',
      country: 'Ethiopia',
      region: 'Sidama',
      city: 'Hawassa',
      role: 'USER',
      verificationStatus: 'VERIFIED',
      bio: 'Business consultant based in Hawassa with frequent travel to Addis Ababa.',
      reputation: { ratingAverage: 4.7, ratingCount: 4, itemsReturned: 1, itemsRecovered: 1 },
    },
  ];

  const categories = [
    {
      name: 'Phones, Tablets & Smart Devices',
      slug: 'phones-tablets',
      description: 'Smartphones, iPads, Android tablets, smartwatches, and styluses.',
      icon: 'Smartphone',
    },
    {
      name: 'Wallets, Purses & Cards',
      slug: 'wallets-purses-cards',
      description: 'Leather wallets, coin purses, bank payment cards, and cash clips.',
      icon: 'CreditCard',
    },
    {
      name: 'Keys & Keychains',
      slug: 'keys-keychains',
      description: 'House keys, car fobs, office lanyards, and lock combinations.',
      icon: 'Key',
    },
    {
      name: 'Bags, Backpacks & Luggage',
      slug: 'bags-backpacks',
      description: 'School backpacks, laptop briefcases, tote bags, and travel suitcases.',
      icon: 'Briefcase',
    },
    {
      name: 'Headphones & Audio Gear',
      slug: 'headphones-audio',
      description: 'Wireless earbuds, over-ear noise-cancelling headphones, and cases.',
      icon: 'Headphones',
    },
    {
      name: 'IDs, Passports & Documents',
      slug: 'ids-documents',
      description: 'National ID cards, passports, driving licenses, and academic certificates.',
      icon: 'FileText',
    },
    {
      name: 'Laptops, Chargers & Computers',
      slug: 'laptops-computers',
      description: 'MacBooks, Windows laptops, USB-C chargers, cables, and hard drives.',
      icon: 'Laptop',
    },
    {
      name: 'Jewelry, Watches & Accessories',
      slug: 'jewelry-accessories',
      description: 'Watches, rings, necklaces, prescription spectacles, and sunglasses.',
      icon: 'Watch',
    },
  ];

  const locations = [
    {
      name: 'Bole Medhanealem Public Hub',
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      country: 'Ethiopia',
      area: 'Bole',
      address: 'Near Medhanealem Cathedral Plaza, Cameroon Street',
      isOfficialMeetingSpot: true,
      meetingInstructions: 'Meet in the bustling, well-lit pedestrian plaza or hotel lobby entrance.',
    },
    {
      name: 'Meskel Square Transport Hub & Public Foyer',
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      country: 'Ethiopia',
      area: 'Kirkos',
      address: 'Meskel Square Exhibition Concourse',
      isOfficialMeetingSpot: true,
      meetingInstructions: 'Meet near the public information pavilion or light-rail station entrance.',
    },
    {
      name: 'Piassa Heritage Post Office Plaza',
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      country: 'Ethiopia',
      area: 'Arada',
      address: 'Churchill Avenue, Piassa',
      isOfficialMeetingSpot: true,
      meetingInstructions: 'Meet in front of the central post office customer service lobby.',
    },
    {
      name: 'Arat Kilo Public Library & Plaza',
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      country: 'Ethiopia',
      area: 'Arada',
      address: 'King George VI Street, Arat Kilo',
      isOfficialMeetingSpot: true,
      meetingInstructions: 'Meet near the reception desk inside the Abrehot / Arat Kilo library entrance.',
    },
    {
      name: 'Mexico Square Commercial Center',
      city: 'Addis Ababa',
      region: 'Addis Ababa',
      country: 'Ethiopia',
      area: 'Kirkos',
      address: 'Chad Street / Mexico Square Roundabout',
      isOfficialMeetingSpot: true,
      meetingInstructions: 'Meet inside the main commercial shopping arcade ground floor atrium.',
    },
    {
      name: 'Hawassa Lake Promenade Hub',
      city: 'Hawassa',
      region: 'Sidama',
      country: 'Ethiopia',
      area: 'Tabor',
      address: 'Lake Hawassa Central Promenade',
      isOfficialMeetingSpot: true,
      meetingInstructions: 'Meet at the public visitors center near the main lakeshore park.',
    },
  ];

  return { users, categories, locations };
}
