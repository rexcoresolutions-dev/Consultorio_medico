// Lista de nombres comunes para detectar género
const femaleNames = [
  'maria', 'maría', 'ana', 'laura', 'carmen', 'josefina', 'isabel', 'luisa', 
  'patricia', 'martha', 'teresa', 'gloria', 'silvia', 'veronica', 'verónica',
  'elena', 'sofia', 'sofía', 'valentina', 'camila', 'daniela', 'paula',
  'andrea', 'fernanda', 'alejandra', 'monica', 'mónica', 'lorena', 'mayte',
  'janeth', 'karla', 'karen', 'liliana', 'jessica', 'vanessa', 'gabriela',
  'adriana', 'diana', 'ivette', 'rocko', 'wendy', 'melissa', 'katherine',
  'karmina', 'marisol', 'angela', 'ángela', 'beatriz', 'cristina', 'elizabeth',
  'raquel', 'rebeca', 'susana', 'ximena', 'yolanda', 'fabiola', 'karina'
];

const maleNames = [
  'jose', 'josé', 'juan', 'carlos', 'miguel', 'angel', 'ángel', 'jesus', 'jesús',
  'pedro', 'pablo', 'francisco', 'javier', 'manuel', 'andres', 'andrès',
  'alejandro', 'roberto', 'antonio', 'fernando', 'sergio', 'ramon', 'ramón',
  'ricardo', 'alberto', 'gerardo', 'omar', 'edgar', 'ivan', 'iván', 'david',
  'jorge', 'luis', 'daniel', 'arturo', 'mario', 'hugo', 'ruben', 'rubén',
  'adrian', 'adrián', 'cristian', 'victor', 'víctor', 'enrique', 'raul', 'raúl',
  'gustavo', 'alfredo', 'oscar', 'óscar', 'cesar', 'césar', 'martin', 'martín',
  'edwin', 'julio', 'hector', 'héctor', 'rodrigo', 'sebastian', 'sebastián'
];

// Palabras clave por terminación
const femaleEndings = ['a', 'ina', 'ana', 'ela', 'ira', 'isa', 'ita', 'ora', 'ura'];
const maleEndings = ['o', 'io', 'eo', 'ano', 'eno', 'ino', 'ón', 'os', 'ez'];

export type Gender = 'MALE' | 'FEMALE' | 'UNKNOWN';

export function detectGender(nombre: string, _primerApellido?: string, _segundoApellido?: string): Gender {
  if (!nombre) return 'UNKNOWN';
  
  const nombreLower = nombre.toLowerCase().trim();
  
  // 1. Verificar en listas de nombres
  if (femaleNames.includes(nombreLower)) {
    return 'FEMALE';
  }
  if (maleNames.includes(nombreLower)) {
    return 'MALE';
  }
  
  // 2. Verificar por terminaciones
  for (const ending of femaleEndings) {
    if (nombreLower.endsWith(ending)) {
      return 'FEMALE';
    }
  }
  
  for (const ending of maleEndings) {
    if (nombreLower.endsWith(ending)) {
      return 'MALE';
    }
  }
  
  // 3. Si no se puede determinar, usar heurísticas
  const lastChar = nombreLower.charAt(nombreLower.length - 1);
  if (lastChar === 'a') return 'FEMALE';
  if (lastChar === 'o') return 'MALE';
  
  return 'UNKNOWN';
}

export function getWelcomeMessage(gender: Gender, nombre: string, primerApellido?: string): string {
  const fullName = `${nombre} ${primerApellido || ''}`.trim();
  
  switch (gender) {
    case 'FEMALE':
      return `¡Bienvenida, ${fullName}!`;
    case 'MALE':
      return `¡Bienvenido, ${fullName}!`;
    default:
      return `¡Bienvenido(a), ${fullName}!`;
  }
}

export function getGreetingWithGender(gender: Gender): string {
  const hour = new Date().getHours();
  let greeting = '';
  
  if (hour < 12) greeting = 'Buenos';
  else if (hour < 18) greeting = 'Buenas';
  else greeting = 'Buenas';
  
  switch (gender) {
    case 'FEMALE':
      return `${greeting} tardes`;
    case 'MALE':
      return `${greeting} tardes`;
    default:
      return `${greeting} tardes`;
  }
}