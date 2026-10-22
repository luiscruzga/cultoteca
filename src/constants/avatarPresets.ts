/**
 * Listas curadas de la galería de avatares y portadas. Solo se guardan títulos de artículos de
 * la Wikipedia en inglés y nombres: las URLs de las imágenes se piden a las APIs al abrir cada
 * categoría, para que nunca queden enlaces rotos fijados en el código.
 */

export type AvatarCategoryKey =
  | 'anime'
  | 'cine_series'
  | 'comics'
  | 'musica'
  | 'animacion'
  | 'videojuegos'
  | 'libros'
  | 'historicos'
  | 'graciosas'
  | 'paisajes'
  | 'ciudades'
  | 'arte'
  | 'espacio';

/** Categorías de fotos: solo se ofrecen al elegir la portada de una lista. */
export const PHOTO_CATEGORIES: AvatarCategoryKey[] = ['paisajes', 'ciudades', 'arte', 'espacio'];

/** Artículos de en.wikipedia por categoría (máx. 50 por consulta de la API). */
export const WIKI_TITLES: Partial<Record<AvatarCategoryKey, string[]>> = {
  cine_series: [
    'Darth Vader', 'Yoda', 'Indiana Jones (character)', 'James Bond', 'Hermione Granger',
    'Gandalf', 'Jack Sparrow', 'Forrest Gump (character)', 'Eleven (Stranger Things)',
    'Tony Soprano', 'Daenerys Targaryen', 'Jon Snow (character)', 'Vito Corleone', 'Hannibal Lecter',
    'Ellen Ripley', 'Marty McFly', 'Rocky Balboa', 'Dorothy Gale', 'Wednesday Addams', 'Sheldon Cooper',
    'Leia Organa', 'Luke Skywalker', 'Pedro Pascal', 'Keanu Reeves', 'Meryl Streep', 'Zendaya',
  ],
  musica: [
    'Freddie Mercury', 'David Bowie', 'Michael Jackson', 'Madonna', 'The Beatles', 'Bob Marley', 'Elvis Presley',
    'Shakira', 'Bad Bunny', 'Taylor Swift', 'Violeta Parra', 'Víctor Jara', 'Mon Laferte', 'Gustavo Cerati',
    'Beyoncé', 'Kurt Cobain', 'Amy Winehouse', 'Juan Gabriel', 'Celia Cruz', 'Rosalía', 'Los Jaivas',
    'Billie Eilish', 'Prince (musician)', 'Mercedes Sosa',
  ],
  animacion: [
    'Mickey Mouse', 'Bugs Bunny', 'Homer Simpson', 'Bart Simpson', 'SpongeBob SquarePants (character)', 'Shrek (character)',
    'Garfield (character)', 'Snoopy', 'Scooby-Doo (character)', 'Pink Panther (character)', 'Woody (Toy Story)',
    'Buzz Lightyear', 'Stitch (Lilo & Stitch)', 'Popeye', 'Betty Boop', 'Elsa (Frozen)', 'Peter Griffin',
  ],
  comics: ['Mafalda', 'Asterix (character)', 'Tintin (character)', 'Calvin and Hobbes', 'Charlie Brown'],
  videojuegos: [
    'Mario', 'Link (The Legend of Zelda)', 'Pikachu', 'Sonic the Hedgehog (character)', 'Lara Croft', 'Master Chief (Halo)',
    'Kratos (God of War)', 'Pac-Man (character)', 'Samus Aran', 'Kirby (character)', 'Donkey Kong (character)',
    'Geralt of Rivia', 'Cloud Strife', 'Solid Snake', 'Steve (Minecraft)', 'Princess Peach', 'Yoshi',
    'Ellie (The Last of Us)', 'Crash Bandicoot (character)', 'Princess Zelda',
  ],
  libros: [
    'Sherlock Holmes', 'Don Quixote', 'Count Dracula', "Frankenstein's monster", 'The Little Prince',
    'Alice (Alice\'s Adventures in Wonderland)', 'Hercule Poirot', 'Gabriel García Márquez', 'Jorge Luis Borges',
    'Isabel Allende', 'J. R. R. Tolkien', 'Agatha Christie', 'Jane Austen', 'Edgar Allan Poe', 'Franz Kafka',
    'Julio Cortázar', 'Miguel de Cervantes', 'William Shakespeare', 'Pablo Neruda', 'Gabriela Mistral',
    'Virginia Woolf', 'Mary Shelley', 'Haruki Murakami',
  ],
  historicos: [
    'Albert Einstein', 'Frida Kahlo', 'Cleopatra', 'Leonardo da Vinci', 'Napoleon', 'Marie Curie', 'Nikola Tesla',
    'Simón Bolívar', 'Mahatma Gandhi', 'Ludwig van Beethoven', 'Wolfgang Amadeus Mozart', 'Vincent van Gogh',
    'Juana Inés de la Cruz', 'Ada Lovelace', 'Martin Luther King Jr.', 'Nelson Mandela', 'Galileo Galilei',
    'Isaac Newton', 'Charles Darwin', 'Julius Caesar', 'Joan of Arc', 'Confucius', 'Socrates',
    "Bernardo O'Higgins", 'Amelia Earhart', 'Charlie Chaplin', 'Alfred Hitchcock', 'Stanley Kubrick',
    'Marilyn Monroe', 'Stephen Hawking',
  ],
  paisajes: [
    'Torres del Paine National Park', 'Machu Picchu', 'Atacama Desert', 'Iguazu Falls', 'Mount Fuji', 'Grand Canyon',
    'Aurora', 'Matterhorn', 'Salar de Uyuni', 'Perito Moreno Glacier', 'Moai', 'Victoria Falls',
    'Banff National Park', 'Lake Bled', 'Sahara', 'Amazon rainforest', 'Great Barrier Reef', 'Monte Fitz Roy',
    'Milford Sound', 'Yosemite Valley', 'Plitvice Lakes National Park', 'Ha Long Bay', 'Santorini', 'Osorno (volcano)',
  ],
  ciudades: [
    'Valparaíso', 'Santiago', 'Paris', 'Tokyo', 'New York City', 'Rio de Janeiro', 'Buenos Aires', 'Barcelona',
    'Rome', 'London', 'Venice', 'Istanbul', 'Kyoto', 'Prague', 'Dubai', 'Hong Kong', 'Cartagena, Colombia',
    'Havana', 'Lisbon', 'Amsterdam', 'Cusco', 'Mexico City', 'Sydney Opera House', 'Petra',
  ],
  arte: [
    'The Starry Night', 'Mona Lisa', 'The Great Wave off Kanagawa', 'Girl with a Pearl Earring', 'The Persistence of Memory',
    'The Scream', 'The Kiss (Klimt)', 'The Birth of Venus', 'Guernica (Picasso)', 'Water Lilies (Monet series)',
    'The Night Watch', 'Las Meninas', 'The Creation of Adam', 'American Gothic', 'Nighthawks (painting)',
    'The Garden of Earthly Delights', 'Liberty Leading the People', 'Impression, Sunrise', 'The Son of Man',
    'Café Terrace at Night', 'A Sunday Afternoon on the Island of La Grande Jatte', 'Wanderer above the Sea of Fog',
    'The Two Fridas', 'Sunflowers (Van Gogh series)',
  ],
  espacio: [
    'Pillars of Creation', 'Earthrise', 'The Blue Marble', 'Saturn', 'Jupiter', 'Andromeda Galaxy', 'Milky Way',
    'Crab Nebula', 'Orion Nebula', 'Mars', 'Moon', 'Carina Nebula', 'Hubble Ultra-Deep Field', 'Pale Blue Dot',
    'Whirlpool Galaxy', 'Horsehead Nebula', 'Helix Nebula', 'Sun', 'Neptune', 'Ring Nebula', 'Eagle Nebula',
    'Sombrero Galaxy', 'International Space Station',
  ],
};

