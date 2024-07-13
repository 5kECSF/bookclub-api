import slugify from 'slugify';
import * as crypto from 'crypto';

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
  if (uid === '') {
    uid = generateShortDate() + generateRandom(length);
  }

  const names = fileName.split('.');
  const slug = generateSlug(names[0], true, false);

  const ext = names[names.length - 1];
  return { name: `${uid}-${slug}-${ctr}.${ext}`, uid: uid };
}
export const removeSubArr = (mainArr: string[], arrToBeRemoved: string[]) => {
  return mainArr.filter((name) => {
    return !arrToBeRemoved.includes(name);
  });
};

export function generateRandom(len: number) {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString('hex')
    .slice(0, len);
}
/**
 * a function to generate a random string of length len
 * @param len
 */
export function generateRandoms(len: number) {
  let pass = '';
  const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 1; i <= len; i++) {
    const char = Math.floor(Math.random() * str.length + 1);
    pass += str.charAt(char);
  }
  return pass;
}
