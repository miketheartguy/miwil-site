export const config = {
  name: 'Michael D. Wilson',

  instagram: {
    art: {
      handle:  'miketheartguy',
      bio:     'Pen & ink figurative drawings, mostly from a live model',
      url:     'https://www.instagram.com/miketheartguy',
      feedUrl: '/api/instagram/art',
    },
    bjj: {
      handle:  'mikethemartialartsguy',
      bio:     'BJJ & Muay Thai — the only workout that actually sticks',
      url:     'https://www.instagram.com/mikethemartialartsguy',
      feedUrl: '/api/instagram/bjj',
    },
  },

  // ── Social links bar ─────────────────────────────────────────────────────
  // Add, remove, or reorder entries freely. Supported platforms (for icons):
  //   'facebook' | 'github' | 'twitch' | 'youtube' | 'twitter' | 'discord'
  socials: [
    {
      platform: 'facebook',
      label:    'Facebook',
      url:      'https://www.facebook.com/michael.d.wilson',
      handle:   'michael.d.wilson',
    },
    {
      platform: 'github',
      label:    'GitHub',
      url:      'https://github.com/miketheartguy',
      handle:   'miketheartguy',
    },
    {
      platform: 'twitch',
      label:    'Twitch',
      url:      'https://www.twitch.tv/dad_and_the_boys',
      handle:   'dad_and_the_boys',
    },
  ],

  linkedin: {
    //
    // ── EDIT THESE ──────────────────────────────────────────────────
    // Your LinkedIn profile URL (the part after linkedin.com/in/)
    url:     'https://www.linkedin.com/in/miwil/',
    // Your current job title (update when you change roles)
    title:   'VP, Information Technology',
    // Optional: your employer / organisation
    company: 'HF Software Solutions, Inc.',
    // Optional: path to a profile photo hosted with the site.
    //   1. Drop the image into public/images/linkedin.jpg
    //   2. Change this value to '/images/linkedin.jpg'
    //   3. The initials avatar will be replaced automatically.
    avatarUrl: '/images/linkedin.jpg',
    // ────────────────────────────────────────────────────────────────
  },
} as const;
