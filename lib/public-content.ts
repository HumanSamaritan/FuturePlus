export const DESTINATIONS = [
  {
    slug: 'pune',
    name: 'Pune',
    state: 'Maharashtra',
    image: 'https://futureplusedus.com/wp-content/uploads/2024/10/pune.webp',
    source: 'https://futureplusedus.com/city/pune/',
    institutions: ['RIIM Pune', 'MIT World Peace University', 'Universal AI', 'ITM Business School', 'ISMS Pune', 'Pune Business School', 'Indira School Of Business Studies', 'IIMS (Sai Balaji)', 'Kirloskar Institute Of Advanced Management', 'Lexicon MILE', 'Dr. D. Y. Patil B-School']
  },
  {
    slug: 'bangalore',
    name: 'Bangalore',
    state: 'Karnataka',
    image: 'https://futureplusedus.com/wp-content/uploads/2024/10/bangalore.webp',
    source: 'https://futureplusedus.com/city/bangalore/',
    institutions: ['NITTE University', "St. Joseph's College", 'IFIM Institutions', 'Acharya Bangalore B-School', 'Dayananda Sagar University', 'Jain University', 'RV University', 'Alliance University', 'ISBR Business School', 'GIBS Bangalore', 'Regional College of Management Bangalore', 'KCM - Karnataka College of Management']
  },
  {
    slug: 'delhi',
    name: 'Delhi NCR',
    state: 'Delhi / NCR',
    image: 'https://futureplusedus.com/wp-content/uploads/2024/10/delhi-1024x560.webp',
    source: 'https://futureplusedus.com/city/delhi/',
    institutions: ['BML Munjal University', 'Bennett University', 'SOIL Institute of Management', 'Amity University Noida', 'JIMS', 'GD Goenka University', 'NDIM', 'Asian Business School', 'GLBITM Engineering College', 'Lloyd Business School', 'Sharda University', 'IILM University', 'GIMS']
  },
  {
    slug: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    image: 'https://futureplusedus.com/wp-content/uploads/2024/10/mumbai.webp',
    source: 'https://futureplusedus.com/city/mumbai/',
    institutions: ['ATLAS SkillTech University', 'Welingkar Institute of Management Development and Research', "Chetana's Institute of Management and Research"]
  },
  {
    slug: 'kolkata',
    name: 'Kolkata',
    state: 'West Bengal',
    image: 'https://futureplusedus.com/wp-content/uploads/2024/10/kolkata-1024x602.webp',
    source: 'https://futureplusedus.com/city/kolkata/',
    institutions: ['IMI Kolkata', 'Globsyn Business School', 'Calcutta Business School', 'Praxis Business School', 'IQ City Unitedworld School of Business']
  },
  {
    slug: 'bhubaneswar',
    name: 'Bhubaneswar',
    state: 'Odisha',
    image: 'https://futureplusedus.com/wp-content/uploads/2024/10/bhubaneswar-1024x683.webp',
    source: 'https://futureplusedus.com/city/bhubaneswar/',
    institutions: ['ODM', 'Birla Global University', 'SOA University', 'KIIT University']
  },
  {
    slug: 'hyderabad',
    name: 'Hyderabad',
    state: 'Telangana',
    image: 'https://futureplusedus.com/wp-content/uploads/2024/10/hyderabad-1024x702.webp',
    source: 'https://futureplusedus.com/city/hyderabad/',
    institutions: ['GITAM University', 'Mahindra University', 'Ashoka School of Business', 'Siva Sivani Institute of Management']
  },
  {
    slug: 'chennai',
    name: 'Chennai',
    state: 'Tamil Nadu',
    image: 'https://futureplusedus.com/wp-content/uploads/2024/10/chennai.webp',
    source: 'https://futureplusedus.com/city/chennai/',
    institutions: ['Bharath University', 'Hindustan University', 'Sathyabama University', 'SRM University']
  }
] as const;

export const GALLERY_IMAGES = [
  'IMG-20241017-WA0004-1-scaled.webp',
  'IMG-20241017-WA0000-scaled.webp',
  'IMG-20241017-WA0001-scaled.webp',
  'IMG-20241017-WA0002-scaled.webp',
  'IMG-20241017-WA0006-scaled.webp',
  'IMG-20241017-WA0004-scaled.webp',
  'IMG-20241017-WA0009-scaled.webp',
  'IMG-20241017-WA0007.webp',
  'IMG-20241017-WA0010.webp'
].map((name) => `https://futureplusedus.com/wp-content/uploads/2024/10/${name}`);
