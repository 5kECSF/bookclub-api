import slugify from 'slugify';

export const generateSlug = (title: string) => {
  const baseSlug = slugify(title, { lower: true });
  const timestamp = Date.now().toString();
  const randomPart = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `${baseSlug}-${randomPart}-${timestamp}`;
};

/**
 * a function to generate a random string of length len
 * @param len
 */
export function generateRandom(len: number) {
  let pass = '';
  const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 1; i <= len; i++) {
    const char = Math.floor(Math.random() * str.length + 1);
    pass += str.charAt(char);
  }
  return pass;
}
