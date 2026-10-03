export interface AvatarPreset {
  id: string;
  name: string;
  category: 'anime' | 'cine_series' | 'graciosas' | 'clasicos';
  url: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  // --- ANIME & MANGA ---
  {
    id: 'anime-goku',
    name: 'Son Goku (Dragon Ball)',
    category: 'anime',
    url: 'https://s4.anilist.co/file/anilistcdn/character/large/246-wsRRr6z1kii8.png',
  },
  {
    id: 'anime-luffy',
    name: 'Monkey D. Luffy (One Piece)',
    category: 'anime',
    url: 'https://s4.anilist.co/file/anilistcdn/character/large/b40-MNypXsxSRb1R.png',
  },
  {
    id: 'anime-naruto',
    name: 'Naruto Uzumaki',
    category: 'anime',
    url: 'https://s4.anilist.co/file/anilistcdn/character/large/b17-phjcWCkRuIhu.png',
  },
  {
    id: 'anime-totoro',
    name: 'Totoro (Studio Ghibli)',
    category: 'anime',
    url: 'https://s4.anilist.co/file/anilistcdn/character/large/b269-sbPL4w1ygjSe.jpg',
  },
  {
    id: 'anime-chihiro',
    name: 'Chihiro Ogino',
    category: 'anime',
    url: 'https://s4.anilist.co/file/anilistcdn/character/large/b384-AoWCsQyG0WI7.png',
  },
  {
    id: 'anime-spike',
    name: 'Spike Spiegel (Cowboy Bebop)',
    category: 'anime',
    url: 'https://s4.anilist.co/file/anilistcdn/character/large/b1-ChxaldmieFlQ.png',
  },
  {
    id: 'anime-shinji',
    name: 'Shinji Ikari (Evangelion)',
    category: 'anime',
    url: 'https://s4.anilist.co/file/anilistcdn/character/large/b89-ZtZhXkh1rITn.png',
  },
  {
    id: 'anime-gojo',
    name: 'Satoru Gojo (Jujutsu Kaisen)',
    category: 'anime',
    url: 'https://s4.anilist.co/file/anilistcdn/character/large/b127691-9zqh1xpIubn7.png',
  },

  // --- SERIES & PELÍCULAS ---
  {
    id: 'cine-walter',
    name: 'Walter White (Breaking Bad)',
    category: 'cine_series',
    url: 'https://static.tvmaze.com/uploads/images/medium_portrait/195/488839.jpg',
  },
  {
    id: 'cine-wednesday',
    name: 'Merlina / Wednesday Addams',
    category: 'cine_series',
    url: 'https://static.tvmaze.com/uploads/images/medium_portrait/397/993717.jpg',
  },
  {
    id: 'cine-neo',
    name: 'Neo / John Wick (Keanu)',
    category: 'cine_series',
    url: 'https://static.tvmaze.com/uploads/images/medium_portrait/17/44933.jpg',
  },
  {
    id: 'cine-saul',
    name: 'Saul Goodman (Better Call Saul)',
    category: 'cine_series',
    url: 'https://static.tvmaze.com/uploads/images/medium_portrait/195/488840.jpg',
  },
  {
    id: 'cine-joel',
    name: 'Joel Miller (Pedro Pascal)',
    category: 'cine_series',
    url: 'https://static.tvmaze.com/uploads/images/medium_portrait/444/1110599.jpg',
  },
  {
    id: 'cine-vader',
    name: 'Darth Vader (Star Wars)',
    category: 'cine_series',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Darth_vader_grotesque.jpg/300px-Darth_vader_grotesque.jpg',
  },

  // --- GRACIOSAS & MEMES ---
  {
    id: 'meme-popcorn',
    name: 'Popcorn Emoji',
    category: 'graciosas',
    url: 'https://api.dicebear.com/7.x/fun-emoji/png?seed=Popcorn&backgroundColor=ffd5dc,d1d4f9,c0aede',
  },
  {
    id: 'meme-bot-cine',
    name: 'Robot Cinéfilo',
    category: 'graciosas',
    url: 'https://api.dicebear.com/7.x/bottts/png?seed=Cinephile&backgroundColor=b6e3f4,c0aede,d1d4f9',
  },
  {
    id: 'meme-neko-cine',
    name: 'Michi Crítico',
    category: 'graciosas',
    url: 'https://api.dicebear.com/7.x/bottts/png?seed=NekoCinema&backgroundColor=ffdfbf,ffd5dc',
  },
  {
    id: 'meme-xeno-cine',
    name: 'Alien Popcorn',
    category: 'graciosas',
    url: 'https://api.dicebear.com/7.x/bottts/png?seed=XenoCine&backgroundColor=c0aede,b6e3f4',
  },
  {
    id: 'meme-pixel-culto',
    name: 'Pixel Art 8-Bit',
    category: 'graciosas',
    url: 'https://api.dicebear.com/7.x/pixel-art/png?seed=CultoPlayer&backgroundColor=ffd5dc,b6e3f4',
  },
  {
    id: 'meme-culto-star',
    name: 'Caricatura Cinema',
    category: 'graciosas',
    url: 'https://api.dicebear.com/7.x/fun-emoji/png?seed=CultoMascot&backgroundColor=d1d4f9,ffdfbf',
  },

  // --- CLÁSICOS & DIRECTORES ---
  {
    id: 'clasico-kubrick',
    name: 'Stanley Kubrick',
    category: 'clasicos',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Kubrick_on_the_set_of_Barry_Lyndon_%28cropped%29.jpg/300px-Kubrick_on_the_set_of_Barry_Lyndon_%28cropped%29.jpg',
  },
  {
    id: 'clasico-hitchcock',
    name: 'Alfred Hitchcock',
    category: 'clasicos',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Alfred_Hitchcock_1955.jpg/300px-Alfred_Hitchcock_1955.jpg',
  },
  {
    id: 'clasico-chaplin',
    name: 'Charlie Chaplin',
    category: 'clasicos',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Charlie_Chaplin.jpg/300px-Charlie_Chaplin.jpg',
  },
  {
    id: 'clasico-lynch',
    name: 'David Lynch',
    category: 'clasicos',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/David_Lynch_May_2017.jpg/300px-David_Lynch_May_2017.jpg',
  },
];
