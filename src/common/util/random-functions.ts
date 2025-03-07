import * as crypto from 'crypto';
import slugify from 'slugify';

export const generateSlug = (title: string, random = true, timeStamp = true) => {
  const baseSlug = slugify(title, { lower: true });
  let first10 = baseSlug.slice(0, 10);
  if (random) first10 = `${first10}_${generateRandom(4)}`;
  if (timeStamp) first10 = `${generateShortDate()}_${first10}`;
  return first10;
};
function generateShortDate() {
  const date = new Date();
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based in JavaScript
  const year = date.getFullYear().toString().slice(-2); // Extract last two digits of the year
  return year + month + day;
}

interface Img {
  uid?: string;
  name: string;
}

export function generateUniqName(fileName: string, uid = '', ctr = 0): Img {
  const length = 6;
  //uid is useful for sorting
  if (uid === '') {
    uid = generateShortDate() + generateRandom(length);
  }

  const names = fileName.split('.');
  //chooses if slug should have random and timestamp
  const slug = generateSlug(names[0], true, false);

  const ext = names[names.length - 1];
  return { name: `${uid}-${slug}-${ctr}.${ext}`, uid: uid };
}

export function generateRandom(len: number) {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString('hex')
    .slice(0, len);
}

const CapitalLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SmallLetters = 'abcdefghijklmnopqrstuvwxyz';
const NumberChars = '0123456789';
// const AlphabetOnly = CapitalLetters + SmallLetters;
const AlphaNumeric = CapitalLetters + SmallLetters + NumberChars;

/**
 * a function to generate a random string of length len
 * @param len
 */
export function generateRandoms(len: number) {
  let pass = '';

  for (let i = 1; i <= len; i++) {
    const char = Math.floor(Math.random() * AlphaNumeric.length + 1);
    pass += AlphaNumeric.charAt(char);
  }
  return pass;
}
export function generateRandomNum(len: number) {
  let pass = '';

  for (let i = 1; i <= len; i++) {
    const char = Math.floor(Math.random() * NumberChars.length + 1);
    pass += NumberChars.charAt(char);
  }
  return pass;
}