/** Personajes de Superhero API que se muestran en la categoría Cómics (en este orden). */
export const FEATURED_SUPERHEROES = [
  'Batman', 'Superman', 'Spider-Man', 'Wonder Woman', 'Iron Man', 'Wolverine', 'Joker', 'Harley Quinn', 'Deadpool',
  'Thor', 'Hulk', 'Captain America', 'Black Widow', 'Storm', 'Flash', 'Aquaman', 'Green Lantern', 'Catwoman',
  'Venom', 'Doctor Strange', 'Black Panther', 'Scarlet Witch', 'Thanos', 'Groot', 'Rocket Raccoon', 'Magneto',
  'Robin', 'Batgirl', 'Loki', 'Silver Surfer',
];

const DICEBEAR_STYLES = [
  'fun-emoji', 'bottts', 'pixel-art', 'adventurer', 'avataaars', 'big-smile', 'croodles', 'lorelei', 'micah',
  'notionists', 'open-peeps', 'personas', 'thumbs', 'miniavs',
];
const DICEBEAR_SEEDS = ['Popcorn', 'Cinefilo', 'Lector', 'Otaku', 'Gamer', 'Melomano', 'Critico', 'Culto'];
const DICEBEAR_BACKGROUNDS = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';

/** Avatares ilustrados de DiceBear: siempre disponibles, sin depender de búsquedas. */
export const DICEBEAR_AVATARS = DICEBEAR_STYLES.flatMap((style, styleIndex) =>
  [0, 1, 2].map(offset => {
    const seed = DICEBEAR_SEEDS[(styleIndex + offset * 3) % DICEBEAR_SEEDS.length];
    return {
      id: `dicebear-${style}-${seed}`,
      name: `${seed} (${style})`,
      url: `https://api.dicebear.com/9.x/${style}/png?seed=${seed}&size=256&backgroundColor=${DICEBEAR_BACKGROUNDS}`,
    };
  })
);
